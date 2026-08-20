import type { ReactNode } from 'react';

export function Topbar({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="font-display text-[26px] font-semibold tracking-tight text-ink">
          {title}
          {subtitle && <span className="ml-2.5 align-middle font-mono text-[14px] font-medium text-primary">{subtitle}</span>}
        </h1>
        <span className="mt-1.5 block h-[3px] w-9 rounded-full bg-rail" />
      </div>
      {right && <div className="flex gap-2.5">{right}</div>}
    </div>
  );
}

export function Chip({ label, value, hero = false }: { label: string; value: string; hero?: boolean }) {
  return (
    <div
      className={`rounded-md border px-4 py-2 text-[13px] transition-shadow duration-200 hover:shadow-md ${
        hero ? 'border-primary bg-primary text-white/80 shadow-sm' : 'border-line bg-panel text-ink2'
      }`}
    >
      {label}
      <b className={`block font-display text-[15px] ${hero ? 'text-white' : 'text-ink'}`}>{value}</b>
    </div>
  );
}
