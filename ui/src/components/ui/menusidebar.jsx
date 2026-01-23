import { FileCode, FileText, User, Clipboard, Folder, FolderPlus, FolderOpen, X, Edit2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'

// Common emojis for folder icons
const FOLDER_EMOJIS = [
  "📁", "📂", "🗂️", "📚", "📖", "📝", "✏️", "🎨", "🎯", "💡",
  "🔥", "⚡", "🚀", "💻", "🖥️", "📱", "🌐", "🔧", "⚙️", "🔩",
  "🎵", "🎬", "📷", "🎥", "🎮", "🕹️", "🗺️", "🧭", "📊", "📈",
  "💼", "📋", "📌", "📍", "✂️", "📏", "🖊️", "🖋️", "💎", "🔑",
  "🏠", "🏢", "🏗️", "🏭", "🌟", "⭐", "🌙", "☀️", "🌈", "🍀",
]

export function MenuSidebar({
  activeMenu,
  onMenuChange,
  sidebarCollapsed,
  folders,
  selectedFolderId,
  onFolderSelect,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  snippets,
  files
}) {
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolderId, setEditingFolderId] = useState(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const [appVersion, setAppVersion] = useState('')

  // Load app version on mount
  useEffect(() => {
    invoke('get_app_version')
      .then(setAppVersion)
      .catch(console.error)
  }, [])

  const menuItems = [
    { id: 'snippets', icon: FileCode, label: 'Snippets', badge: null },
    { id: 'files', icon: FileText, label: 'Files', badge: null },
    { id: 'clipboard', icon: Clipboard, label: 'Clipboard', badge: null },
    { id: 'account', icon: User, label: 'Account', badge: 'DEV' }
  ]

  // Count items per folder (snippets or files based on active menu)
  const getFolderCount = (folderId) => {
    // Use files when in files menu, otherwise use snippets
    const items = activeMenu === 'files' ? files : snippets

    if (folderId === 'all') {
      return items.length
    }
    if (folderId === 'uncategorized') {
      return items.filter(item => !item.folder_id).length
    }
    return items.filter(item => item.folder_id === folderId).length
  }

  const handleCreateFolder = async (e) => {
    e.preventDefault()
    if (!newFolderName.trim()) return

    await onCreateFolder(newFolderName.trim())
    setNewFolderName('')
    setShowCreateFolder(false)
  }

  const handleUpdateFolder = async (folderId) => {
    if (!editingFolderName.trim()) return

    const folder = folders.find(f => f.id === folderId)
    await onUpdateFolder(folderId, editingFolderName.trim(), folder?.icon)
    setEditingFolderId(null)
    setEditingFolderName('')
  }

  const handleEmojiSelect = (folderId, emoji) => {
    const folder = folders.find(f => f.id === folderId)
    onUpdateFolder(folderId, folder?.name || '', emoji)
  }

  // Show folders only when snippets or files menu is active and sidebar is not collapsed
  const showFolders = (activeMenu === 'snippets' || activeMenu === 'files') && !sidebarCollapsed

  return (
    <div className={`h-full flex flex-col py-2 gap-1 bg-background relative overflow-hidden border-r transition-all duration-300 ${
      showFolders ? 'w-56' : 'w-14'
    }`}>
      {/* Gradient background overlay matching SearchBar */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />

      {/* Menu Items */}
      <div className="flex flex-col gap-1 px-1 z-10">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeMenu === item.id

          return (
            <button
              key={item.id}
              onClick={() => onMenuChange(item.id)}
              className={`relative w-full h-10 flex items-center px-3 rounded-md transition-all group ${
                isActive
                  ? 'bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/30'
                  : 'hover:bg-accent border border-transparent'
              }`}
              title={item.label}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-0.5 h-6 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 rounded-r" />
              )}

              <Icon className={`h-4 w-4 transition-colors flex-shrink-0 ${
                isActive
                  ? 'text-purple-600'
                  : 'text-muted-foreground group-hover:text-foreground'
              }`} />

              {showFolders && (
                <span className={`ml-2 text-sm font-medium ${
                  isActive ? 'text-purple-600' : 'text-muted-foreground'
                }`}>
                  {item.label}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Folders Section - Only show when snippets or files menu is active */}
      {showFolders && (
        <div className="flex-1 flex flex-col overflow-hidden mt-2 z-10">
          {/* Folders Header */}
          <div className="px-2 py-1.5 border-b border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                {activeMenu === 'files' ? 'File Folders' : 'Folders'}
              </span>
              <button
                onClick={() => setShowCreateFolder(!showCreateFolder)}
                className="p-1 hover:bg-accent rounded transition-colors"
                title="Create folder"
              >
                <FolderPlus className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            {/* Create Folder Input */}
            {showCreateFolder && (
              <form onSubmit={handleCreateFolder} className="mt-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name..."
                  className="w-full px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  autoFocus
                />
              </form>
            )}
          </div>

          {/* Folders List */}
          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
            {/* All Snippets / All Files */}
            <button
              onClick={() => onFolderSelect(null)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                selectedFolderId === null
                  ? 'bg-purple-500/10 text-purple-600'
                  : 'hover:bg-accent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FolderOpen className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="text-xs flex-1 text-left">
                {activeMenu === 'files' ? 'All Files' : 'All Snippets'}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                selectedFolderId === null ? 'bg-purple-500/20' : 'bg-muted'
              }`}>
                {getFolderCount('all')}
              </span>
            </button>

            {/* Uncategorized */}
            {(activeMenu === 'files' ? files : snippets).some(item => !item.folder_id) && (
              <button
                onClick={() => onFolderSelect('uncategorized')}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                  selectedFolderId === 'uncategorized'
                    ? 'bg-purple-500/10 text-purple-600'
                    : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Folder className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-xs flex-1 text-left">Uncategorized</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                  selectedFolderId === 'uncategorized' ? 'bg-purple-500/20' : 'bg-muted'
                }`}>
                  {getFolderCount('uncategorized')}
                </span>
              </button>
            )}

            {/* Custom Folders */}
            {folders.map((folder) => (
              <div key={folder.id} className="group">
                {editingFolderId === folder.id ? (
                  // Edit mode
                  <form onSubmit={(e) => { e.preventDefault(); handleUpdateFolder(folder.id) }} className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editingFolderName}
                      onChange={(e) => setEditingFolderName(e.target.value)}
                      className="flex-1 px-1 py-0.5 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setEditingFolderId(null)}
                      className="p-0.5 hover:bg-destructive/20 rounded"
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </button>
                  </form>
                ) : (
                  // Display mode - button contains icon, name, and badge for consistent alignment
                  <div className="relative flex items-center">
                    <button
                      onClick={() => onFolderSelect(folder.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                        selectedFolderId === folder.id
                          ? 'bg-purple-500/10 text-purple-600'
                          : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span
                        className="text-sm cursor-pointer hover:scale-125 transition-transform flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Show emoji picker (for now, cycle through emojis)
                          const currentIndex = FOLDER_EMOJIS.indexOf(folder.icon || '📁')
                          const nextIndex = (currentIndex + 1) % FOLDER_EMOJIS.length
                          handleEmojiSelect(folder.id, FOLDER_EMOJIS[nextIndex])
                        }}
                        title="Click to change icon"
                      >
                        {folder.icon || '📁'}
                      </span>
                      <span className="text-xs flex-1 text-left truncate">
                        {folder.name}
                      </span>
                      {/* Counter badge - inside button for alignment with All Snippets/Uncategorized */}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        selectedFolderId === folder.id ? 'bg-purple-500/20' : 'bg-muted'
                      }`}>
                        {getFolderCount(folder.id)}
                      </span>
                    </button>

                    {/* Edit/Delete buttons - absolutely positioned to not affect badge alignment */}
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingFolderId(folder.id)
                          setEditingFolderName(folder.name)
                        }}
                        className="p-1 hover:bg-accent rounded transition-colors"
                        title="Edit folder"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteFolder(folder.id)
                        }}
                        className="p-1 hover:bg-destructive/20 rounded transition-colors"
                        title="Delete folder"
                      >
                        <X className="h-3 w-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Version indicator */}
      <div className="text-[8px] text-muted-foreground/50 z-10 px-2 text-center">
        {appVersion ? `v${appVersion}` : 'Loading...'}
      </div>
    </div>
  )
}
