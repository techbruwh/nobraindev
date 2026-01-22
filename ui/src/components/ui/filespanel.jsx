import { Search, Plus, FileText, Trash2, AlertCircle, RefreshCw, CheckCircle, Loader2, ArrowUp, Shield, List, LayoutList, Upload, FileImage, FileVideo, FileAudio, Code, File, Archive, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useEffect, useState } from 'react'
import { useSupabaseAuth } from '@/lib/supabase-auth'
import { syncService } from '@/lib/sync'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'

export function FilesPanel({
  currentFolderId,
  currentFolderName,
  currentFolderIcon,
  onFileSelect,
  onUploadComplete,
  hasUnsyncedChanges,
  onSyncComplete,
  onSyncStart,
  viewMode = 'card',
  onViewModeChange
}) {
  const { user } = useSupabaseAuth()
  const isSignedIn = !!user

  // File state
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [uploadingFile, setUploadingFile] = useState(null)

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const [syncApproval, setSyncApproval] = useState(null)

  // Pagination
  const [displayCount, setDisplayCount] = useState(20)

  // File type icons mapping
  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image': return <FileImage className="h-3.5 w-3.5 text-blue-500" />
      case 'video': return <FileVideo className="h-3.5 w-3.5 text-purple-500" />
      case 'audio': return <FileAudio className="h-3.5 w-3.5 text-green-500" />
      case 'code': return <Code className="h-3.5 w-3.5 text-yellow-500" />
      case 'document': return <FileText className="h-3.5 w-3.5 text-red-500" />
      case 'archive': return <Archive className="h-3.5 w-3.5 text-orange-500" />
      default: return <File className="h-3.5 w-3.5 text-gray-500" />
    }
  }

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // Load files
  const loadFiles = async () => {
    try {
      setLoading(true)
      setError(null)
      // Convert 'uncategorized' string to null for backend
      const folderId = currentFolderId === 'uncategorized' ? null : currentFolderId
      const result = await invoke('get_files_by_folder', { folderId })
      setFiles(result || [])
    } catch (err) {
      console.error('Failed to load files:', err)
      setError(err.toString())
    } finally {
      setLoading(false)
    }
  }

  // Check sync approval
  const checkSyncApproval = async () => {
    try {
      const approval = await syncService.checkSyncApproval(user.email)
      setSyncApproval(approval)
    } catch (error) {
      console.error('Failed to check sync approval:', error)
    }
  }

  // Load files on mount and folder change
  useEffect(() => {
    loadFiles()
  }, [currentFolderId])

  // Check sync approval on mount
  useEffect(() => {
    if (isSignedIn && user?.email) {
      checkSyncApproval()
    }
  }, [isSignedIn, user])

  // Handle file upload
  const handleFileUpload = async () => {
    try {
      const selected = await open({
        multiple: false,
        title: 'Select a file to upload'
      })

      if (selected && !Array.isArray(selected)) {
        setUploadingFile('Uploading...')
        const fileName = selected.split(/[/\\]/).pop()

        // Read file as ArrayBuffer
        const response = await fetch(selected)
        const buffer = await response.arrayBuffer()
        const fileBytes = new Uint8Array(buffer)

        // Convert 'uncategorized' string to null for backend
        const folderId = currentFolderId === 'uncategorized' ? null : currentFolderId

        // Upload file through Tauri
        await invoke('upload_file', {
          filename: fileName,
          fileData: Array.from(fileBytes),
          folderId,
          description: null,
          tags: null
        })

        // Reload files
        await loadFiles()

        // Notify parent
        onUploadComplete?.()

        setUploadingFile(null)
      }
    } catch (err) {
      console.error('Failed to upload file:', err)
      setError(err.toString())
      setUploadingFile(null)
    }
  }

  // Handle file delete
  const handleDeleteFile = async (e, file) => {
    e.stopPropagation()

    try {
      await invoke('delete_file', { id: file.id })
      await loadFiles()
    } catch (err) {
      console.error('Failed to delete file:', err)
      setError(err.toString())
    }
  }

  // Handle file download
  const handleDownloadFile = async (e, file) => {
    e.stopPropagation()
    try {
      const [fileName, fileData, mimeType] = await invoke('download_file', { id: file.id })

      // Create blob and download
      const blob = new Blob([new Uint8Array(fileData)], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download file:', err)
      setError(err.toString())
    }
  }

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadFiles()
      return
    }

    try {
      setLoading(true)
      const result = await invoke('search_files', { query: searchQuery })
      setFiles(result || [])
    } catch (err) {
      console.error('Failed to search files:', err)
      setError(err.toString())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch()
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Handle sync
  const handleSync = async () => {
    const email = user?.email
    if (!email) return

    if (!hasUnsyncedChanges) {
      setSyncStatus({
        type: 'success',
        message: 'Secured cloud sync successful'
      })
      setTimeout(() => setSyncStatus(null), 3000)
      return
    }

    setIsSyncing(true)
    setSyncStatus(null)
    onSyncStart?.()

    try {
      const result = await syncService.syncFilesAll(email)

      setSyncStatus({
        type: 'success',
        message: 'Secured cloud sync successful'
      })

      onSyncComplete?.(result.syncTime)

      setTimeout(() => setSyncStatus(null), 3000)
    } catch (error) {
      console.error('Sync failed:', error)

      let errorMessage
      if (error.message === 'SYNC_NOT_APPROVED') {
        errorMessage = 'Sync access not approved yet. Please wait for approval.'
      } else if (error.message === 'Supabase not configured') {
        errorMessage = 'Cloud sync not configured'
      } else {
        errorMessage = error.message || 'Sync failed. Please try again.'
      }

      setSyncStatus({
        type: 'error',
        message: errorMessage
      })

      setTimeout(() => setSyncStatus(null), 5000)
    } finally {
      setIsSyncing(false)
    }
  }

  // Filter files by search query
  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.tags?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.file_type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4" />
          <h2 className="text-sm font-semibold">
            {currentFolderIcon && <span className="mr-1">{currentFolderIcon}</span>}
            {currentFolderName || 'Files'}
          </h2>
          <Badge variant="secondary" className="text-[9px]">
            {filteredFiles.length}
          </Badge>
        </div>

        {/* Search Bar */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-[10px] border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* View Mode Toggle */}
          {onViewModeChange && (
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onViewModeChange('list')}
                title="List view"
              >
                <List className="h-3 w-3" />
              </Button>
              <Button
                variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onViewModeChange('card')}
                title="Card view"
              >
                <LayoutList className="h-3 w-3" />
              </Button>
            </div>
          )}

          <div className="flex-1"></div>

          {/* Upload Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[9px] gap-1"
            onClick={handleFileUpload}
            disabled={!!uploadingFile || loading}
          >
            <Upload className="h-3 w-3" />
            {uploadingFile || 'Upload'}
          </Button>

          {/* Sync Button */}
          {isSignedIn && syncApproval?.approved && (
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-2 text-[9px] gap-1 ${
                hasUnsyncedChanges && !isSyncing
                  ? 'bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30 hover:text-yellow-700'
                  : ''
              }`}
              disabled={!hasUnsyncedChanges || isSyncing}
              onClick={handleSync}
            >
              {isSyncing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : hasUnsyncedChanges ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <CheckCircle className="h-3 w-3" />
              )}
              {isSyncing ? 'Syncing...' : hasUnsyncedChanges ? 'Sync' : 'Synced'}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto ${viewMode === 'list' ? '' : 'p-3 space-y-2'}`}>
        {/* Sync Status */}
        {syncStatus && (
          <div className={`mx-3 mt-3 p-2 rounded-md border ${
            syncStatus.type === 'success'
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-destructive/10 border-destructive/20'
          }`}>
            <div className="flex items-center gap-2">
              {syncStatus.type === 'success' ? (
                <Shield className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-destructive" />
              )}
              <p className={`text-[10px] ${
                syncStatus.type === 'success' ? 'text-green-600' : 'text-destructive'
              }`}>
                {syncStatus.message}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="m-3 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-3 w-3 text-destructive mt-0.5" />
              <p className="text-[10px] text-destructive">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className={`text-center py-8 text-muted-foreground ${viewMode === 'list' ? 'px-3' : ''}`}>
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-[10px]">
              {searchQuery ? 'No files found' : 'No files yet'}
            </p>
            {!searchQuery && (
              <p className="text-[9px] mt-1">Upload a file to get started</p>
            )}
          </div>
        ) : (
          <>
            {filteredFiles.slice(0, displayCount).map((file) => (
              <div
                key={file.id}
                onClick={() => onFileSelect?.(file)}
                className={`
                  cursor-pointer transition-all
                  ${viewMode === 'list'
                    ? `px-2 py-1.5 border-b border-border/50 hover:bg-accent/50`
                    : `p-2.5 border rounded-lg bg-accent/30 border-border/50 hover:bg-accent/50 hover:border-border hover:shadow-sm`
                  }
                `}
              >
                {viewMode === 'list' ? (
                  // List View
                  <div className="flex items-center gap-2">
                    {getFileIcon(file.file_type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[10px] font-medium truncate">
                          {file.filename}
                        </h3>
                        <Badge variant="secondary" className="text-[7px]">
                          {file.file_type}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[9px] text-muted-foreground">
                        {formatFileSize(file.file_size)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        onClick={(e) => handleDownloadFile(e, file)}
                      >
                        <Download className="h-2.5 w-2.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => handleDeleteFile(e, file)}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Card View
                  <>
                    <div className="flex items-start gap-2">
                      {getFileIcon(file.file_type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[11px] font-medium truncate">
                            {file.filename}
                          </h3>
                          <Badge variant="secondary" className="text-[8px]">
                            {file.file_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{formatFileSize(file.file_size)}</span>
                          <span>•</span>
                          <span>
                            {new Date(file.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {file.description && (
                          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">
                            {file.description}
                          </p>
                        )}
                        {file.tags && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {file.tags.split(',').map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-[8px] px-1 py-0">
                                {tag.trim()}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[9px]"
                        onClick={(e) => handleDownloadFile(e, file)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[9px] text-destructive hover:text-destructive"
                        onClick={(e) => handleDeleteFile(e, file)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Load More Button */}
            {filteredFiles.length > displayCount && (
              <Button
                variant="ghost"
                className={`w-full text-xs h-8 ${viewMode === 'list' ? 'rounded-none' : 'mt-2'}`}
                onClick={() => setDisplayCount(prev => prev + 20)}
              >
                Load {Math.min(20, filteredFiles.length - displayCount)} More
              </Button>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className={`border-t ${viewMode === 'list' ? 'p-2' : 'p-3'}`}>
        <Button
          className="w-full text-[10px] h-8"
          onClick={handleFileUpload}
          disabled={loading || !!uploadingFile}
        >
          <Upload className="h-3.5 w-3.5 mr-1" />
          {uploadingFile || 'Upload File'}
        </Button>
      </div>
    </div>
  )
}
