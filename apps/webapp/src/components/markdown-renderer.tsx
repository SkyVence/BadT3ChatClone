import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

// NOTE: highlight.js theme CSS should be imported once globally (e.g. in `app/globals.css`).

interface MarkdownRendererProps {
  /**
   * Raw Markdown source – expected to be **trusted** user/AI output.
   * Sanitisation is handled by react-markdown's default escaping.
   */
  content: string;
  /**
   * Optional extra className appended to the outermost element.
   */
  className?: string;
}

/**
 * Renders arbitrary markdown using react-markdown with GFM & syntax-highlighting.
 * The output is wrapped with the `prose` classes so typography matches the rest of the app.
 */
export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm as any]}
      rehypePlugins={[rehypeHighlight as any]}
      className={`prose prose-sm max-w-none dark:prose-invert prose-pre:bg-muted prose-pre:border prose-pre:border-border ${className}`.trim()}
      // Custom renderers for code to ensure proper className forwarding
      components={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        code({ inline, className: ln, children, ...props }: any) {
          const match = /language-(\w+)/.exec(ln || "");
          return !inline && match ? (
            <code className={`${ln} rounded-md`} {...props}>
              {children}
            </code>
          ) : (
            <code className="rounded px-1 py-0.5 bg-muted/70" {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}