import { Search, Plus, FileCode, Trash2, Copy, AlertCircle, RefreshCw, Cloud, CheckCircle, Loader2, ArrowUp, Shield, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useEffect, useRef, useState } from 'react'
import { useSupabaseAuth } from '@/lib/supabase-auth'
import { syncService } from '@/lib/sync'

export function SnippetsPanel({
  snippets,
  currentSnippet,
  onSnippetClick,
  onNewSnippet,
  onDeleteSnippet,
  sidebarCollapsed,
  isDeleting = false,
  error = null,
  hasUnsyncedChanges,
  onSyncComplete,
  onSyncStart,
  newSnippetIds = new Set(),
  currentFolderId,
  currentFolderName,
  currentFolderIcon
}) {
  const { user } = useSupabaseAuth()
  const isSignedIn = !!user
  const snippetRefs = useRef({})
  const containerRef = useRef(null)
  const [deletingId, setDeletingId] = useState(null)

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const [syncApproval, setSyncApproval] = useState(null)

  // Pagination state
  const [displayCount, setDisplayCount] = useState(20)

  // Auto-scroll to selected snippet when it changes
  useEffect(() => {
    if (currentSnippet?.id && snippetRefs.current[currentSnippet.id]) {
      snippetRefs.current[currentSnippet.id].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
    }
  }, [currentSnippet?.id])

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

  const handleSync = async () => {
    const email = user?.email
    if (!email) {
      return
    }

    // If no unsynced changes, show message without calling API
    if (!hasUnsyncedChanges) {
      setSyncStatus({
        type: 'success',
        message: 'Secured cloud sync successful'
      })
      setTimeout(() => setSyncStatus(null), 3000)
      return
    }

    setIsSyncing(true)
    setSyncStatus(null)
    onSyncStart?.()

    try {
      const result = await syncService.syncAll(email)
      
      setSyncStatus({
        type: 'success',
        message: 'Secured cloud sync successful'
      })
      
      // Notify parent that sync completed successfully
      onSyncComplete?.(result.syncTime)
      
      // Clear success message after 3 seconds
      setTimeout(() => setSyncStatus(null), 3000)
    } catch (error) {
      console.error('Sync failed:', error)
      
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

  const handleDeleteClick = (e, snippet) => {
    e.stopPropagation()
    if (confirm(`Are you sure you want to delete "${snippet.title}"? This will be deleted from both local and cloud storage.`)) {
      setDeletingId(snippet.id)
      onDeleteSnippet?.(snippet)
      setDeletingId(null)
    }
  }

  const handleCopySnippet = async (e, content) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(content)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4" />
          <h2 className="text-sm font-semibold">
            {currentFolderIcon && <span className="mr-1">{currentFolderIcon}</span>}
            {currentFolderName || 'Snippets'}
          </h2>
          <Badge variant="secondary" className="text-[9px]">
            {snippets.length}
          </Badge>

          {/* Sync Button */}
          {isSignedIn && syncApproval?.approved && (
            <Button
              variant="ghost"
              size="sm"
              className={`ml-auto h-7 px-2 text-[9px] gap-1 ${
                hasUnsyncedChanges && !isSyncing 
                  ? 'bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30 hover:text-yellow-700' 
                  : ''
              }`}
              disabled={!hasUnsyncedChanges || isSyncing}
              onClick={handleSync}
            >
              {isSyncing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : hasUnsyncedChanges ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <CheckCircle className="h-3 w-3" />
              )}
              {isSyncing ? 'Syncing...' : hasUnsyncedChanges ? 'Sync' : 'Synced'}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
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

        {isDeleting ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : snippets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-[10px]">No snippets yet</p>
          </div>
        ) : (
          <>
            {snippets.slice(0, displayCount).map((snippet) => (
              <div
                key={snippet.id}
                ref={(el) => snippetRefs.current[snippet.id] = el}
                onClick={() => onSnippetClick(snippet)}
                className={`p-2.5 border rounded-lg cursor-pointer transition-all ${
                  currentSnippet?.id === snippet.id
                    ? 'bg-accent border-primary/50 ring-1 ring-primary/20 shadow-sm'
                    : 'bg-accent/30 border-border/50 hover:bg-accent/50 hover:border-border hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[11px] font-medium truncate">
                        {snippet.title}
                      </h3>
                      {newSnippetIds.has(snippet.id) && (
                        <Badge className="text-[8px] px-1.5 py-0 bg-green-500 text-white hover:bg-green-600">
                          NEW
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(snippet.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {snippet.language && (
                        <Badge variant="secondary" className="text-[8px]">
                          {snippet.language}
                        </Badge>
                      )}
                    </div>
                    {snippet.content && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 font-mono leading-relaxed">
                        {snippet.content.replace(/<[^>]*>/g, '').substring(0, 100)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[9px]"
                    onClick={(e) => handleCopySnippet(e, snippet.content)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[9px] text-destructive hover:text-destructive"
                    onClick={(e) => handleDeleteClick(e, snippet)}
                    disabled={deletingId === snippet.id || isDeleting}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Load More Button */}
            {snippets.length > displayCount && (
              <Button
                variant="ghost"
                className="w-full text-xs h-8 mt-2"
                onClick={() => setDisplayCount(prev => prev + 20)}
              >
                Load {Math.min(20, snippets.length - displayCount)} More
              </Button>
            )}
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t">
        <Button
          className="w-full text-[10px] h-8"
          onClick={onNewSnippet}
          disabled={isDeleting}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Snippet
        </Button>
      </div>
    </div>
  )
}
