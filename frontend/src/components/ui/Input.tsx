import { forwardRef, type InputHTMLAttributes } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={`rounded-sm border border-line bg-white px-3 py-2 text-[14.5px] font-sans text-ink placeholder:text-ink3 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 ${className}`}
      {...props}
    />
  );
});
