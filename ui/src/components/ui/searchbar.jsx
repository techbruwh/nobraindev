import { Search, Sparkles, Brain, Download, Loader2, X, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { open } from '@tauri-apps/plugin-shell'

export function SearchBar({ 
  onSearchClick, 
  useSemanticSearch, 
  modelStatus,
  isLoadingModel,
  onLoadModel,
  isMac,
  searchQuery,
  isSearchOpen,
  onClearSearch
}) {
  return (
    <div className="h-10 bg-background border-b flex items-center justify-between px-4 relative overflow-hidden">
      {/* Gradient background overlay for AI branding */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
      
      {/* App Icon - Left side */}
      <div className="w-6 h-6 shrink-0 z-10">
        <img 
          src="/icon-192.png" 
          alt="App Icon" 
          className="w-full h-full object-contain rounded"
        />
      </div>
      
      {/* Search Button - Centered, hidden when search is open */}
      {!isSearchOpen && (
        <button
          onClick={onSearchClick}
          className="w-full max-w-lg z-10 group mx-4"
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
      )}
      
      {/* Star on GitHub Button - Right side */}
      <Button 
        variant="outline" 
        size="sm" 
        className="gap-1 shrink-0 z-10"
        onClick={() => open('https://github.com/techbruwh/nobraindev')}
      >
        <Star className="h-3 w-3" />
        <span className="hidden sm:inline">Star on GitHub</span>
      </Button>
    </div>
  )
}