import { supabase, isSupabaseConfigured } from './supabase'
import { invoke } from '@tauri-apps/api/core'

/**
 * Clipboard management service for NoBrainDev
 * Handles clipboard history, sync, and snippet conversion
 */
export class ClipboardService {
  constructor() {
    this.maxHistory = 100
    this.lastSyncTime = null
  }

  /**
   * Save clipboard entry to local database
   */
  async saveClipboardEntry(content, metadata = {}) {
    try {
      const entry = {
        content,
        source: metadata.source || 'system',
        category: metadata.category || 'general',
        created_at: new Date().toISOString(),
      }

      const result = await invoke('save_clipboard_entry', {
        content: entry.content,
        source: entry.source,
        category: entry.category,
        createdAt: entry.created_at,
      })

      return result
    } catch (error) {
      console.error('Failed to save clipboard entry:', error)
      throw error
    }
  }

  /**
   * Get clipboard history from local database
   */
  async getClipboardHistory(limit = 100) {
    try {
      const history = await invoke('get_clipboard_history', { limit })
      return history || []
    } catch (error) {
      console.error('Failed to get clipboard history:', error)
      return []
    }
  }

  /**
   * Delete clipboard entry
   */
  async deleteClipboardEntry(entryId) {
    try {
      await invoke('delete_clipboard_entry', { id: entryId })
    } catch (error) {
      console.error('Failed to delete clipboard entry:', error)
      throw error
    }
  }

  /**
   * Clear all clipboard history
   */
  async clearClipboardHistory() {
    try {
      await invoke('clear_clipboard_history')
    } catch (error) {
      console.error('Failed to clear clipboard history:', error)
      throw error
    }
  }

  /**
   * Convert clipboard entry to snippet
   */
  async convertToSnippet(entryId, snippetData) {
    try {
      console.log('🔄 [ClipboardService] Converting clipboard entry to snippet')
      console.log('Entry ID:', entryId)
      console.log('Snippet data:', snippetData)

      const snippet = {
        title: snippetData.title || 'Untitled',
        language: snippetData.language || 'text',
        content: snippetData.content,
        tags: snippetData.tags || [],
        description: snippetData.description || 'Converted from clipboard',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      console.log('Prepared snippet object:', snippet)

      // Create snippet via Tauri backend - pass as single snippet object
      const now = new Date().toISOString()
      const payload = {
        snippet: {
          id: null,
          title: snippet.title,
          language: snippet.language,
          content: snippet.content,
          tags: snippet.tags.join(','),
          description: snippet.description,
          created_at: now,
          updated_at: now,
        }
      }

      console.log('🚀 Invoking create_snippet Tauri command with payload:', payload)

      const result = await invoke('create_snippet', payload)

      console.log('✅ [ClipboardService] Snippet created successfully:', result)

      // Mark as converted in clipboard (optional - keep the history)
      // await this.deleteClipboardEntry(entryId)

      return result
    } catch (error) {
      console.error('❌ [ClipboardService] Failed to convert to snippet:', error)
      console.error('Error details:', error.message, error.stack)
      throw error
    }
  }

  /**
   * Sync clipboard history to Supabase
   */
  async syncToCloud(userEmail) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured')
    }
    
    const { syncService } = await import('./sync')
    return await syncService.pushClipboardToCloud(userEmail)
  }

  /**
   * Pull clipboard history from Supabase
   */
  async pullFromCloud(userEmail) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured')
    }
    
    const { syncService } = await import('./sync')
    return await syncService.pullClipboardFromCloud(userEmail)
  }

  /**
   * Full sync: push and pull
   */
  async syncAll(userEmail) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured')
    }
    
    const { syncService } = await import('./sync')
    const result = await syncService.syncClipboardAll(userEmail)
    this.lastSyncTime = result.syncTime
    return result
  }

  /**
   * Search clipboard history
   */
  async searchHistory(query, limit = 50) {
    try {
      const history = await this.getClipboardHistory(limit)
      return history.filter(entry =>
        entry.content.toLowerCase().includes(query.toLowerCase())
      )
    } catch (error) {
      console.error('Failed to search clipboard history:', error)
      return []
    }
  }

  /**
   * Scan system clipboard and save if new content
   */
  async scanSystemClipboard() {
    try {
      // Get current clipboard content using Tauri command
      const clipboardText = await invoke('read_system_clipboard')
      
      if (!clipboardText || clipboardText.trim() === '') {
        return { isNew: false, message: 'Clipboard is empty' }
      }

      // Get existing history to check for duplicates
      const history = await this.getClipboardHistory(1)
      const lastEntry = history.length > 0 ? history[0] : null

      // Check if this is new content (not the same as the last entry)
      if (lastEntry && lastEntry.content === clipboardText) {
        return { isNew: false, message: 'Already saved' }
      }

      // Save the new clipboard content
      await this.saveClipboardEntry(clipboardText, {
        source: 'system',
        category: this.categorizeContent(clipboardText),
      })

      return { isNew: true, message: 'Clipboard scanned & saved', content: clipboardText }
    } catch (error) {
      console.error('Failed to scan clipboard:', error)
      throw new Error('Failed to read system clipboard: ' + (error.message || 'Unknown error'))
    }
  }

  /**
   * Auto-categorize clipboard content
   */
  categorizeContent(content) {
    if (content.startsWith('{') && content.endsWith('}')) {
      return 'json'
    }
    if (content.startsWith('http://') || content.startsWith('https://')) {
      return 'url'
    }
    if (content.includes('SELECT') || content.includes('INSERT') || content.includes('UPDATE')) {
      return 'sql'
    }
    if (content.includes('{') || content.includes('}') || content.includes('function') || content.includes('const ')) {
      return 'code'
    }
    if (content.includes('<') && content.includes('>')) {
      return 'code'
    }
    return 'general'
  }
}

// Export singleton instance
export const clipboardService = new ClipboardService()
