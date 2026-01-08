import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Plus, Search, FileCode, X, Edit, Trash2, Copy, Save, Brain, Download, Sparkles, CheckCircle, AlertCircle, Info, PanelLeftClose, PanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { SearchBar } from '@/components/ui/searchbar'
import { SearchModal } from '@/components/ui/searchmodal'
import { ConfirmDialog } from '@/components/ui/confirmdialog'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import './editor.css'

function App() {
  const [snippets, setSnippets] = useState([])
  const [currentSnippet, setCurrentSnippet] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredSnippets, setFilteredSnippets] = useState([])
  
  // Search Modal state - separate from sidebar filtering
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [isMac, setIsMac] = useState(false)
  
  // AI Model state
  const [modelStatus, setModelStatus] = useState({ loaded: false, downloaded: false })
  const [isLoadingModel, setIsLoadingModel] = useState(false)
  const [useSemanticSearch, setUseSemanticSearch] = useState(false)
  
  // Toast notification state
  const [toast, setToast] = useState(null)
  
  // Layout state
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [isResizing, setIsResizing] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // Form state
  const [title, setTitle] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [tags, setTags] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  
  // Quill editor ref
  const quillRef = useRef(null)

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })

  // Detect OS
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0)
  }, [])

  // Show toast notification
  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Load snippets and check model status on mount
  useEffect(() => {
    loadSnippets()
    checkModelStatus()
  }, [])

  // Always show all snippets in sidebar (no filtering)
  useEffect(() => {
    setFilteredSnippets(snippets)
  }, [snippets])

  // Search for modal results when query changes
  useEffect(() => {
    if (isSearchModalOpen && searchQuery.trim()) {
      handleSearch(searchQuery)
    } else if (isSearchModalOpen) {
      setSearchResults(snippets)
    }
  }, [searchQuery, snippets, useSemanticSearch, isSearchModalOpen])

  // Handle sidebar resize
  const handleMouseDown = (e) => {
    setIsResizing(true)
    e.preventDefault()
  }
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return
      const newWidth = Math.min(Math.max(e.clientX, 240), 500)
      setSidebarWidth(newWidth)
    }
    
    const handleMouseUp = () => {
      setIsResizing(false)
    }
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  // Setup Quill tab handler
  useEffect(() => {
    if (quillRef.current && isEditing) {
      const quill = quillRef.current.getEditor()
      
      // Override tab key behavior
      const handleTab = (e) => {
        if (e.key === 'Tab' && !e.shiftKey) {
          const selection = quill.getSelection()
          if (selection) {
            const format = quill.getFormat(selection.index)
            if (format['code-block']) {
              e.preventDefault()
              e.stopPropagation()
              
              // Get the current line
              const [line] = quill.getLine(selection.index)
              
              // Insert HTML with non-breaking spaces directly
              const range = quill.getSelection()
              const delta = quill.clipboard.convert({ html: '&nbsp;&nbsp;' })
              quill.updateContents(
                new (quill.constructor.import('delta'))()
                  .retain(range.index)
                  .concat(delta),
                'user'
              )
              quill.setSelection(range.index + 2, 0)
              
              return false
            }
          }
        }
      }
      
      const editorElement = quill.root
      editorElement.addEventListener('keydown', handleTab, { capture: true })
      
      return () => {
        editorElement.removeEventListener('keydown', handleTab, { capture: true })
      }
    }
  }, [isEditing])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchModalOpen(true)
      }
      // Cmd/Ctrl + N for new snippet
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        handleNewSnippet()
      }
      // Cmd/Ctrl + S for save (when editing)
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && isEditing) {
        e.preventDefault()
        handleSaveSnippet()
      }
      // Escape to cancel editing
      if (e.key === 'Escape' && isEditing) {
        setIsEditing(false)
      }
      // Cmd/Ctrl + B to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setSidebarCollapsed(!sidebarCollapsed)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditing, sidebarCollapsed])

  const loadSnippets = async () => {
    try {
      const data = await invoke('get_all_snippets')
      setSnippets(data)
      setFilteredSnippets(data)
    } catch (error) {
      console.error('Failed to load snippets:', error)
    }
  }

  const checkModelStatus = async () => {
    try {
      const status = await invoke('get_model_status')
      setModelStatus(status)
    } catch (error) {
      console.error('Failed to check model status:', error)
    }
  }

  const handleLoadModel = async () => {
    setIsLoadingModel(true)
    try {
      await invoke('load_model')
      await checkModelStatus()
      showToast('AI model loaded successfully! You can now use semantic search.', 'success')
    } catch (error) {
      console.error('Failed to load model:', error)
      showToast('AI Search is not available yet. The feature requires downloading a 22MB model file.', 'error')
    } finally {
      setIsLoadingModel(false)
    }
  }

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults(snippets)
      return
    }

    console.log('🔍 Search Debug:', {
      query,
      useSemanticSearch,
      modelLoaded: modelStatus.loaded,
      willUseAI: useSemanticSearch && modelStatus.loaded
    })

    try {
      if (useSemanticSearch && modelStatus.loaded) {
        console.log('✨ Using AI semantic search...')
        const results = await invoke('semantic_search', { query })
        console.log('✅ AI results:', results.length, 'snippets')
        setSearchResults(results.map(r => r.snippet))
      } else {
        console.log('📝 Using keyword search...')
        const queryLower = query.toLowerCase()
        const filtered = snippets.filter(snippet =>
          snippet.title.toLowerCase().includes(queryLower) ||
          snippet.language.toLowerCase().includes(queryLower) ||
          snippet.content.toLowerCase().includes(queryLower) ||
          (snippet.tags && snippet.tags.toLowerCase().includes(queryLower))
        )
        setSearchResults(filtered)
      }
    } catch (error) {
      console.error('Search failed:', error)
      const queryLower = query.toLowerCase()
      const filtered = snippets.filter(snippet =>
        snippet.title.toLowerCase().includes(queryLower) ||
        snippet.language.toLowerCase().includes(queryLower) ||
        snippet.content.toLowerCase().includes(queryLower) ||
        (snippet.tags && snippet.tags.toLowerCase().includes(queryLower))
      )
      setSearchResults(filtered)
    }
  }

  const handleNewSnippet = () => {
    setCurrentSnippet(null)
    setIsEditing(true)
    setTitle('')
    setLanguage('javascript')
    setTags('')
    setDescription('')
    setContent('')
  }

  const handleEditSnippet = (snippet) => {
    setCurrentSnippet(snippet)
    setIsEditing(true)
    setTitle(snippet.title)
    setLanguage(snippet.language)
    setTags(snippet.tags || '')
    setDescription(snippet.description || '')
    setContent(snippet.content)
  }

  const handleSaveSnippet = async () => {
    if (!title.trim()) {
      showToast('Title is required', 'error')
      return
    }
    if (!content.trim()) {
      showToast('Content is required', 'error')
      return
    }

    const snippet = {
      title: title.trim(),
      language,
      tags: tags.trim() || null,
      description: description.trim() || null,
      content: content.trim(),
      created_at: '',
      updated_at: ''
    }

    try {
      const savedTitle = title.trim()
      const savedId = currentSnippet?.id
      
      if (currentSnippet) {
        await invoke('update_snippet', { id: currentSnippet.id, snippet })
        showToast('Snippet updated successfully', 'success')
      } else {
        await invoke('create_snippet', { snippet })
        showToast('Snippet created successfully', 'success')
      }
      
      await loadSnippets()
      setIsEditing(false)
      
      // Wait a bit for state to update, then find and select the saved snippet
      setTimeout(() => {
        setSnippets(prev => {
          const savedSnippet = prev.find(s => 
            savedId ? s.id === savedId : s.title === savedTitle
          )
          if (savedSnippet) {
            setCurrentSnippet(savedSnippet)
          }
          return prev
        })
      }, 100)
    } catch (error) {
      console.error('Failed to save snippet:', error)
      showToast('Failed to save snippet', 'error')
    }
  }

  const handleDeleteSnippet = async (snippet) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Snippet',
      message: `Are you sure you want to delete "${snippet.title}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await invoke('delete_snippet', { id: snippet.id })
          showToast('Snippet deleted successfully', 'success')
          await loadSnippets()
          if (currentSnippet?.id === snippet.id) {
            setCurrentSnippet(null)
            setIsEditing(false)
          }
        } catch (error) {
          console.error('Failed to delete snippet:', error)
          showToast('Failed to delete snippet', 'error')
        }
      }
    })
  }

  const handleCopyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      showToast('Code copied to clipboard', 'success')
    } catch (error) {
      console.error('Failed to copy:', error)
      showToast('Failed to copy code', 'error')
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Search Bar - Below Native Title Bar */}
      <SearchBar 
        onSearchClick={() => setIsSearchModalOpen(true)}
        useSemanticSearch={useSemanticSearch}
        modelStatus={modelStatus}
        isLoadingModel={isLoadingModel}
        onLoadModel={handleLoadModel}
        isMac={isMac}
        searchQuery={searchQuery}
        isSearchOpen={isSearchModalOpen}
        onClearSearch={() => setSearchQuery('')}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => {
          setIsSearchModalOpen(false)
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        useSemanticSearch={useSemanticSearch}
        onToggleSemanticSearch={setUseSemanticSearch}
        modelStatus={modelStatus}
        isLoadingModel={isLoadingModel}
        onLoadModel={handleLoadModel}
        filteredSnippets={searchResults}
        onSelectSnippet={(snippet) => {
          setCurrentSnippet(snippet)
          setIsEditing(false)
          setIsSearchModalOpen(false)
        }}
        isMac={isMac}
      />

      {/* Toast Notification */}
      {toast && (
        <div 
          className="fixed top-12 left-0 right-0 z-40 flex justify-center px-4"
          style={{ animation: 'slideDown 0.3s ease-out' }}
        >
          <div 
            className={`flex items-center gap-2 px-3 py-2 rounded-md shadow-lg border max-w-md w-full ${
              toast.type === 'error' 
                ? 'bg-destructive border-destructive text-destructive-foreground' 
                : toast.type === 'success' 
                ? 'bg-primary border-primary text-primary-foreground' 
                : 'bg-accent border-border text-foreground'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="h-3.5 w-3.5 flex-shrink-0" />}
            <p className="text-xs font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="flex-shrink-0 hover:opacity-70 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Resizable Sidebar */}
        <div 
          className={`border-r flex flex-col transition-all duration-300 ${
            sidebarCollapsed ? 'w-0 overflow-hidden' : ''
          }`}
          style={{ width: sidebarCollapsed ? 0 : `${sidebarWidth}px` }}
        >
          {/* Sidebar Header */}
          <div className="p-2 border-b space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                
                <h1 className="text-sm font-semibold">Snippets</h1>
                <Badge variant="secondary">{snippets.length}</Badge>
              </div>
              <Button onClick={handleNewSnippet} >
               <Plus className="h-3.5 w-3.5" /> New snippet
              </Button>
            </div>
            
            
          </div>

          {/* Snippets List */}
          <div className="flex-1 overflow-y-auto p-1 space-y-1">
            {filteredSnippets.map((snippet) => (
              <button
                key={snippet.id}
                className={`w-full p-2 rounded-md transition-colors text-left group border ${
                  currentSnippet?.id === snippet.id 
                    ? 'bg-accent border-primary' 
                    : 'border-border/50 hover:bg-accent hover:border-border'
                }`}
                onClick={() => {
                  setCurrentSnippet(snippet)
                  setIsEditing(false)
                }}
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
            
            {filteredSnippets.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-[10px]">No snippets found</p>
              </div>
            )}
          </div>
        </div>

        {/* Resize Handle */}
        {!sidebarCollapsed && (
          <div
            className="w-1 hover:w-1.5 bg-border hover:bg-primary cursor-col-resize transition-all flex-shrink-0"
            onMouseDown={handleMouseDown}
            style={{ userSelect: 'none' }}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar */}
          <div className="border-b px-3 py-1.5 flex items-center gap-2 bg-background">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? <PanelLeft className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
            </Button>
            {currentSnippet && !isEditing && (
              <span className="text-xs text-muted-foreground truncate">
                {currentSnippet.title}
              </span>
            )}
            {isEditing && (
              <span className="text-xs text-muted-foreground">
                {currentSnippet ? 'Editing' : 'New Snippet'}
              </span>
            )}
          </div>

          {/* Content Area */}
          {!currentSnippet && !isEditing ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileCode className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h2 className="text-lg font-semibold mb-1.5">Select a snippet</h2>
                <p className="text-xs text-muted-foreground mb-3">
                  Or create a new one to get started
                </p>
                <Button onClick={handleNewSnippet}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  New Snippet
                </Button>
                <p className="text-[10px] text-muted-foreground mt-3">
                  Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘ N</kbd> to create a new snippet
                </p>
              </div>
            </div>
          ) : isEditing ? (
            // Editor Mode
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Editor Header */}
              <div className="border-b px-3 py-2 flex items-center justify-between bg-background">
                <h2 className="text-sm font-semibold">
                  {currentSnippet ? 'Edit Snippet' : 'New Snippet'}
                </h2>
                <div className="flex gap-1.5">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                  <Button onClick={handleSaveSnippet}>
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                </div>
              </div>

              {/* Editor Form */}
              <div className="flex-1 overflow-auto p-3">
                <div className="max-w-4xl mx-auto space-y-2">
                  <Input
                    placeholder="Snippet title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-sm font-medium"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="flex h-7 w-full rounded-md border border-border bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="typescript">TypeScript</option>
                      <option value="python">Python</option>
                      <option value="rust">Rust</option>
                      <option value="go">Go</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                      <option value="csharp">C#</option>
                      <option value="php">PHP</option>
                      <option value="ruby">Ruby</option>
                      <option value="swift">Swift</option>
                      <option value="kotlin">Kotlin</option>
                      <option value="html">HTML</option>
                      <option value="css">CSS</option>
                      <option value="sql">SQL</option>
                      <option value="bash">Bash</option>
                      <option value="json">JSON</option>
                      <option value="yaml">YAML</option>
                      <option value="markdown">Markdown</option>
                      <option value="others">Others</option>
                    </select>
                    <Input
                      placeholder="Tags (comma-separated)"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                  </div>

                  <Textarea
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />

                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={content}
                    onChange={setContent}
                    placeholder="Paste your code here..."
                    className="h-[calc(100vh-320px)]"
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'code'],
                        ['blockquote', 'code-block'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['link'],
                        ['clean']
                      ]
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            // View Mode
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* View Header */}
              <div className="border-b px-3 py-2 flex items-center justify-between bg-background">
                <div className="flex-1 min-w-0 mr-3">
                  <h2 className="text-sm font-bold truncate mb-1">{currentSnippet.title}</h2>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline">{currentSnippet.language}</Badge>
                    {currentSnippet.tags && currentSnippet.tags.split(',').map(tag => (
                      <Badge key={tag} variant="secondary">{tag.trim()}</Badge>
                    ))}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(currentSnippet.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    onClick={() => handleCopyCode(currentSnippet.content)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleEditSnippet(currentSnippet)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteSnippet(currentSnippet)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* View Content */}
              <div className="flex-1 overflow-auto p-3">
                {currentSnippet.description && (
                  <div className="mb-3 p-3 bg-muted/30 rounded-md border border-border">
                    <div className="flex items-start gap-2">
                      <div className="shrink-0 mt-0.5">
                        <div className="w-1 h-1 rounded-full bg-primary" />
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{currentSnippet.description}</p>
                    </div>
                  </div>
                )}
                <div className="ql-snow-content" 
                     dangerouslySetInnerHTML={{ __html: currentSnippet.content }} 
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-background px-4 py-1.5 flex items-center justify-center">
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          made with <span className="text-red-500">♥</span> by{' '}
          <a 
            href="https://techbruwh.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-medium hover:text-primary transition-colors"
          >
            techbruwh
          </a>
        </p>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />

      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        kbd {
          font-family: ui-monospace, SFMono-Regular, 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace;
        }
      `}</style>
    </div>
  )
}

export default App