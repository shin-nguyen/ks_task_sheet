import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
}

export function Button({ variant = 'ghost', className = '', ...props }: ButtonProps) {
  const base =
    'rounded-sm px-4 py-2.5 text-[14.5px] font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';
  const styles = {
    primary: 'bg-primary text-white shadow-sm hover:bg-primary-hover hover:shadow-md',
    ghost: 'bg-white border border-line text-ink hover:border-ink3/60 hover:bg-panel2',
    danger: 'bg-danger text-white shadow-sm hover:bg-[#D33C41] hover:shadow-md',
  }[variant];
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
