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
      const snippet = {
        title: snippetData.title || 'Untitled',
        language: snippetData.language || 'text',
        content: snippetData.content,
        tags: snippetData.tags || [],
        description: snippetData.description || 'Converted from clipboard',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Create snippet via Tauri backend - pass as single snippet object
      const now = new Date().toISOString()
      const result = await invoke('create_snippet', {
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
      })

      // Mark as converted in clipboard (optional - keep the history)
      // await this.deleteClipboardEntry(entryId)

      return result
    } catch (error) {
      console.error('Failed to convert to snippet:', error)
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

    if (!userEmail) {
      throw new Error('User email required for sync')
    }

    try {
      // Get all local clipboard entries
      const localEntries = await this.getClipboardHistory(this.maxHistory)

      if (!localEntries || localEntries.length === 0) {
        console.log('No local clipboard entries to sync')
        return { pushed: 0, updated: 0, errors: 0 }
      }

      let pushed = 0
      let updated = 0
      let errors = 0

      // Push each entry to Supabase
      for (const entry of localEntries) {
        try {
          // Check if entry already exists in cloud
          const { data: existing, error: fetchError } = await supabase
            .from('clipboard_history')
            .select('id, updated_at')
            .eq('user_email', userEmail)
            .eq('local_id', entry.id)
            .single()

          if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError
          }

          if (existing) {
            // Update existing entry
            const { error: updateError } = await supabase
              .from('clipboard_history')
              .update({
                content: entry.content,
                source: entry.source,
                category: entry.category,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id)

            if (updateError) throw updateError
            updated++
          } else {
            // Insert new entry
            const { error: insertError } = await supabase
              .from('clipboard_history')
              .insert({
                user_email: userEmail,
                local_id: entry.id,
                content: entry.content,
                source: entry.source,
                category: entry.category,
                created_at: entry.created_at,
              })

            if (insertError) throw insertError
            pushed++
          }
        } catch (error) {
          console.error(`Failed to sync clipboard entry ${entry.id}:`, error)
          errors++
        }
      }

      this.lastSyncTime = new Date()
      return { pushed, updated, errors }
    } catch (error) {
      console.error('Sync failed:', error)
      throw error
    }
  }

  /**
   * Pull clipboard history from Supabase
   */
  async pullFromCloud(userEmail) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured')
    }

    if (!userEmail) {
      throw new Error('User email required for sync')
    }

    try {
      // Get all cloud entries
      const { data: cloudEntries, error } = await supabase
        .from('clipboard_history')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(this.maxHistory)

      if (error) throw error

      let pulled = 0
      let errors = 0

      // Merge cloud entries with local (cloud takes precedence if newer)
      for (const entry of cloudEntries || []) {
        try {
          // Check if entry exists locally
          const localEntries = await invoke('get_clipboard_entry', { id: entry.local_id })

          if (!localEntries) {
            // Insert new entry locally
            await this.saveClipboardEntry(entry.content, {
              source: entry.source,
              category: entry.category,
            })
            pulled++
          }
        } catch (error) {
          console.error(`Failed to pull clipboard entry ${entry.id}:`, error)
          errors++
        }
      }

      return { pulled, errors }
    } catch (error) {
      console.error('Pull from cloud failed:', error)
      throw error
    }
  }

  /**
   * Full sync: push and pull
   */
  async syncAll(userEmail) {
    try {
      const pushResult = await this.syncToCloud(userEmail)
      const pullResult = await this.pullFromCloud(userEmail)

      return {
        pushed: pushResult.pushed,
        updated: pushResult.updated,
        pulled: pullResult.pulled,
        errors: pushResult.errors + pullResult.errors,
        syncTime: this.lastSyncTime,
      }
    } catch (error) {
      console.error('Full sync failed:', error)
      throw error
    }
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
