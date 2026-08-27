import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { Markdown } from './Markdown';
import { Tooltip } from './Tooltip';

type Action = 'bold' | 'italic' | 'heading' | 'quote' | 'code' | 'bullet' | 'numbered' | 'link';

interface FormatResult {
  value: string;
  selStart: number;
  selEnd: number;
}

function lineBounds(value: string, start: number, end: number) {
  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const nextBreak = value.indexOf('\n', end);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  return { lineStart, lineEnd };
}

function wrapInline(value: string, start: number, end: number, before: string, after: string, placeholder: string): FormatResult {
  const selected = value.slice(start, end);
  const text = selected || placeholder;
  const newValue = value.slice(0, start) + before + text + after + value.slice(end);
  const selStart = start + before.length;
  return { value: newValue, selStart, selEnd: selStart + text.length };
}

function prefixLines(value: string, start: number, end: number, prefixFor: (lineIndex: number) => string): FormatResult {
  const { lineStart, lineEnd } = lineBounds(value, start, end);
  const lines = value.slice(lineStart, lineEnd).split('\n');
  const prefixes = lines.map((_, i) => prefixFor(i));
  const newBlock = lines.map((l, i) => prefixes[i] + l).join('\n');
  const newValue = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);

  const lineOfStart = value.slice(lineStart, start).split('\n').length - 1;
  const addedBeforeStart = prefixes.slice(0, lineOfStart + 1).reduce((a, p) => a + p.length, 0);
  const addedTotal = prefixes.reduce((a, p) => a + p.length, 0);

  return { value: newValue, selStart: start + addedBeforeStart, selEnd: end + addedTotal };
}

function formatValue(action: Action, value: string, start: number, end: number): FormatResult {
  switch (action) {
    case 'bold':
      return wrapInline(value, start, end, '**', '**', 'bold text');
    case 'italic':
      return wrapInline(value, start, end, '_', '_', 'italic text');
    case 'code': {
      const selected = value.slice(start, end);
      if (selected.includes('\n')) return wrapInline(value, start, end, '```\n', '\n```', 'code');
      return wrapInline(value, start, end, '`', '`', 'code');
    }
    case 'link': {
      const selected = value.slice(start, end);
      const text = selected || 'link text';
      const insert = `[${text}](url)`;
      const newValue = value.slice(0, start) + insert + value.slice(end);
      const urlStart = start + text.length + 3;
      return { value: newValue, selStart: urlStart, selEnd: urlStart + 3 };
    }
    case 'heading':
      return prefixLines(value, start, end, () => '## ');
    case 'quote':
      return prefixLines(value, start, end, () => '> ');
    case 'bullet':
      return prefixLines(value, start, end, () => '- ');
    case 'numbered':
      return prefixLines(value, start, end, (i) => `${i + 1}. `);
  }
}

