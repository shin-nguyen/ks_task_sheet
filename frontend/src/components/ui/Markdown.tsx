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

export function Markdown({ content, className = '' }: { content: string; className?: string }) {
  return (
    <div className={`text-[14.5px] leading-relaxed text-ink ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
