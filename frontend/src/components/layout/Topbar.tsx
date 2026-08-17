import type { ReactNode } from 'react';

export function Topbar({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-display text-[23px] font-bold">
        {title}
        {subtitle && <span className="ml-2 align-middle font-mono text-[14.5px] font-medium text-primary">{subtitle}</span>}
      </h1>
      {right && <div className="flex gap-2.5">{right}</div>}
    </div>
  );
}

export function Chip({ label, value, hero = false }: { label: string; value: string; hero?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-4 py-2 text-[14px] transition-shadow duration-200 hover:shadow-md ${
        hero ? 'border-primary bg-primary text-[#D3EFE6]' : 'border-line bg-panel text-ink2'
      }`}
    >
      {label}
      <b className={`block font-display text-sm ${hero ? 'text-white' : 'text-ink'}`}>{value}</b>
    </div>
  );
}
