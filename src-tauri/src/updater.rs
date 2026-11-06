//! In-app updates from GitHub Releases.
//!
//! * `check_update` asks the GitHub Releases API for the newest version
//!   (optionally including Beta pre-releases) and compares it with the
//!   running version using SemVer.
//! * `install_update` downloads the NSIS installer, verifies its SHA-256
//!   against the `SHA256SUMS.txt` published with the release, launches it
//!   and closes Monto so files can be replaced. User data lives in
//!   %APPDATA% and is never touched by the installer.
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
    pub sums_url: Option<String>,
}

#[derive(Serialize, Clone)]
struct Progress {
    downloaded: u64,
    total: u64,
}

fn parse_tag(tag: &str) -> Option<Version> {
    Version::parse(tag.trim().trim_start_matches(['v', 'V'])).ok()
}

/// Pick the newest release newer than `current` that ships a Windows installer.
pub fn pick_update(releases: &[GhRelease], current: &str, include_prerelease: bool) -> Option<UpdateInfo> {
    let cur = Version::parse(current).ok()?;
    releases
        .iter()
        .filter(|r| !r.draft && (include_prerelease || !r.prerelease))
        .filter_map(|r| parse_tag(&r.tag_name).map(|v| (v, r)))
        .filter(|(v, _)| *v > cur)
        .filter_map(|(v, r)| {
            let inst = r.assets.iter().find(|a| a.name.to_lowercase().ends_with("-setup.exe"))?;
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
            sums_url: r.assets.iter().find(|a| a.name == "SHA256SUMS.txt").map(|a| a.browser_download_url.clone()),
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
        let sums_url = info.sums_url.clone().ok_or("La versión no publica SHA256SUMS.txt; no se puede verificar la descarga")?;
        let sums = agent().get(&sums_url).set("User-Agent", UA).call().map_err(|e| e.to_string())?.into_string().map_err(|e| e.to_string())?;
        let expected = expected_hash(&sums, &info.installer_name).ok_or("El instalador no figura en SHA256SUMS.txt")?;

        let resp = agent().get(&info.installer_url).set("User-Agent", UA).call().map_err(|e| format!("Error al descargar: {e}"))?;
        let total = resp.header("Content-Length").and_then(|v| v.parse().ok()).unwrap_or(info.installer_size);
        let dir = std::env::temp_dir().join("monto-update");
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
        Ok(path)
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
            assets: assets.iter().map(|a| GhAsset { name: a.to_string(), browser_download_url: format!("https://github.com/x/{a}"), size: 1 }).collect(),
        }
    }

    #[test]
    fn picks_newest_stable_or_beta() {
        let rs = vec![
            rel("v0.4.8-beta.2", true, &["Monto_0.4.8-beta.2_x64-setup.exe", "SHA256SUMS.txt"]),
            rel("v0.4.8-beta.3", true, &["Monto_0.4.8-beta.3_x64-setup.exe", "SHA256SUMS.txt"]),
            rel("v0.5.0", false, &["Monto_0.5.0_x64-setup.exe", "SHA256SUMS.txt"]),
            rel("v0.6.0", false, &["notes.txt"]),
        ];
        assert_eq!(pick_update(&rs, "0.4.8-beta.2", true).unwrap().version, "0.5.0");
        assert_eq!(pick_update(&rs[..2], "0.4.8-beta.2", true).unwrap().version, "0.4.8-beta.3");
        assert!(pick_update(&rs[..2], "0.4.8-beta.2", false).is_none());
        assert!(pick_update(&rs, "0.5.0", true).is_none());
        let u = pick_update(&rs, "0.4.8-beta.2", false).unwrap();
        assert!(u.sums_url.is_some());
        assert!(u.installer_name.ends_with("-setup.exe"));
    }

    #[test]
    fn stable_is_newer_than_its_beta() {
        let rs = vec![rel("v0.4.8", false, &["Monto_0.4.8_x64-setup.exe"])];
        assert!(pick_update(&rs, "0.4.8-beta.2", false).is_some());
    }

    #[test]
    fn reads_sha256sums() {
        let h = "a".repeat(64);
        let sums = format!("{h}  Monto_0.5.0_x64-setup.exe\r\n{}  other.msi\n", "b".repeat(64));
        assert_eq!(expected_hash(&sums, "Monto_0.5.0_x64-setup.exe").as_deref(), Some(h.as_str()));
        assert!(expected_hash(&sums, "missing.exe").is_none());
    }
}
