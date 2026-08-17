import type { ReactNode } from 'react';

export function Tooltip({ label, children, disabled }: { label: string; children: ReactNode; disabled?: boolean }) {
  if (disabled || !label) return <>{children}</>;

  return (
    <span className="group/tooltip relative block w-full min-w-0">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-[calc(100%+6px)] z-40 max-w-[320px] scale-95 whitespace-normal break-words rounded-md bg-[#17252A] px-2.5 py-1.5 text-[12.5px] leading-snug text-white opacity-0 shadow-lg transition-[opacity,transform] duration-150 group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
