use keyring::Entry;

const SERVICE_NAME: &str = "com.techbruwh.nobraindev";

/// Store a user token securely in the OS keychain
#[tauri::command]
pub async fn store_user_token(key: String, token: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &key)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    
    entry
        .set_password(&token)
        .map_err(|e| format!("Failed to store token: {}", e))?;
    
    Ok(())
}

/// Get a user token from the OS keychain
#[tauri::command]
pub async fn get_user_token(key: String) -> Result<String, String> {
    let entry = Entry::new(SERVICE_NAME, &key)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    
    entry
        .get_password()
        .map_err(|e| format!("Failed to retrieve token: {}", e))
}

/// Clear all user tokens from the OS keychain
#[tauri::command]
pub async fn clear_user_tokens() -> Result<(), String> {
    let keys = vec!["access_token", "refresh_token", "user_email"];
    
    for key in keys {
        if let Ok(entry) = Entry::new(SERVICE_NAME, key) {
            // Ignore errors if token doesn't exist
            let _ = entry.delete_credential();
        }
    }
    
    Ok(())
}

/// Check if user is authenticated (has stored tokens)
#[tauri::command]
pub async fn is_authenticated() -> Result<bool, String> {
    match Entry::new(SERVICE_NAME, "access_token") {
        Ok(entry) => Ok(entry.get_password().is_ok()),
        Err(_) => Ok(false),
    }
}

/// Get user email from secure storage
#[tauri::command]
pub async fn get_user_email() -> Result<Option<String>, String> {
    match Entry::new(SERVICE_NAME, "user_email") {
        Ok(entry) => match entry.get_password() {
            Ok(email) => Ok(Some(email)),
            Err(_) => Ok(None),
        },
        Err(_) => Ok(None),
    }
}
