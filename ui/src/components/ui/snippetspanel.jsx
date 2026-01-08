import { Search, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function SnippetsPanel({ 
  snippets, 
  currentSnippet, 
  onSnippetClick, 
  onNewSnippet,
  sidebarCollapsed 
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-2 border-b space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-semibold">Snippets</h1>
            <Badge variant="secondary">{snippets.length}</Badge>
          </div>
          <Button onClick={onNewSnippet} size="sm">
            <Plus className="h-3.5 w-3.5" /> New snippet
          </Button>
        </div>
      </div>

      {/* Snippets List */}
      <div className="flex-1 overflow-y-auto p-1 space-y-1">
        {snippets.map((snippet) => (
          <button
            key={snippet.id}
            className={`w-full p-2 rounded-md transition-colors text-left group border ${
              currentSnippet?.id === snippet.id 
                ? 'bg-accent border-primary' 
                : 'border-border/50 hover:bg-accent hover:border-border'
            }`}
            onClick={() => onSnippetClick(snippet)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h3 className={`text-[10px] font-medium truncate transition-colors ${
                    currentSnippet?.id === snippet.id ? 'text-primary' : 'group-hover:text-primary'
                  }`}>
                    {snippet.title}
                  </h3>
                  <Badge variant="secondary" className="shrink-0">
                    {snippet.language}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                  <span>{new Date(snippet.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  {snippet.tags && (
                    <>
                      <span>•</span>
                      <span className="truncate">{snippet.tags.split(',')[0]}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
        
        {snippets.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-[10px]">No snippets found</p>
          </div>
        )}
      </div>
    </div>
  )
}
