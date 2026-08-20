import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';

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
      ? 'group/trigger flex w-full items-center justify-between gap-1 truncate rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-left text-[13.5px] hover:border-line hover:bg-panel2'
      : 'flex w-full items-center justify-between gap-2 rounded-sm border border-line bg-white px-3 py-2 text-left text-[14.5px] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`${triggerClass} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className={`truncate ${selected ? '' : 'text-ink3'}`}>{selected ? selected.label : placeholder}</span>
        <Icon
          name="chevron-down"
          size={13}
          className={`shrink-0 text-ink3 ${variant === 'ghost' ? 'opacity-0 transition-opacity group-hover/trigger:opacity-100' : ''}`}
        />
      </button>

      {open && !disabled && (
        <div className="absolute left-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-md border border-line bg-white shadow-raised">
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
