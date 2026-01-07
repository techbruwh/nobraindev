import { useState, useEffect, useRef } from 'react'
import { Search, Sparkles, X, Brain, Download, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function SearchModal({ 
  isOpen, 
  onClose, 
  searchQuery,
  onSearchChange,
  useSemanticSearch,
  onToggleSemanticSearch,
  modelStatus,
  isLoadingModel,
  onLoadModel,
  filteredSnippets,
  onSelectSnippet,
  isMac
}) {
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (isOpen) {
      // Focus input when dropdown opens
      setTimeout(() => inputRef.current?.focus(), 100)
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredSnippets])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredSnippets.length - 1 ? prev + 1 : prev
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0)
      } else if (e.key === 'Enter' && filteredSnippets.length > 0) {
        e.preventDefault()
        onSelectSnippet(filteredSnippets[selectedIndex])
        onClose()
      }
    }
    
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose()
      }
    }
    
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, filteredSnippets, selectedIndex, onSelectSnippet])

  // Scroll selected item into view
  useEffect(() => {
    if (isOpen && filteredSnippets.length > 0) {
      const selectedElement = document.getElementById(`search-result-${selectedIndex}`)
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex, isOpen, filteredSnippets])

  if (!isOpen) return null

  return (
    <div 
      ref={dropdownRef}
      className="fixed top-10 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50"
    >
      {/* Dropdown Panel */}
      <div className="bg-background rounded-lg shadow-2xl border border-border overflow-hidden">
        {/* Search Input Area */}
        <div className="relative border-b">
          <div className="p-2 space-y-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                placeholder={useSemanticSearch ? "Ask AI anything..." : "Search snippets..."}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full h-7 pl-9 pr-9 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring transition-all placeholder:text-muted-foreground"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              
              <button
                onClick={onClose}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center hover:bg-accent rounded-sm transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {/* AI Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* AI Toggle */}
                {modelStatus.loaded && (
                  <label className="flex items-center gap-1.5 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={useSemanticSearch}
                        onChange={(e) => onToggleSemanticSearch(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-7 h-4 bg-muted rounded-full peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:via-purple-500 peer-checked:to-pink-500 transition-all" />
                      <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-3 shadow-sm" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5 text-purple-500" />
                      <span className="text-[10px] font-medium">AI Search</span>
                    </div>
                  </label>
                )}

                {/* Load Model Button */}
                {!modelStatus.loaded && (
                  <Button
                    onClick={onLoadModel}
                    disabled={isLoadingModel}
                    size="sm"
                    variant="outline"
                  >
                    {isLoadingModel ? (
                      <>
                        <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Download className="h-2.5 w-2.5 mr-1" />
                        Load AI
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Keyboard Hints */}
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[9px] font-mono">
                  ↑↓
                </kbd>
                <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[9px] font-mono">
                  Enter
                </kbd>
                <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[9px] font-mono">
                  ESC
                </kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {searchQuery.trim() === '' ? (
            <div className="p-4 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-[10px]">Start typing to search snippets</p>
              {modelStatus.loaded && (
                <p className="text-[9px] mt-1">
                  {useSemanticSearch ? '✨ AI search is enabled' : 'Toggle AI search for natural language queries'}
                </p>
              )}
            </div>
          ) : filteredSnippets.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-[10px]">No snippets found</p>
              <p className="text-[9px] mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="p-1">
              {filteredSnippets.map((snippet, index) => (
                <button
                  key={snippet.id}
                  id={`search-result-${index}`}
                  onClick={() => {
                    onSelectSnippet(snippet)
                    onClose()
                  }}
                  className={`w-full p-2 rounded-md transition-colors text-left group ${
                    index === selectedIndex 
                      ? 'bg-accent border border-primary' 
                      : 'hover:bg-accent border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h3 className={`text-[10px] font-medium truncate transition-colors ${
                          index === selectedIndex ? 'text-primary' : 'group-hover:text-primary'
                        }`}>
                          {snippet.title}
                        </h3>
                        <Badge variant="secondary" className="shrink-0">
                          {snippet.language}
                        </Badge>
                      </div>
                      <p className="text-[9px] text-muted-foreground line-clamp-1">
                        {snippet.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                      </p>
                    </div>
                    <div className="text-[9px] text-muted-foreground shrink-0">
                      {new Date(snippet.updated_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {filteredSnippets.length > 0 && (
          <div className="border-t px-2 py-1 bg-muted/30 text-[9px] text-muted-foreground text-center">
            Found {filteredSnippets.length} snippet{filteredSnippets.length !== 1 ? 's' : ''}
            {useSemanticSearch && modelStatus.loaded && (
              <span className="ml-1">
                • <Sparkles className="inline h-2 w-2 text-purple-500" /> AI-powered
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}