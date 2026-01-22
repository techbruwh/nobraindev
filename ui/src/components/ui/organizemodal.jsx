import { useState, useEffect } from 'react'
import { Folder, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function OrganizeModal({
  isOpen,
  onClose,
  snippets,
  folders,
  onOrganize
}) {
  const [mappings, setMappings] = useState({}) // { snippetId: folderId }

  useEffect(() => {
    // Initialize with null (uncategorized) for all snippets
    if (isOpen) {
      const initialMappings = {}
      snippets.forEach(s => {
        initialMappings[s.id] = s.folder_id || null
      })
      setMappings(initialMappings)
    }
  }, [isOpen, snippets])

  const handleSnippetFolderChange = (snippetId, folderId) => {
    setMappings(prev => ({
      ...prev,
      [snippetId]: folderId
    }))
  }

  const handleOrganize = () => {
    const mappingArray = Object.entries(mappings).map(([snippetId, folderId]) => [
      parseInt(snippetId),
      folderId
    ])
    onOrganize(mappingArray)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold">Organize Your Snippets</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-accent rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            You have {snippets.length} uncategorized snippet{snippets.length !== 1 ? 's' : ''}.
            Organize them into folders to keep your snippets tidy.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <div className="space-y-3">
            {snippets.map(snippet => (
              <div
                key={snippet.id}
                className="flex items-center gap-3 p-3 border border-border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium truncate">
                    {snippet.title}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {snippet.content?.substring(0, 60)}...
                  </p>
                </div>

                <select
                  value={mappings[snippet.id] || 'uncategorized'}
                  onChange={(e) => handleSnippetFolderChange(
                    snippet.id,
                    e.target.value === 'uncategorized' ? null : parseInt(e.target.value)
                  )}
                  className="px-3 py-1.5 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="uncategorized">Uncategorized</option>
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {snippets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>All snippets are organized!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-muted/30 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Skip for now
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                // Organize all as uncategorized
                onClose()
              }}
            >
              Leave uncategorized
            </Button>
            <Button
              onClick={handleOrganize}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={snippets.length === 0}
            >
              <Check className="h-4 w-4 mr-1" />
              Organize {snippets.length} snippet{snippets.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
