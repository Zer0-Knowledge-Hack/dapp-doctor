/**
 * Line icons drawn in the same ink as the rest of the clinic. No icon pack:
 * the design system does not take one, and a second visual language would
 * compete with the stamp and the ECG.
 */
export type IconName =
  | 'menu'
  | 'close'
  | 'dashboard'
  | 'diagnose'
  | 'compare'
  | 'heartbeat'
  | 'launch'
  | 'history'
  | 'help'
  | 'refresh'
  | 'search'
  | 'warning'
  | 'error'
  | 'success'
  | 'info'
  | 'copy'
  | 'check'
  | 'spinner'
  | 'more'
  | 'upload';

const PATH: Record<IconName, string> = {
  menu: 'M3 7h18M3 12h18M3 17h18',
  close: 'M6 6l12 12M18 6L6 18',
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  diagnose: 'M11 5a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM20 20l-4-4',
  compare: 'M7 5v14M17 5v14M4 9h6M14 15h6',
  heartbeat: 'M3 12h4l2-5 4 10 2-5h6',
  launch: 'M12 19V5M7 10l5-5 5 5M6 19h12',
  history: 'M12 7v5l3 2M5 12a7 7 0 1 0 2-4.9M5 5v5h5',
  help: 'M12 17h.01M9.5 9a2.5 2.5 0 1 1 3.2 2.4c-.7.3-1.2.9-1.2 1.6V14',
  refresh: 'M20 12a8 8 0 1 1-2.2-5.5M20 4v5h-5',
  search: 'M11 5a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM20 20l-4-4',
  warning: 'M12 4l9 16H3L12 4zM12 10v4M12 16h.01',
  error: 'M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM12 8v5M12 16h.01',
  success: 'M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM8.5 12l2.5 2.5 4.5-5',
  info: 'M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM12 11v5M12 8h.01',
  copy: 'M8 8h11v11H8zM5 16V5h11',
  check: 'M5 12l5 5 9-9',
  spinner: 'M12 4a8 8 0 1 1-8 8',
  more: 'M6 9l6 6 6-6',
  upload: 'M12 16V5M7 9l5-5 5 5M5 19h14',
};

export function Icon({ name, className = '', size = 20 }: { name: IconName; className?: string; size?: number }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className={`shrink-0 ${name === 'spinner' ? 'animate-spin' : ''} ${className}`}
    >
      <path d={PATH[name]} strokeLinecap="square" />
    </svg>
  );
}
