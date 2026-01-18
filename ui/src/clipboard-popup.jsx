import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClipboardPopup } from './components/ui/clipboardpopup'
import './index.css'
import './tiptap.css'
import { invoke } from '@tauri-apps/api/core'

// Toast notification function for the popup window
function showToast(message, type = 'info') {
  // For now, just log to console
  // Could be enhanced to show actual toast notifications
  console.log(`[${type}] ${message}`)
}

// Callback when a clipboard entry is converted to snippet
function handleConvertToSnippet() {
  console.log('Clipboard entry converted to snippet')
  // The main app will handle reloading snippets
  // The popup window doesn't need to do anything else
}

// Mount the ClipboardPopup component
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClipboardPopup
      isOpen={true}
      onClose={() => {
        // Hide the popup window when closed
        invoke('hide_clipboard_popup').catch(console.error)
      }}
      showToast={showToast}
      onConvertToSnippet={handleConvertToSnippet}
    />
  </React.StrictMode>,
)

// Log when the popup window is ready
console.log('📋 Clipboard popup window ready')
