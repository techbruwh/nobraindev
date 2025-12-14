import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Plus, Search, FileCode, X, Edit, Trash2, Copy, Save, Brain, Download, Sparkles, CheckCircle, AlertCircle, Info } from 'lucide-react'
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
    <div className="flex h-screen bg-background">
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

      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileCode className="h-6 w-6 text-primary" />
              <h1 className="text-xl">Snippets</h1>
            </div>
            <Button onClick={handleNewSnippet} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* AI Model Status */}
          <div className="mb-3 p-2 bg-muted rounded-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <span className="text-sm font-medium">AI Search</span>
              </div>
              {modelStatus.loaded ? (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Loaded
                </Badge>
              ) : (
                <Button 
                  onClick={handleLoadModel} 
                  size="sm" 
                  variant="outline"
                  disabled={isLoadingModel}
                  className="h-6 text-xs"
                >
                  {isLoadingModel ? (
                    'Loading...'
                  ) : (
                    <>
                      <Download className="h-3 w-3 mr-1" />
                      Load
                    </>
                  )}
                </Button>
              )}
            </div>
            {modelStatus.loaded && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="semantic-search"
                  checked={useSemanticSearch}
                  onChange={(e) => setUseSemanticSearch(e.target.checked)}
                  className="h-3 w-3"
                />
                <label htmlFor="semantic-search" className="text-xs text-muted-foreground cursor-pointer">
                  Use natural language search
                </label>
              </div>
            )}
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={useSemanticSearch ? "Ask in natural language..." : "Search snippets..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {useSemanticSearch && (
              <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
            )}
          </div>
        </div>

        {/* Snippets List */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredSnippets.map((snippet) => (
              <Card
                key={snippet.id}
                className={`mb-2 cursor-pointer transition-colors ${
                  currentSnippet?.id === snippet.id ? 'bg-accent' : 'hover:bg-accent/50'
                }`}
                onClick={() => {
                  setCurrentSnippet(snippet)
                  setIsEditing(false)
                }}
              >
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm font-semibold truncate">
                    {snippet.title}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {snippet.language}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(snippet.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {snippet.content.substring(0, 100)}...
                  </p>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
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
            </div>
          </div>
        ) : isEditing ? (
          // Editor Mode
          <div className="flex-1 flex flex-col p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">
                {currentSnippet ? 'Edit Snippet' : 'New Snippet'}
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSaveSnippet}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Input
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-semibold"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Tags (comma-separated)..."
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Textarea
                  placeholder="Description (optional)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={1}
                />
              </div>

              <div className="flex-1">
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  placeholder="Paste your code here..."
                  className="h-[500px] mb-12"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      ['blockquote', 'code-block'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'color': [] }, { 'background': [] }],
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
          <div className="flex-1 flex flex-col p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">{currentSnippet.title}</h2>
                <div className="flex items-center gap-3">
                  <Badge>{currentSnippet.language}</Badge>
                  <span className="text-sm text-muted-foreground">
                    Updated {new Date(currentSnippet.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleCopyCode(currentSnippet.content)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleEditSnippet(currentSnippet)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteSnippet(currentSnippet)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            {currentSnippet.description && (
              <p className="text-muted-foreground mb-4">{currentSnippet.description}</p>
            )}

            <div className="flex-1 bg-muted rounded-lg p-4 overflow-auto">
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: currentSnippet.content }} />
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
      `}</style>
    </div>
  )
}

export default App