use tauri::State;

use crate::models::{ModelInfo, SearchResult, Snippet};
use crate::search::{get_models_dir, SearchEngine};
use crate::search::download_model as download_model_internal;
use crate::AppState;
use std::sync::Mutex;

// Global state to store the previous application
static PREVIOUS_APP: Mutex<Option<String>> = Mutex::new(None);

#[tauri::command]
pub fn create_snippet(state: State<AppState>, snippet: Snippet) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let snippet_id = db.create_snippet(&snippet).map_err(|e| e.to_string())?;

    // Generate and store embedding if model is loaded
    let search_engine = state.search_engine.lock().map_err(|e| e.to_string())?;
    if let Some(engine) = search_engine.as_ref() {
        let mut snippet_with_id = snippet.clone();
        snippet_with_id.id = Some(snippet_id);
        
        let text = SearchEngine::generate_snippet_text(&snippet_with_id);
        match engine.generate_embedding(&text) {
            Ok(embedding) => {
                let _ = db.store_embedding(snippet_id, &embedding);
            }
            Err(e) => {
                eprintln!("Failed to generate embedding: {}", e);
            }
        }
    }

    Ok(snippet_id)
}

#[tauri::command]
pub fn get_all_snippets(state: State<AppState>) -> Result<Vec<Snippet>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_all_snippets().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_snippet(state: State<AppState>, id: i64) -> Result<Option<Snippet>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_snippet(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_snippet(state: State<AppState>, id: i64, snippet: Snippet) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_snippet(id, &snippet).map_err(|e| e.to_string())?;

    // Regenerate embedding if model is loaded
    let search_engine = state.search_engine.lock().map_err(|e| e.to_string())?;
    if let Some(engine) = search_engine.as_ref() {
        let mut snippet_with_id = snippet.clone();
        snippet_with_id.id = Some(id);
        
        let text = SearchEngine::generate_snippet_text(&snippet_with_id);
        match engine.generate_embedding(&text) {
            Ok(embedding) => {
                let _ = db.store_embedding(id, &embedding);
            }
            Err(e) => {
                eprintln!("Failed to generate embedding: {}", e);
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn delete_snippet(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_snippet(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_snippets(state: State<AppState>, query: String) -> Result<Vec<Snippet>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.search_snippets(&query).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn semantic_search(
    state: State<AppState>,
    query: String,
) -> Result<Vec<SearchResult>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let search_engine = state.search_engine.lock().map_err(|e| e.to_string())?;

    let snippets = db.get_all_snippets().map_err(|e| e.to_string())?;

    if let Some(engine) = search_engine.as_ref() {
        // Get all stored embeddings
        let embeddings = db.get_all_embeddings().map_err(|e| e.to_string())?;
        
        engine
            .semantic_search(&query, &snippets, &embeddings)
            .map_err(|e| e.to_string())
    } else {
        // Fallback to regular search if no model is loaded
        let results = db
            .search_snippets(&query)
            .map_err(|e| e.to_string())?
            .into_iter()
            .map(|snippet| SearchResult {
                snippet,
                score: 1.0,
                highlight: None,
            })
            .collect();
        Ok(results)
    }
}

#[tauri::command]
pub async fn download_model(_model_url: String, _model_name: String) -> Result<String, String> {
    // Download the model (without progress callback for now)
    let (model_path, _tokenizer_path) = download_model_internal("", "", None)
        .await
        .map_err(|e| e.to_string())?;

    Ok(format!(
        "Model downloaded successfully to: {}",
        model_path.display()
    ))
}

#[tauri::command]
pub fn get_model_status(state: State<AppState>) -> Result<ModelInfo, String> {
    let search_engine = state.search_engine.lock().map_err(|e| e.to_string())?;

    let models_dir = get_models_dir().map_err(|e| e.to_string())?;
    let model_dir = models_dir.join("all-MiniLM-L6-v2");
    let model_path = model_dir.join("model.onnx");
    let tokenizer_path = model_dir.join("tokenizer.json");

    let downloaded = model_path.exists() && tokenizer_path.exists();
    let size = if downloaded {
        std::fs::metadata(&model_path)
            .ok()
            .map(|m| m.len())
    } else {
        None
    };

    Ok(ModelInfo {
        name: "all-MiniLM-L6-v2".to_string(),
        path: if downloaded {
            Some(model_path.to_string_lossy().to_string())
        } else {
            None
        },
        size,
        downloaded,
        loaded: search_engine.as_ref().map(|e| e.is_loaded()).unwrap_or(false),
    })
}

#[tauri::command]
pub async fn load_model(state: State<'_, AppState>) -> Result<(), String> {
    let models_dir = get_models_dir().map_err(|e| e.to_string())?;
    let model_dir = models_dir.join("all-MiniLM-L6-v2");
    let model_path = model_dir.join("model.onnx");
    let tokenizer_path = model_dir.join("tokenizer.json");

    // Check if model exists, download if not
    if !model_path.exists() || !tokenizer_path.exists() {
        download_model_internal("", "", None)
            .await
            .map_err(|e| e.to_string())?;
    }

    // Load the model
    let engine = SearchEngine::new(model_path, tokenizer_path).map_err(|e| e.to_string())?;

    // Generate embeddings for all existing snippets
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let snippets = db.get_all_snippets().map_err(|e| e.to_string())?;

    for snippet in snippets {
        if let Some(id) = snippet.id {
            // Check if embedding already exists
            if db.get_embedding(id).map_err(|e| e.to_string())?.is_none() {
                let text = SearchEngine::generate_snippet_text(&snippet);
                if let Ok(embedding) = engine.generate_embedding(&text) {
                    let _ = db.store_embedding(id, &embedding);
                }
            }
        }
    }

    // Store the engine
    let mut search_engine = state.search_engine.lock().map_err(|e| e.to_string())?;
    *search_engine = Some(engine);

    Ok(())
}

#[tauri::command]
pub async fn regenerate_embeddings(state: State<'_, AppState>) -> Result<String, String> {
    let search_engine = state.search_engine.lock().map_err(|e| e.to_string())?;
    
    if search_engine.is_none() {
        return Err("Model not loaded. Please load the model first.".to_string());
    }

    let engine = search_engine.as_ref().unwrap();
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let snippets = db.get_all_snippets().map_err(|e| e.to_string())?;

    let mut count = 0;
    for snippet in snippets {
        if let Some(id) = snippet.id {
            let text = SearchEngine::generate_snippet_text(&snippet);
            if let Ok(embedding) = engine.generate_embedding(&text) {
                db.store_embedding(id, &embedding).map_err(|e| e.to_string())?;
                count += 1;
            }
        }
    }

    Ok(format!("Regenerated {} embeddings", count))
}

// Clipboard management commands

#[tauri::command]
pub fn read_system_clipboard() -> Result<String, String> {
    let mut clipboard = arboard::Clipboard::new()
        .map_err(|e| format!("Failed to access clipboard: {}", e))?;
    
    clipboard.get_text()
        .map_err(|e| format!("Failed to read clipboard: {}", e))
}

#[tauri::command]
pub fn save_clipboard_entry(
    state: State<AppState>,
    content: String,
    source: String,
    category: String,
    created_at: Option<String>,
) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let timestamp = created_at.unwrap_or_else(|| chrono::Utc::now().to_rfc3339());
    db.save_clipboard_entry(&content, &source, &category, &timestamp)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_clipboard_history(state: State<AppState>, limit: i64) -> Result<Vec<crate::models::ClipboardEntry>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_clipboard_history(limit).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_clipboard_entry(state: State<AppState>, id: i64) -> Result<Option<crate::models::ClipboardEntry>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_clipboard_entry(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_clipboard_entry(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_clipboard_entry(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_clipboard_history(state: State<AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.clear_clipboard_history().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_clipboard_entry(
    state: State<AppState>,
    id: i64,
    content: String,
    source: String,
    category: String,
    updated_at: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_clipboard_entry(id, &content, &source, &category, &updated_at)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn show_clipboard_popup(app_handle: tauri::AppHandle) -> Result<(), String> {
    use tauri::{Emitter, Manager};

    println!("📋 Showing clipboard popup window");

    // Capture the previous application BEFORE showing the popup
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        let script = r#"
        tell application "System Events"
            set frontApp to first application process whose frontmost is true
            set bundleId to bundle identifier of frontApp
            return bundleId
        end tell
        "#;

        if let Ok(output) = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
        {
            let bundle_id = String::from_utf8_lossy(&output.stdout).trim().to_string();
            println!("🔍 AppleScript captured bundle ID: '{}'", bundle_id);

            // Store the bundle ID if it's not nobraindev and not empty
            if !bundle_id.contains("nobraindev") && !bundle_id.is_empty() {
                if let Ok(mut prev_app) = PREVIOUS_APP.lock() {
                    *prev_app = Some(bundle_id.clone());
                    println!("✅ Captured previous app BEFORE popup opens: {}", bundle_id);
                }
            } else if bundle_id.contains("nobraindev") {
                println!("⚠️  Detected nobraindev, not storing as previous app");
            }
        } else {
            println!("⚠️  Failed to execute AppleScript to capture previous app");
        }
    }

    // Try to get both the main window and clipboard popup window
    let main_window = app_handle.get_webview_window("main");
    let clipboard_popup = app_handle.get_webview_window("clipboard-popup");

    if let (Some(main_window), Some(clipboard_popup)) = (main_window, clipboard_popup) {
        // Get current mouse cursor position from the main window
        // This works better across multiple monitors
        let (cursor_x, cursor_y) = if let Ok(pos) = main_window.cursor_position() {
            let cursor_x = pos.x as i32;
            let cursor_y = pos.y as i32;
            println!("🖱️ Cursor position from main window: x={}, y={}", cursor_x, cursor_y);
            (cursor_x, cursor_y)
        } else {
            // Fallback: try to get from primary monitor
            println!("⚠️ Could not get cursor position from main window, using fallback");
            (100, 100) // Default fallback position
        };

        // Popup dimensions (must match tauri.conf.json)
        let popup_width = 570;
        let popup_height = 400;
        let offset = 15;

        // Find which monitor the cursor is on
        let target_monitor = if let Ok(monitors) = clipboard_popup.available_monitors() {
            monitors
                .into_iter()
                .find(|monitor| {
                    let monitor_pos = monitor.position();
                    let monitor_size = monitor.size();
                    cursor_x >= monitor_pos.x as i32
                        && cursor_x < (monitor_pos.x as i32 + monitor_size.width as i32)
                        && cursor_y >= monitor_pos.y as i32
                        && cursor_y < (monitor_pos.y as i32 + monitor_size.height as i32)
                })
                .or_else(|| {
                    // Fallback to primary monitor if cursor is not found on any monitor
                    clipboard_popup.primary_monitor().ok().flatten()
                })
        } else {
            clipboard_popup.primary_monitor().ok().flatten()
        };

        let monitor = match target_monitor {
            Some(m) => m,
            None => return Err("Failed to find monitor for cursor position".to_string()),
        };

        let screen_pos = monitor.position();
        let screen_size = monitor.size();

        println!("📺 Monitor position: x={}, y={}, size={}x{}",
            screen_pos.x, screen_pos.y, screen_size.width, screen_size.height);

        // Calculate monitor boundaries
        let monitor_left = screen_pos.x as i32;
        let monitor_right = screen_pos.x as i32 + screen_size.width as i32;
        let monitor_top = screen_pos.y as i32;
        let monitor_bottom = screen_pos.y as i32 + screen_size.height as i32;

        // Calculate popup position (below and right of cursor by default)
        let mut x = cursor_x + offset;
        let mut y = cursor_y + offset;

        // Adjust horizontal position if popup would go off right edge
        if x + popup_width > monitor_right {
            // Try to position to the left of the cursor
            x = cursor_x - popup_width - offset;
            // If that would go off the left edge, clamp to left edge
            if x < monitor_left {
                x = monitor_left;
            }
        }

        // Adjust horizontal position if popup would go off left edge
        if x < monitor_left {
            x = monitor_left;
        }

        // Final horizontal check to ensure it doesn't overflow right edge
        if x + popup_width > monitor_right {
            x = monitor_right - popup_width;
        }

        // Adjust vertical position if popup would go off bottom edge
        if y + popup_height > monitor_bottom {
            y = cursor_y - popup_height - offset;
            // If that would go off the top edge, clamp to top edge
            if y < monitor_top {
                y = monitor_top;
            }
        }

        // Adjust vertical position if popup would go off top edge
        if y < monitor_top {
            y = monitor_top;
        }

        // Final vertical check to ensure it doesn't overflow bottom edge
        if y + popup_height > monitor_bottom {
            y = monitor_bottom - popup_height;
        }

        println!("📍 Positioning popup at: x={}, y={}", x, y);

        clipboard_popup.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }))
            .map_err(|e| format!("Failed to set popup position: {}", e))?;

        // Show and focus the popup window
        clipboard_popup.show().map_err(|e| format!("Failed to show popup: {}", e))?;
        clipboard_popup.set_focus().map_err(|e| format!("Failed to focus popup: {}", e))?;

        // Emit an event to trigger clipboard refresh in the popup
        let _ = clipboard_popup.emit("clipboard-popup-triggered", ());

        println!("✅ Clipboard popup window shown and refresh triggered");
        Ok(())
    } else {
        Err("Could not find main window or clipboard popup window".to_string())
    }
}

#[tauri::command]
pub fn hide_clipboard_popup(app_handle: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;

    println!("📋 Hiding clipboard popup window");

    // Try to get the clipboard popup window
    if let Some(clipboard_popup) = app_handle.get_webview_window("clipboard-popup") {
        // Hide the popup window
        clipboard_popup.hide().map_err(|e| format!("Failed to hide popup: {}", e))?;
        println!("✅ Clipboard popup window hidden");
        Ok(())
    } else {
        Err("Clipboard popup window not found".to_string())
    }
}

#[tauri::command]
pub fn register_clipboard_hotkey(app_handle: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

    // List of fallback shortcuts to try, in order of preference
    let shortcuts_to_try = vec![
        "Cmd+Shift+C",  // Most unique and macOS-specific
        "Cmd+Option+C",
        "Cmd+Ctrl+C",
        "F6",
        "F7",
    ];

    let shortcuts = app_handle.global_shortcut();
    let mut registered_shortcut: Option<String> = None;

    for shortcut_str in shortcuts_to_try {
        println!("🔑 Attempting to register global shortcut: {}", shortcut_str);

        // Check if already registered to avoid duplicates
        if shortcuts.is_registered(shortcut_str) {
            println!("ℹ️  Shortcut '{}' is already registered, trying next...", shortcut_str);
            continue;
        }

        // Try to register the global shortcut with event handler in one call
        let app_handle_clone = app_handle.clone();
        let shortcut_str_clone = shortcut_str.to_string();

        match shortcuts.on_shortcut(shortcut_str, move |_app, _shortcut, event| {
            println!("⚡ Shortcut event received! State: {:?}", event.state);
            if event.state == ShortcutState::Pressed {
                println!("🎯 Global shortcut '{}' pressed!", shortcut_str_clone);

                // Show the clipboard popup window directly
                match show_clipboard_popup(app_handle_clone.clone()) {
                    Ok(_) => println!("✅ Clipboard popup window opened"),
                    Err(e) => println!("❌ Failed to show clipboard popup: {}", e),
                }
            }
        }) {
            Ok(_) => {
                println!("✅ Successfully registered global shortcut with listener: {}", shortcut_str);
                registered_shortcut = Some(shortcut_str.to_string());
                break;
            }
            Err(e) => {
                println!("⚠️  Failed to register shortcut '{}': {}", shortcut_str, e);
                // Try the next shortcut in the list
            }
        }
    }

    let _shortcut_str = registered_shortcut.ok_or_else(|| {
        "Failed to register any global shortcut. Tried: Cmd+Shift+C, Cmd+Option+C, Cmd+Ctrl+C, F6, F7. \
         You may need to grant accessibility permissions or close conflicting applications.".to_string()
    })?;

    println!("✅ Global clipboard hotkey registration complete");

    Ok(())
}

/// Capture the name of the current frontmost application (called before popup opens)
#[tauri::command]
pub fn capture_previous_app() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        // Get the current frontmost application
        let script = r#"
        tell application "System Events"
            set frontApp to name of first application process whose frontmost is true
            return frontApp
        end tell
        "#;

        let output = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| format!("Failed to capture previous app: {}", e))?;

        let app_name = String::from_utf8_lossy(&output.stdout).trim().to_string();

        // Store it if it's not nobraindev
        if !app_name.contains("nobraindev") && !app_name.is_empty() {
            let mut prev_app = PREVIOUS_APP.lock().map_err(|e| e.to_string())?;
            *prev_app = Some(app_name.clone());
            println!("✅ Captured previous app: {}", app_name);
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        // For Windows/Linux, we'll use a simpler approach
        // Just store None and let the paste logic handle it
        println!("⚠️  capture_previous_app not fully implemented for this platform");
    }

    Ok(())
}

/// Paste content from clipboard to active cursor position
#[tauri::command]
pub fn paste_to_cursor() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        // Get the stored previous app (bundle ID)
        let previous_app = {
            let prev_app = PREVIOUS_APP.lock().map_err(|e| e.to_string())?;
            prev_app.clone()
        };

        // If we have a stored previous app, switch to it and paste
        if let Some(bundle_id) = previous_app {
            println!("🎯 Pasting to previous app: {}", bundle_id);

            // Switch to the previous app using bundle ID and paste in one AppleScript
            let script = format!(
                r#"
                tell application id "{}"
                    activate
                end tell
                tell application "System Events"
                    keystroke "v" using command down
                end tell
                "#,
                bundle_id
            );

            Command::new("osascript")
                .arg("-e")
                .arg(&script)
                .output()
                .map_err(|e| format!("Failed to paste: {}", e))?;
        } else {
            println!("⚠️  No previous app stored");

            // Fallback: just paste
            let paste_script = r#"
            tell application "System Events"
                keystroke "v" using command down
            end tell
            "#;

            Command::new("osascript")
                .arg("-e")
                .arg(paste_script)
                .output()
                .map_err(|e| format!("Failed to paste: {}", e))?;
        }

        // Clear the stored app after pasting
        let mut prev_app = PREVIOUS_APP.lock().map_err(|e| e.to_string())?;
        *prev_app = None;
    }

    #[cfg(not(target_os = "macos"))]
    {
        use std::process::Command;
        use std::thread;
        use std::time::Duration;

        // Wait for the popup to close
        thread::sleep(Duration::from_millis(200));

        // For Windows/Linux, use platform-specific paste simulation
        #[cfg(target_os = "windows")]
        {
            // Windows: Use PowerShell to send Ctrl+V
            Command::new("powershell")
                .arg("-c")
                .arg("(New-Object -ComObject WScript.Shell).SendKeys('^{V}')")
                .output()
                .map_err(|e| format!("Failed to paste: {}", e))?;
        }

        #[cfg(target_os = "linux")]
        {
            // Linux: Use xdotool to send Ctrl+V
            Command::new("xdotool")
                .arg("key")
                .arg("ctrl+v")
                .output()
                .map_err(|e| format!("Failed to paste: {}", e))?;
        }
    }

    Ok(())
}

