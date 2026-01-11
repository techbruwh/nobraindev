import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Plus, Search, FileCode, X, Edit, Trash2, Copy, Save, Brain, Download, Sparkles, CheckCircle, AlertCircle, Info, PanelLeftClose, PanelLeft, Keyboard, Code, Braces, RefreshCw, Cloud, User } from 'lucide-react'
import { useSupabaseAuth } from '@/lib/supabase-auth'
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
const ReactQuill = lazy(() => import('react-quill-new'))
import 'react-quill-new/dist/quill.snow.css'
import './editor.css'

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
  
  // Quill editor ref
  const quillRef = useRef(null)
  
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
  const [isSyncingFromFooter, setIsSyncingFromFooter] = useState(false)

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

  // Setup Quill tab handler and fix spaces after load
  useEffect(() => {
    if (quillRef.current && isEditing && currentSnippet) {
      const quill = quillRef.current.getEditor()
      
      // CUSTOMIZE TOOLBAR ICONS - Add this section
      const toolbar = quill.getModule('toolbar')
      if (toolbar && toolbar.container) {
        // Find and customize the inline code button
        const codeButton = toolbar.container.querySelector('button.ql-code')
        if (codeButton) {
          codeButton.innerHTML = '<span style="font-family: monospace; font-weight: bold; font-size: 12px; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">&lt;&gt;</span>'
          codeButton.setAttribute('title', 'Inline Code')
          codeButton.style.display = 'flex'
          codeButton.style.alignItems = 'center'
          codeButton.style.justifyContent = 'center'
        }

        // Find and customize the code-block button
        const codeBlockButton = toolbar.container.querySelector('button.ql-code-block')
        if (codeBlockButton) {
          codeBlockButton.innerHTML = '<span style="font-family: monospace; font-weight: bold; font-size: 12px; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; letter-spacing: 1px;">{}</span>'
          codeBlockButton.setAttribute('title', 'Code Block')
          codeBlockButton.style.display = 'flex'
          codeBlockButton.style.alignItems = 'center'
          codeBlockButton.style.justifyContent = 'center'
        }
      }
      // Fix spaces in code blocks after content loads by directly manipulating the DOM
      const fixSpaces = () => {
        // Parse the original content to find spaces
        const parser = new DOMParser()
        const doc = parser.parseFromString(currentSnippet.content, 'text/html')
        const originalBlocks = doc.querySelectorAll('.ql-code-block')
        const editorBlocks = quill.root.querySelectorAll('.ql-code-block')
        
        // Compare and restore spaces
        originalBlocks.forEach((originalBlock, index) => {
          if (editorBlocks[index]) {
            const originalText = originalBlock.textContent
            const editorText = editorBlocks[index].textContent
            
            // If original had leading spaces but editor doesn't
            const originalLeading = originalText.match(/^(\s+)/)
            const editorLeading = editorText.match(/^(\s+)/)
            
            if (originalLeading && (!editorLeading || originalLeading[1].length > (editorLeading[1] || '').length)) {
              // Restore the spaces by directly setting innerHTML with &nbsp;
              const spaces = originalLeading[1]
              const rest = originalText.substring(spaces.length)
              editorBlocks[index].innerHTML = spaces.replace(/ /g, '&nbsp;') + rest
            }
          }
        })
      }
      
      // Run after Quill finishes rendering
      setTimeout(fixSpaces, 300)
      
      // Override tab key behavior
      const handleTab = (e) => {
        if (e.key === 'Tab' && !e.shiftKey) {
          const selection = quill.getSelection()
          if (selection) {
            const format = quill.getFormat(selection.index)
            if (format['code-block']) {
              e.preventDefault()
              e.stopPropagation()
              
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
  }, [isEditing, content])

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
      // Cmd/Ctrl + E for inline code (when editing)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'e') {
        if (isEditing && quillRef.current) {
          e.preventDefault()
          e.stopPropagation()
          const quill = quillRef.current.getEditor()
          const format = quill.getFormat()
          quill.format('code', !format.code)
        }
        return
      }
      // Cmd/Ctrl + Shift + C for code block (when editing)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        if (isEditing && quillRef.current) {
          e.preventDefault()
          e.stopPropagation()
          console.log('Code block shortcut triggered')
          const quill = quillRef.current.getEditor()
          const format = quill.getFormat()
          quill.format('code-block', !format['code-block'])
        }
        return
      }
    }
    
    // Use capture phase to catch events before they reach Quill
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, sidebarCollapsed, showShortcutsHelp])

  // Customize Quill toolbar icons whenever editor is shown
  useEffect(() => {
    if (quillRef.current && isEditing) {
      // Small delay to ensure Quill toolbar is fully rendered
      const timer = setTimeout(() => {
        const quill = quillRef.current.getEditor()
        const toolbar = quill.getModule('toolbar')
        
        if (toolbar && toolbar.container) {
          // Find and customize the inline code button
          const codeButton = toolbar.container.querySelector('button.ql-code')
          if (codeButton) {
            codeButton.innerHTML = '<span style="font-family: monospace; font-weight: bold; font-size: 12px; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">&lt;&gt;</span>'
            codeButton.setAttribute('title', 'Inline Code')
            codeButton.style.display = 'flex'
            codeButton.style.alignItems = 'center'
            codeButton.style.justifyContent = 'center'
          }
          
          // Find and customize the code-block button
          const codeBlockButton = toolbar.container.querySelector('button.ql-code-block')
          if (codeBlockButton) {
            codeBlockButton.innerHTML = '<span style="font-family: monospace; font-weight: bold; font-size: 12px; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; letter-spacing: 1px;">{}</span>'
            codeBlockButton.setAttribute('title', 'Code Block')
            codeBlockButton.style.display = 'flex'
            codeBlockButton.style.alignItems = 'center'
            codeBlockButton.style.justifyContent = 'center'
          }
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [isEditing])

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
    
    // Use zero-width non-joiner (&#8204;) before spaces to preserve them
    // This character is invisible but prevents Quill from stripping spaces
    let preservedContent = snippet.content
    preservedContent = preservedContent.replace(
      /(<div class="ql-code-block"[^>]*>)(\s+)/g,
      (match, tag, spaces) => {
        // Add zero-width non-joiner before each space
        const preserved = spaces.split('').map(char => 
          char === ' ' ? '\u200C ' : char
        ).join('')
        return tag + preserved
      }
    )
    
    setContent(preservedContent)
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
      message: `Are you sure you want to delete "${snippet.title}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await invoke('delete_snippet', { id: snippet.id })
          showToast('Snippet deleted successfully', 'success')
          
          // Mark as having unsynced changes
          setHasUnsyncedChanges(true)
          
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
              sidebarCollapsed={sidebarCollapsed}
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
                setHasUnsyncedChanges(true)
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
                setIsSyncingFromFooter(false)
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

                  <Suspense fallback={<div className="flex items-center justify-center h-32 text-xs text-muted-foreground">Loading editor...</div>}>
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
                  </Suspense>
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
          {lastSyncTime && (
            <span className="text-[9px] text-muted-foreground flex items-center gap-1">
              <Cloud className="h-3 w-3" />
              Last synced: {lastSyncTime.toLocaleTimeString()}
            </span>
          )}
          {isSignedIn ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] gap-1"
              disabled={!hasUnsyncedChanges || isSyncingFromFooter}
              onClick={() => {
                setIsSyncingFromFooter(true)
                // Trigger sync from footer
                const event = new CustomEvent('footer-sync-clicked')
                window.dispatchEvent(event)
              }}
            >
              <RefreshCw className={`h-3 w-3 ${isSyncingFromFooter ? 'animate-spin' : ''}`} />
              {isSyncingFromFooter ? 'Syncing...' : hasUnsyncedChanges ? 'Sync Now' : 'All Synced'}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] gap-1 opacity-50 cursor-not-allowed"
              disabled
              title="Sign in to enable cloud sync"
              onClick={() => setActiveMenu('account')}
            >
              <Cloud className="h-3 w-3" />
              <span className="hidden sm:inline">Cloud Sync Disabled</span>
              <span className="sm:hidden">Sync Off</span>
            </Button>
          )}
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
                  <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50">
                    <div className="flex items-center gap-2">
                      <Code className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">Inline code</span>
                    </div>
                    <kbd className="px-2 py-1 text-[10px] font-medium bg-muted border border-border rounded">{isMac ? '⌘' : 'Ctrl'} E</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50">
                    <div className="flex items-center gap-2">
                      <Braces className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">Code block</span>
                    </div>
                    <kbd className="px-2 py-1 text-[10px] font-medium bg-muted border border-border rounded">{isMac ? '⌘' : 'Ctrl'} Shift C</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50">
                    <span className="text-xs">Insert tab (in code block)</span>
                    <kbd className="px-2 py-1 text-[10px] font-medium bg-muted border border-border rounded">Tab</kbd>
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