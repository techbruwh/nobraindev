import { useState, useEffect, useRef } from 'react'
import { Search, FilePlus, Clock, Check, ChevronDown } from 'lucide-react'
import { ClipboardService } from '@/lib/clipboard'
import { Button } from '@/components/ui/button'
import { listen, emit } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'

const PAGE_SIZE = 20

/**
 * ClipboardPopup - A Clipy-like clipboard manager popup
 * Appears on Cmd/Ctrl + Shift + C for quick clipboard history access
 */
export function ClipboardPopup({ isOpen, onClose, showToast, onConvertToSnippet }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [entries, setEntries] = useState([])
  const [allEntries, setAllEntries] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [copiedEntryId, setCopiedEntryId] = useState(null)
  const popupRef = useRef(null)
  const inputRef = useRef(null)
  const isLoadingRef = useRef(false)

  // Convert to snippet confirmation state
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)

  // Debug: Log when modal state changes
  useEffect(() => {
    console.log('🔍 Modal state changed:', { showConvertModal, selectedEntry })
  }, [showConvertModal, selectedEntry])

  const clipboardService = new ClipboardService()

  // Load more entries when scrolling near bottom
  function loadMore() {
    if (hasMore && !isLoading) {
      setPage(prev => prev + 1)
    }
  }

  // Load clipboard history on mount and when popup is triggered
  useEffect(() => {
    if (isOpen) {
      console.log('📖 Popup opened - loading clipboard history')
      loadClipboardHistory()
      inputRef.current?.focus()
    } else {
      // Reset state when closed
      setSearchQuery('')
      setSelectedIndex(0)
      setPage(1)
      setEntries([]) // Clear entries when closed
      setAllEntries([]) // Clear all entries when closed
      setCopiedEntryId(null)
      setShowConvertModal(false)
      setSelectedEntry(null)
      isLoadingRef.current = false // Reset loading flag
    }
  }, [isOpen])

  // Also refresh when window regains focus (Cmd+Tab or Cmd+Shift+C again)
  useEffect(() => {
    const handleFocus = () => {
      if (isOpen) {
        console.log('🎯 Window focused - refreshing clipboard')
        loadClipboardHistory()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [isOpen])

  // Close popup when it loses focus (click outside)
  useEffect(() => {
    const handleBlur = () => {
      if (isOpen) {
        console.log('🔲 Window lost focus - closing popup')
        onClose()
      }
    }

    window.addEventListener('blur', handleBlur)
    return () => window.removeEventListener('blur', handleBlur)
  }, [isOpen, onClose])

  // Listen for clipboard popup triggered event (Cmd+Shift+C pressed)
  useEffect(() => {
    let unlistenFn

    const setupListener = async () => {
      console.log('🎯 Setting up clipboard-popup-triggered event listener')

      unlistenFn = await listen('clipboard-popup-triggered', (event) => {
        console.log('🎉 Event received!', event)
        console.log('🔄 Cmd+Shift+C pressed - refreshing clipboard')

        // Refresh the clipboard
        loadClipboardHistory()

        // Keep focus on search input after refresh
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
      })

      console.log('✅ Event listener setup complete')
    }

    setupListener()

    return () => {
      console.log('🧹 Cleaning up event listener')
      if (unlistenFn) {
        unlistenFn()
      }
    }
  }, [])

  // Update displayed entries when page, search query, or all entries change
  useEffect(() => {
    const filtered = allEntries.filter(entry => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        entry.content.toLowerCase().includes(query) ||
        entry.category.toLowerCase().includes(query)
      )
    })

    const start = 0
    const end = page * PAGE_SIZE
    const paginatedEntries = filtered.slice(start, end)

    console.log(`📊 Pagination: page=${page}, total=${filtered.length}, showing=${paginatedEntries.length}, hasMore=${filtered.length > end}`)

    setEntries(paginatedEntries)
    setHasMore(filtered.length > end)
  }, [page, allEntries, searchQuery])

  // Filter entries based on search
  const filteredEntries = entries

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return

      // Escape - close modal first, then popup
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        if (showConvertModal) {
          setShowConvertModal(false)
          setSelectedEntry(null)
        } else {
          // Just hide the popup, don't focus main window
          onClose()
        }
        return
      }

      // Don't handle other shortcuts when modal is open
      if (showConvertModal) return

      // Arrow down
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev =>
          Math.min(prev + 1, filteredEntries.length - 1)
        )
        return
      }

      // Arrow up
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        return
      }

      // Enter - paste selected entry to active cursor
      if (e.key === 'Enter' && filteredEntries.length > 0) {
        e.preventDefault()
        e.stopPropagation()
        const entry = filteredEntries[selectedIndex]
        pasteToClipboard(entry)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, showConvertModal, selectedIndex, filteredEntries])

  // Scroll selected item into view
  useEffect(() => {
    if (isOpen && filteredEntries.length > 0) {
      const selectedElement = document.getElementById(`clipboard-entry-${selectedIndex}`)
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex, isOpen, filteredEntries])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      // If modal is open, check if click is outside modal
      if (showConvertModal) {
        // Don't close if clicking on the modal content
        const modalContent = e.target.closest('.bg-background.border.rounded-lg')
        if (!modalContent) {
          // Clicked outside modal - close modal only
          setShowConvertModal(false)
          setSelectedEntry(null)
        }
        return
      }

      // If modal is not open, check if clicking outside popup
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose, showConvertModal])

  async function loadClipboardHistory() {
    // Prevent concurrent loading
    if (isLoadingRef.current) {
      console.log('⏳ Already loading clipboard history, skipping...')
      return
    }

    isLoadingRef.current = true
    setIsLoading(true)

    try {
      console.log('🔄 Loading clipboard history...')

      // First, scan the system clipboard to pick up any new content
      try {
        const scanResult = await clipboardService.scanSystemClipboard()
        console.log('✅ System clipboard scan result:', scanResult)
      } catch (scanError) {
        // Don't fail if scanning doesn't work, just log it
        console.warn('⚠️ Clipboard scan failed, continuing with history:', scanError)
      }

      // Load all clipboard history (ordered by latest first)
      const history = await clipboardService.getClipboardHistory(100)
      console.log('📋 Loaded clipboard history:', history.length, 'entries')
      console.log('📋 First entry:', history[0])

      setAllEntries(history)
      console.log('✅ All entries set to state')
    } catch (error) {
      console.error('❌ Failed to load clipboard history:', error)
      if (showToast) showToast('Failed to load clipboard history', 'error')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }

  async function copyToClipboard(entry) {
    try {
      await navigator.clipboard.writeText(entry.content)

      // Show copy notification by setting the copied entry ID
      setCopiedEntryId(entry.id)

      // Clear the notification after 2 seconds
      setTimeout(() => {
        setCopiedEntryId(null)
      }, 2000)

      // Don't close popup - user must press ESC
      console.log('✅ Copied to clipboard:', entry.content.substring(0, 50))
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      if (showToast) showToast('Failed to copy to clipboard', 'error')
    }
  }

  async function pasteToClipboard(entry) {
    try {
      // First copy to clipboard
      await navigator.clipboard.writeText(entry.content)

      // Paste to cursor WITHOUT closing popup first
      await invoke('paste_to_cursor')

      console.log('✅ Pasted to cursor:', entry.content.substring(0, 50))

      // Hide the popup window (doesn't return focus to parent)
      const clipboardWindow = getCurrentWindow()
      clipboardWindow.hide()
    } catch (error) {
      console.error('Failed to paste to cursor:', error)
      if (showToast) showToast('Failed to paste', 'error')
    }
  }

  function handleConvertClick(entry) {
    console.log('🔄 Convert button clicked for entry:', entry)
    console.log('Current state - showConvertModal:', showConvertModal, 'selectedEntry:', selectedEntry)
    setSelectedEntry(entry)
    setShowConvertModal(true)
    console.log('State updated - showConvertModal should now be true')
  }

  async function handleConvertSubmit() {
    if (!selectedEntry) {
      console.error('No selected entry to convert')
      return
    }

    try {
      console.log('🔄 Starting conversion of clipboard entry:', selectedEntry)

      // Generate smart defaults for snippet data
      const title = selectedEntry.content
        .split('\n')[0]
        .substring(0, 50)
        .trim() || 'Clipboard Snippet'

      // Map category to language
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

      const snippetData = {
        title,
        language: languageMap[selectedEntry.category.toLowerCase()] || 'text',
        content: selectedEntry.content,
        tags: [],
        description: `Converted from clipboard (${selectedEntry.category})`,
      }

      console.log('📝 Snippet data prepared:', snippetData)

      const result = await clipboardService.convertToSnippet(selectedEntry.id, snippetData)

      console.log('✅ Conversion successful, result:', result)

      // Notify parent component
      console.log('📢 Calling onConvertToSnippet callback')
      onConvertToSnippet?.()
      console.log('✅ onConvertToSnippet callback completed')

      // Emit event to main window to reload snippets
      try {
        await emit('snippet-created', {}, { target: 'main' })
        console.log('✅ Emitted snippet-created event to main window')
      } catch (error) {
        console.warn('⚠️ Failed to emit snippet-created event:', error)
      }

      if (showToast) showToast('Converted to snippet', 'success')

      // Close both modal and popup
      setShowConvertModal(false)
      setSelectedEntry(null)
      onClose()
    } catch (error) {
      console.error('❌ Failed to convert to snippet:', error)
      console.error('Error details:', error.message, error.stack)
      if (showToast) showToast('Failed to convert to snippet: ' + error.message, 'error')
      // Don't close modal on error, let user try again
    }
  }

  function getTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown'

    const now = new Date()
    const past = new Date(timestamp)
    const diffMs = now - past
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  if (!isOpen) return null

  return (
    <>
      {/* Popup */}
      <div
        ref={popupRef}
        className="fixed top-0 left-0 right-0 z-50 bg-background border border-border rounded-b-xl shadow-2xl w-full h-full overflow-hidden flex flex-col"
      >
        {/* Header with Logo */}
        <div className="flex items-center justify-center px-4 py-2 border-b border-border/50 bg-muted/30">
          <img
            src="/icon-192.png"
            alt="App Icon"
            className="w-5 h-5 object-contain rounded mr-2"
          />
          <span className="text-xs font-semibold">Clipboard History</span>
        </div>

        {/* Search Input */}
        <div className="relative border-b border-border/50">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground top-1/2 -translate-y-1/2" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clipboard history..."
            className="w-full pl-10 pr-4 py-3 bg-background border-0 focus:outline-none focus:ring-0"
          />
        </div>

        {/* Entries List */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <div className="text-sm">Loading clipboard history...</div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="w-8 h-8 mb-2 opacity-50" />
              <div className="text-sm">
                {searchQuery ? 'No matching clipboard entries' : 'No clipboard history yet'}
              </div>
            </div>
          ) : (
            <>
              {filteredEntries.map((entry, index) => (
                <div
                  key={entry.id}
                  id={`clipboard-entry-${index}`}
                  className={`p-3 border-b border-border/50 cursor-pointer hover:bg-accent transition-colors ${
                    index === selectedIndex ? 'bg-accent' : ''
                  }`}
                  onClick={() => {
                    copyToClipboard(entry)
                  }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Clock className="w-3 h-3" />
                        <span>{getTimeAgo(entry.created_at)}</span>
                        <span>•</span>
                        <span className="capitalize">{entry.category}</span>
                        {copiedEntryId === entry.id && (
                          <>
                            <span>•</span>
                            <span className="text-green-500 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Copied!
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-sm font-mono text-foreground/90 truncate">
                        {entry.content}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        pasteToClipboard(entry)
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                      }}
                      className="text-primary hover:text-primary hover:bg-primary/10 p-1.5 rounded transition-colors font-medium text-xs"
                      title="Paste to active cursor"
                    >
                      Paste this
                    </button>
                  </div>
                </div>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="p-3 text-center">
                  <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto transition-colors disabled:opacity-50"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Load more ({entries.length} shown)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-border/50 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>↑↓ Navigate • Enter to Paste • Esc to Close</span>
            <span>{copiedEntryId ? 'Copied! Press Esc to close' : 'Click "Paste this" or press Enter'}</span>
          </div>
        </div>
      </div>

      {/* Convert to Snippet Confirmation Modal */}
      {showConvertModal && selectedEntry && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[60] p-4 pointer-events-none"
          onMouseDown={(e) => {
            e.stopPropagation()
          }}
        >
          <div
            className="bg-background border border-border rounded-lg p-4 max-w-sm w-full shadow-2xl pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold mb-2">Convert to Snippet</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Are you sure you want to convert this clipboard entry to a snippet?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-[10px] h-8"
                onClick={() => {
                  console.log('❌ Cancel clicked')
                  setShowConvertModal(false)
                  setSelectedEntry(null)
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 text-[10px] h-8"
                onClick={() => {
                  console.log('✅ Confirm button clicked')
                  handleConvertSubmit()
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
