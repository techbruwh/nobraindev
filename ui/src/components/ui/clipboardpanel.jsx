import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Clipboard, Trash2, Copy, FileCode, Search, RefreshCw, AlertCircle, Cloud, CheckCircle, Loader2, ArrowUp, Shield, Keyboard } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { clipboardService } from '@/lib/clipboard'
import { useSupabaseAuth } from '@/lib/supabase-auth'
import { syncService } from '@/lib/sync'

export const ClipboardPanel = forwardRef(({ onConvertToSnippet, onClipboardChanged, hasUnsyncedClipboard, onClipboardSyncComplete }, ref) => {
  const { user } = useSupabaseAuth()
  const isSignedIn = !!user
  const [history, setHistory] = useState([])
  const [filteredHistory, setFilteredHistory] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [showConvertModal, setShowConvertModal] = useState(false)

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [syncApproval, setSyncApproval] = useState(null)

  // Pagination state
  const [displayCount, setDisplayCount] = useState(20)

  // Expose refreshClipboard function to parent
  useImperativeHandle(ref, () => ({
    refreshClipboard: () => {
      handleScanClipboard()
    }
  }))

  // Load clipboard history on mount
  useEffect(() => {
    loadClipboardHistory()
    // Refresh every 30 seconds
    const interval = setInterval(loadClipboardHistory, 30000)
    return () => clearInterval(interval)
  }, [])

  // Check sync approval on mount
  useEffect(() => {
    if (isSignedIn && user?.email) {
      checkSyncApproval()
    }
  }, [isSignedIn, user])

  const checkSyncApproval = async () => {
    try {
      const approval = await syncService.checkSyncApproval(user.email)
      setSyncApproval(approval)
    } catch (error) {
      console.error('Failed to check sync approval:', error)
    }
  }

  // Filter history based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredHistory(
        history.filter(entry =>
          entry.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    } else {
      setFilteredHistory(history)
    }
  }, [searchQuery, history])

  const loadClipboardHistory = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await clipboardService.getClipboardHistory(20)
      setHistory(data)
    } catch (err) {
      setError('Failed to load clipboard history')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleScanClipboard = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await clipboardService.scanSystemClipboard()
      if (result.isNew) {
        // Reload history to show the new entry
        await loadClipboardHistory()
        // Trigger sync button enable
        onClipboardChanged?.()
      } else {
        // Show helpful message based on the result
        if (result.message === 'Clipboard is empty') {
          setError('Your clipboard is empty. Copy some text first, then click "Scan & Refresh".')
        } else if (result.message === 'Already saved') {
          setError('This content is already in your history. Copy something new to add it.')
        } else {
          setError(result.message)
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to scan clipboard. Make sure the app has clipboard access permissions.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteEntry = async (entryId) => {
    if (!confirm('Are you sure you want to delete this clipboard entry? This will be deleted from both local and cloud storage.')) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Delete locally first
      await clipboardService.deleteClipboardEntry(entryId)
      
      // Delete from cloud if user is signed in
      if (isSignedIn && user?.email && syncApproval?.approved) {
        try {
          const { syncService } = await import('@/lib/sync')
          await syncService.deleteClipboardFromCloud(user.email, entryId)
        } catch (cloudError) {
          console.warn('Failed to delete from cloud:', cloudError)
          setError('Deleted locally but failed to sync deletion to cloud')
        }
      }
      
      // Mark as having unsynced changes
      onClipboardChanged?.()
      
      // Remove from UI
      setHistory(history.filter(e => e.id !== entryId))
    } catch (err) {
      setError('Failed to delete entry')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyEntry = async (content) => {
    try {
      await navigator.clipboard.writeText(content)
      // Show success toast (integrate with your toast system)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleConvertClick = (entry) => {
    setSelectedEntry(entry)
    setShowConvertModal(true)
  }

  const handleConvertSubmit = async () => {
    if (!selectedEntry) return

    try {
      // Generate smart defaults for snippet data
      const title = selectedEntry.content
        .split('\n')[0]
        .substring(0, 50)
        .trim() || 'Clipboard Snippet'

      const languageMap = {
        'json': 'json',
        'sql': 'sql',
        'javascript': 'javascript',
        'typescript': 'typescript',
        'python': 'python',
        'html': 'html',
        'css': 'css',
        'code': 'text',
        'url': 'text',
        'general': 'text',
      }

      await clipboardService.convertToSnippet(selectedEntry.id, {
        title,
        language: languageMap[selectedEntry.category?.toLowerCase()] || 'text',
        content: selectedEntry.content,
        tags: [],
        description: `Converted from clipboard (${selectedEntry.category})`,
      })

      // Notify parent component
      onConvertToSnippet?.()

      setShowConvertModal(false)
      setSelectedEntry(null)
    } catch (err) {
      setError('Failed to convert to snippet')
      console.error(err)
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all clipboard history? This will be deleted from both local and cloud storage.')) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Clear local storage first
      await clipboardService.clearClipboardHistory()
      
      // Clear from cloud if user is signed in
      if (isSignedIn && user?.email && syncApproval?.approved) {
        try {
          const { supabase } = await import('@/lib/supabase')
          const { error } = await supabase
            .from('clipboard_history')
            .delete()
            .eq('user_email', user.email)
          
          if (error) throw error
        } catch (cloudError) {
          console.warn('Failed to clear from cloud:', cloudError)
          setError('Cleared locally but failed to sync deletion to cloud')
        }
      }
      
      // Mark as having unsynced changes
      onClipboardChanged?.()
      
      // Clear UI
      setHistory([])
      setFilteredHistory([])
    } catch (err) {
      setError('Failed to clear history')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async () => {
    const email = user?.email
    if (!email) {
      setError('User email not found')
      return
    }

    // If no unsynced changes, show message without calling API
    if (!hasUnsyncedClipboard) {
      setSyncStatus({
        type: 'success',
        message: 'Secured cloud sync successful'
      })
      setTimeout(() => setSyncStatus(null), 3000)
      return
    }

    setIsSyncing(true)
    setError(null)
    setSyncStatus(null)

    try {
      const result = await clipboardService.syncAll(email)

      // Reload clipboard after sync
      await loadClipboardHistory()

      // Create user-friendly message
      const message = 'Secured cloud sync successful'

      setSyncStatus({
        type: 'success',
        message
      })
      setLastSyncTime(result.syncTime)

      // Notify parent that sync completed successfully
      onClipboardSyncComplete?.(result.syncTime)

      // Clear success message after 3 seconds
      setTimeout(() => setSyncStatus(null), 3000)
    } catch (error) {
      console.error('Clipboard sync failed:', error)

      let errorMessage
      if (error.message === 'SYNC_NOT_APPROVED') {
        errorMessage = 'Sync access not approved yet. Please wait for approval.'
      } else if (error.message === 'Supabase not configured') {
        errorMessage = 'Cloud sync not configured'
      } else if (error.message.includes('fetch') || error.message.includes('network')) {
        errorMessage = 'Network error. Check your internet connection.'
      } else {
        errorMessage = error.message || 'Sync failed. Please try again.'
      }

      setSyncStatus({
        type: 'error',
        message: errorMessage
      })

      // Clear error message after 5 seconds
      setTimeout(() => setSyncStatus(null), 5000)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleOpenClipboardPopup = async () => {
    try {
      await invoke('show_clipboard_popup')
    } catch (error) {
      console.error('Failed to open clipboard popup:', error)
      setError('Failed to open clipboard popup')
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2">
          <Clipboard className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Clipboard History</h2>
          <Badge variant="secondary" className="text-[9px]">
            {history.length}
          </Badge>
          
          {/* Sync Button */}
          {isSignedIn && syncApproval?.approved && (
            <Button
              variant="ghost"
              size="sm"
              className={`ml-auto h-7 px-2 text-[9px] gap-1 ${
                hasUnsyncedClipboard && !isSyncing 
                  ? 'bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30 hover:text-yellow-700' 
                  : ''
              }`}
              disabled={!hasUnsyncedClipboard || isSyncing}
              onClick={handleSync}
            >
              {isSyncing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : hasUnsyncedClipboard ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <Cloud className="h-3 w-3" />
              )}
              {isSyncing ? 'Syncing...' : hasUnsyncedClipboard ? 'Sync' : 'Synced'}
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search clipboard..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Open Popup Hint */}
        <div className="p-3 rounded-md border bg-blue-500/5 border-blue-500/20">
          <div className="flex items-start gap-2 mb-2">
            <Keyboard className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-blue-600 mb-1">
                Open Clipboard Popup
              </p>
              <p className="text-[10px] text-muted-foreground mb-2">
                Press <kbd className="px-1.5 py-0.5 rounded bg-background border text-[9px] font-mono">⌘⇧C</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-background border text-[9px] font-mono">Ctrl+Shift+C</kbd> to open clipboard in the center panel
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-[9px] h-7 border-blue-500/30 text-blue-600 hover:bg-blue-500/10 hover:text-blue-700"
                onClick={handleOpenClipboardPopup}
              >
                Open Clipboard Popup
              </Button>
            </div>
          </div>
        </div>

        {/* Sync Status */}
        {syncStatus && (
          <div className={`p-2 rounded-md border ${
            syncStatus.type === 'success'
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-destructive/10 border-destructive/20'
          }`}>
            <div className="flex items-center gap-2">
              {syncStatus.type === 'success' ? (
                <Shield className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-destructive" />
              )}
              <p className={`text-[10px] ${
                syncStatus.type === 'success' ? 'text-green-600' : 'text-destructive'
              }`}>
                {syncStatus.message}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-3 w-3 text-destructive mt-0.5" />
              <p className="text-[10px] text-destructive">{error}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clipboard className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-[10px]">No clipboard history yet</p>
          </div>
        ) : (
          <>
            {filteredHistory.slice(0, displayCount).map((entry) => (
              <div
                key={entry.id}
                className="p-2.5 border rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground mb-1">
                      {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[11px] text-foreground break-words line-clamp-2 font-mono leading-relaxed">
                      {entry.content.replace(/<[^>]*>/g, '')}
                    </p>
                    {entry.category && (
                      <Badge variant="outline" className="text-[8px] mt-1">
                        {entry.category}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[9px]"
                    onClick={() => handleCopyEntry(entry.content)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[9px]"
                    onClick={() => handleConvertClick(entry)}
                  >
                    <FileCode className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[9px] text-destructive hover:text-destructive"
                    onClick={() => handleDeleteEntry(entry.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Load More Button */}
            {filteredHistory.length > displayCount && (
              <Button
                variant="ghost"
                className="w-full text-xs h-8 mt-2"
                onClick={() => setDisplayCount(prev => prev + 20)}
              >
                Load {Math.min(20, filteredHistory.length - displayCount)} More
              </Button>
            )}
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t space-y-2">
        <Button
          variant="outline"
          className="w-full text-[10px] h-8"
          onClick={handleScanClipboard}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Scan & Refresh
        </Button>
        <Button
          variant="destructive"
          className="w-full text-[10px] h-8"
          onClick={handleClearAll}
          disabled={history.length === 0}
        >
          Clear All
        </Button>
      </div>

      {/* Convert to Snippet Confirmation Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border rounded-lg p-4 max-w-sm w-full">
            <h3 className="text-sm font-semibold mb-2">Convert to Snippet</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Are you sure you want to convert this clipboard entry to a snippet?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-[10px] h-8"
                onClick={() => {
                  setShowConvertModal(false)
                  setSelectedEntry(null)
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 text-[10px] h-8"
                onClick={handleConvertSubmit}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

ClipboardPanel.displayName = 'ClipboardPanel'
