import { useState, useEffect } from 'react'
import { Clipboard, Trash2, Copy, FileCode, Search, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { clipboardService } from '@/lib/clipboard'
import { useSupabaseAuth } from '@/lib/supabase-auth'

export function ClipboardPanel({ onConvertToSnippet, onClipboardChanged }) {
  const { user } = useSupabaseAuth()
  const [history, setHistory] = useState([])
  const [filteredHistory, setFilteredHistory] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertData, setConvertData] = useState({
    title: '',
    language: 'text',
    tags: '',
  })

  // Load clipboard history on mount
  useEffect(() => {
    loadClipboardHistory()
    // Refresh every 30 seconds
    const interval = setInterval(loadClipboardHistory, 30000)
    return () => clearInterval(interval)
  }, [])

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
      const data = await clipboardService.getClipboardHistory(100)
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
        setError(result.message)
      }
    } catch (err) {
      setError(err.message || 'Failed to scan clipboard')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteEntry = async (entryId) => {
    try {
      await clipboardService.deleteClipboardEntry(entryId)
      setHistory(history.filter(e => e.id !== entryId))
    } catch (err) {
      setError('Failed to delete entry')
      console.error(err)
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
    setConvertData({
      title: entry.content.substring(0, 50),
      language: 'text',
      tags: '',
    })
    setShowConvertModal(true)
  }

  const handleConvertSubmit = async () => {
    try {
      await clipboardService.convertToSnippet(selectedEntry.id, {
        title: convertData.title,
        language: convertData.language,
        content: selectedEntry.content,
        tags: convertData.tags.split(',').filter(t => t.trim()),
        description: `Converted from clipboard - ${new Date().toLocaleDateString()}`,
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
    if (confirm('Are you sure you want to clear all clipboard history?')) {
      try {
        await clipboardService.clearClipboardHistory()
        setHistory([])
        setFilteredHistory([])
      } catch (err) {
        setError('Failed to clear history')
        console.error(err)
      }
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2 mb-3">
          <Clipboard className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Clipboard History</h2>
          <Badge variant="secondary" className="text-[9px]">
            {history.length}
          </Badge>
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
          filteredHistory.map((entry) => (
            <div
              key={entry.id}
              className="p-2 border rounded-md bg-accent/30 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground mb-1">
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-foreground break-words line-clamp-3 font-mono">
                    {entry.content}
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
                  <span className="ml-1">Snippet</span>
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
          ))
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

      {/* Convert to Snippet Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border rounded-lg p-4 max-w-md w-full">
            <h3 className="text-sm font-semibold mb-3">Convert to Snippet</h3>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-medium">Title</label>
                <Input
                  type="text"
                  value={convertData.title}
                  onChange={(e) =>
                    setConvertData({ ...convertData, title: e.target.value })
                  }
                  className="text-xs h-8 mt-1"
                  placeholder="Snippet title"
                />
              </div>

              <div>
                <label className="text-[10px] font-medium">Language</label>
                <select
                  value={convertData.language}
                  onChange={(e) =>
                    setConvertData({ ...convertData, language: e.target.value })
                  }
                  className="w-full text-xs h-8 mt-1 rounded border bg-background px-2"
                >
                  <option value="text">Text</option>
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="csharp">C#</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="sql">SQL</option>
                  <option value="bash">Bash</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-medium">Tags (comma separated)</label>
                <Input
                  type="text"
                  value={convertData.tags}
                  onChange={(e) =>
                    setConvertData({ ...convertData, tags: e.target.value })
                  }
                  className="text-xs h-8 mt-1"
                  placeholder="tag1, tag2, tag3"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1 text-[10px] h-8"
                onClick={() => setShowConvertModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 text-[10px] h-8"
                onClick={handleConvertSubmit}
              >
                Convert
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
