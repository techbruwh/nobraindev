import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { listen } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-shell'
import { Plus, Search, FileCode, FileText, X, Edit, Trash2, Copy, Save, Brain, Download, Sparkles, CheckCircle, AlertCircle, Info, PanelLeftClose, PanelLeft, Keyboard, Code, Braces, RefreshCw, Cloud, User, List, LayoutList } from 'lucide-react'
import { useSupabaseAuth } from '@/lib/supabase-auth'
import { syncService } from '@/lib/sync'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchBar } from '@/components/ui/searchbar'
import { SearchModal } from '@/components/ui/searchmodal'
import { ConfirmDialog } from '@/components/ui/confirmdialog'
import { MenuSidebar } from '@/components/ui/menusidebar'
import { SnippetsPanel } from '@/components/ui/snippetspanel'
import { FilesPanel } from '@/components/ui/filespanel'
import { FilePreview } from '@/components/ui/filepreview'
import { OrganizeModal } from '@/components/ui/organizemodal'
import { AccountPanel } from '@/components/ui/accountpanel'
import { AccountMainView } from '@/components/ui/accountmainview'
import { ClipboardPanel } from '@/components/ui/clipboardpanel'
import { ClipboardMainView } from '@/components/ui/clipboardmainview'
import { TiptapEditor } from '@/components/ui/tiptap-editor'
import './tiptap.css'

