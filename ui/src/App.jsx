import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Plus, Search, FileCode, X, Edit, Trash2, Copy, Save, Brain, Download, Sparkles, CheckCircle, AlertCircle, Info, PanelLeftClose, PanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import './editor.css'

function App() {
  const [snippets, setSnippets] = useState([])
  const [currentSnippet, setCurrentSnippet] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredSnippets, setFilteredSnippets] = useState([])
  
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

  // Search snippets when search changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSnippets(snippets)
    } else {
      handleSearch(searchQuery)
    }
  }, [searchQuery, snippets, useSemanticSearch])

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + K for search focus
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.querySelector('input[placeholder*="Search"]')?.focus()
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
      setFilteredSnippets(snippets)
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
        // Use AI semantic search
        console.log('✨ Using AI semantic search...')
        const results = await invoke('semantic_search', { query })
        console.log('✅ AI results:', results.length, 'snippets')
        setFilteredSnippets(results.map(r => r.snippet))
      } else {
        console.log('📝 Using keyword search...')
        // Use keyword search
        const queryLower = query.toLowerCase()
        const filtered = snippets.filter(snippet =>
          snippet.title.toLowerCase().includes(queryLower) ||
          snippet.language.toLowerCase().includes(queryLower) ||
          snippet.content.toLowerCase().includes(queryLower) ||
          (snippet.tags && snippet.tags.toLowerCase().includes(queryLower))
        )
        setFilteredSnippets(filtered)
      }
    } catch (error) {
      console.error('Search failed:', error)
      // Fallback to keyword search
      const queryLower = query.toLowerCase()
      const filtered = snippets.filter(snippet =>
        snippet.title.toLowerCase().includes(queryLower) ||
        snippet.language.toLowerCase().includes(queryLower) ||
        snippet.content.toLowerCase().includes(queryLower) ||
        (snippet.tags && snippet.tags.toLowerCase().includes(queryLower))
      )
      setFilteredSnippets(filtered)
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
      if (currentSnippet) {
        await invoke('update_snippet', { id: currentSnippet.id, snippet })
        showToast('Snippet updated successfully', 'success')
      } else {
        await invoke('create_snippet', { snippet })
        showToast('Snippet created successfully', 'success')
      }
      
      await loadSnippets()
      setIsEditing(false)
      setCurrentSnippet(null)
    } catch (error) {
      console.error('Failed to save snippet:', error)
      showToast('Failed to save snippet', 'error')
    }
  }

  const handleDeleteSnippet = async (snippet) => {
    if (!confirm(`Are you sure you want to delete "${snippet.title}"?`)) {
      return
    }

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
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div 
          className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4"
          style={{
            animation: 'slideDown 0.3s ease-out'
          }}
        >
          <div 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border max-w-md w-full ${
              toast.type === 'error' 
                ? 'bg-destructive border-destructive text-destructive-foreground' 
                : toast.type === 'success' 
                ? 'bg-primary border-primary text-primary-foreground' 
                : 'bg-accent border-border text-foreground'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="h-5 w-5 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="h-5 w-5 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="h-5 w-5 flex-shrink-0" />}
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="flex-shrink-0 hover:opacity-70 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Resizable Sidebar */}
      <div 
        className={`border-r flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-0 overflow-hidden' : ''
        }`}
        style={{ width: sidebarCollapsed ? 0 : `${sidebarWidth}px` }}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Snippets</h1>
              <Badge variant="secondary" className="text-xs">{snippets.length}</Badge>
            </div>
            <Button onClick={handleNewSnippet} size="sm" className="h-8 w-8 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* AI Model Status - Collapsible */}
          <details className="group" open={modelStatus.loaded}>
            <summary className="flex items-center justify-between cursor-pointer list-none p-2 rounded-md hover:bg-accent transition-colors">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <span className="text-sm font-medium">AI Search</span>
              </div>
              {modelStatus.loaded ? (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              ) : (
                <Button 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLoadModel()
                  }} 
                  size="sm" 
                  variant="ghost"
                  disabled={isLoadingModel}
                  className="h-6 text-xs px-2"
                >
                  {isLoadingModel ? 'Loading...' : <Download className="h-3 w-3" />}
                </Button>
              )}
            </summary>
            {modelStatus.loaded && (
              <div className="flex items-center gap-2 px-2 pt-2">
                <input
                  type="checkbox"
                  id="semantic-search"
                  checked={useSemanticSearch}
                  onChange={(e) => setUseSemanticSearch(e.target.checked)}
                  className="h-3 w-3 rounded border-input"
                />
                <label htmlFor="semantic-search" className="text-xs text-muted-foreground cursor-pointer">
                  Natural language search
                </label>
              </div>
            )}
          </details>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={useSemanticSearch ? "Ask anything..." : "Search snippets..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 pr-8 text-sm"
            />
            {useSemanticSearch && (
              <Sparkles className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
            )}
          </div>
        </div>

        {/* Snippets List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredSnippets.map((snippet) => (
            <Card
              key={snippet.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                currentSnippet?.id === snippet.id 
                  ? 'bg-accent border-primary shadow-sm' 
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => {
                setCurrentSnippet(snippet)
                setIsEditing(false)
              }}
            >
              <CardHeader className="p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-medium leading-tight line-clamp-2 flex-1">
                    {snippet.title}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {snippet.language}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{new Date(snippet.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  {snippet.tags && (
                    <>
                      <span>•</span>
                      <span className="truncate">{snippet.tags.split(',')[0]}</span>
                    </>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
          
          {filteredSnippets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No snippets found</p>
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
        <div className="border-b px-4 py-2 flex items-center gap-3 bg-background">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-8 w-8 p-0"
          >
            {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
          {currentSnippet && !isEditing && (
            <span className="text-sm text-muted-foreground truncate">
              {currentSnippet.title}
            </span>
          )}
          {isEditing && (
            <span className="text-sm text-muted-foreground">
              {currentSnippet ? 'Editing' : 'New Snippet'}
            </span>
          )}
        </div>

        {/* Content Area */}
        {!currentSnippet && !isEditing ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Select a snippet</h2>
              <p className="text-muted-foreground mb-4">
                Or create a new one to get started
              </p>
              <Button onClick={handleNewSnippet}>
                <Plus className="h-4 w-4 mr-2" />
                New Snippet
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Press <kbd className="px-2 py-1 bg-muted rounded text-xs">⌘ N</kbd> to create a new snippet
              </p>
            </div>
          </div>
        ) : isEditing ? (
          // Editor Mode
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Editor Header */}
            <div className="border-b px-4 py-3 flex items-center justify-between bg-background">
              <h2 className="text-lg font-semibold">
                {currentSnippet ? 'Edit Snippet' : 'New Snippet'}
              </h2>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveSnippet}>
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save
                </Button>
              </div>
            </div>

            {/* Editor Form */}
            <div className="flex-1 overflow-auto p-4">
              <div className="max-w-4xl mx-auto space-y-3">
                <Input
                  placeholder="Snippet title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-base font-medium"
                />

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    className="h-9"
                  />
                </div>

                <Textarea
                  placeholder="Description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="resize-none"
                />

                <div className="border rounded-lg overflow-hidden">
                  <ReactQuill
                    theme="snow"
                    value={content}
                    onChange={setContent}
                    placeholder="Paste your code here..."
                    className="h-[calc(100vh-380px)]"
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
          </div>
        ) : (
          // View Mode
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* View Header */}
            <div className="border-b px-4 py-3 flex items-center justify-between bg-background">
              <div className="flex-1 min-w-0 mr-4">
                <h2 className="text-xl font-bold truncate mb-1">{currentSnippet.title}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{currentSnippet.language}</Badge>
                  {currentSnippet.tags && currentSnippet.tags.split(',').map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag.trim()}</Badge>
                  ))}
                  <span className="text-xs text-muted-foreground">
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
                  size="sm"
                  onClick={() => handleCopyCode(currentSnippet.content)}
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditSnippet(currentSnippet)}
                >
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteSnippet(currentSnippet)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* View Content */}
            <div className="flex-1 overflow-auto p-4">
              {currentSnippet.description && (
                <div className="mb-4 p-3 bg-muted/50 rounded-md border-l-2 border-primary">
                  <p className="text-sm text-muted-foreground">{currentSnippet.description}</p>
                </div>
              )}
              <div className="prose prose-sm max-w-none dark:prose-invert" 
                   dangerouslySetInnerHTML={{ __html: currentSnippet.content }} 
              />
            </div>
          </div>
        )}
      </div>

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