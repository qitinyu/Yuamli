'use client'

import ReactMarkdown from "react-markdown"

// Pre-process content: normalize <br> variants to newlines for ReactMarkdown
function preprocessMarkdown(content: string): string {
  return content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/br>/gi, '\n')
}

// Shared prose classes for consistent markdown rendering
const PROSE_CLASSES = "prose prose-sm max-w-none prose-zinc dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-h1:my-2 prose-h2:my-2 prose-h3:my-2 prose-pre:bg-muted prose-pre:p-2 prose-code:text-xs prose-a:text-emerald-600 dark:prose-a:text-emerald-400"

// Custom components for ReactMarkdown
const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => {
    if (typeof children === 'string') {
      return <p>{children.split('\n').map((line, i) =>
        i > 0 ? <><br key={i} />{line}</> : line
      )}</p>
    }
    return <p>{children}</p>
  },
}

interface MarkdownRendererProps {
  content: string
  className?: string
  emptyText?: string
}

export default function MarkdownRenderer({ content, className = "", emptyText }: MarkdownRendererProps) {
  const processed = preprocessMarkdown(content)
  if (!processed.trim()) {
    return (
      <div className={`${PROSE_CLASSES} ${className}`}>
        <span className="text-muted-foreground">{emptyText || ""}</span>
      </div>
    )
  }
  return (
    <div className={`${PROSE_CLASSES} ${className}`}>
      <ReactMarkdown components={markdownComponents}>
        {processed}
      </ReactMarkdown>
    </div>
  )
}