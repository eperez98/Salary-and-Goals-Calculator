//! Monto desktop shell.
//!
//! The whole application (UI + SQLite engine compiled to WebAssembly) runs in
//! the WebView. The Rust side only provides native capabilities: file access
//! restricted to the app data folder and user-chosen files, native dialogs,
//! a single-instance guard so two windows never write the same database, and
//! opt-in updates from GitHub Releases verified with SHA-256 (see `updater`).

mod updater;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![updater::check_update, updater::install_update])
        .setup(|app| {
            // Make sure the data folder exists before the UI asks for it.
            if let Ok(dir) = app.path().app_data_dir() {
                let _ = std::fs::create_dir_all(dir.join("backups"));
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error al iniciar Monto");
}
