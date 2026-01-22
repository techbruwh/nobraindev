import { X, Download, Edit, FileText, FileImage, FileVideo, FileAudio, Code, File, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'

export function FilePreview({ file, onClose, onEdit }) {
  const [fileData, setFileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const fileInputRef = useRef(null)

  // Load file data
  useEffect(() => {
    loadFileData()
    return () => {
      // Cleanup object URL when component unmounts
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [file])

  const loadFileData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [fileName, data, mimeType] = await invoke('download_file', { id: file.id })

      setFileData({ fileName, data, mimeType })

      // Create blob URL for preview
      const blob = new Blob([new Uint8Array(data)], { type: mimeType })
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
    } catch (err) {
      console.error('Failed to load file:', err)
      setError(err.toString())
    } finally {
      setLoading(false)
    }
  }

  // Handle file edit (replace file)
  const handleEdit = async () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    try {
      setLoading(true)
      const fileBytes = new Uint8Array(await selectedFile.arrayBuffer())

      // Upload new file
      await invoke('update_file', {
        id: file.id,
        filename: selectedFile.name,
        description: file.description,
        tags: file.tags,
        folderId: file.folder_id
      })

      // Reload file data
      await loadFileData()
      onEdit?.(file)
    } catch (err) {
      console.error('Failed to update file:', err)
      setError(err.toString())
    } finally {
      setLoading(false)
    }
  }

  // Handle download
  const handleDownload = () => {
    if (!fileData || !previewUrl) return

    const a = document.createElement('a')
    a.href = previewUrl
    a.download = fileData.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Render preview based on file type
  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-destructive text-sm">Failed to load file</p>
            <p className="text-muted-foreground text-xs mt-1">{error}</p>
          </div>
        </div>
      )
    }

    if (!fileData || !previewUrl) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">No file data available</p>
        </div>
      )
    }

    switch (file.file_type) {
      case 'image':
        return (
          <div className="flex items-center justify-center h-full p-4 bg-black/5">
            <img
              src={previewUrl}
              alt={fileData.fileName}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        )

      case 'video':
        return (
          <div className="flex items-center justify-center h-full">
            <video
              src={previewUrl}
              controls
              className="max-w-full max-h-full"
              autoPlay
            />
          </div>
        )

      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center h-full gap-8">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <FileAudio className="h-16 w-16 text-white" />
            </div>
            <audio
              src={previewUrl}
              controls
              className="w-full max-w-md"
              autoPlay
            />
          </div>
        )

      case 'code':
      case 'text':
        try {
          const text = new TextDecoder().decode(new Uint8Array(fileData.data))
          return (
            <div className="h-full p-4 bg-black/5">
              <pre className="h-full overflow-auto text-xs font-mono whitespace-pre-wrap">
                {text}
              </pre>
            </div>
          )
        } catch (err) {
          return (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Failed to decode text</p>
            </div>
          )
        }

      case 'document':
      case 'archive':
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            {file.file_type === 'document' ? (
              <FileText className="h-24 w-24 text-red-500" />
            ) : file.file_type === 'archive' ? (
              <File className="h-24 w-24 text-orange-500" />
            ) : (
              <File className="h-24 w-24 text-gray-500" />
            )}
            <div className="text-center">
              <p className="text-sm font-medium">{fileData.fileName}</p>
              <p className="text-muted-foreground text-xs mt-1">
                {(fileData.data.length / 1024).toFixed(1)} KB
              </p>
            </div>
            <p className="text-muted-foreground text-xs">
              Preview not available for this file type
            </p>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-6xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {file.file_type === 'image' && <FileImage className="h-4 w-4 text-blue-500" />}
            {file.file_type === 'video' && <FileVideo className="h-4 w-4 text-purple-500" />}
            {file.file_type === 'audio' && <FileAudio className="h-4 w-4 text-green-500" />}
            {(file.file_type === 'code' || file.file_type === 'text') && <Code className="h-4 w-4 text-yellow-500" />}
            {file.file_type === 'document' && <FileText className="h-4 w-4 text-red-500" />}
            {file.file_type === 'archive' && <File className="h-4 w-4 text-orange-500" />}
            {!['image', 'video', 'audio', 'code', 'text', 'document', 'archive'].includes(file.file_type) && (
              <File className="h-4 w-4 text-gray-500" />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold truncate">{file.filename}</h2>
              <p className="text-xs text-muted-foreground">
                {file.file_type} • {(file.file_size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              disabled={!fileData}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderPreview()}
        </div>

        {/* Hidden file input for editing */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  )
}
