export function TypeBadge({ type }: { type: 'BE' | 'UI' }) {
  const cls = type === 'BE' ? 'bg-be-soft text-be' : 'bg-ui-soft text-ui';
  return <span className={`rounded px-2 py-0.5 text-[13px] font-semibold ${cls}`}>{type}</span>;
}

export function StatusBadge({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[14px] font-medium">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {name}
    </span>
  );
}
