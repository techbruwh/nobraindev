// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod models;
mod commands;
mod search;

use std::sync::Mutex;

pub struct AppState {
    db: Mutex<database::Database>,
    search_engine: Mutex<Option<search::SearchEngine>>,
}

fn main() {
    let db = database::Database::new().expect("Failed to initialize database");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState {
            db: Mutex::new(db),
            search_engine: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_snippet,
            commands::get_all_snippets,
            commands::get_snippet,
            commands::update_snippet,
            commands::delete_snippet,
            commands::search_snippets,
            commands::semantic_search,
            commands::download_model,
            commands::get_model_status,
            commands::load_model,
            commands::regenerate_embeddings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}