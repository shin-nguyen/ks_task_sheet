import { forwardRef, type SelectHTMLAttributes } from 'react';
import { Icon } from './Icon';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = '', children, ...props },
  ref
) {
  return (
    <div className={`relative inline-block ${className}`}>
      <select
        ref={ref}
        className="w-full rounded-sm border border-line bg-white py-2 pl-3 pr-8 text-[14.5px] font-sans text-ink transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
        {...props}
      >
        {children}
      </select>
      <Icon name="chevron-down" size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink3" />
    </div>
  );
});
