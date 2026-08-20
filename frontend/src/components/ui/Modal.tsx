import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 620,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E0F1A]/50 backdrop-blur-[2px] animate-[fade-in_0.15s_ease-out]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="max-h-[88vh] w-[94vw] origin-center animate-[scale-in_0.18s_ease-out] overflow-auto rounded-xl bg-white shadow-modal"
        style={{ maxWidth: width }}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-[17px] font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-sm p-1 text-ink2 transition-colors hover:bg-panel2 hover:text-ink">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="sticky bottom-0 flex justify-end gap-2 border-t border-line bg-panel2 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}
