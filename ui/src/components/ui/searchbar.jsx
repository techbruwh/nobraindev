import { Search, Sparkles, X, Star, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirmdialog'
import { useState } from 'react'

export function SearchBar({ 
  onSearchClick, 
  useSemanticSearch, 
  isMac,
  searchQuery,
  isSearchOpen,
  onClearSearch,
  onShowShortcuts
}) {
  const [showGitHubDialog, setShowGitHubDialog] = useState(false)
  return (
    <>
      <div className="h-10 bg-background border-b flex items-center relative overflow-hidden">
        {/* Gradient background overlay for AI branding */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
        
        {/* Menu sidebar space - keeps the gradient unified */}
        <div className="w-14 h-full border-r flex items-center justify-center z-10 shrink-0">
          <img 
            src="/icon-192.png" 
            alt="App Icon" 
            className="w-6 h-6 object-contain rounded"
          />
        </div>
        
        {/* Main search bar area */}
        <div className="flex-1 flex items-center justify-center px-4 z-10 min-w-0">
        
          {/* Search Button - Centered, flexible width */}
          <button
            onClick={onSearchClick}
            className="z-10 group"
            style={{ 
              visibility: isSearchOpen ? 'hidden' : 'visible',
              width: '100%',
              maxWidth: 'min(28rem, calc(100vw - 400px))',
              minWidth: '200px'
            }}
          >
            <div className="relative">
              {/* Gradient border effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-md opacity-30 group-hover:opacity-50 blur-sm transition-opacity" />
              
              <div className="relative flex items-center gap-2 h-7 px-3 bg-background/95 backdrop-blur-sm border border-border rounded-md hover:border-purple-500/50 transition-all">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground flex-1 text-left truncate">
                  {searchQuery || (useSemanticSearch ? "Ask AI anything..." : "Search snippets...")}
                </span>
                
                <div className="flex items-center gap-1.5">
                  {searchQuery && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onClearSearch()
                      }}
                      className="h-4 w-4 flex items-center justify-center hover:bg-accent rounded-sm transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  {useSemanticSearch && (
                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/20">
                      <Sparkles className="h-2.5 w-2.5 text-purple-500" />
                      <span className="text-[10px] font-medium text-purple-600">AI</span>
                    </div>
                  )}
                  <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-muted border border-border rounded">
                    {isMac ? '⌘' : 'Ctrl'}K
                  </kbd>
                </div>
              </div>
            </div>
          </button>
          
          {/* Right side buttons - positioned absolutely */}
          <div className="absolute right-4 flex items-center gap-2 shrink-0">
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1"
              onClick={onShowShortcuts}
              title="Keyboard Shortcuts (⌘/)"
            >
              <Keyboard className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1"
              onClick={() => setShowGitHubDialog(true)}
            >
              <Star className="h-3 w-3" />
              <span className="hidden sm:inline">Star on GitHub</span>
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showGitHubDialog}
        onClose={() => setShowGitHubDialog(false)}
        onConfirm={() => {
          navigator.clipboard.writeText('https://github.com/techbruwh/nobraindev')
          setShowGitHubDialog(false)
        }}
        title="Star on GitHub"
        message="Please copy this URL and paste it in your browser: https://github.com/techbruwh/nobraindev"
        confirmText="Copy URL"
        cancelText="Close"
        variant="default"
      />
    </>
  )
}