// Hide the extra console window on Windows release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod soundcloud;

use std::collections::HashMap;

use soundcloud::SoundCloud;
use tauri::{ipc::Response, State};

/// Generic api-v2 GET (search, users, playlists, comments, `next_href` pages...).
#[tauri::command]
async fn api(sc: State<'_, SoundCloud>, url: String, query: HashMap<String, String>) -> Result<serde_json::Value, String> {
    sc.api(&url, &query).await.map_err(|e| e.to_string())
}

/// Returns the whole audio file as raw bytes; the webview plays it from a Blob URL.
#[tauri::command]
async fn stream(sc: State<'_, SoundCloud>, track_id: u64) -> Result<Response, String> {
    sc.audio(track_id).await.map(Response::new).map_err(|e| e.to_string())
}

#[tauri::command]
async fn waveform(sc: State<'_, SoundCloud>, url: String) -> Result<serde_json::Value, String> {
    sc.waveform(&url).await.map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .manage(SoundCloud::new())
        .invoke_handler(tauri::generate_handler![api, stream, waveform])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
