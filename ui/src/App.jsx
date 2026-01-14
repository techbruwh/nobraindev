import { useState, useEffect, useRef, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Plus, Search, FileCode, X, Edit, Trash2, Copy, Save, Brain, Download, Sparkles, CheckCircle, AlertCircle, Info, PanelLeftClose, PanelLeft, Keyboard, Code, Braces, RefreshCw, Cloud, User } from 'lucide-react'
import { useSupabaseAuth } from '@/lib/supabase-auth'
import { syncService } from '@/lib/sync'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { SearchBar } from '@/components/ui/searchbar'
import { SearchModal } from '@/components/ui/searchmodal'
import { ConfirmDialog } from '@/components/ui/confirmdialog'
import { MenuSidebar } from '@/components/ui/menusidebar'
import { SnippetsPanel } from '@/components/ui/snippetspanel'
import { AccountPanel } from '@/components/ui/accountpanel'
import { ClipboardPanel } from '@/components/ui/clipboardpanel'
import { TiptapEditor } from '@/components/ui/tiptap-editor'
import 'reactjs-tiptap-editor/style.css'
import './tiptap.css'

function App() {
  const { user } = useSupabaseAuth()
  const isSignedIn = !!user
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
  
  // Ref to store the save function
  const saveSnippetRef = useRef(null)

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })

  // Shortcuts help modal state
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)

  // Menu sidebar state
  const [activeMenu, setActiveMenu] = useState('snippets')

  // Track if snippets have been modified
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState(null)

  // Track if clipboard has been modified
  const [hasUnsyncedClipboard, setHasUnsyncedClipboard] = useState(false)

  // Deletion tracking state
  const [isDeletingSnippet, setIsDeletingSnippet] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

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


  // Keep the save function ref updated
  useEffect(() => {
    saveSnippetRef.current = handleSaveSnippet
  }, [title, content, language, tags, description, currentSnippet])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchModalOpen(true)
        return
      }
      // Cmd/Ctrl + N for new snippet
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        handleNewSnippet()
        return
      }
      // Cmd/Ctrl + S for save (when editing)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        e.stopPropagation()
        console.log('Save shortcut triggered, isEditing:', isEditing)
        if (isEditing && saveSnippetRef.current) {
          console.log('Calling save function from ref')
          saveSnippetRef.current()
        }
        return
      }
      // Escape to cancel editing or close modals (priority: modals first, then editing)
      if (e.key === 'Escape') {
        if (showShortcutsHelp) {
          setShowShortcutsHelp(false)
        } else if (isEditing) {
          setIsEditing(false)
        }
        return
      }
      // Cmd/Ctrl + Shift + B to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'B' || e.key === 'b')) {
        e.preventDefault()
        setSidebarCollapsed(prev => !prev)
        return
      }
      // Cmd/Ctrl + / to show shortcuts help
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setShowShortcutsHelp(prev => !prev)
        return
      }
    }
    
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, sidebarCollapsed, showShortcutsHelp])


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
    console.log('handleSaveSnippet called', { title, content: content?.substring(0, 50) })
    
    if (!title?.trim()) {
      console.log('Title validation failed')
      showToast('Title is required', 'error')
      return
    }
    if (!content?.trim()) {
      console.log('Content validation failed')
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
      
      console.log('Saving snippet...', { savedId, savedTitle })
      
      if (currentSnippet) {
        await invoke('update_snippet', { id: currentSnippet.id, snippet })
        showToast('Snippet updated successfully', 'success')
      } else {
        await invoke('create_snippet', { snippet })
        showToast('Snippet created successfully', 'success')
      }
      
      // Mark as having unsynced changes
      setHasUnsyncedChanges(true)
      
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
      message: `Are you sure you want to delete "${snippet.title}"? This will be deleted from both local and cloud storage.`,
      onConfirm: async () => {
        setIsDeletingSnippet(true)
        setDeleteError(null)
        try {
          // Delete locally first
          await invoke('delete_snippet', { id: snippet.id })
          
          // Delete from cloud if user is signed in
          if (isSignedIn && user?.email) {
            try {
              await syncService.deleteFromCloud(user.email, snippet.id)
              showToast('Snippet deleted from local and cloud', 'success')
            } catch (cloudError) {
              console.warn('Failed to delete from cloud:', cloudError)
              setDeleteError('Deleted locally but failed to sync deletion to cloud')
              showToast('Deleted locally (cloud sync failed)', 'warning')
            }
          } else {
            showToast('Snippet deleted locally', 'success')
          }
          
          // Mark as having unsynced changes
          setHasUnsyncedChanges(true)
          
          await loadSnippets()
          if (currentSnippet?.id === snippet.id) {
            setCurrentSnippet(null)
            setIsEditing(false)
          }
        } catch (error) {
          console.error('Failed to delete snippet:', error)
          setDeleteError('Failed to delete snippet')
          showToast('Failed to delete snippet', 'error')
        } finally {
          setIsDeletingSnippet(false)
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
        onShowShortcuts={() => setShowShortcutsHelp(true)}
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
        {/* Menu Sidebar - Always visible */}
        <MenuSidebar 
          activeMenu={activeMenu}
          onMenuChange={setActiveMenu}
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* Resizable Content Sidebar */}
        <div 
          className={`border-r flex flex-col transition-all duration-300 ${
            sidebarCollapsed ? 'w-0 overflow-hidden' : ''
          }`}
          style={{ width: sidebarCollapsed ? 0 : `${sidebarWidth}px` }}
        >
          {activeMenu === 'snippets' && (
            <SnippetsPanel
              snippets={filteredSnippets}
              currentSnippet={currentSnippet}
              onSnippetClick={(snippet) => {
                setCurrentSnippet(snippet)
                setIsEditing(false)
              }}
              onNewSnippet={handleNewSnippet}
              onDeleteSnippet={handleDeleteSnippet}
              sidebarCollapsed={sidebarCollapsed}
              isDeleting={isDeletingSnippet}
              error={deleteError}
              hasUnsyncedChanges={hasUnsyncedChanges}
              onSyncComplete={(syncTime) => {
                setHasUnsyncedChanges(false)
                setLastSyncTime(syncTime)
              }}
              onSyncStart={() => {
                // Optionally handle sync start
              }}
            />
          )}
          
          {activeMenu === 'clipboard' && (
            <ClipboardPanel
              onConvertToSnippet={() => {
                setActiveMenu('snippets')
                loadSnippets()
                setHasUnsyncedChanges(true)
              }}
              onClipboardChanged={() => {
                setHasUnsyncedClipboard(true)
              }}
              hasUnsyncedClipboard={hasUnsyncedClipboard}
              onClipboardSyncComplete={(syncTime) => {
                setHasUnsyncedClipboard(false)
                setLastSyncTime(syncTime)
              }}
            />
          )}

          {activeMenu === 'account' && (
            <AccountPanel 
              hasUnsyncedChanges={hasUnsyncedChanges}
              lastSyncTime={lastSyncTime}
              onSyncComplete={(syncTime) => {
                setHasUnsyncedChanges(false)
                setLastSyncTime(syncTime)
              }}
              onSyncStart={() => {
                // Optionally handle sync start
              }}
            />
          )}
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

                  <div className="h-[calc(100vh-320px)] overflow-auto">
                    <TiptapEditor
                      content={content}
                      onChange={setContent}
                      editable={true}
                    />
                  </div>
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
                <TiptapEditor
                  content={currentSnippet.content}
                  onChange={() => {}}
                  editable={false}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-background px-4 py-1.5 flex items-center justify-between">
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
        
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground flex items-center gap-1">
            <Cloud className="h-3 w-3" />
            {lastSyncTime ? (
              <>Last synced: {lastSyncTime.toLocaleTimeString()}</>
            ) : (
              <>Not synced yet</>
            )}
          </span>
        </div>
      </div>

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowShortcutsHelp(false)}>
          <div className="bg-background border border-border rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-background border-b px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Keyboard Shortcuts</h2>
              </div>
              <button onClick={() => setShowShortcutsHelp(false)} className="hover:bg-accent rounded p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* General Shortcuts */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">General</h3>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50">
                    <span className="text-xs">Search snippets</span>
                    <kbd className="px-2 py-1 text-[10px] font-medium bg-muted border border-border rounded">{isMac ? '⌘' : 'Ctrl'} K</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50">
                    <span className="text-xs">New snippet</span>
                    <kbd className="px-2 py-1 text-[10px] font-medium bg-muted border border-border rounded">{isMac ? '⌘' : 'Ctrl'} N</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50">
                    <span className="text-xs">Toggle sidebar</span>
                    <kbd className="px-2 py-1 text-[10px] font-medium bg-muted border border-border rounded">{isMac ? '⌘' : 'Ctrl'} Shift B</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50">
                    <span className="text-xs">Show shortcuts</span>
                    <kbd className="px-2 py-1 text-[10px] font-medium bg-muted border border-border rounded">{isMac ? '⌘' : 'Ctrl'} /</kbd>
                  </div>
                </div>
              </div>

              {/* Editor Shortcuts */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Editor</h3>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50">
                    <span className="text-xs">Save snippet</span>
                    <kbd className="px-2 py-1 text-[10px] font-medium bg-muted border border-border rounded">{isMac ? '⌘' : 'Ctrl'} S</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50">
                    <span className="text-xs">Cancel editing</span>
                    <kbd className="px-2 py-1 text-[10px] font-medium bg-muted border border-border rounded">Esc</kbd>
                  </div>
                </div>
              </div>

              {/* Text Formatting */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Text Formatting</h3>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50">
                    <span className="text-xs font-bold">Bold</span>
                    <kbd className="px-2 py-1 text-[10px] font-medium bg-muted border border-border rounded">{isMac ? '⌘' : 'Ctrl'} B</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50">
                    <span className="text-xs italic">Italic</span>
                    <kbd className="px-2 py-1 text-[10px] font-medium bg-muted border border-border rounded">{isMac ? '⌘' : 'Ctrl'} I</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50">
                    <span className="text-xs underline">Underline</span>
                    <kbd className="px-2 py-1 text-[10px] font-medium bg-muted border border-border rounded">{isMac ? '⌘' : 'Ctrl'} U</kbd>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t px-4 py-3 bg-muted/30">
              <p className="text-[10px] text-muted-foreground text-center">
                Press <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">Esc</kbd> to close
              </p>
            </div>
          </div>
        </div>
      )}

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