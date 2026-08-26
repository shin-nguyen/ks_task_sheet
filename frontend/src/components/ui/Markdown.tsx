import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components: Components = {
  p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
  h1: ({ children }) => <h1 className="mb-1.5 mt-3 font-display text-[19px] font-semibold text-ink first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-1.5 mt-3 font-display text-[17px] font-semibold text-ink first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 mt-2.5 font-display text-[15.5px] font-semibold text-ink first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="mb-1 mt-2.5 text-[14.5px] font-semibold text-ink first:mt-0">{children}</h4>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-0.5 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-0.5 pl-5 last:mb-0">{children}</ol>,
  li: ({ children, className }) => (
    <li className={`leading-relaxed ${className?.includes('task-list-item') ? 'list-none' : ''}`}>{children}</li>
  ),
  input: ({ checked, disabled }) => (
    <input type="checkbox" checked={!!checked} disabled={disabled} readOnly className="mr-1.5 -ml-5 accent-primary align-middle" />
  ),
  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-line pl-3 text-ink2">{children}</blockquote>,
  hr: () => <hr className="my-3 border-line" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  img: ({ src, alt }) => <img src={src} alt={alt} className="my-2 max-w-full rounded-sm" />,
  pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-sm bg-panel2 p-2.5 text-[13px]">{children}</pre>,
  code: ({ className, children }) => {
    const isBlock = String(children).includes('\n');
    if (isBlock) return <code className={`block font-mono ${className ?? ''}`}>{children}</code>;
    return <code className="rounded-sm bg-panel2 px-1 py-0.5 font-mono text-[0.85em] text-ink">{children}</code>;
  },
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-[13.5px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-panel2">{children}</thead>,
  th: ({ children }) => <th className="border border-line px-2 py-1 text-left font-semibold text-ink">{children}</th>,
  td: ({ children }) => <td className="border border-line px-2 py-1 text-ink">{children}</td>,
};

// Compact variant for card/list previews: headings collapse to bold text and links/images are
// inert (no navigation, no oversized media) since this renders inside a clickable card.
const compactComponents: Components = {
  p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
  h1: ({ children }) => <p className="mb-1 font-semibold text-ink">{children}</p>,
  h2: ({ children }) => <p className="mb-1 font-semibold text-ink">{children}</p>,
  h3: ({ children }) => <p className="mb-1 font-semibold text-ink">{children}</p>,
  h4: ({ children }) => <p className="mb-1 font-semibold text-ink">{children}</p>,
  ul: ({ children }) => <ul className="mb-1 list-disc space-y-0 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-1 list-decimal space-y-0 pl-4 last:mb-0">{children}</ol>,
  li: ({ children, className }) => (
    <li className={`leading-snug ${className?.includes('task-list-item') ? 'list-none' : ''}`}>{children}</li>
  ),
  input: ({ checked, disabled }) => (
    <input type="checkbox" checked={!!checked} disabled={disabled} readOnly className="mr-1 -ml-4 accent-primary align-middle" />
  ),
  blockquote: ({ children }) => <blockquote className="my-1 border-l-2 border-line pl-2 text-ink2">{children}</blockquote>,
  hr: () => <hr className="my-1.5 border-line" />,
  a: ({ children }) => <span className="text-primary">{children}</span>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  img: () => null,
  pre: ({ children }) => <pre className="my-1 overflow-hidden rounded-sm bg-panel2 p-1.5 text-[12px]">{children}</pre>,
  code: ({ className, children }) => {
    const isBlock = String(children).includes('\n');
    if (isBlock) return <code className={`block font-mono ${className ?? ''}`}>{children}</code>;
    return <code className="rounded-sm bg-panel2 px-1 py-0.5 font-mono text-[0.85em] text-ink">{children}</code>;
  },
  table: ({ children }) => (
    <div className="my-1 overflow-hidden">
      <table className="w-full border-collapse text-[12.5px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-panel2">{children}</thead>,
  th: ({ children }) => <th className="border border-line px-1.5 py-0.5 text-left font-semibold text-ink">{children}</th>,
  td: ({ children }) => <td className="border border-line px-1.5 py-0.5 text-ink">{children}</td>,
};

export function Markdown({ content, className = '', compact = false }: { content: string; className?: string; compact?: boolean }) {
  return (
    <div className={`${compact ? 'text-[13px] leading-snug' : 'text-[14.5px] leading-relaxed'} text-ink ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={compact ? compactComponents : components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Rendered-markdown card preview: a compact, height-capped, fade-truncated excerpt.
 * Use in card/list rows instead of flattening markdown to a single line of plain text.
 */
export function MarkdownPreview({
  content,
  maxHeight,
  emptyText,
  className = '',
}: {
  content: string;
  maxHeight: number;
  emptyText: string;
  className?: string;
}) {
  if (!content.trim()) return <p className={`text-[13px] text-ink3 ${className}`}>{emptyText}</p>;
  return (
    <div className={`md-preview-fade overflow-hidden ${className}`} style={{ maxHeight }}>
      <Markdown content={content} compact />
    </div>
  );
}
