import { supabase, isSupabaseConfigured } from './supabase'
import { invoke } from '@tauri-apps/api/core'
import { clipboardService } from './clipboard'

/**
 * Sync service for syncing local SQLite database with Supabase
 */
export class SyncService {
  constructor() {
    this.isSyncing = false
    this.lastSyncTime = null
  }

  /**
   * Push local snippets to Supabase
   */
  async pushToCloud(userEmail) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured')
    }

    if (!userEmail) {
      throw new Error('User email required for sync')
    }

    try {
      // Get all local snippets
      const localSnippets = await invoke('get_all_snippets')

      if (!localSnippets || localSnippets.length === 0) {
        console.log('No local snippets to sync')
        return { pushed: 0, errors: 0 }
      }

      let pushed = 0
      let errors = 0

      // Push each snippet to Supabase
      for (const snippet of localSnippets) {
        try {
          // Check if snippet already exists in cloud
          const { data: existing, error: fetchError } = await supabase
            .from('snippets')
            .select('id, updated_at')
            .eq('user_email', userEmail)
            .eq('local_id', snippet.id)
            .single()

          if (fetchError && fetchError.code !== 'PGRST116') {
            // PGRST116 = not found, which is okay
            throw fetchError
          }

          const cloudSnippet = {
            user_email: userEmail,
            local_id: snippet.id,
            title: snippet.title,
            language: snippet.language,
            tags: snippet.tags,
            description: snippet.description,
            content: snippet.content,
            created_at: snippet.created_at,
            updated_at: snippet.updated_at
          }

          if (existing) {
            // Update if local is newer
            const localTime = new Date(snippet.updated_at).getTime()
            const cloudTime = new Date(existing.updated_at).getTime()

            if (localTime > cloudTime) {
              const { error } = await supabase
                .from('snippets')
                .update(cloudSnippet)
                .eq('id', existing.id)

              if (error) throw error
              pushed++
            }
          } else {
            // Insert new snippet
            const { error } = await supabase
              .from('snippets')
              .insert(cloudSnippet)

            if (error) throw error
            pushed++
          }
        } catch (error) {
          console.error(`Failed to sync snippet ${snippet.id}:`, error)
          errors++
        }
      }

      this.lastSyncTime = new Date()
      return { pushed, errors }
    } catch (error) {
      console.error('Push to cloud failed:', error)
      throw error
    }
  }

  /**
   * Pull snippets from Supabase to local SQLite
   */
  async pullFromCloud(userEmail) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured')
    }

    if (!userEmail) {
      throw new Error('User email required for sync')
    }

    try {
      // Get all cloud snippets for this user
      const { data: cloudSnippets, error } = await supabase
        .from('snippets')
        .select('*')
        .eq('user_email', userEmail)

      if (error) throw error

      if (!cloudSnippets || cloudSnippets.length === 0) {
        console.log('No cloud snippets to sync')
        return { pulled: 0, errors: 0 }
      }

      let pulled = 0
      let errors = 0

      // Get all local snippets to check for conflicts
      const localSnippets = await invoke('get_all_snippets')
      const localMap = new Map(localSnippets.map(s => [s.id, s]))

      for (const cloudSnippet of cloudSnippets) {
        try {
          const localSnippet = localMap.get(cloudSnippet.local_id)

          const snippet = {
            title: cloudSnippet.title,
            language: cloudSnippet.language,
            tags: cloudSnippet.tags || '',
            description: cloudSnippet.description || '',
            content: cloudSnippet.content,
            created_at: cloudSnippet.created_at,
            updated_at: cloudSnippet.updated_at
          }

          if (localSnippet) {
            // Check which is newer
            const localTime = new Date(localSnippet.updated_at).getTime()
            const cloudTime = new Date(cloudSnippet.updated_at).getTime()

            if (cloudTime > localTime) {
              // Cloud is newer, update local
              await invoke('update_snippet', {
                id: cloudSnippet.local_id,
                snippet
              })
              pulled++
            }
          } else {
            // New snippet from cloud, create locally
            await invoke('create_snippet', { snippet })
            pulled++
          }
        } catch (error) {
          console.error(`Failed to pull snippet ${cloudSnippet.id}:`, error)
          errors++
        }
      }

      this.lastSyncTime = new Date()
      return { pulled, errors }
    } catch (error) {
      console.error('Pull from cloud failed:', error)
      throw error
    }
  }

  /**
   * Check if user has sync approval and encryption status
   */
  async checkSyncApproval(userEmail) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured')
    }

    try {
      const { data, error } = await supabase
        .from('user_approvals')
        .select('approved, requested_at, encryption_enabled')
        .eq('user_email', userEmail)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data || null
    } catch (error) {
      console.error('Failed to check approval:', error)
      throw error
    }
  }

  /**
   * Request sync approval
   */
  async requestSyncApproval(userEmail) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured')
    }

    try {
      // Use upsert to handle existing records (409 conflict)
      const { error } = await supabase
        .from('user_approvals')
        .upsert({
          user_email: userEmail,
          approved: false,
          requested_at: new Date().toISOString()
        }, {
          onConflict: 'user_email',
          ignoreDuplicates: false
        })

      if (error) throw error

      return true
    } catch (error) {
      console.error('Failed to request approval:', error)
      throw error
    }
  }

  /**
   * Full two-way sync
   */
  async syncAll(userEmail) {
    if (this.isSyncing) {
      console.log('Sync already in progress')
      return null
    }

    // Check approval first
    const approval = await this.checkSyncApproval(userEmail)
    if (!approval || !approval.approved) {
      throw new Error('SYNC_NOT_APPROVED')
    }

    this.isSyncing = true

    try {
      console.log('Starting sync for:', userEmail)

      // First push local changes (snippets)
      const pushResult = await this.pushToCloud(userEmail)
      console.log('Push result:', pushResult)

      // Then pull cloud changes (snippets)
      const pullResult = await this.pullFromCloud(userEmail)
      console.log('Pull result:', pullResult)

      // Sync clipboard history
      let clipboardSyncResult = { pushed: 0, updated: 0, pulled: 0, errors: 0 }
      try {
        clipboardSyncResult = await clipboardService.syncAll(userEmail)
        console.log('Clipboard sync result:', clipboardSyncResult)
      } catch (error) {
        console.warn('Clipboard sync failed:', error)
        // Don't fail the entire sync if clipboard sync fails
      }

      this.lastSyncTime = new Date()

      return {
        pushed: pushResult.pushed + (clipboardSyncResult.pushed || 0),
        pulled: pullResult.pulled + (clipboardSyncResult.pulled || 0),
        errors: pushResult.errors + pullResult.errors + (clipboardSyncResult.errors || 0),
        syncTime: this.lastSyncTime
      }
    } catch (error) {
      console.error('Sync failed:', error)
      throw error
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Get last sync time
   */
  getLastSyncTime() {
    return this.lastSyncTime
  }

  /**
   * Check if sync is in progress
   */
  isSyncInProgress() {
    return this.isSyncing
  }
}

// Export singleton instance
export const syncService = new SyncService()
