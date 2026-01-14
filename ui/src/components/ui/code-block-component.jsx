import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

export const CodeBlockComponent = ({ node, updateAttributes, extension }) => {
  const language = node.attrs.language || 'javascript'

  return (
    <NodeViewWrapper className="code-block-wrapper">
      <div className="code-block-header">
        <Select 
          value={language} 
          onValueChange={(value) => updateAttributes({ language: value })}
        >
          <SelectTrigger className="select-trigger h-6 w-[120px] border-0 bg-transparent hover:bg-white/10 text-[0.7rem] text-[#abb2bf]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.value} value={lang.value} className="text-[0.7rem]">
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <pre className={`language-${language}`}>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  )
}
