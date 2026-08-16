import type { ReactNode, SVGProps } from "react";

export function Icon({ children, ...rest }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {children}
    </svg>
  );
}

export const I = {
  plus: (
    <Icon>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  ),
  minus: (
    <Icon>
      <path d="M5 12h14" />
    </Icon>
  ),
  indent: (
    <Icon>
      <path d="M4 6h16M10 12h10M10 18h10M4 12l4 4-4 4" />
    </Icon>
  ),
  outdent: (
    <Icon>
      <path d="M8 6h12M8 12h12M8 18h12M8 12L4 8M8 12L4 16" />
    </Icon>
  ),
  group: (
    <Icon>
      <rect x="4" y="5" width="16" height="5" rx="1" />
      <rect x="7" y="13" width="13" height="5" rx="1" />
    </Icon>
  ),
  connect: (
    <Icon>
      <path d="M7 7h4v4M17 17h-4v-4M11 9l6 6" />
    </Icon>
  ),
  disconnect: (
    <Icon>
      <path d="M7 7h4M17 17h-4M9 9l6 6M15 9l-6 6" />
    </Icon>
  ),
  outline: (
    <Icon>
      <path d="M5 7h14M5 12h14M5 17h10" />
    </Icon>
  ),
  gantt: (
    <Icon>
      <path d="M4 6h8M8 12h10M6 18h7" />
    </Icon>
  ),
  network: (
    <Icon>
      <circle cx="7" cy="7" r="2.2" />
      <circle cx="17" cy="7" r="2.2" />
      <circle cx="12" cy="17" r="2.2" />
      <path d="M9 8l6 0M8 9l3 6M16 9l-3 6" />
    </Icon>
  ),
  resource: (
    <Icon>
      <circle cx="9" cy="8" r="2.4" />
      <path d="M4.5 17c.6-2.4 2.3-3.6 4.5-3.6s3.9 1.2 4.5 3.6M16 8h4M18 6v4" />
    </Icon>
  ),
  filter: (
    <Icon>
      <path d="M4 6h16l-6 7v5l-4 2v-7z" />
    </Icon>
  ),
  inspector: (
    <Icon>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </Icon>
  ),
  info: (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 11v5M12 8h.01" />
    </Icon>
  ),
  flag: (
    <Icon>
      <path d="M6 4v16M6 4h10l-2 4 2 4H6" />
    </Icon>
  ),
  task: (
    <Icon>
      <rect x="5" y="7" width="14" height="4" rx="1" />
    </Icon>
  ),
  people: (
    <Icon>
      <circle cx="9" cy="9" r="2.5" />
      <path d="M4 18c.7-2.6 2.4-4 5-4s4.3 1.4 5 4" />
    </Icon>
  ),
  styles: (
    <Icon>
      <path d="M12 4l3 7h7l-5.5 4 2 7L12 18l-6.5 4 2-7L2 11h7z" />
    </Icon>
  ),
  tag: (
    <Icon>
      <path d="M4 12l8-8h8v8l-8 8z" />
      <circle cx="15" cy="9" r="1.2" />
    </Icon>
  ),
};
