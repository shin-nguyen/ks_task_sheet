import { useEffect, useMemo, useRef, useState } from 'react';

export interface SearchableSelectOption {
  id: string;
  label: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  emptyOption,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  variant = 'default',
  className = '',
  disabled = false,
}: {
  value: string;
  onChange: (id: string) => void;
  options: SearchableSelectOption[];
  /** Pinned entry shown above the search results, e.g. { id: '', label: '— unassigned —' } or { id: 'ALL', label: 'All assignees' }. */
  emptyOption?: SearchableSelectOption;
  placeholder?: string;
  searchPlaceholder?: string;
  variant?: 'default' | 'ghost';
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const selected = (emptyOption && emptyOption.id === value ? emptyOption : undefined) ?? options.find((o) => o.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const triggerClass =
    variant === 'ghost'
      ? 'w-full truncate rounded border-0 bg-transparent px-0 py-0.5 text-left text-[13.5px]'
      : 'flex w-full items-center justify-between gap-2 rounded-md border border-line bg-white px-3 py-2 text-left text-[14.5px] focus:outline-none focus:ring-2 focus:ring-primary/40';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`${triggerClass} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className={`truncate ${selected ? '' : 'text-ink2'}`}>{selected ? selected.label : placeholder}</span>
      </button>

      {open && !disabled && (
        <div className="absolute left-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-lg border border-line bg-white shadow-xl">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false);
                setQuery('');
              }
            }}
            placeholder={searchPlaceholder}
            className="w-full border-b border-line px-2.5 py-1.5 text-[13px] focus:outline-none"
          />
          <div className="max-h-56 overflow-y-auto py-1">
            {emptyOption && (
              <button
                type="button"
                onClick={() => {
                  onChange(emptyOption.id);
                  setOpen(false);
                  setQuery('');
                }}
                className={`block w-full truncate px-2.5 py-1.5 text-left text-[13px] hover:bg-primary-soft ${
                  emptyOption.id === value ? 'font-semibold text-primary' : 'text-ink2'
                }`}
              >
                {emptyOption.label}
              </button>
            )}
            {filtered.length === 0 && <div className="px-2.5 py-1.5 text-[13px] text-ink2">No match</div>}
            {filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                  setQuery('');
                }}
                className={`block w-full truncate px-2.5 py-1.5 text-left text-[13px] hover:bg-primary-soft ${
                  o.id === value ? 'font-semibold text-primary' : 'text-ink'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
