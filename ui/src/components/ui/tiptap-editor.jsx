import { useEffect, useState, useRef } from 'react'
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { open } from '@tauri-apps/plugin-shell'
import * as UnderlineExt from '@tiptap/extension-underline'
import * as TextStyleExt from '@tiptap/extension-text-style'
import * as ColorExt from '@tiptap/extension-color'
import * as HighlightExt from '@tiptap/extension-highlight'
import * as LinkExt from '@tiptap/extension-link'
import * as ImageExt from '@tiptap/extension-image'
import * as TableExt from '@tiptap/extension-table'
import * as TableRowExt from '@tiptap/extension-table-row'
import * as TableCellExt from '@tiptap/extension-table-cell'
import * as TableHeaderExt from '@tiptap/extension-table-header'
import * as PlaceholderExt from '@tiptap/extension-placeholder'
import * as TextAlignExt from '@tiptap/extension-text-align'
import * as TaskListExt from '@tiptap/extension-task-list'
import * as TaskItemExt from '@tiptap/extension-task-item'
import * as CodeBlockLowlightExt from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'

const Underline = UnderlineExt.default || UnderlineExt.Underline || UnderlineExt
const TextStyle = TextStyleExt.default || TextStyleExt.TextStyle || TextStyleExt
const Color = ColorExt.default || ColorExt.Color || ColorExt
const Highlight = HighlightExt.default || HighlightExt.Highlight || HighlightExt
const Link = LinkExt.default || LinkExt.Link || LinkExt
const Image = ImageExt.default || ImageExt.Image || ImageExt
const Table = TableExt.default || TableExt.Table || TableExt
const TableRow = TableRowExt.default || TableRowExt.TableRow || TableRowExt
const TableCell = TableCellExt.default || TableCellExt.TableCell || TableCellExt
const TableHeader = TableHeaderExt.default || TableHeaderExt.TableHeader || TableHeaderExt
const Placeholder = PlaceholderExt.default || PlaceholderExt.Placeholder || PlaceholderExt
const TextAlign = TextAlignExt.default || TextAlignExt.TextAlign || TextAlignExt
const TaskList = TaskListExt.default || TaskListExt.TaskList || TaskListExt
const TaskItem = TaskItemExt.default || TaskItemExt.TaskItem || TaskItemExt
const CodeBlockLowlight = CodeBlockLowlightExt.default || CodeBlockLowlightExt.CodeBlockLowlight || CodeBlockLowlightExt

// Custom FontSize extension
const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
      {
        types: ['codeBlock'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
      {
        types: ['code'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontSize: fontSize => ({ chain, editor }) => {
        // Apply to regular text
        const result = chain()
          .setMark('textStyle', { fontSize })
          .run()
        
        // Apply to code blocks
        if (editor.isActive('codeBlock')) {
          editor.commands.updateAttributes('codeBlock', { fontSize })
        }
        
        return result
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run()
      },
    }
  },
})

import { RichTextProvider } from 'reactjs-tiptap-editor'
import 'reactjs-tiptap-editor/style.css'
import { CodeBlockComponent } from './code-block-component'
import {
  Type,
  Bold,
  Italic,
  Strikethrough,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  MessageSquareQuote,
  Undo2,
  Redo2,
  Minus,
  Link2,
  ImagePlus,
  Table2,
  Highlighter,
  UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ListTodo,
  Palette,
  ChevronDown,
  FileCode2,
  Edit3,
  Trash2,
  Plus,
  MinusIcon,
  Columns,
  Rows
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Create lowlight instance with common languages
const lowlight = createLowlight(common)

// Popular programming languages
const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'plaintext', label: 'Plain Text' }
]

