import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
}

export function Button({ variant = 'ghost', className = '', ...props }: ButtonProps) {
  const base = 'rounded-md px-4 py-2.5 text-[14.5px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const styles = {
    primary: 'bg-primary text-white hover:bg-primary/90',
    ghost: 'bg-white border border-line text-ink hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }[variant];
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
