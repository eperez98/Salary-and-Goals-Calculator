//! In-app updates from GitHub Releases.
//!
//! * `check_update` asks the GitHub Releases API for the newest version
//!   (optionally including Beta pre-releases) and compares it with the
//!   running version using SemVer.
//! * `install_update` downloads the release zip (`Monto_<v>_x64.zip`),
//!   verifies it against the SHA-256 digest GitHub reports for the asset,
//!   extracts it with Windows' built-in `tar.exe`, checks the installer
//!   against the `SHA256SUMS.txt` inside the zip, launches it and closes
//!   Monto so files can be replaced. User data lives in %APPDATA% and is
//!   never touched by the installer.
//!
//! Network access only happens when the user explicitly asks for it
//! (button or the "check automatically" preference).

use semver::Version;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::io::{Read, Write};
use tauri::{AppHandle, Emitter, Manager};

pub const REPO: &str = "eperez98/monto";
const UA: &str = concat!("Monto-Updater/", env!("CARGO_PKG_VERSION"));

#[derive(Debug, Deserialize)]
pub struct GhAsset {
    pub name: String,
    pub browser_download_url: String,
    #[serde(default)]
    pub size: u64,
    /// "sha256:<hex>", computed by GitHub when the asset is uploaded.
    #[serde(default)]
    pub digest: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GhRelease {
    pub tag_name: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub body: Option<String>,
    #[serde(default)]
    pub prerelease: bool,
    #[serde(default)]
    pub draft: bool,
    #[serde(default)]
    pub published_at: Option<String>,
    #[serde(default)]
    pub html_url: String,
    #[serde(default)]
    pub assets: Vec<GhAsset>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub version: String,
    pub current: String,
    pub name: String,
    pub notes: String,
    pub date: Option<String>,
    pub prerelease: bool,
    pub html_url: String,
    pub installer_name: String,
    pub installer_url: String,
    pub installer_size: u64,
    /// SHA-256 of the zip as reported by GitHub (hex, lowercase).
    pub sha256: Option<String>,
}

#[derive(Serialize, Clone)]
struct Progress {
    downloaded: u64,
    total: u64,
}

fn parse_tag(tag: &str) -> Option<Version> {
    Version::parse(tag.trim().trim_start_matches(['v', 'V'])).ok()
}

/// Release asset that carries the installer: `Monto_<version>_x64.zip`.
fn is_package(name: &str) -> bool {
    let n = name.to_lowercase();
    n.starts_with("monto_") && n.ends_with("_x64.zip")
}

/// Pick the newest release newer than `current` that ships a Windows installer zip.
pub fn pick_update(releases: &[GhRelease], current: &str, include_prerelease: bool) -> Option<UpdateInfo> {
    let cur = Version::parse(current).ok()?;
    releases
        .iter()
        .filter(|r| !r.draft && (include_prerelease || !r.prerelease))
        .filter_map(|r| parse_tag(&r.tag_name).map(|v| (v, r)))
        .filter(|(v, _)| *v > cur)
        .filter_map(|(v, r)| {
            let inst = r.assets.iter().find(|a| is_package(&a.name))?;
            Some((v, r, inst))
        })
        .max_by(|a, b| a.0.cmp(&b.0))
        .map(|(v, r, inst)| UpdateInfo {
            version: v.to_string(),
            current: current.to_string(),
            name: r.name.clone().unwrap_or_else(|| r.tag_name.clone()),
            notes: r.body.clone().unwrap_or_default(),
            date: r.published_at.clone(),
            prerelease: r.prerelease || !v.pre.is_empty(),
            html_url: r.html_url.clone(),
            installer_name: inst.name.clone(),
            installer_url: inst.browser_download_url.clone(),
            installer_size: inst.size,
            sha256: inst.digest.as_deref().and_then(|d| d.strip_prefix("sha256:")).map(str::to_lowercase),
        })
}

/// Find the hash for `file` in a `sha256sum`-style listing.
pub fn expected_hash(sums: &str, file: &str) -> Option<String> {
    sums.lines().find_map(|l| {
        let mut it = l.split_whitespace();
        let hash = it.next()?;
        let name = it.next()?.trim_start_matches('*');
        (name == file && hash.len() == 64).then(|| hash.to_lowercase())
    })
}

fn agent() -> ureq::Agent {
    ureq::AgentBuilder::new().timeout_connect(std::time::Duration::from_secs(15)).timeout_read(std::time::Duration::from_secs(60)).build()
}

/// Unzip the package with Windows' tar.exe and return the verified installer path.
fn extract_installer(zip: &std::path::Path, dir: &std::path::Path) -> Result<std::path::PathBuf, String> {
    let out = dir.join("paquete");
    std::fs::create_dir_all(&out).map_err(|e| e.to_string())?;
    let tar = std::env::var_os("SystemRoot").map(|r| std::path::PathBuf::from(r).join("System32").join("tar.exe")).unwrap_or_else(|| "tar.exe".into());
    let st = std::process::Command::new(tar).arg("-xf").arg(zip).arg("-C").arg(&out).status().map_err(|e| format!("No se pudo descomprimir: {e}"))?;
    if !st.success() { return Err("No se pudo descomprimir el paquete de actualización".into()); }
    let sums = std::fs::read_to_string(out.join("SHA256SUMS.txt")).map_err(|_| "El paquete no incluye SHA256SUMS.txt")?;
    let exe = std::fs::read_dir(&out).map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .find(|n| n.to_lowercase().ends_with("-setup.exe"))
        .ok_or("El paquete no incluye el instalador")?;
    let expected = expected_hash(&sums, &exe).ok_or("El instalador no figura en SHA256SUMS.txt")?;
    let path = out.join(&exe);
    let got = format!("{:x}", Sha256::digest(std::fs::read(&path).map_err(|e| e.to_string())?));
    if got != expected { return Err("La verificación SHA-256 del instalador falló".into()); }
    Ok(path)
}

#[tauri::command]
pub async fn check_update(app: AppHandle, include_prerelease: bool) -> Result<Option<UpdateInfo>, String> {
    let current = app.package_info().version.to_string();
    tauri::async_runtime::spawn_blocking(move || {
        let url = format!("https://api.github.com/repos/{REPO}/releases?per_page=20");
        let body = agent()
            .get(&url)
            .set("User-Agent", UA)
            .set("Accept", "application/vnd.github+json")
            .call()
            .map_err(|e| format!("No se pudo consultar GitHub: {e}"))?
            .into_string()
            .map_err(|e| e.to_string())?;
        let releases: Vec<GhRelease> = serde_json::from_str(&body).map_err(|e| format!("Respuesta no válida: {e}"))?;
        Ok(pick_update(&releases, &current, include_prerelease))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn install_update(app: AppHandle, info: UpdateInfo) -> Result<(), String> {
    let handle = app.clone();
    let path = tauri::async_runtime::spawn_blocking(move || -> Result<std::path::PathBuf, String> {
        if !info.installer_url.starts_with("https://github.com/") && !info.installer_url.starts_with("https://objects.githubusercontent.com/") {
            return Err("Origen de descarga no permitido".into());
        }
        let expected = info.sha256.clone().filter(|h| h.len() == 64).ok_or("GitHub no informó la suma SHA-256 del paquete; no se puede verificar la descarga")?;

        let resp = agent().get(&info.installer_url).set("User-Agent", UA).call().map_err(|e| format!("Error al descargar: {e}"))?;
        let total = resp.header("Content-Length").and_then(|v| v.parse().ok()).unwrap_or(info.installer_size);
        let dir = std::env::temp_dir().join("monto-update");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let path = dir.join(&info.installer_name);
        let mut file = std::fs::File::create(&path).map_err(|e| e.to_string())?;
        let mut reader = resp.into_reader();
        let mut hasher = Sha256::new();
        let mut buf = vec![0u8; 64 * 1024];
        let mut downloaded = 0u64;
        let mut last = 0u64;
        loop {
            let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
            if n == 0 { break; }
            hasher.update(&buf[..n]);
            file.write_all(&buf[..n]).map_err(|e| e.to_string())?;
            downloaded += n as u64;
            if downloaded - last > 256 * 1024 || downloaded == total {
                last = downloaded;
                let _ = handle.emit("update://progress", Progress { downloaded, total });
            }
        }
        file.flush().map_err(|e| e.to_string())?;
        drop(file);
        let got = format!("{:x}", hasher.finalize());
        if got != expected {
            let _ = std::fs::remove_file(&path);
            return Err("La verificación SHA-256 falló: la descarga está dañada o fue alterada".into());
        }
        extract_installer(&path, &dir)
    })
    .await
    .map_err(|e| e.to_string())??;

    // Passive mode: progress bar without questions; data in %APPDATA% is kept.
    std::process::Command::new(&path).arg("/P").spawn().map_err(|e| format!("No se pudo iniciar el instalador: {e}"))?;
    if let Some(w) = app.get_webview_window("main") { let _ = w.hide(); }
    app.exit(0);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rel(tag: &str, pre: bool, assets: &[&str]) -> GhRelease {
        GhRelease {
            tag_name: tag.into(), name: None, body: Some(format!("notas {tag}")), prerelease: pre, draft: false, published_at: None, html_url: String::new(),
            assets: assets.iter().map(|a| GhAsset { name: a.to_string(), browser_download_url: format!("https://github.com/x/{a}"), size: 1, digest: Some(format!("sha256:{}", "A".repeat(64))) }).collect(),
        }
    }

    #[test]
    fn picks_newest_stable_or_beta() {
        let rs = vec![
            rel("v0.4.8-beta.2", true, &["Monto_0.4.8-beta.2_x64.zip"]),
            rel("v0.4.8-beta.3", true, &["Monto_0.4.8-beta.3_x64.zip"]),
            rel("v0.5.0", false, &["Monto_0.5.0_x64.zip"]),
            rel("v0.6.0", false, &["notes.txt", "Monto_0.6.0_x64-setup.exe"]),
        ];
        assert_eq!(pick_update(&rs, "0.4.8-beta.2", true).unwrap().version, "0.5.0");
        assert_eq!(pick_update(&rs[..2], "0.4.8-beta.2", true).unwrap().version, "0.4.8-beta.3");
        assert!(pick_update(&rs[..2], "0.4.8-beta.2", false).is_none());
        assert!(pick_update(&rs, "0.5.0", true).is_none());
        let u = pick_update(&rs, "0.4.8-beta.2", false).unwrap();
        assert_eq!(u.sha256.as_deref(), Some("a".repeat(64).as_str()));
        assert_eq!(u.installer_name, "Monto_0.5.0_x64.zip");
    }

    #[test]
    fn stable_is_newer_than_its_beta() {
        let rs = vec![rel("v0.4.8", false, &["Monto_0.4.8_x64.zip"])];
        assert!(pick_update(&rs, "0.4.8-beta.2", false).is_some());
    }

    #[test]
    fn reads_sha256sums() {
        let h = "a".repeat(64);
        let sums = format!("{h}  Monto_0.5.0_x64-setup.exe\r\n{}  other.msi\n", "b".repeat(64));
        assert_eq!(expected_hash(&sums, "Monto_0.5.0_x64-setup.exe").as_deref(), Some(h.as_str()));
        assert!(expected_hash(&sums, "missing.exe").is_none());
    }

    #[cfg(windows)]
    #[test]
    fn extracts_and_verifies_installer_from_zip() {
        let dir = std::env::temp_dir().join(format!("monto-zip-test-{}", std::process::id()));
        let src = dir.join("src");
        std::fs::create_dir_all(&src).unwrap();
        let exe = b"fake installer";
        std::fs::write(src.join("Monto_9.9.9_x64-setup.exe"), exe).unwrap();
        std::fs::write(src.join("LEEME.txt"), "hola").unwrap();
        let hash = format!("{:x}", Sha256::digest(exe));
        std::fs::write(src.join("SHA256SUMS.txt"), format!("{hash}  Monto_9.9.9_x64-setup.exe
")).unwrap();
        let zip = dir.join("Monto_9.9.9_x64.zip");
        let st = std::process::Command::new("tar").args(["-a", "-c", "-f"]).arg(&zip).arg("-C").arg(&src).args(["Monto_9.9.9_x64-setup.exe", "SHA256SUMS.txt", "LEEME.txt"]).status().unwrap();
        assert!(st.success());
        let path = extract_installer(&zip, &dir.join("ok")).unwrap();
        assert_eq!(std::fs::read(&path).unwrap(), exe);

        // A tampered installer must be rejected.
        std::fs::write(src.join("Monto_9.9.9_x64-setup.exe"), b"tampered").unwrap();
        let bad = dir.join("bad.zip");
        std::process::Command::new("tar").args(["-a", "-c", "-f"]).arg(&bad).arg("-C").arg(&src).args(["Monto_9.9.9_x64-setup.exe", "SHA256SUMS.txt"]).status().unwrap();
        assert!(extract_installer(&bad, &dir.join("bad")).is_err());
        let _ = std::fs::remove_dir_all(&dir);
    }
}
