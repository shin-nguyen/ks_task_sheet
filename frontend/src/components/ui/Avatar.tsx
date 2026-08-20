const PALETTE = ['#3B4CE0', '#F0672F', '#1E9E63', '#B0389C', '#0891B2', '#C2861A', '#7B6EF0', '#DC2626'];

export function colorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function Avatar({ name, size = 20 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.45, background: colorForName(name) }}
    >
      {initials}
    </span>
  );
}

export function Who({ name }: { name: string | null | undefined }) {
  if (!name) return <span className="text-ink3">— unassigned</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Avatar name={name} />
      {name}
    </span>
  );
}