export function TiptapEditor({ content, onChange, editable = true, autoFocus = false }) {
  const isMountedRef = useRef(true)
  const [editorContent, setEditorContent] = useState(content || '')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkInputPosition, setLinkInputPosition] = useState({ top: 0, left: 0 })
  const [showLinkPopup, setShowLinkPopup] = useState(false)
  const [linkPopupPosition, setLinkPopupPosition] = useState({ top: 0, left: 0 })
  const [currentLinkUrl, setCurrentLinkUrl] = useState('')
  const [isEditingLink, setIsEditingLink] = useState(false)
  const [showImageInput, setShowImageInput] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [currentLanguage, setCurrentLanguage] = useState('javascript')
  const [currentFontSize, setCurrentFontSize] = useState('16px')
  const [showBubbleMenu, setShowBubbleMenu] = useState(false)
  const [bubbleMenuPosition, setBubbleMenuPosition] = useState({ top: 0, left: 0 })
  const [showTableMenu, setShowTableMenu] = useState(false)
  const [tableMenuPosition, setTableMenuPosition] = useState({ top: 0, left: 0 })
  const bubbleMenuRef = useRef(null)
  const tableMenuRef = useRef(null)
  const isInteractingWithMenuRef = useRef(false)
  const linkInputRef = useRef(null)
  const linkPopupRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6]
        },
        codeBlock: false // Disable default code block
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'javascript',
        HTMLAttributes: {
          class: 'hljs',
          spellcheck: 'false'
        }
      }).extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockComponent)
        },
        addKeyboardShortcuts() {
          return {
            Tab: () => {
              if (this.editor.isActive('codeBlock')) {
                return this.editor.commands.insertContent('\t')
              }
              return false
            }
          }
        }
      }),
      Underline,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({
        multicolor: true
      }),
      Link.configure({
        openOnClick: !editable,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md'
        }
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full'
        }
      }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({
        placeholder: ''
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      TaskList,
      TaskItem.configure({
        nested: true
      })
    ],
    content: editorContent,
    editable,
    onUpdate: ({ editor }) => {
      if (!isMountedRef.current || !editor || !editor.view || editor.isDestroyed) return
      try {
        const html = editor.getHTML()
        setEditorContent(html)
        onChange?.(html)
      } catch (error) {
        console.warn('Editor update error:', error)
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-2',
        spellcheck: 'false',
        autocomplete: 'off',
        autocorrect: 'off',
        autocapitalize: 'off',
        'data-tippy-root': 'false'
      }
    }
  })

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (editor && !editor.isDestroyed && content !== editorContent) {
      try {
        editor.commands.setContent(content || '', false)
        setEditorContent(content || '')
      } catch (error) {
        console.warn('Error setting editor content:', error)
      }
    }
  }, [content, editor])

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      try {
        editor.setEditable(editable)
      } catch (error) {
        console.warn('Error setting editor editable:', error)
      }
    }
  }, [editable, editor])

  // Auto-focus editor when autoFocus is true
  useEffect(() => {
    if (autoFocus && editor && !editor.isDestroyed && editor.view) {
      try {
        // Small delay to ensure editor is fully mounted
        setTimeout(() => {
          if (editor && !editor.isDestroyed) {
            editor.commands.focus('start')
          }
        }, 100)
      } catch (error) {
        console.warn('Error focusing editor:', error)
      }
    }
  }, [autoFocus, editor])

  // Handle clicks and hovers on links
  useEffect(() => {
    if (!editor || !editor.view || !editor.view.dom) return

    let hoverTimeout = null

    const handleClick = async (event) => {
      if (!isMountedRef.current) return

      const target = event.target

      // Check if clicked on a link
      if (target.tagName === 'A' && target.href) {
        const url = target.getAttribute('href')

        // Only open link if Cmd/Ctrl key is pressed
        if (event.metaKey || event.ctrlKey) {
          event.preventDefault()
          try {
            await open(url)
          } catch (error) {
            console.error('Failed to open link:', error)
          }
        } else {
          // Regular click on link - prevent default and show popup
          event.preventDefault()
          const rect = target.getBoundingClientRect()

          setCurrentLinkUrl(url)
          setLinkPopupPosition({
            top: rect.bottom + window.scrollY + 8,
            left: rect.left + window.scrollX
          })
          setShowLinkPopup(true)
          setIsEditingLink(false)
        }
      }
    }

    const handleMouseEnter = (event) => {
      if (!isMountedRef.current) return

      const target = event.target

      // Check if hovering on a link
      if (target.tagName === 'A' && target.href && editable) {
        // Clear any existing timeout
        if (hoverTimeout) {
          clearTimeout(hoverTimeout)
        }

        // Show popup after a short delay
        hoverTimeout = setTimeout(() => {
          if (!isMountedRef.current) return

          const url = target.getAttribute('href')
          const rect = target.getBoundingClientRect()

          setCurrentLinkUrl(url)
          setLinkPopupPosition({
            top: rect.bottom + window.scrollY + 8,
            left: rect.left + window.scrollX
          })
          setShowLinkPopup(true)
          setIsEditingLink(false)
        }, 300) // 300ms delay before showing popup
      }
    }

    const handleMouseLeave = () => {
      // Clear the timeout if mouse leaves before popup appears
      if (hoverTimeout) {
        clearTimeout(hoverTimeout)
        hoverTimeout = null
      }
    }

    const editorElement = editor.view.dom
    editorElement.addEventListener('click', handleClick)
    editorElement.addEventListener('mouseenter', handleMouseEnter, true)
    editorElement.addEventListener('mouseleave', handleMouseLeave, true)

    return () => {
      try {
        if (hoverTimeout) {
          clearTimeout(hoverTimeout)
        }
        editorElement.removeEventListener('click', handleClick)
        editorElement.removeEventListener('mouseenter', handleMouseEnter, true)
        editorElement.removeEventListener('mouseleave', handleMouseLeave, true)
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }, [editor, editable])

  // Close popup when clicking outside
  useEffect(() => {
    if (!showLinkPopup) return

    const handleClickOutside = (event) => {
      if (linkPopupRef.current && !linkPopupRef.current.contains(event.target)) {
        setShowLinkPopup(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showLinkPopup])

  // Update current language when cursor moves into a code block
  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    const updateLanguage = () => {
      if (!isMountedRef.current || editor.isDestroyed) return
      try {
        if (editor.isActive('codeBlock')) {
          const { language } = editor.getAttributes('codeBlock')
          if (language) {
            setCurrentLanguage(language)
          }
        }
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    editor.on('selectionUpdate', updateLanguage)
    editor.on('update', updateLanguage)

    return () => {
      try {
        if (!editor.isDestroyed) {
          editor.off('selectionUpdate', updateLanguage)
          editor.off('update', updateLanguage)
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }, [editor])

  // Update current font size when selection changes
  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    const updateFontSize = () => {
      if (!isMountedRef.current || editor.isDestroyed) return
      try {
        const { fontSize } = editor.getAttributes('textStyle')
        setCurrentFontSize(fontSize || '16px')
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    editor.on('selectionUpdate', updateFontSize)
    editor.on('transaction', updateFontSize)

    return () => {
      try {
        if (!editor.isDestroyed) {
          editor.off('selectionUpdate', updateFontSize)
          editor.off('transaction', updateFontSize)
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }, [editor])

  // Handle bubble menu positioning
  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    const updateBubbleMenu = () => {
      if (!isMountedRef.current || editor.isDestroyed) return
      try {
        const { from, to, empty } = editor.state.selection

      if (empty || !editable) {
        setShowBubbleMenu(false)
        return
      }

      // Don't show bubble menu if selection is inside a code block
      if (editor.isActive('codeBlock')) {
        setShowBubbleMenu(false)
        return
      }

      // Get the DOM selection
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) {
        setShowBubbleMenu(false)
        return
      }

      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      if (rect.width === 0 && rect.height === 0) {
        setShowBubbleMenu(false)
        return
      }

      // Position the bubble menu above the selection
      const menuWidth = 400 // approximate width
      const menuHeight = 40 // approximate height

      let top = rect.top + window.scrollY - menuHeight - 8
      let left = rect.left + window.scrollX + (rect.width / 2) - (menuWidth / 2)

      // Keep menu on screen
      if (left < 10) left = 10
      if (left + menuWidth > window.innerWidth - 10) {
        left = window.innerWidth - menuWidth - 10
      }

      if (top < 10) {
        // If no room above, show below
        top = rect.bottom + window.scrollY + 8
      }

        setBubbleMenuPosition({ top, left })
        setShowBubbleMenu(true)
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    const handleBlur = () => {
      if (!isMountedRef.current) return
      // Delay hiding to allow clicking menu items and check if selection still exists
      setTimeout(() => {
        if (!editor.isDestroyed) {
          const { empty } = editor.state.selection
          // Only hide if:
          // 1. Selection is empty
          // 2. Focus is not on the bubble menu
          // 3. User is not interacting with the menu
          if (empty &&
              !bubbleMenuRef.current?.contains(document.activeElement) &&
              !isInteractingWithMenuRef.current) {
            setShowBubbleMenu(false)
          }
        }
      }, 150)
    }

    const handleFocus = () => {
      // Show bubble menu when editor gets focus and there's a selection
      setTimeout(() => {
        if (!editor.isDestroyed && isMountedRef.current) {
          const { empty } = editor.state.selection
          if (!empty) {
            updateBubbleMenu()
          }
        }
      }, 50)
    }

    editor.on('selectionUpdate', updateBubbleMenu)
    editor.on('transaction', updateBubbleMenu)
    editor.on('blur', handleBlur)
    editor.on('focus', handleFocus)

    return () => {
      try {
        if (!editor.isDestroyed) {
          editor.off('selectionUpdate', updateBubbleMenu)
          editor.off('transaction', updateBubbleMenu)
          editor.off('blur', handleBlur)
          editor.off('focus', handleFocus)
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }, [editor, editable])

  // Handle table menu positioning
  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    const updateTableMenu = () => {
      if (!isMountedRef.current || editor.isDestroyed) return
      try {
        const isInTable = editor.isActive('table')

        if (!isInTable || !editable) {
          setShowTableMenu(false)
          return
        }

        // Get the cursor coordinates
        const { from } = editor.state.selection
        const coords = editor.view.coordsAtPos(from)

        // Position table menu above the cursor
        const menuWidth = 300 // approximate width
        const menuHeight = 40 // approximate height

        let top = coords.top - menuHeight - 8
        let left = coords.left + window.scrollX - (menuWidth / 2)

        // Keep menu on screen
        if (left < 10) left = 10
        if (left + menuWidth > window.innerWidth - 10) {
          left = window.innerWidth - menuWidth - 10
        }

        if (top < 10) {
          // If no room above, show below
          top = coords.bottom + 8
        }

        setTableMenuPosition({ top, left })
        setShowTableMenu(true)
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    const handleTableBlur = () => {
      if (!isMountedRef.current) return
      setTimeout(() => {
        if (!editor.isDestroyed) {
          const isInTable = editor.isActive('table')
          if (!isInTable &&
              !tableMenuRef.current?.contains(document.activeElement) &&
              !isInteractingWithMenuRef.current) {
            setShowTableMenu(false)
          }
        }
      }, 150)
    }

    editor.on('selectionUpdate', updateTableMenu)
    editor.on('transaction', updateTableMenu)
    editor.on('blur', handleTableBlur)

    return () => {
      try {
        if (!editor.isDestroyed) {
          editor.off('selectionUpdate', updateTableMenu)
          editor.off('transaction', updateTableMenu)
          editor.off('blur', handleTableBlur)
        }
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  }, [editor, editable])

  const addLink = () => {
    if (linkUrl && editor) {
      let url = linkUrl.trim()
      
      // Add https:// if no protocol
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url
      }
      
      editor.chain().focus().setLink({ href: url }).run()
      setLinkUrl('')
      setShowLinkInput(false)
    }
  }

  const updateLink = () => {
    if (currentLinkUrl && editor) {
      let url = currentLinkUrl.trim()
      
      // Add https:// if no protocol
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url
      }
      
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
      setShowLinkPopup(false)
      setIsEditingLink(false)
    }
  }

  const removeLink = () => {
    if (editor) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      setShowLinkPopup(false)
    }
  }

  const addImage = () => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run()
      setImageUrl('')
      setShowImageInput(false)
    }
  }

  const insertTable = () => {
    if (editor) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    }
  }

  const insertCodeBlock = () => {
    if (editor) {
      editor.chain().focus().toggleCodeBlock().run()
    }
  }

  const updateCodeBlockLanguage = (language) => {
    if (editor && editor.isActive('codeBlock')) {
      editor.chain().focus().updateAttributes('codeBlock', { language }).run()
      setCurrentLanguage(language)
    }
  }

  if (!editor) {
    return <div className="p-4 text-muted-foreground text-sm">Loading editor...</div>
  }

  // Wait for editor view to be ready before calling any methods
  if (!editor.view || !editor.view.dom) {
    return <div className="p-4 text-muted-foreground text-sm">Initializing editor...</div>
  }

  const isCodeBlock = editor.isActive('codeBlock')

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Custom Toolbar - only show in editable mode */}
      {editable && (
      <div className="border-b bg-muted/30 p-2 flex flex-wrap gap-1 items-center sticky top-0 z-10">
        {/* Font Size Selector */}
        <Select 
          value={currentFontSize} 
          onValueChange={(value) => {
            editor.chain().focus().setFontSize(value).run()
            setCurrentFontSize(value)
          }}
        >
          <SelectTrigger className="h-8 w-[100px] text-xs gap-1">
            <Type className="h-3.5 w-3.5" />
            <SelectValue>{currentFontSize}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="12px" className="text-xs">12px</SelectItem>
            <SelectItem value="14px" className="text-xs">14px</SelectItem>
            <SelectItem value="16px" className="text-xs">16px</SelectItem>
            <SelectItem value="18px" className="text-xs">18px</SelectItem>
            <SelectItem value="20px" className="text-xs">20px</SelectItem>
            <SelectItem value="24px" className="text-xs">24px</SelectItem>
            <SelectItem value="28px" className="text-xs">28px</SelectItem>
            <SelectItem value="32px" className="text-xs">32px</SelectItem>
            <SelectItem value="36px" className="text-xs">36px</SelectItem>
            <SelectItem value="48px" className="text-xs">48px</SelectItem>
          </SelectContent>
        </Select>

        <div className="w-px h-7 bg-border mx-1" />
        
        {/* Text Formatting */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          data-active={editor.isActive('bold')}
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          data-active={editor.isActive('italic')}
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          data-active={editor.isActive('underline')}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          data-active={editor.isActive('strike')}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.can().chain().focus().toggleCode().run()}
          data-active={editor.isActive('code')}
        >
          <Code2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          data-active={editor.isActive('highlight')}
        >
          <Highlighter className="h-4 w-4" />
        </Button>

        <div className="w-px h-7 bg-border mx-1" />
        
        {/* Headings */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => {
            if (editor.isActive('heading', { level: 1 })) {
              // If already H1, convert to paragraph
              editor.chain().focus().setParagraph().run()
            } else {
              // Apply H1 and remove all other formatting including text style (font size)
              editor.chain()
                .focus()
                .unsetMark('textStyle')
                .unsetMark('bold')
                .unsetMark('italic')
                .unsetMark('underline')
                .unsetMark('strike')
                .unsetMark('code')
                .unsetMark('link')
                .unsetMark('highlight')
                .setHeading({ level: 1 })
                .run()
            }
          }}
          data-active={editor.isActive('heading', { level: 1 })}
        >
          <Heading1 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => {
            if (editor.isActive('heading', { level: 2 })) {
              // If already H2, convert to paragraph
              editor.chain().focus().setParagraph().run()
            } else {
              // Apply H2 and remove all other formatting including text style (font size)
              editor.chain()
                .focus()
                .unsetMark('textStyle')
                .unsetMark('bold')
                .unsetMark('italic')
                .unsetMark('underline')
                .unsetMark('strike')
                .unsetMark('code')
                .unsetMark('link')
                .unsetMark('highlight')
                .setHeading({ level: 2 })
                .run()
            }
          }}
          data-active={editor.isActive('heading', { level: 2 })}
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => {
            if (editor.isActive('heading', { level: 3 })) {
              // If already H3, convert to paragraph
              editor.chain().focus().setParagraph().run()
            } else {
              // Apply H3 and remove all other formatting including text style (font size)
              editor.chain()
                .focus()
                .unsetMark('textStyle')
                .unsetMark('bold')
                .unsetMark('italic')
                .unsetMark('underline')
                .unsetMark('strike')
                .unsetMark('code')
                .unsetMark('link')
                .unsetMark('highlight')
                .setHeading({ level: 3 })
                .run()
            }
          }}
          data-active={editor.isActive('heading', { level: 3 })}
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <div className="w-px h-7 bg-border mx-1" />
        
        {/* Text Alignment */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          data-active={editor.isActive({ textAlign: 'left' })}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          data-active={editor.isActive({ textAlign: 'center' })}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          data-active={editor.isActive({ textAlign: 'right' })}
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-7 bg-border mx-1" />
        
        {/* Lists */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          data-active={editor.isActive('bulletList')}
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          data-active={editor.isActive('orderedList')}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          data-active={editor.isActive('taskList')}
        >
          <ListTodo className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={insertCodeBlock}
          data-active={isCodeBlock}
        >
          <FileCode2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          data-active={editor.isActive('blockquote')}
        >
          <MessageSquareQuote className="h-4 w-4" />
        </Button>

        <div className="w-px h-7 bg-border mx-1" />
        
        {/* Insert Elements */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => {
            const { from, to } = editor.state.selection
            const text = editor.state.doc.textBetween(from, to, '')

            if (!text) {
              alert('Please select some text first')
              return
            }

            // Get selection position
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0)
              const rect = range.getBoundingClientRect()

              // Position below the selection
              setLinkInputPosition({
                top: rect.bottom + window.scrollY + 8,
                left: rect.left + window.scrollX
              })
            }

            setShowLinkInput(!showLinkInput)
          }}
          data-active={editor.isActive('link')}
        >
          <Link2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setShowImageInput(!showImageInput)}
        >
          <ImagePlus className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={insertTable}
        >
          <Table2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </Button>

        <div className="w-px h-7 bg-border mx-1" />
        
        {/* History */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>
      )}

      {/* Link Popup - shows when hovering/clicking on a link */}
      {showLinkPopup && (
        <div
          ref={linkPopupRef}
          className="fixed bg-background border rounded-lg shadow-lg p-2 z-50 min-w-[300px]"
          style={{
            top: `${linkPopupPosition.top}px`,
            left: `${linkPopupPosition.left}px`,
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {isEditingLink ? (
            // Edit mode
            <div className="flex gap-2 items-center">
              <Input
                type="url"
                placeholder="Enter URL..."
                value={currentLinkUrl}
                onChange={(e) => setCurrentLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateLink()
                  } else if (e.key === 'Escape') {
                    setIsEditingLink(false)
                    setShowLinkPopup(false)
                  }
                }}
                className="h-8 text-xs flex-1"
                autoFocus
              />
              <Button size="sm" className="h-8" onClick={updateLink}>
                Save
              </Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setIsEditingLink(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            // View mode
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link2 className="h-3 w-3 shrink-0" />
                <span className="flex-1 truncate">{currentLinkUrl}</span>
              </div>
              {editable && (
                <>
                  <div className="flex gap-1 justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => setIsEditingLink(true)}
                      title="Edit link"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 w-8 p-0"
                      onClick={removeLink}
                      title="Remove link"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[9px] text-muted-foreground text-center">
                    <kbd className="px-1 bg-muted rounded">Cmd/Ctrl</kbd> + Click to open
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating Link Input - only show in editable mode */}
      {editable && showLinkInput && (
        <div 
          ref={linkInputRef}
          className="fixed bg-background border rounded-lg shadow-lg p-2 flex gap-2 items-center z-50"
          style={{
            top: `${linkInputPosition.top}px`,
            left: `${linkInputPosition.left}px`,
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <Input
            type="url"
            placeholder="Enter URL..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addLink()
              } else if (e.key === 'Escape') {
                setShowLinkInput(false)
              }
            }}
            className="h-8 text-xs w-64"
            autoFocus
          />
          <Button size="sm" className="h-8" onClick={addLink}>
            Add
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowLinkInput(false)}>
            Cancel
          </Button>
        </div>
      )}

      {editable && (
      <>
      {showImageInput && (
        <div className="border-b p-2 flex gap-2 items-center bg-muted/20">
          <ImagePlus className="h-4 w-4 text-muted-foreground" />
          <Input
            type="url"
            placeholder="Enter image URL..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addImage()
              } else if (e.key === 'Escape') {
                setShowImageInput(false)
              }
            }}
            className="h-8 text-xs"
            autoFocus
          />
          <Button size="sm" className="h-8" onClick={addImage}>
            Add
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowImageInput(false)}>
            Cancel
          </Button>
        </div>
      )}
      </>
      )}

      {/* Custom Floating Bubble Menu - only show in editable mode */}
      {editable && (
      <>
      {showBubbleMenu && (
        <div
          ref={bubbleMenuRef}
          className="fixed bg-background border rounded-lg shadow-lg p-1 flex gap-1 items-center z-50 transition-opacity"
          style={{
            top: `${bubbleMenuPosition.top}px`,
            left: `${bubbleMenuPosition.left}px`,
          }}
          onMouseEnter={() => {
            isInteractingWithMenuRef.current = true
          }}
          onMouseLeave={() => {
            isInteractingWithMenuRef.current = false
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            isInteractingWithMenuRef.current = true
          }}
        >
          {/* Font Size in Bubble Menu */}
          <Select 
            value={currentFontSize} 
            onValueChange={(value) => {
              editor.chain().focus().setFontSize(value).run()
              setCurrentFontSize(value)
            }}
          >
            <SelectTrigger className="h-7 w-[85px] text-xs border-0">
              <Type className="h-3 w-3" />
              <SelectValue>{currentFontSize}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12px" className="text-xs">12px</SelectItem>
              <SelectItem value="14px" className="text-xs">14px</SelectItem>
              <SelectItem value="16px" className="text-xs">16px</SelectItem>
              <SelectItem value="18px" className="text-xs">18px</SelectItem>
              <SelectItem value="20px" className="text-xs">20px</SelectItem>
              <SelectItem value="24px" className="text-xs">24px</SelectItem>
              <SelectItem value="28px" className="text-xs">28px</SelectItem>
              <SelectItem value="32px" className="text-xs">32px</SelectItem>
            </SelectContent>
          </Select>

          <div className="w-px h-5 bg-border" />

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().toggleBold().run()}
            data-active={editor.isActive('bold')}
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            data-active={editor.isActive('italic')}
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            data-active={editor.isActive('underline')}
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            data-active={editor.isActive('strike')}
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </Button>

          <div className="w-px h-5 bg-border" />
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().toggleCode().run()}
            data-active={editor.isActive('code')}
          >
            <Code2 className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            data-active={editor.isActive('highlight')}
          >
            <Highlighter className="h-3.5 w-3.5" />
          </Button>

          <div className="w-px h-5 bg-border" />

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const { from, to } = editor.state.selection
              const text = editor.state.doc.textBetween(from, to, '')
              
              if (!text) {
                alert('Please select some text first')
                return
              }

              // Get selection position
              const selection = window.getSelection()
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0)
                const rect = range.getBoundingClientRect()
                
                // Position below the selection
                setLinkInputPosition({
                  top: rect.bottom + window.scrollY + 8,
                  left: rect.left + window.scrollX
                })
              }
              
              setShowLinkInput(!showLinkInput)
            }}
            data-active={editor.isActive('link')}
          >
            <Link2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      </>
      )}

      {/* Table Editing Menu - shows when cursor is inside a table */}
      {editable && showTableMenu && (
        <div
          ref={tableMenuRef}
          className="fixed bg-background border rounded-lg shadow-lg p-1 flex gap-1 items-center z-50 transition-opacity"
          style={{
            top: `${tableMenuPosition.top}px`,
            left: `${tableMenuPosition.left}px`,
          }}
          onMouseEnter={() => {
            isInteractingWithMenuRef.current = true
          }}
          onMouseLeave={() => {
            isInteractingWithMenuRef.current = false
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            isInteractingWithMenuRef.current = true
          }}
        >
          <div className="flex items-center gap-1">
            {/* Column operations */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              title="Add column before"
            >
              <Columns className="h-3.5 w-3.5" />
              <Plus className="h-2 w-2 absolute -top-0.5 -right-0.5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              title="Add column after"
            >
              <Columns className="h-3.5 w-3.5" />
              <Plus className="h-2 w-2 absolute -bottom-0.5 -right-0.5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              title="Delete column"
            >
              <Columns className="h-3.5 w-3.5" />
              <MinusIcon className="h-2 w-2 absolute -bottom-0.5 -right-0.5 text-destructive" />
            </Button>

            <div className="w-px h-5 bg-border mx-1" />

            {/* Row operations */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => editor.chain().focus().addRowBefore().run()}
              title="Add row before"
            >
              <Rows className="h-3.5 w-3.5" />
              <Plus className="h-2 w-2 absolute -top-0.5 -right-0.5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              title="Add row after"
            >
              <Rows className="h-3.5 w-3.5" />
              <Plus className="h-2 w-2 absolute -bottom-0.5 -right-0.5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => editor.chain().focus().deleteRow().run()}
              title="Delete row"
            >
              <Rows className="h-3.5 w-3.5" />
              <MinusIcon className="h-2 w-2 absolute -bottom-0.5 -right-0.5 text-destructive" />
            </Button>
          </div>
        </div>
      )}

      {/* Editor Content with RichTextProvider for bubble menus */}
      <RichTextProvider editor={editor}>
        <EditorContent editor={editor} />
      </RichTextProvider>
    </div>
  )
}
