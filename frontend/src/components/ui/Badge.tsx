export function TypeBadge({ type }: { type: 'BE' | 'UI' }) {
  const cls = type === 'BE' ? 'bg-be-soft text-be' : 'bg-ui-soft text-ui';
  return <span className={`rounded-full px-2 py-0.5 text-[12.5px] font-semibold tracking-wide ${cls}`}>{type}</span>;
}

export function StatusBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full py-0.5 pl-1.5 pr-2.5 text-[13.5px] font-medium"
      style={{ background: `${color}1A`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {name}
    </span>
  );
}
