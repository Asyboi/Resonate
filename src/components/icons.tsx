import type { ReactNode } from "react";

type IconProps = { className?: string };

function Icon({ className = "size-6", children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const ArrowRight = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </Icon>
);

export const ArrowDown = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3v18M6 15l6 6 6-6" />
  </Icon>
);

export const Plus = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const Pencil = (props: IconProps) => (
  <Icon {...props}>
    <path d="m4 20 1-5L16 4l4 4L9 19zM14 6l4 4" />
  </Icon>
);

export const Copy = (props: IconProps) => (
  <Icon {...props}>
    <rect x="8" y="8" width="12" height="13" rx="2" />
    <path d="M16 4H6a2 2 0 0 0-2 2v11" />
  </Icon>
);

export const Mail = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Icon>
);

export const Lock = (props: IconProps) => (
  <Icon {...props}>
    <rect x="5" y="10" width="14" height="10" rx="2" fill="currentColor" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </Icon>
);

export const Close = (props: IconProps) => (
  <Icon {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);

export const Verified = ({ className = "size-5" }: IconProps) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true">
    <circle cx="10" cy="10" r="10" fill="currentColor" />
    <path d="m5.5 10.5 3 3 6-7" fill="none" stroke="white" strokeWidth="2" />
  </svg>
);

export const Mark = ({ className = "size-[30px]" }: IconProps) => (
  <svg className={className} viewBox="0 0 30 30" fill="none" aria-hidden="true">
    <circle cx="15" cy="15" r="14" className="stroke-line" strokeWidth="1.5" />
    <circle cx="15" cy="15" r="9.5" className="stroke-sky" strokeWidth="1.5" />
    <circle cx="15" cy="15" r="5" className="fill-blue" />
  </svg>
);

export const ResonanceDot = ({ className = "size-6" }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10.5" className="stroke-resonance" strokeWidth="2" />
    <circle cx="12" cy="12" r="5.5" className="fill-resonance" />
  </svg>
);

/** A live dot with the creator's navy at its center. */
export const AudienceDot = ({ className = "size-3.5" }: IconProps) => (
  <svg className={className} viewBox="0 0 14 14" aria-hidden="true">
    <circle cx="7" cy="7" r="7" className="fill-sky" />
    <circle cx="7" cy="7" r="3.2" className="fill-navy" />
  </svg>
);