function App() {
  const { user } = useSupabaseAuth()
  const isSignedIn = !!user
  const [snippets, setSnippets] = useState([])
  const [currentSnippet, setCurrentSnippet] = useState(null)
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
  const [snippetsViewMode, setSnippetsViewMode] = useState('card') // 'card' or 'list'
  
  // Form state
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [tags, setTags] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  
  // Debounce timeout for auto-save
  const autoSaveTimeoutRef = useRef(null)

  // Track last saved state to prevent unnecessary saves
  const lastSavedStateRef = useRef({
    id: null,
    title: '',
    content: '',
    language: '',
    tags: '',
    description: ''
  })

  // Ref to access ClipboardPanel refresh function
  const clipboardPanelRef = useRef(null)

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
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

  // Selected clipboard entry ID
  const [selectedClipboardEntryId, setSelectedClipboardEntryId] = useState(null)

  // File state
  const [selectedFile, setSelectedFile] = useState(null)
  const [hasUnsyncedFiles, setHasUnsyncedFiles] = useState(false)
  const [filesReloadCounter, setFilesReloadCounter] = useState(0)

  // Folder state
  const [folders, setFolders] = useState([])
  const [selectedFolderId, setSelectedFolderId] = useState(null) // null = all snippets/files
  const [showOrganizeModal, setShowOrganizeModal] = useState(false)
  const [hasSeenOrganizeModal, setHasSeenOrganizeModal] = useState(false)

  // Files state (for badge counts in sidebar)
  const [files, setFiles] = useState([])
  const [allFiles, setAllFiles] = useState([]) // Always contains ALL files for badge counts

  // Track newly created snippet IDs
  const [newSnippetIds, setNewSnippetIds] = useState(new Set())

  // Deletion tracking state
  const [isDeletingSnippet, setIsDeletingSnippet] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // Update state
  const [availableUpdate, setAvailableUpdate] = useState(null)
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false)

  // Footer sync state
  const [isFooterSyncing, setIsFooterSyncing] = useState(false)
  const [syncApproval, setSyncApproval] = useState(null)

  // Check sync approval when user signs in
  useEffect(() => {
    if (isSignedIn && user?.email) {
      syncService.checkSyncApproval(user.email)
        .then(setSyncApproval)
        .catch(console.error)
    }
  }, [isSignedIn, user])

  const handleFooterSync = async () => {
    const email = user?.email
    if (!email || !isSignedIn) {
      showToast('Please sign in to sync', 'error')
      return
    }

    setIsFooterSyncing(true)

    try {
      let result
      if (activeMenu === 'snippets') {
        // Sync snippets
        if (!hasUnsyncedChanges) {
          showToast('Everything is already synced!', 'success')
          setLastSyncTime(new Date())
          setIsFooterSyncing(false)
          return
        }
        result = await syncService.syncAll(email)
        setHasUnsyncedChanges(false)
      } else if (activeMenu === 'clipboard') {
        // Sync clipboard
        if (!hasUnsyncedClipboard) {
          showToast('Everything is already synced!', 'success')
          setLastSyncTime(new Date())
          setIsFooterSyncing(false)
          return
        }
        result = await syncService.syncClipboardAll(email)
        setHasUnsyncedClipboard(false)
      } else if (activeMenu === 'files') {
        // Sync files
        if (!hasUnsyncedFiles) {
          showToast('Everything is already synced!', 'success')
          setLastSyncTime(new Date())
          setIsFooterSyncing(false)
          return
        }
        result = await syncService.syncFilesAll(email, user?.id)
        setHasUnsyncedFiles(false)
      } else if (activeMenu === 'account') {
        // Sync all (account menu syncs everything)
        result = await syncService.syncAll(email)
        setHasUnsyncedChanges(false)
      }

      setLastSyncTime(result?.syncTime || new Date())
      showToast('Sync completed successfully', 'success')

      // Reload data after sync
      if (activeMenu === 'snippets') {
        await loadSnippets()
        await loadFolders()
      }
    } catch (error) {
      console.error('Footer sync failed:', error)
      let errorMessage = 'Sync failed. Please try again.'
      if (error.message === 'SYNC_NOT_APPROVED') {
        errorMessage = 'Sync access not approved yet. Please wait for approval.'
      } else if (error.message === 'Supabase not configured') {
        errorMessage = 'Cloud sync not configured'
      } else if (error.message.includes('fetch') || error.message.includes('network')) {
        errorMessage = 'Network error. Check your internet connection.'
      } else if (error.message) {
        errorMessage = error.message
      }
      showToast(errorMessage, 'error')
    } finally {
      setIsFooterSyncing(false)
    }
  }

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
    loadFolders()
    checkModelStatus()
    checkForUpdates()

    // Register global clipboard hotkey
    invoke('register_clipboard_hotkey').catch(console.error)
  }, [])

  // Listen for snippet-created event from clipboard popup
  useEffect(() => {
    let unlistenFn

    const setupListener = async () => {
      console.log('🎯 Setting up snippet-created event listener')

      unlistenFn = await listen('snippet-created', (event) => {
        console.log('📝 Snippet created event received!', event)
        console.log('🔄 Reloading snippets...')
        loadSnippets()
      })

      console.log('✅ Snippet-created event listener setup complete')
    }

    setupListener()

    return () => {
      console.log('🧹 Cleaning up snippet-created event listener')
      if (unlistenFn) {
        unlistenFn()
      }
    }
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


  // Auto-save with debounce - only when actual changes are made
  useEffect(() => {
    const scheduleAutoSave = () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        if (title?.trim() && content?.trim()) {
          handleSaveSnippet(true) // true = silent auto-save
        }
      }, 1000) // Auto-save after 1 second of inactivity
    }

    // Check if there are actual changes compared to last saved state
    const hasActualChanges = () => {
      const lastSaved = lastSavedStateRef.current
      const currentId = currentSnippet?.id || null

      // If this is a new snippet, check if there's any content
      if (!currentSnippet) {
        return !!(title?.trim() || content?.trim())
      }

      // If switching to a different snippet, don't auto-save
      if (lastSaved.id !== currentId) {
        return false
      }

      // Check if any field actually changed
      return (
        title !== lastSaved.title ||
        content !== lastSaved.content ||
        language !== lastSaved.language ||
        tags !== lastSaved.tags ||
        description !== lastSaved.description
      )
    }

    // Update last saved state when snippet changes
    if (currentSnippet) {
      lastSavedStateRef.current = {
        id: currentSnippet.id,
        title: currentSnippet.title,
        content: currentSnippet.content,
        language: currentSnippet.language,
        tags: currentSnippet.tags || '',
        description: currentSnippet.description || ''
      }
    } else {
      // Reset for new snippet
      lastSavedStateRef.current = {
        id: null,
        title: '',
        content: '',
        language: 'javascript',
        tags: '',
        description: ''
      }
    }

    // Only schedule auto-save if there are actual changes
    if (hasActualChanges()) {
      scheduleAutoSave()
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [title, content, language, tags, description, currentSnippet])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle shortcuts when modals/popups are open (except Escape)
      if (isSearchModalOpen || confirmDialog.isOpen) {
        // Only allow Escape key when modals are open
        if (e.key === 'Escape') {
          if (showShortcutsHelp) {
            setShowShortcutsHelp(false)
          } else if (isSearchModalOpen) {
            setIsSearchModalOpen(false)
          } else if (confirmDialog.isOpen) {
            setConfirmDialog(prev => ({ ...prev, isOpen: false }))
            if (confirmDialog.onCancel) {
              confirmDialog.onCancel()
            }
          }
        }
        return
      }

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
      // Escape to close shortcuts help
      if (e.key === 'Escape' && showShortcutsHelp) {
        setShowShortcutsHelp(false)
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
      // Cmd/Ctrl + Shift + C to refresh clipboard history (only when not in popup)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault()
        if (activeMenu === 'clipboard' && clipboardPanelRef.current) {
          clipboardPanelRef.current.refreshClipboard()
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarCollapsed, showShortcutsHelp, isSearchModalOpen, activeMenu, confirmDialog])

  // Handle global link clicks to open in external browser
  useEffect(() => {
    const handleLinkClick = async (e) => {
      const target = e.target
      // Check if clicked element is a link or inside a link
      const link = target.closest('a')

      if (link && link.href) {
        const href = link.getAttribute('href')
        // Only handle external links (http/https)
        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
          e.preventDefault()
          e.stopPropagation()
          await open(href).catch(console.error)
        }
      }
    }

    document.addEventListener('click', handleLinkClick, true) // Use capture phase
    return () => document.removeEventListener('click', handleLinkClick, true)
  }, [])


  const loadSnippets = async () => {
    try {
      const data = await invoke('get_all_snippets')
      setSnippets(data)
      setFilteredSnippets(data)
    } catch (error) {
      console.error('Failed to load snippets:', error)
    }
  }

  const loadFolders = async () => {
    try {
      const data = await invoke('get_all_folders')
      setFolders(data)

      // Also load files for badge counts
      if (activeMenu === 'files') {
        loadFiles()
      }
    } catch (error) {
      console.error('Failed to load folders:', error)
    }
  }

  const loadFiles = async (folderId = selectedFolderId) => {
    try {
      // Always load all files for badge counts
      const allFilesData = await invoke('get_all_files')
      setAllFiles(allFilesData || [])

      // Load filtered files based on folder
      let result
      if (folderId === null) {
        // All files
        result = allFilesData
      } else if (folderId === 'uncategorized') {
        // Uncategorized files
        result = await invoke('get_files_by_folder', { folderId: null })
      } else {
        // Specific folder
        result = await invoke('get_files_by_folder', { folderId: folderId })
      }
      setFiles(result || [])
    } catch (error) {
      console.error('Failed to load files:', error)
      setFiles([])
      setAllFiles([])
    }
  }

  const handleCreateFolder = async (name) => {
    try {
      await invoke('create_folder', { name })
      await loadFolders()
      // Reload snippets to ensure counts are up to date
      await loadSnippets()
      showToast('Folder created', 'success')

      // Check if organization needed
      const uncategorized = snippets.filter(s => !s.folder_id).length
      if (uncategorized > 0 && !hasSeenOrganizeModal) {
        setShowOrganizeModal(true)
        setHasSeenOrganizeModal(true)
      }
    } catch (error) {
      console.error('Failed to create folder:', error)
      showToast('Failed to create folder', 'error')
    }
  }

  const handleDeleteFolder = async (folderId) => {
    try {
      await invoke('delete_folder', { id: folderId })
      await loadFolders()
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null)
        // Reload all snippets
        await loadSnippets()
      }
      showToast('Folder deleted', 'success')
    } catch (error) {
      console.error('Failed to delete folder:', error)
      showToast('Failed to delete folder', 'error')
    }
  }

  const handleUpdateFolder = async (folderId, name, icon) => {
    try {
      await invoke('update_folder', { id: folderId, name, icon })
      await loadFolders()
      // Reload snippets/files if we changed the currently selected folder
      if (selectedFolderId === folderId) {
        if (activeMenu === 'files') {
          await loadFiles()
        } else {
          await loadSnippets()
        }
      }
      showToast('Folder updated', 'success')
    } catch (error) {
      console.error('Failed to update folder:', error)
      showToast('Failed to update folder', 'error')
    }
  }

  const handleMenuChange = async (menu) => {
    setActiveMenu(menu)

    // Load files when switching to files menu
    if (menu === 'files') {
      await loadFiles(selectedFolderId)
    }
  }

  const handleFolderSelect = async (folderId) => {
    setSelectedFolderId(folderId)

    // Load based on active menu
    if (activeMenu === 'files') {
      // Load files for badge count, passing the new folderId directly
      await loadFiles(folderId)
      return
    }

    // Original snippets loading logic
    try {
      let data

      if (folderId === null) {
        // All snippets - use get_all_snippets command
        data = await invoke('get_all_snippets')
      } else if (folderId === 'uncategorized') {
        // Uncategorized - pass null to get_snippets_by_folder (which returns snippets with folder_id IS NULL)
        data = await invoke('get_snippets_by_folder', { folderId: null })
      } else {
        // Specific folder - pass the folder ID
        data = await invoke('get_snippets_by_folder', { folderId })
      }

      setFilteredSnippets(data)
      setCurrentSnippet(null)
      setTitle('')
      setContent('')
    } catch (error) {
      console.error('Failed to load folder snippets:', error)
      showToast('Failed to load folder', 'error')
    }
  }

  const handleOrganizeSnippets = async (mappings) => {
    try {
      await invoke('organize_snippets', { mappings })
      await loadSnippets()
      await loadFolders()

      // If a folder is currently selected, refresh the view to show updated snippets
      if (selectedFolderId !== null) {
        let data

        if (selectedFolderId === 'uncategorized') {
          // Uncategorized - pass null to get_snippets_by_folder
          data = await invoke('get_snippets_by_folder', { folderId: null })
        } else {
          // Specific folder - pass the folder ID
          data = await invoke('get_snippets_by_folder', { folderId: selectedFolderId })
        }

        setFilteredSnippets(data)
      }

      showToast('Snippets organized', 'success')
    } catch (error) {
      console.error('Failed to organize snippets:', error)
      showToast('Failed to organize snippets', 'error')
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

  const checkForUpdates = async () => {
    try {
      console.log('🔄 Checking for updates...')
      const update = await check()

      if (update) {
        console.log(`✅ Update available: ${update.version}`)
        setAvailableUpdate(update)
        showToast(`Update available: v${update.version}`, 'info')
      } else {
        console.log('✅ No updates available')
      }
    } catch (error) {
      console.error('Failed to check for updates:', error)
    }
  }

  const installUpdate = async () => {
    if (!availableUpdate) return

    setIsDownloadingUpdate(true)
    try {
      let downloaded = 0
      let contentLength = 0

      await availableUpdate.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength
            console.log(`started downloading ${event.data.contentLength} bytes`)
            break
          case 'Progress':
            downloaded += event.data.chunkLength
            console.log(`downloaded ${downloaded} from ${contentLength}`)
            showToast(`Downloading update: ${Math.round((downloaded / contentLength) * 100)}%`, 'info')
            break
          case 'Finished':
            console.log('download finished')
            showToast('Update downloaded! Restarting...', 'success')
            break
        }
      })

      console.log('update installed')
      await relaunch()
    } catch (error) {
      console.error('Failed to install update:', error)
      showToast('Failed to install update', 'error')
    } finally {
      setIsDownloadingUpdate(false)
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

  const handleNewSnippet = async () => {
    console.log('🆕 Creating new snippet')

    // Switch to snippets menu if not already there
    if (activeMenu !== 'snippets') {
      setActiveMenu('snippets')
    }

    // Ensure sidebar is expanded
    if (sidebarCollapsed) {
      setSidebarCollapsed(false)
    }

    setIsEditing(true)
    setTitle('Untitled')
    setLanguage('javascript')
    setTags('')
    setDescription('')
    setContent('')

    // Immediately create the snippet
    const snippet = {
      title: 'Untitled',
      language: 'javascript',
      tags: null,
      description: null,
      content: '',
      folder_id: selectedFolderId || null,
      created_at: '',
      updated_at: ''
    }

    try {
      await invoke('create_snippet', { snippet })

      // Mark as having unsynced changes
      setHasUnsyncedChanges(true)

      // Reload snippets
      await loadSnippets()

      // Find and select the newly created "Untitled" snippet
      setSnippets(prev => {
        const newSnippet = prev.find(s => s.title === 'Untitled' && !newSnippetIds.has(s.id))
        if (newSnippet) {
          setCurrentSnippet(newSnippet)
          setIsEditing(false)

          // Track as new snippet
          setNewSnippetIds(prevIds => new Set([...prevIds, newSnippet.id]))

          // Remove NEW badge after 5 seconds
          setTimeout(() => {
            setNewSnippetIds(ids => {
              const newIds = new Set(ids)
              newIds.delete(newSnippet.id)
              return newIds
            })
          }, 5000)

          // Update last saved state to prevent immediate re-save
          lastSavedStateRef.current = {
            id: newSnippet.id,
            title: newSnippet.title,
            content: newSnippet.content,
            language: newSnippet.language,
            tags: newSnippet.tags || '',
            description: newSnippet.description || ''
          }
        }
        return prev
      })
    } catch (error) {
      console.error('Failed to create snippet:', error)
      showToast('Failed to create snippet', 'error')
    }
  }

  const handleEditSnippet = (snippet) => {
    setCurrentSnippet(snippet)
    setTitle(snippet.title)
    setLanguage(snippet.language)
    setTags(snippet.tags || '')
    setDescription(snippet.description || '')
    setContent(snippet.content)
  }

  const handleSaveSnippet = async (silent = false) => {
    console.log('handleSaveSnippet called', { title, content: content?.substring(0, 50) })

    if (!title?.trim()) {
      if (!silent) {
        console.log('Title validation failed')
        showToast('Title is required', 'error')
      }
      return
    }
    if (!content?.trim()) {
      if (!silent) {
        console.log('Content validation failed')
        showToast('Content is required', 'error')
      }
      return
    }

    const snippet = {
      title: title.trim(),
      language,
      tags: tags.trim() || null,
      description: description.trim() || null,
      content: content.trim(),
      folder_id: currentSnippet?.folder_id || selectedFolderId || null,
      created_at: '',
      updated_at: ''
    }

    try {
      const savedTitle = title.trim()
      const savedId = currentSnippet?.id

      console.log('Saving snippet...', { savedId, savedTitle })

      if (currentSnippet) {
        await invoke('update_snippet', { id: currentSnippet.id, snippet })
        if (!silent) {
          showToast('Snippet updated successfully', 'success')
        }
      } else {
        await invoke('create_snippet', { snippet })
        if (!silent) {
          showToast('Snippet created successfully', 'success')
        }
      }

      // Mark as having unsynced changes
      setHasUnsyncedChanges(true)

      await loadSnippets()

      // Find and select the saved snippet
      setSnippets(prev => {
        const savedSnippet = prev.find(s =>
          savedId ? s.id === savedId : s.title === savedTitle
        )
        if (savedSnippet) {
          setCurrentSnippet(savedSnippet)

          // Update last saved state to prevent immediate re-save
          lastSavedStateRef.current = {
            id: savedSnippet.id,
            title: savedSnippet.title,
            content: savedSnippet.content,
            language: savedSnippet.language,
            tags: savedSnippet.tags || '',
            description: savedSnippet.description || ''
          }
        }
        return prev
      })
    } catch (error) {
      console.error('Failed to save snippet:', error)
      if (!silent) {
        showToast('Failed to save snippet', 'error')
      }
    }
  }

  // Check if current snippet has unsaved changes
  const hasUnsavedChanges = () => {
    if (!currentSnippet) {
      // For new snippets, check if there's any content
      return !!(title?.trim() || content?.trim())
    }
    // For existing snippets, check if any field has changed
    return (
      title !== currentSnippet.title ||
      content !== currentSnippet.content ||
      language !== currentSnippet.language ||
      tags !== (currentSnippet.tags || '') ||
      description !== (currentSnippet.description || '')
    )
  }

  // Show unsaved changes warning
  const showUnsavedChangesWarning = () => {
    return new Promise((resolve) => {
      setConfirmDialog({
        isOpen: true,
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Do you want to save them before continuing?',
        onConfirm: async () => {
          await handleSaveSnippet()
          resolve(true)
        },
        onCancel: () => {
          resolve(false)
        }
      })
    })
  }

  const handleDeleteSnippet = async (snippet) => {
    // Check if there are unsaved changes in the current snippet
    const hasUnsavedChanges = currentSnippet?.id === snippet.id && (
      title !== snippet.title ||
      content !== snippet.content ||
      language !== snippet.language ||
      tags !== (snippet.tags || '') ||
      description !== (snippet.description || '')
    )

    setConfirmDialog({
      isOpen: true,
      title: hasUnsavedChanges ? 'Unsaved Changes' : 'Delete Snippet',
      message: hasUnsavedChanges
        ? `You have unsaved changes in "${snippet.title}". Are you sure you want to delete it? These changes will be lost.`
        : `Are you sure you want to delete "${snippet.title}"? This will be deleted from both local and cloud storage.`,
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
            setTitle('')
            setContent('')
            setLanguage('javascript')
            setTags('')
            setDescription('')
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

  const handleDeleteFile = (file) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete File',
      message: `Are you sure you want to delete "${file.filename}"? This will be deleted from both local and cloud storage.`,
      onConfirm: async () => {
        try {
          // Delete locally first
          await invoke('delete_file', { id: file.id })

          // Delete from cloud if user is signed in
          if (isSignedIn && user?.email) {
            try {
              await syncService.deleteFileFromCloud(user.email, user.id, file.id)
              showToast('File deleted from local and cloud', 'success')
            } catch (cloudError) {
              console.warn('Failed to delete from cloud:', cloudError)
              showToast('Deleted locally (cloud sync failed)', 'warning')
            }
          } else {
            showToast('File deleted locally', 'success')
          }

          // Mark as having unsynced changes
          setHasUnsyncedFiles(true)

          // Clear selected file if it was deleted
          if (selectedFile?.id === file.id) {
            setSelectedFile(null)
          }

          // Force a reload of files by incrementing a counter
          setFilesReloadCounter(prev => prev + 1)
        } catch (error) {
          console.error('Failed to delete file:', error)
          showToast('Failed to delete file', 'error')
        }
      }
    })
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
        onSelectSnippet={async (snippet) => {
          if (hasUnsavedChanges()) {
            const shouldSave = await showUnsavedChangesWarning()
            if (!shouldSave) {
              // User cancelled, don't switch snippets
              return
            }
          }
          handleEditSnippet(snippet)
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
          onMenuChange={handleMenuChange}
          sidebarCollapsed={sidebarCollapsed}
          folders={folders}
          selectedFolderId={selectedFolderId}
          onFolderSelect={handleFolderSelect}
          onCreateFolder={handleCreateFolder}
          onUpdateFolder={handleUpdateFolder}
          onDeleteFolder={handleDeleteFolder}
          snippets={snippets}
          files={allFiles}
        />

        {/* Resizable Content Sidebar */}
        <div
          className={`border-r flex flex-col transition-all duration-300 ${
            sidebarCollapsed || activeMenu === 'clipboard' || activeMenu === 'account' ? 'w-0 overflow-hidden' : ''
          }`}
          style={{ width: (sidebarCollapsed || activeMenu === 'clipboard' || activeMenu === 'account') ? 0 : `${sidebarWidth}px` }}
        >
          {activeMenu === 'snippets' && (
            <SnippetsPanel
              snippets={filteredSnippets}
              currentSnippet={currentSnippet}
              onSnippetClick={async (snippet) => {
                if (hasUnsavedChanges()) {
                  const shouldSave = await showUnsavedChangesWarning()
                  if (!shouldSave) {
                    // User cancelled, don't switch snippets
                    return
                  }
                }
                handleEditSnippet(snippet)
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
              newSnippetIds={newSnippetIds}
              currentFolderId={selectedFolderId}
              currentFolderName={
                selectedFolderId === 'uncategorized'
                  ? 'Uncategorized'
                  : selectedFolderId
                  ? folders.find(f => f.id === selectedFolderId)?.name
                  : null
              }
              currentFolderIcon={
                selectedFolderId === 'uncategorized'
                  ? '📂'
                  : selectedFolderId
                  ? folders.find(f => f.id === selectedFolderId)?.icon
                  : null
              }
              viewMode={snippetsViewMode}
              onViewModeChange={setSnippetsViewMode}
            />
          )}
          {activeMenu === 'files' && (
            <FilesPanel
              currentFolderId={selectedFolderId}
              reloadCounter={filesReloadCounter}
              currentFolderName={
                selectedFolderId === 'uncategorized'
                  ? 'Uncategorized'
                  : selectedFolderId
                  ? folders.find(f => f.id === selectedFolderId)?.name
                  : null
              }
              currentFolderIcon={
                selectedFolderId === 'uncategorized'
                  ? '📂'
                  : selectedFolderId
                  ? folders.find(f => f.id === selectedFolderId)?.icon
                  : null
              }
              onFileSelect={(file) => {
                setSelectedFile(file)
              }}
              onUploadComplete={() => setHasUnsyncedFiles(true)}
              hasUnsyncedChanges={hasUnsyncedFiles}
              onSyncComplete={(syncTime) => {
                setHasUnsyncedFiles(false)
                setLastSyncTime(syncTime)
              }}
              onSyncStart={() => {
                // Optionally handle sync start
              }}
              onDeleteFile={handleDeleteFile}
              viewMode={snippetsViewMode}
              onViewModeChange={setSnippetsViewMode}
            />
          )}
        </div>

        {/* Resize Handle */}
        {!sidebarCollapsed && activeMenu !== 'clipboard' && activeMenu !== 'account' && activeMenu !== 'files' && (
          <div
            className="w-1 hover:w-1.5 bg-border hover:bg-primary cursor-col-resize transition-all flex-shrink-0"
            onMouseDown={handleMouseDown}
            style={{ userSelect: 'none' }}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Show File Preview when file is selected (inline, like snippets) */}
          {activeMenu === 'files' && selectedFile ? (
            <>
              {/* Top Bar */}
              <div className="border-b px-3 py-1.5 flex items-center gap-2 bg-background">
                {/* Folder Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Folder:</span>
                  <select
                    value={selectedFile.folder_id || 'none'}
                    onChange={async (e) => {
                      const newFolderId = e.target.value === 'none' ? null : parseInt(e.target.value)
                      const updatedFile = {
                        ...selectedFile,
                        folder_id: newFolderId
                      }

                      try {
                        await invoke('update_file', {
                          id: selectedFile.id,
                          filename: selectedFile.filename,
                          description: selectedFile.description,
                          tags: selectedFile.tags,
                          folderId: newFolderId
                        })

                        // Update local state
                        setSelectedFile(updatedFile)
                        setHasUnsyncedFiles(true)

                        // Reload to update folder counts
                        const updatedFiles = await invoke('get_all_files')
                        setAllFiles(updatedFiles)
                        await loadFolders()

                        showToast('Folder updated', 'success')
                      } catch (error) {
                        console.error('Failed to update folder:', error)
                        showToast('Failed to update folder', 'error')
                      }
                    }}
                    className="h-7 px-2 text-[10px] bg-background border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="none">Uncategorized</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.icon || '📁'} {folder.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* File info */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-medium truncate">{selectedFile.filename}</span>
                  <Badge variant="secondary" className="text-[9px]">
                    {selectedFile.file_type}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {selectedFile.file_size ? `${(selectedFile.file_size / 1024).toFixed(1)} KB` : ''}
                  </span>
                </div>

                {/* Close button on the right */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px]"
                  onClick={() => setSelectedFile(null)}
                >
                  Close
                </Button>
              </div>

              {/* Content Area - File Preview */}
              <div className="flex-1 overflow-auto">
                <FilePreview
                  file={selectedFile}
                  onEdit={(file) => {
                    setHasUnsyncedFiles(true)
                  }}
                />
              </div>
            </>
          ) : activeMenu === 'files' ? (
            // No file selected - show placeholder
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h2 className="text-lg font-semibold mb-1.5">Select a file</h2>
                <p className="text-xs text-muted-foreground mb-3">
                  Or upload a new file to get started
                </p>
              </div>
            </div>
          ) : activeMenu === 'clipboard' ? (
            <div className="flex-1 overflow-hidden">
              <ClipboardMainView
                ref={clipboardPanelRef}
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
                selectedEntryId={selectedClipboardEntryId}
                onEntrySelect={setSelectedClipboardEntryId}
              />
            </div>
          ) : activeMenu === 'account' ? (
            <div className="flex-1 overflow-hidden">
              <AccountMainView
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
            </div>
          ) : (
            <>
              {/* Top Bar */}
              <div className="border-b px-3 py-1.5 flex items-center gap-2 bg-background">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                >
                  {sidebarCollapsed ? <PanelLeft className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
                </Button>

                {/* Folder Selector - Only for current snippet */}
                {currentSnippet && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">Folder:</span>
                    <select
                      value={currentSnippet.folder_id || 'none'}
                      onChange={async (e) => {
                        const newFolderId = e.target.value === 'none' ? null : parseInt(e.target.value)
                        const updatedSnippet = {
                          ...currentSnippet,
                          folder_id: newFolderId
                        }

                        try {
                          await invoke('update_snippet', {
                            id: currentSnippet.id,
                            snippet: {
                            title: currentSnippet.title,
                            language: currentSnippet.language,
                            tags: currentSnippet.tags || null,
                            description: currentSnippet.description || null,
                            content: currentSnippet.content,
                            folder_id: newFolderId,
                            created_at: currentSnippet.created_at,
                            updated_at: currentSnippet.updated_at
                          }
                          })

                          // Update local state
                          setCurrentSnippet(updatedSnippet)
                          setHasUnsyncedChanges(true)

                          // Reload to update folder counts
                          await loadSnippets()
                          await loadFolders()

                          showToast('Folder updated', 'success')
                        } catch (error) {
                          console.error('Failed to update folder:', error)
                          showToast('Failed to update folder', 'error')
                        }
                      }}
                      className="h-7 px-2 text-[10px] bg-background border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value="none">Uncategorized</option>
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.icon || '📁'} {folder.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Auto-save indicator */}
                {currentSnippet || (title && content) ? (
                  <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="text-[10px] text-muted-foreground">
                      Auto-save enabled
                    </span>
                    {hasUnsavedChanges() && (
                      <span className="text-[10px] text-yellow-600 dark:text-yellow-400">
                        • Unsaved changes
                      </span>
                    )}
                  </div>
                ) : null}

                {/* Spacer to push buttons to the right */}
                <div className="flex-1"></div>

                {/* Action Buttons - Only for current snippet */}
                {currentSnippet ? (
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => handleCopyCode(currentSnippet.content)}>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-destructive hover:text-destructive" onClick={() => handleDeleteSnippet(currentSnippet)}>
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                ) : null}
              </div>

              {/* Content Area */}
              {!currentSnippet && !isEditing && !title && !content ? (
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
              ) : (
                // Always Edit Mode
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-auto p-2">
                    <TiptapEditor
                      content={content || ''}
                      onChange={(newContent) => {
                        setContent(newContent)
                        // Auto-detect title from first heading or first line
                        const tempDiv = document.createElement('div')
                        tempDiv.innerHTML = newContent

                        // Try to get first heading
                        const firstHeading = tempDiv.querySelector('h1, h2, h3, h4, h5, h6')
                        if (firstHeading && firstHeading.textContent?.trim()) {
                          setTitle(firstHeading.textContent.trim().substring(0, 100))
                          return
                        }

                        // Otherwise get first paragraph or line
                        const firstParagraph = tempDiv.querySelector('p')
                        if (firstParagraph && firstParagraph.textContent?.trim()) {
                          setTitle(firstParagraph.textContent.trim().substring(0, 100))
                          return
                        }

                        // Fallback to first non-empty text
                        const allText = tempDiv.textContent?.trim() || ''
                        const firstLine = allText.split('\n').find(line => line.trim()) || ''
                        if (firstLine) {
                          setTitle(firstLine.trim().substring(0, 100))
                        }
                      }}
                      editable={true}
                      autoFocus={true}
                    />
                  </div>
                </div>
              )}
            </>
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
          {availableUpdate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[9px] bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={installUpdate}
              disabled={isDownloadingUpdate}
            >
              <Download className="h-3 w-3 mr-1" />
              {isDownloadingUpdate ? 'Installing...' : `Update to v${availableUpdate.version}`}
            </Button>
          )}

          {/* Sync Button - Only show when signed in and approved */}
          {isSignedIn && syncApproval?.approved && (
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 px-2 text-[9px] gap-1 ${
                ((activeMenu === 'snippets' && hasUnsyncedChanges) ||
                 (activeMenu === 'clipboard' && hasUnsyncedClipboard) ||
                 (activeMenu === 'files' && hasUnsyncedFiles))
                  ? 'bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30 hover:text-yellow-700'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
              onClick={handleFooterSync}
              disabled={isFooterSyncing}
            >
              {isFooterSyncing ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Cloud className="h-3 w-3" />
                  {((activeMenu === 'snippets' && hasUnsyncedChanges) ||
                   (activeMenu === 'clipboard' && hasUnsyncedClipboard) ||
                   (activeMenu === 'files' && hasUnsyncedFiles))
                    ? 'Sync Now'
                    : lastSyncTime
                    ? `Synced ${lastSyncTime.toLocaleTimeString()}`
                    : 'Sync'
                  }
                </>
              )}
            </Button>
          )}

          {/* Show sync status for non-signed-in users */}
          {!isSignedIn && (
            <span className="text-[9px] text-muted-foreground flex items-center gap-1">
              <Cloud className="h-3 w-3" />
              {lastSyncTime ? (
                <>Last synced: {lastSyncTime.toLocaleTimeString()}</>
              ) : (
                <>Sign in to sync</>
              )}
            </span>
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
                    <span className="text-xs">Show pop up clipboard history</span>
                    <kbd className="px-2 py-1 text-[10px] font-medium bg-muted border border-border rounded">{isMac ? '⌘' : 'Ctrl'} Shift C</kbd>
                  </div>
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
                    <span className="text-xs">Auto-save enabled</span>
                    <span className="text-[10px] text-muted-foreground">Changes save automatically</span>
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

      {/* Organize Modal */}
      <OrganizeModal
        isOpen={showOrganizeModal}
        onClose={() => setShowOrganizeModal(false)}
        snippets={snippets.filter(s => !s.folder_id)}
        folders={folders}
        onOrganize={handleOrganizeSnippets}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
          if (confirmDialog.onCancel) {
            confirmDialog.onCancel()
          }
        }}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText || 'Confirm'}
        cancelText="Cancel"
        variant={confirmDialog.variant || 'default'}
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