import type { SVGProps } from 'react';

const PATHS: Record<string, string> = {
  sheet: 'M3 5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5v9A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5v-9ZM3 8.5h14M3 12h14M8 4v12',
  timeline: 'M3 4v12h14M6 13v-3M9.5 13V6M13 13v-6.5M16.5 13v-4',
  report: 'M3 17V4M3 17h14M6.5 14v-4M10 14V7M13.5 14v-6',
  notes: 'M4.5 3.5h8L15.5 6v10a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-11.5a1 1 0 0 1 1-1ZM12 3.5V7h3.3M6.5 10h5M6.5 12.7h5',
  members: 'M7 9.2a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2ZM2.6 15.5c.4-2.6 2.2-4.2 4.4-4.2s4 1.6 4.4 4.2M13.2 9.2a2.2 2.2 0 1 0 0-4.4M17 15.2c-.3-2.1-1.5-3.5-3.3-3.9',
  gear: 'M10 12.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z M16.3 10c0 .5-.05.9-.14 1.35l1.6 1.24-1.5 2.6-1.87-.63c-.7.6-1.5 1.03-2.4 1.28L11.6 18H8.4l-.4-1.96a6.6 6.6 0 0 1-2.4-1.28l-1.87.63-1.5-2.6 1.6-1.24A5.9 5.9 0 0 1 3.7 10c0-.46.05-.9.14-1.35l-1.6-1.24 1.5-2.6 1.87.63c.7-.6 1.5-1.03 2.4-1.28L8.4 2h3.2l.4 1.96c.9.25 1.7.68 2.4 1.28l1.87-.63 1.5 2.6-1.6 1.24c.09.44.14.9.14 1.35Z',
  link: 'M8.3 11.7 11.7 8.3M7 5.2 8.4 3.8a3 3 0 1 1 4.2 4.2L11 9.4M13 14.8l-1.4 1.4a3 3 0 1 1-4.2-4.2L9 10.6',
  search: 'M9 15A6 6 0 1 0 9 3a6 6 0 0 0 0 12ZM17 17l-3.8-3.8',
  plus: 'M10 4v12M4 10h12',
  close: 'M5 5l10 10M15 5 5 15',
  'chevron-down': 'M5 7.5 10 12.5 15 7.5',
  'chevron-up': 'M5 12.5 10 7.5 15 12.5',
  trash: 'M4 6h12M8 6V4.5A1 1 0 0 1 9 3.5h2a1 1 0 0 1 1 1V6M6 6l.6 9a1 1 0 0 0 1 1h4.8a1 1 0 0 0 1-1L14 6M8.3 9v4M11.7 9v4',
  warning: 'M10 3 17.5 16h-15L10 3ZM10 8.3v3.4M10 14.2h.01',
  check: 'M4 10.5 8 14.5 16 5.5',
  flag: 'M5 17V4M5 4.5h9l-2.6 3 2.6 3H5',
  pencil: 'M12.6 3.4a1.7 1.7 0 0 1 2.4 2.4L6 15l-3.3.9L3.6 12.6 12.6 3.4Z',
  logout: 'M8 17H4.5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1H8M13 13.5 17 10l-4-3.5M17 10H7',
  filter: 'M3 4.5h14M6 10h8M8.5 15.5h3',
  upload: 'M10 13V4M6.5 7.5 10 4l3.5 3.5M4 14v1.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V14',
  download: 'M10 4v9M6.5 9.5 10 13l3.5-3.5M4 14v1.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V14',
  document: 'M4.5 3.5h8L15.5 6v10a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-11.5a1 1 0 0 1 1-1ZM12 3.5V7h3.3',
  'dots-vertical': 'M10 5.2a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8ZM10 10.9a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8ZM10 16.6a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z',
  users: 'M13.2 9.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4ZM6.8 9.2A2.6 2.6 0 1 0 6.8 4a2.6 2.6 0 0 0 0 5.2ZM2.5 15.5c.4-2.6 2.2-4.2 4.3-4.2s3.9 1.6 4.3 4.2M13.6 11.4c1.8.4 3 1.8 3.3 3.9',
  question: 'M7.4 7.7a2.6 2.6 0 1 1 3.7 2.4c-1 .5-1.1 1.1-1.1 2.1M10 14.6h.01',
  clock: 'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM10 6.5V10l2.8 1.6',
  bell: 'M5 8.5a5 5 0 0 1 10 0v3.2l1.3 2.3H3.7L5 11.7V8.5ZM8.2 15.5a1.8 1.8 0 0 0 3.6 0',
};

export function Icon({ name, size = 16, className = '', strokeWidth = 1.6, ...props }: { name: keyof typeof PATHS; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
