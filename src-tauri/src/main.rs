// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod models;
mod commands;
mod search;
mod auth;
mod file_storage;

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
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
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
            commands::create_folder,
            commands::get_all_folders,
            commands::get_folder,
            commands::update_folder,
            commands::delete_folder,
            commands::get_snippets_by_folder,
            commands::update_snippet_folder,
            commands::organize_snippets,
            commands::read_system_clipboard,
            commands::save_clipboard_entry,
            commands::get_clipboard_history,
            commands::get_clipboard_entry,
            commands::delete_clipboard_entry,
            commands::clear_clipboard_history,
            commands::update_clipboard_entry,
            commands::show_clipboard_popup,
            commands::hide_clipboard_popup,
            commands::register_clipboard_hotkey,
            commands::capture_previous_app,
            commands::paste_to_cursor,
            commands::paste_as_plain_text,
            commands::get_app_version,
            commands::upload_file,
            commands::download_file,
            commands::update_file,
            commands::delete_file,
            commands::get_files_by_folder,
            commands::search_files,
            auth::store_user_token,
            auth::get_user_token,
            auth::clear_user_tokens,
            auth::is_authenticated,
            auth::get_user_email,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}