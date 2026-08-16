import { forwardRef, type SelectHTMLAttributes } from 'react';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = '', children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={`rounded-md border border-line bg-white px-3 py-2 text-[14.5px] font-sans focus:outline-none focus:ring-2 focus:ring-primary/40 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});
