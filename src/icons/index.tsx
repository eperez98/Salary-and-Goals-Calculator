/**
 * Monto icon system — custom 24px icons, 1.7px rounded strokes with an
 * optional duotone fill (`.duo`) that lights up in the active state.
 * States: inactive (muted), hover (ink), active (brand colour + duotone).
 */
import type { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';

const D = ({ d }: { d: string }) => <path className="duo" d={d} />;

const ICONS: Record<string, ReactNode> = {
  dashboard: <><rect className="duo" x="3.5" y="3.5" width="7" height="9" rx="2" /><rect x="3.5" y="3.5" width="7" height="9" rx="2" /><rect x="13.5" y="3.5" width="7" height="5" rx="2" /><rect x="13.5" y="11.5" width="7" height="9" rx="2" /><rect x="3.5" y="15.5" width="7" height="5" rx="2" /></>,
  income: <><circle className="duo" cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="8.5" /><path d="M9 15l6-6M10 9h5v5" /></>,
  expense: <><circle className="duo" cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="8.5" /><path d="M15 9l-6 6M14 15H9v-5" /></>,
  transfer: <><path d="M4 8.5h14l-3.5-3.5M20 15.5H6l3.5 3.5" /></>,
  transactions: <><path d="M7.5 4v16M7.5 4 4.5 7M7.5 4l3 3M16.5 20V4M16.5 20l-3-3M16.5 20l3-3" /></>,
  bank: <><D d="M3.5 9 12 4.5 20.5 9z" /><path d="M3.5 9 12 4.5 20.5 9zM5.5 11v6.5M10 11v6.5M14 11v6.5M18.5 11v6.5M3.5 20h17" /></>,
  card: <><rect className="duo" x="3" y="5.5" width="18" height="13" rx="2.5" /><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 14.5h3.5" /></>,
  cash: <><rect className="duo" x="2.5" y="6.5" width="19" height="11" rx="2" /><rect x="2.5" y="6.5" width="19" height="11" rx="2" /><circle cx="12" cy="12" r="2.4" /><path d="M6 9.5v.01M18 14.5v.01" /></>,
  home: <><D d="M6 9.5V20h12V9.5L12 4.5z" /><path d="M3.5 11 12 4l8.5 7M6 9.5V20h12V9.5M10 20v-5h4v5" /></>,
  food: <><D d="M4 11h16a8 8 0 0 1-16 0z" /><path d="M4 11h16a8 8 0 0 1-16 0zM9.5 3.5c-1 1.4 1 2.3 0 4M14 3.5c-1 1.4 1 2.3 0 4M8 21h8" /></>,
  transport: <><D d="M4 15v-3l2.2-5.2A2 2 0 0 1 8 5.5h8a2 2 0 0 1 1.8 1.3L20 12v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /><path d="M4 15v-3l2.2-5.2A2 2 0 0 1 8 5.5h8a2 2 0 0 1 1.8 1.3L20 12v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 12h16M6.5 16v2.5M17.5 16v2.5M7.5 13.8h1M15.5 13.8h1" /></>,
  pets: <><D d="M12 12.5c-2.8 0-5 2.6-5 5 0 1.6 1.3 2.5 2.7 2.2 1-.2 1.5-.6 2.3-.6s1.3.4 2.3.6c1.4.3 2.7-.6 2.7-2.2 0-2.4-2.2-5-5-5z" /><path d="M12 12.5c-2.8 0-5 2.6-5 5 0 1.6 1.3 2.5 2.7 2.2 1-.2 1.5-.6 2.3-.6s1.3.4 2.3.6c1.4.3 2.7-.6 2.7-2.2 0-2.4-2.2-5-5-5z" /><ellipse cx="5.5" cy="10" rx="1.6" ry="2" /><ellipse cx="9.3" cy="6" rx="1.6" ry="2.1" /><ellipse cx="14.7" cy="6" rx="1.6" ry="2.1" /><ellipse cx="18.5" cy="10" rx="1.6" ry="2" /></>,
  utilities: <><D d="M13 3 5 14h6l-1 7 8-11h-6z" /><path d="M13 3 5 14h6l-1 7 8-11h-6z" /></>,
  internet: <><path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0" /><circle cx="12" cy="19.3" r=".9" fill="currentColor" /></>,
  health: <><D d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z" /><path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z" /><path d="M7.5 12.5h2.5l1.2-2.2 1.8 4 1.2-1.8h2.3" /></>,
  education: <><D d="M2.5 9 12 4.5 21.5 9 12 13.5z" /><path d="M2.5 9 12 4.5 21.5 9 12 13.5zM6.5 11v4.8c3.2 2.6 7.8 2.6 11 0V11M21.5 9v5" /></>,
  fun: <><D d="M4 8.5a2 2 0 0 0 0 4v3.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5a2 2 0 0 1 0-4V5.5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z" /><path d="M4 8.5a2 2 0 0 1 0 4v3.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5a2 2 0 0 1 0-4V5.5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2zM14.5 3.5v2M14.5 9.5v2M14.5 15.5v2" transform="translate(0 1.5)" /></>,
  savings: <><D d="M4.5 12a7 6 0 0 1 11.6-4.5h2.4l.9 2.8 1.6.7v3.5l-2 .8-1.2 2.2v2h-3v-1.2a8 8 0 0 1-3.6 0V20h-3v-2.3A6 6 0 0 1 4.5 12z" /><path d="M4.5 12a7 6 0 0 1 11.6-4.5h2.4l.9 2.8 1.6.7v3.5l-2 .8-1.2 2.2v2h-3v-1.2a8 8 0 0 1-3.6 0V20h-3v-2.3A6 6 0 0 1 4.5 12zM9.5 5.5h4M2.5 10.5c0 1.2.8 2 2 2" /><circle cx="16.3" cy="11" r=".8" fill="currentColor" /></>,
  loan: <><D d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8z" /><path d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8zM9.5 13.5l5-5" /><circle cx="9.8" cy="8.8" r="1.1" /><circle cx="14.2" cy="13.2" r="1.1" /></>,
  family: <><D d="M3 20a6 6 0 0 1 12 0z" /><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0M15.6 14.2a5 5 0 0 1 5.4 5.3" /><circle cx="17" cy="8.8" r="2.5" /></>,
  budget: <><D d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1z" /><path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1zM4 7l10.5-3.2V7M20 11.5h-3.5a1.8 1.8 0 0 0 0 3.6H20" /></>,
  reports: <><path d="M3.5 20.5h17" /><rect className="duo" x="5" y="12" width="3" height="6" rx="1" /><rect x="5" y="12" width="3" height="6" rx="1" /><rect x="10.5" y="7" width="3" height="11" rx="1" /><rect x="16" y="4" width="3" height="14" rx="1" /></>,
  settings: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle className="duo" cx="15" cy="7" r="2.2" /><circle cx="15" cy="7" r="2.2" /><circle cx="9" cy="17" r="2.2" /></>,
  goal: <><circle className="duo" cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></>,
  calendar: <><rect className="duo" x="3.5" y="5" width="17" height="15.5" rx="3" /><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" /></>,
  insights: <><D d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.5l-1.8-5.9L4.5 10.8 10.2 9z" /><path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.5l-1.8-5.9L4.5 10.8 10.2 9zM19 16v4M17 18h4" /></>,
  salary: <><D d="M3.5 8.5h17v10a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" /><path d="M3.5 8.5h17v10a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2zM8.5 8.5v-2a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2M3.5 13h17" /></>,
  freelance: <><D d="M5 5.5h14v9.5H5z" /><rect x="5" y="5.5" width="14" height="9.5" rx="1.5" /><path d="M2.5 18.5h19M10 18.5l.5-1.5h3l.5 1.5" /></>,
  business: <><D d="M4.5 10v10h15V10" /><path d="M3.5 10 5 4.5h14l1.5 5.5c0 1.4-1.2 2.5-2.7 2.5S15 11.4 15 10c0 1.4-1.3 2.5-3 2.5S9 11.4 9 10c0 1.4-1.2 2.5-2.8 2.5S3.5 11.4 3.5 10zM4.5 12v8h15v-8M10 20v-4h4v4" /></>,
  investment: <><path d="M3.5 17 9 11.5l3.5 3.5 8-8M15 7h5.5v5.5" /></>,
  bonus: <><D d="M4 11h16v9H4z" /><path d="M3 7.5h18V11H3zM4 11v9h16v-9M12 7.5V20M12 7.5S10.5 3.5 8 4.2C6 4.8 7 7.5 9 7.5M12 7.5s1.5-4 4-3.3c2 .6 1 3.3-1 3.3" /></>,
  shopping: <><D d="M5 8h14l-1 12H6z" /><path d="M5 8h14l-1 12H6zM9 10.5V7a3 3 0 0 1 6 0v3.5" /></>,
  vacation: <><D d="M3 13.5 21 6l-3.5 13-5.5-4z" /><path d="M3 13.5 21 6l-3.5 13-5.5-4zM12 15l-1.5 5 2.2-3.8M21 6 12 15" /></>,
  emergency: <><D d="M12 3.5 19.5 6.5v5.2c0 4.4-3.1 7.6-7.5 8.8-4.4-1.2-7.5-4.4-7.5-8.8V6.5z" /><path d="M12 3.5 19.5 6.5v5.2c0 4.4-3.1 7.6-7.5 8.8-4.4-1.2-7.5-4.4-7.5-8.8V6.5zM12 8.5v6M9 11.5h6" /></>,
  vehicle: <><D d="M4 15v-3l2.2-5.2A2 2 0 0 1 8 5.5h8a2 2 0 0 1 1.8 1.3L20 12v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /><path d="M4 15v-3l2.2-5.2A2 2 0 0 1 8 5.5h8a2 2 0 0 1 1.8 1.3L20 12v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 12h16M6.5 16v2.5M17.5 16v2.5" /></>,
  other: <><circle className="duo" cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="8.5" /><path d="M8 12h.01M12 12h.01M16 12h.01" strokeWidth="2.6" /></>,
  debts: <><D d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8z" /><path d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8zM9.5 13.5l5-5" /><circle cx="9.8" cy="8.8" r="1.1" /><circle cx="14.2" cy="13.2" r="1.1" /></>,
  bell: <><D d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2.2 2.2 0 0 0 4 0" /></>,
  lock: <><rect className="duo" x="5" y="10.5" width="14" height="10" rx="2.5" /><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  chevronLeft: <path d="m14.5 6-6 6 6 6" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>,
  trash: <><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" /></>,
  download: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15" />,
  upload: <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4.5 19.5h15" />,
  clip: <path d="M20 11.5 12.3 19.2a5 5 0 0 1-7.1-7.1l8.2-8.2a3.3 3.3 0 0 1 4.7 4.7l-8.1 8.1a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  moon: <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />,
  monitor: <><rect x="3" y="4.5" width="18" height="12" rx="2" /><path d="M8.5 20h7M12 16.5V20" /></>,
  user: <><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
  filter: <path d="M4 5.5h16l-6 7.5v5.5l-4 1.5v-7z" />,
  refresh: <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />,
  logout: <path d="M14.5 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3M10 16.5 5.5 12 10 7.5M5.5 12h10" />,
  alert: <><path d="M12 4 21 19.5H3z" /><path d="M12 10v4M12 17h.01" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></>,
  shield: <path d="M12 3.5 19.5 6.5v5.2c0 4.4-3.1 7.6-7.5 8.8-4.4-1.2-7.5-4.4-7.5-8.8V6.5zM9 12l2.2 2.2L15.5 10" />,
  database: <><ellipse cx="12" cy="6" rx="7.5" ry="2.8" /><path d="M4.5 6v12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <path d="M3.5 3.5l17 17M10 6a9.6 9.6 0 0 1 2-.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.6 6.6C4 8.4 2.5 12 2.5 12S6 18.5 12 18.5c1.8 0 3.3-.6 4.6-1.4M9.9 9.9a3 3 0 0 0 4.2 4.2" />,
  repeat: <path d="M4.5 11V9.5a3 3 0 0 1 3-3h12l-3-3M19.5 13v1.5a3 3 0 0 1-3 3h-12l3 3" />,
  arrowUpRight: <path d="M7 17 17 7M8.5 7H17v8.5" />,
  arrowDownLeft: <path d="M17 7 7 17M15.5 17H7V8.5" />,
  sparkle: <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.5l-1.8-5.9L4.5 10.8 10.2 9z" />,
  percent: <><path d="M6 18 18 6" /><circle cx="7" cy="7" r="2" /><circle cx="17" cy="17" r="2" /></>,
  handshake: <path d="M3 11.5 7 7.5l3 1 2-1.5 3.5 0L21 12M3 11.5l5 5c.8.8 2 .8 2.8 0M10.8 16.5c.8.8 2 .8 2.8 0l3.9-3.9M13.6 16.5l-2.1-2.1M16.5 13.6 13.9 11" />,
};

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export interface IconProps { name: IconName | string; size?: number; className?: string; active?: boolean; strokeWidth?: number; style?: CSSProperties; title?: string }

export function Icon({ name, size = 20, className, active, strokeWidth = 1.7, style, title }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={clsx('monto-icon shrink-0', active && 'is-active', className)}
      style={style}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {ICONS[name] ?? ICONS.other}
    </svg>
  );
}

/** Icon inside a soft tinted tile, used for categories and accounts. */
export function IconTile({ name, color = 'var(--brand-2)', size = 40, iconSize, className }: { name: string; color?: string; size?: number; iconSize?: number; className?: string }) {
  return (
    <span
      className={clsx('inline-grid place-items-center rounded-[12px] shrink-0', className)}
      style={{ width: size, height: size, color, background: `color-mix(in srgb, ${color} 13%, transparent)` }}
    >
      <Icon name={name} size={iconSize ?? Math.round(size * 0.5)} active />
    </span>
  );
}
