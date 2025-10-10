import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Plus, Search, FileCode, X, Edit, Trash2, Copy, Save, Brain, Download, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
  
  // Form state
  const [title, setTitle] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [tags, setTags] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')

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
      alert('AI model loaded successfully! You can now use semantic search.')
    } catch (error) {
      console.error('Failed to load model:', error)
      alert('AI Search is not available yet.\n\nThe feature requires downloading a 22MB model file, but automatic download is still being implemented.\n\nYou can continue using keyword search for now.')
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
      alert('Title is required')
      return
    }
    if (!content.trim()) {
      alert('Content is required')
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
      } else {
        await invoke('create_snippet', { snippet })
      }
      
      await loadSnippets()
      setIsEditing(false)
      setCurrentSnippet(null)
    } catch (error) {
      console.error('Failed to save snippet:', error)
      alert('Failed to save snippet')
    }
  }

  const handleDeleteSnippet = async (snippet) => {
    if (!confirm(`Are you sure you want to delete "${snippet.title}"?`)) {
      return
    }

    try {
      await invoke('delete_snippet', { id: snippet.id })
      await loadSnippets()
      if (currentSnippet?.id === snippet.id) {
        setCurrentSnippet(null)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Failed to delete snippet:', error)
      alert('Failed to delete snippet')
    }
  }

  const handleCopyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileCode className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">SnippetVault</h1>
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
          {filteredSnippets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <FileCode className="h-12 w-12 text-muted-foreground mb-2" />
              <h2 className="text-lg font-semibold">No snippets yet</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first code snippet
              </p>
              <Button onClick={handleNewSnippet} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Snippet
              </Button>
            </div>
          ) : (
            filteredSnippets.map((snippet) => (
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
            ))
          )}
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
                  placeholder="Snippet title..."
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
                  rows={2}
                />
              </div>

              <div className="flex-1">
                <Textarea
                  placeholder="Paste your code here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={20}
                  className="font-mono text-sm"
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
              <pre className="text-sm font-mono whitespace-pre-wrap">{currentSnippet.content}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
