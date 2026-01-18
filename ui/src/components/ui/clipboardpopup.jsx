import { useState, useEffect, useRef } from 'react'
import { Search, FilePlus, Clock, FileCode } from 'lucide-react'
import { ClipboardService } from '@/lib/clipboard'
import { Button } from '@/components/ui/button'

/**
 * ClipboardPopup - A Clipy-like clipboard manager popup
 * Appears on Cmd/Ctrl + Shift + C for quick clipboard history access
 */
export function ClipboardPopup({ isOpen, onClose, showToast, onConvertToSnippet }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [entries, setEntries] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const popupRef = useRef(null)
  const inputRef = useRef(null)

  // Convert to snippet confirmation state
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)

  // Debug: Log when modal state changes
  useEffect(() => {
    console.log('🔍 Modal state changed:', { showConvertModal, selectedEntry })
  }, [showConvertModal, selectedEntry])

  const clipboardService = new ClipboardService()

  // Load clipboard history on mount
  useEffect(() => {
    if (isOpen) {
      loadClipboardHistory()
      inputRef.current?.focus()
    } else {
      // Reset state when closed
      setSearchQuery('')
      setSelectedIndex(0)
      setShowConvertModal(false)
      setSelectedEntry(null)
    }
  }, [isOpen])

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  // Filter entries based on search
  const filteredEntries = entries.filter(entry => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      entry.content.toLowerCase().includes(query) ||
      entry.category.toLowerCase().includes(query)
    )
  })

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return

      // Escape - close modal first, then popup
      if (e.key === 'Escape') {
        e.preventDefault()
        if (showConvertModal) {
          setShowConvertModal(false)
          setSelectedEntry(null)
        } else {
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

      // Enter - copy selected entry
      if (e.key === 'Enter' && filteredEntries.length > 0) {
        e.preventDefault()
        copyToClipboard(filteredEntries[selectedIndex])
        onClose()
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
    setIsLoading(true)
    try {
      // First, scan the system clipboard to pick up any new content
      try {
        await clipboardService.scanSystemClipboard()
      } catch (scanError) {
        // Don't fail if scanning doesn't work, just log it
        console.warn('Clipboard scan failed, continuing with history:', scanError)
      }

      // Then load the history (which will include newly scanned content)
      const history = await clipboardService.getClipboardHistory(20)
      setEntries(history)
    } catch (error) {
      console.error('Failed to load clipboard history:', error)
      if (showToast) showToast('Failed to load clipboard history', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  async function copyToClipboard(entry) {
    try {
      await navigator.clipboard.writeText(entry.content)
      if (showToast) showToast('Copied to clipboard', 'success')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      if (showToast) showToast('Failed to copy to clipboard', 'error')
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
      <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[15vh]">
        <div
          ref={popupRef}
          className="bg-background border rounded-lg shadow-2xl w-[600px] max-h-[60vh] overflow-hidden"
        >
        {/* Search Input */}
        <div className="relative border-b">
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
        <div className="overflow-y-auto max-h-[45vh]">
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
            filteredEntries.map((entry, index) => (
              <div
                key={entry.id}
                id={`clipboard-entry-${index}`}
                className={`p-3 border-b cursor-pointer hover:bg-muted transition-colors ${
                  index === selectedIndex ? 'bg-muted' : ''
                }`}
                onClick={() => {
                  copyToClipboard(entry)
                  onClose()
                }}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Clock className="w-3 h-3" />
                      <span>{getTimeAgo(entry.created_at)}</span>
                      <span>•</span>
                      <span className="capitalize">{entry.category}</span>
                    </div>
                    <div className="text-sm font-mono truncate">
                      {entry.content}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log('📝 Convert button onClick fired, stopping propagation')
                      handleConvertClick(entry)
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                    }}
                    className="text-muted-foreground hover:text-primary hover:bg-muted-foreground/10 p-1.5 rounded transition-colors"
                    title="Convert to snippet"
                  >
                    <FileCode className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t text-xs text-muted-foreground bg-muted/30">
          <div className="flex items-center justify-between">
            <span>↑↓ Navigate • Enter to Copy • Esc to Close</span>
            <span>Click the icon to convert to snippet</span>
          </div>
        </div>
        </div>
      </div>

      {/* Convert to Snippet Confirmation Modal */}
      {showConvertModal && selectedEntry && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onMouseDown={(e) => {
            e.stopPropagation()
          }}
        >
          <div
            className="bg-background border rounded-lg p-4 max-w-sm w-full shadow-2xl"
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
