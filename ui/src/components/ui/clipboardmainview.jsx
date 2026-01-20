import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Clipboard, Trash2, Copy, FileCode, Search, RefreshCw, AlertCircle, CheckCircle, Keyboard, Sparkles, Clock, Info } from 'lucide-react'
import { clipboardService } from '@/lib/clipboard'
import { useSupabaseAuth } from '@/lib/supabase-auth'
import { syncService } from '@/lib/sync'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export const ClipboardMainView = forwardRef(({ onConvertToSnippet, onClipboardChanged, hasUnsyncedClipboard, onClipboardSyncComplete, selectedEntryId, onEntrySelect }, ref) => {
  const { user } = useSupabaseAuth()
  const isSignedIn = !!user
  const [history, setHistory] = useState([])
  const [filteredHistory, setFilteredHistory] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedEntry, setSelectedEntry] = useState(null)

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

  // Select entry when selectedEntryId changes
  useEffect(() => {
    if (selectedEntryId) {
      const entry = history.find(e => e.id === selectedEntryId)
      if (entry) {
        setSelectedEntry(entry)
      }
    } else {
      setSelectedEntry(null)
    }
  }, [selectedEntryId, history])

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
      if (selectedEntry?.id === entryId) {
        setSelectedEntry(null)
        onEntrySelect?.(null)
      }
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
      // Show success indicator
      const originalText = 'Copy'
      // Could add toast notification here
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleConvertClick = async (entry) => {
    try {
      // Generate smart defaults for snippet data
      const title = entry.content
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

      await clipboardService.convertToSnippet(entry.id, {
        title,
        language: languageMap[entry.category?.toLowerCase()] || 'text',
        content: entry.content,
        tags: [],
        description: `Converted from clipboard (${entry.category})`,
      })

      // Notify parent component
      onConvertToSnippet?.()
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
      setSelectedEntry(null)
      onEntrySelect?.(null)
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
    <div className="h-full flex">
      {/* Left Panel - Clipboard List */}
      <div className="w-[480px] border-r flex flex-col bg-background">
        {/* Header */}
        <div className="p-3 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clipboard className="h-4 w-4" />
              <h2 className="text-sm font-semibold">Clipboard History</h2>
              <Badge variant="secondary" className="text-[9px]">
                {history.length}
              </Badge>
            </div>

            {/* Sync Button */}
            {isSignedIn && syncApproval?.approved && (
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2 text-[9px] gap-1 ${
                  hasUnsyncedClipboard && !isSyncing
                    ? 'bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30 hover:text-yellow-700'
                    : ''
                }`}
                disabled={!hasUnsyncedClipboard || isSyncing}
                onClick={handleSync}
              >
                {isSyncing ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : hasUnsyncedClipboard ? (
                  <Sparkles className="h-3 w-3" />
                ) : (
                  <CheckCircle className="h-3 w-3" />
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

        {/* Sync Status */}
        {syncStatus && (
          <div className={`mx-4 mt-3 p-2.5 rounded-lg border ${
            syncStatus.type === 'success'
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-destructive/10 border-destructive/20'
          }`}>
            <div className="flex items-center gap-2">
              {syncStatus.type === 'success' ? (
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              )}
              <p className={`text-[11px] ${
                syncStatus.type === 'success' ? 'text-green-600' : 'text-destructive'
              }`}>
                {syncStatus.message}
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mx-4 mt-3 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-destructive mt-0.5" />
              <p className="text-[11px] text-destructive">{error}</p>
            </div>
          </div>
        )}

        {/* Clipboard List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clipboard className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No clipboard history yet</p>
            </div>
          ) : (
            <>
              {filteredHistory.slice(0, displayCount).map((entry) => (
                <div
                  key={entry.id}
                  className={`p-2.5 border rounded-lg cursor-pointer transition-all ${
                    selectedEntry?.id === entry.id
                      ? 'bg-primary/10 border-primary'
                      : 'bg-accent/30 hover:bg-accent/50 border-border'
                  }`}
                  onClick={() => {
                    setSelectedEntry(entry)
                    onEntrySelect?.(entry.id)
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <p className="text-xs text-foreground break-words line-clamp-2 font-mono leading-relaxed">
                        {entry.content.replace(/<[^>]*>/g, '')}
                      </p>
                      {entry.category && (
                        <Badge variant="outline" className="text-[8px]">
                          {entry.category}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-1 mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[9px]"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyEntry(entry.content)
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[9px]"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleConvertClick(entry)
                      }}
                    >
                      <FileCode className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[9px] text-destructive hover:text-destructive ml-auto"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteEntry(entry.id)
                      }}
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
                  className="w-full text-xs h-8"
                  onClick={() => setDisplayCount(prev => prev + 20)}
                >
                  Load {Math.min(20, filteredHistory.length - displayCount)} More
                </Button>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t space-y-2">
          <Button
            variant="outline"
            className="w-full text-xs h-9"
            onClick={handleScanClipboard}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Scan & Refresh
          </Button>
          <Button
            variant="destructive"
            className="w-full text-xs h-9"
            onClick={handleClearAll}
            disabled={history.length === 0}
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Right Panel - Entry Detail */}
      <div className="flex-1 flex flex-col bg-muted/30">
        {selectedEntry ? (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-background">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clipboard className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Clipboard Entry</h3>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => handleCopyEntry(selectedEntry.content)}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => handleConvertClick(selectedEntry)}
                  >
                    <FileCode className="h-3.5 w-3.5 mr-1.5" />
                    Convert to Snippet
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 text-xs"
                    onClick={() => handleDeleteEntry(selectedEntry.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete
                  </Button>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(selectedEntry.created_at).toLocaleString()}</span>
                </div>
                {selectedEntry.category && (
                  <Badge variant="secondary" className="text-[10px]">
                    {selectedEntry.category}
                  </Badge>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              <pre className="text-sm font-mono whitespace-pre-wrap break-words bg-background border rounded-lg p-4">
                {selectedEntry.content}
              </pre>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-lg space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                <Clipboard className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Clipboard History</h3>
              <p className="text-sm text-muted-foreground">
                Select an entry from the list to view details, or scan your clipboard to add new entries
              </p>

              <div className="grid grid-cols-1 gap-3 mt-6">
                {/* Keyboard Shortcut Hint */}
                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 text-left">
                  <div className="flex items-start gap-3">
                    <Keyboard className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-600 mb-1.5">
                        Quick Scan
                      </p>
                      <p className="text-[11px] text-muted-foreground mb-2">
                        Press <kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px] font-mono">⌘⇧C</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px] font-mono">Ctrl+Shift+C</kbd> to scan clipboard
                      </p>
                    </div>
                  </div>
                </div>

                {/* Popup Info */}
                <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20 text-left">
                  <div className="flex items-start gap-3">
                    <Info className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-purple-600 mb-1.5">
                        Clipboard Popup
                      </p>
                      <p className="text-[11px] text-muted-foreground mb-3">
                        Open a floating clipboard window to quickly access and manage your clipboard history from anywhere
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-purple-500/30 text-purple-600 hover:bg-purple-500/10 hover:text-purple-700"
                        onClick={handleOpenClipboardPopup}
                      >
                        Open Clipboard Popup
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

ClipboardMainView.displayName = 'ClipboardMainView'