const TOOLBAR: { action: Action; label: string; title: string; buttonClassName?: string }[] = [
  { action: 'bold', label: 'B', title: 'Bold', buttonClassName: 'font-bold' },
  { action: 'italic', label: 'I', title: 'Italic', buttonClassName: 'italic' },
  { action: 'heading', label: 'H', title: 'Heading' },
  { action: 'quote', label: '❝', title: 'Quote' },
  { action: 'code', label: '</>', title: 'Code' },
  { action: 'bullet', label: '•', title: 'Bullet list' },
  { action: 'numbered', label: '1.', title: 'Numbered list' },
  { action: 'link', label: '', title: 'Link' },
];

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  autoFocus,
  minHeightClass = 'min-h-[160px]',
  mono = false,
  onKeyDown,
  onBlur,
  className = '',
  id,
  showPreviewToggle = true,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  minHeightClass?: string;
  mono?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: FocusEvent<HTMLTextAreaElement>) => void;
  className?: string;
  id?: string;
  showPreviewToggle?: boolean;
}) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const expandedTextareaRef = useRef<HTMLTextAreaElement>(null);

  function applyAction(action: Action) {
    const el = expanded ? expandedTextareaRef.current : textareaRef.current;
    if (!el) return;
    const result = formatValue(action, value, el.selectionStart, el.selectionEnd);
    onChange(result.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selStart, result.selEnd);
    });
  }

  // Expanding/collapsing moves focus between the inline and fullscreen textareas; suppress the
  // resulting blur (which would otherwise trigger a consumer's save-on-blur / cancel-on-blur logic)
  // when focus is just moving between our own two textareas rather than leaving the editor.
  function handleBlur(e: FocusEvent<HTMLTextAreaElement>) {
    const next = e.relatedTarget as Node | null;
    if (next && (next === textareaRef.current || next === expandedTextareaRef.current)) return;
    onBlur?.(e);
  }

  function closeFullscreen() {
    textareaRef.current?.focus();
    setExpanded(false);
  }

  function handleExpandedKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeFullscreen();
      return;
    }
    onKeyDown?.(e);
  }

  useEffect(() => {
    if (!expanded) return;
    const raf = requestAnimationFrame(() => expandedTextareaRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [expanded]);

  const tabBase = 'rounded-sm px-2 py-0.5 text-[12px] font-medium transition-colors';

  function renderToolbar(inFullscreen: boolean) {
    return (
      <div className="flex items-center justify-between gap-2 border-b border-line bg-panel2 px-1.5 py-1">
        <div className="flex items-center gap-0.5">
          {TOOLBAR.map((t) => (
            <Tooltip key={t.action} label={t.title}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyAction(t.action)}
                disabled={mode === 'preview'}
                className={`flex h-6 w-6 items-center justify-center rounded-sm text-[12.5px] text-ink2 transition-colors hover:bg-panel hover:text-ink disabled:pointer-events-none disabled:opacity-40 ${t.buttonClassName ?? ''}`}
              >
                {t.action === 'link' ? <Icon name="link" size={12} /> : t.label}
              </button>
            </Tooltip>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {showPreviewToggle && (
            <div className="flex items-center gap-0.5 rounded-sm bg-panel p-0.5">
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setMode('write')}
                className={`${tabBase} ${mode === 'write' ? 'bg-white text-ink shadow-sm' : 'text-ink3 hover:text-ink2'}`}
              >
                Write
              </button>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setMode('preview')}
                className={`${tabBase} ${mode === 'preview' ? 'bg-white text-ink shadow-sm' : 'text-ink3 hover:text-ink2'}`}
              >
                Preview
              </button>
            </div>
          )}
          <Tooltip label={inFullscreen ? 'Collapse' : 'Expand'}>
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => (inFullscreen ? closeFullscreen() : setExpanded(true))}
              className="flex h-6 w-6 items-center justify-center rounded-sm text-ink2 transition-colors hover:bg-panel hover:text-ink"
            >
              <Icon name={inFullscreen ? 'collapse' : 'expand'} size={12} />
            </button>
          </Tooltip>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`overflow-hidden rounded-sm border border-line focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25 ${className}`}
      >
        {renderToolbar(false)}
        {mode === 'write' ? (
          <textarea
            ref={textareaRef}
            id={id}
            tabIndex={expanded ? -1 : undefined}
            autoFocus={autoFocus}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={handleBlur}
            className={`block w-full resize-y border-0 p-2.5 leading-relaxed text-ink focus:outline-none ${minHeightClass} ${mono ? 'font-mono text-[13px]' : 'text-[14.5px]'}`}
          />
        ) : (
          <div className={`overflow-y-auto p-2.5 ${minHeightClass}`}>
            {value.trim() ? <Markdown content={value} /> : <p className="text-[13.5px] text-ink3">Nothing to preview yet.</p>}
          </div>
        )}
      </div>
      {expanded &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex flex-col bg-white animate-[fade-in_0.15s_ease-out]">
            {renderToolbar(true)}
            <div className="min-h-0 flex-1">
              {mode === 'write' ? (
                <textarea
                  ref={expandedTextareaRef}
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  onKeyDown={handleExpandedKeyDown}
                  onBlur={handleBlur}
                  className={`block h-full w-full resize-none border-0 p-4 leading-relaxed text-ink focus:outline-none ${mono ? 'font-mono text-[14px]' : 'text-[15.5px]'}`}
                />
              ) : (
                <div className="h-full overflow-y-auto p-4">
                  {value.trim() ? <Markdown content={value} /> : <p className="text-[13.5px] text-ink3">Nothing to preview yet.</p>}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
