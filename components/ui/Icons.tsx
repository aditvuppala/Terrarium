import { useId } from "react";
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

/**
 * Terrarium logo: a hexagonal glass cover over soil, moss and a leafy plant.
 * Drawn on a 120x120 grid; reads at 24px and scales up cleanly for the hero.
 */
export function TerrariumMark({ size = 32, className, ...props }: IconProps) {
  const uid = useId().replace(/:/g, "");
  const clip = `tm-glass-${uid}`;
  // pointy-top hexagon, center (60,64), radius 50
  const hex = "60,14 103.3,39 103.3,89 60,114 16.7,89 16.7,39";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <defs>
        <clipPath id={clip}>
          <polygon points={hex} />
        </clipPath>
      </defs>

      {/* glass body */}
      <polygon points={hex} fill="#E9F5F1" />

      <g clipPath={`url(#${clip})`}>
        <g transform="translate(0 -7)">
        {/* soil layers */}
        <rect x="0" y="92" width="120" height="40" fill="#8A5A3C" />
        <rect x="0" y="100" width="120" height="32" fill="#6B4430" />
        <g fill="#B9B6A6">
          <circle cx="30" cy="104" r="3.2" />
          <circle cx="44" cy="108" r="2.4" />
          <circle cx="76" cy="105" r="3" />
          <circle cx="90" cy="102" r="2.2" />
          <circle cx="60" cy="110" r="2.6" />
        </g>
        {/* moss mounds */}
        <path d="M10 95 C22 84 36 86 46 93 C54 86 70 85 78 92 C88 85 102 86 112 95 V100 H10 Z" fill="#5DAE6A" />
        <path d="M20 96 C28 91 36 92 42 96 Z M80 96 C88 91 96 92 102 96 Z" fill="#7FC487" />

        {/* tiny mushroom */}
        <rect x="85.5" y="83" width="3" height="9" rx="1.5" fill="#F1E9DA" />
        <path d="M80.5 84.5 Q87 75 93.5 84.5 Z" fill="#D9473A" />
        <circle cx="85" cy="81" r="1" fill="#FCFDFB" />

        {/* small succulent */}
        <g fill="#7FB89A">
          <path d="M30 92 C24 86 24 80 27 76 C31 81 32 86 30 92 Z" />
          <path d="M31 92 C36 86 39 82 39 77 C34 80 31 85 31 92 Z" />
          <path d="M29 92 C23 90 19 86 18 82 C24 83 28 87 29 92 Z" />
        </g>

        </g>

        {/* main plant */}
        <g transform="translate(60 87) scale(1.12) translate(-60 -94)">
        <path d="M60 94 C60 80 57 68 61 50 C62 44 63 40 62 34" stroke="#2F6B47" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M60 78 C52 76 45 70 42 60 C52 60 58 67 60 78 Z" fill="#3D8A55" />
        <path d="M60 78 C55 72 49 66 42 60" stroke="#245538" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M60.5 68 C68 67 75 61 78 52 C69 51 62 57 60.5 68 Z" fill="#4F9A5E" />
        <path d="M60.5 68 C66 63 72 57 78 52" stroke="#2F6B47" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M61.5 52 C55 50 50 45 48.5 37 C56 38 60.5 44 61.5 52 Z" fill="#5DAE6A" />
        <path d="M61.5 52 C57 47 52 42 48.5 37" stroke="#3D8A55" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M62 38 C66 36 70 31 70.5 25 C64.5 26 61.5 31 62 38 Z" fill="#7FC487" />
        <path d="M60.3 86 C66 86 72 82 74 76 C67 75 62 79 60.3 86 Z" fill="#5DAE6A" />
        <path d="M62 38 C58 35 55 30 55 25 C59.5 27 62 31 62 38 Z" fill="#9AD39F" />
        </g>

        {/* glass reflections */}
        <path d="M27 44 L27 74" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
        <path d="M34 36 L42 31" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        <polygon points="60,14 103.3,39 60,39" fill="#FFFFFF" opacity="0.28" />
      </g>

      {/* facet lines + frame */}
      <path d="M16.7 39 H103.3 M60 14 V39" stroke="#1C452C" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <polygon points={hex} stroke="#1C452C" strokeWidth="5" strokeLinejoin="round" />
      {/* cap ring */}
      <rect x="54" y="5" width="12" height="7" rx="3" fill="#1C452C" />
    </svg>
  );
}

export function GripIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className} {...props}>
      <circle cx="5.5" cy="3.5" r="1.25" />
      <circle cx="10.5" cy="3.5" r="1.25" />
      <circle cx="5.5" cy="8" r="1.25" />
      <circle cx="10.5" cy="8" r="1.25" />
      <circle cx="5.5" cy="12.5" r="1.25" />
      <circle cx="10.5" cy="12.5" r="1.25" />
    </svg>
  );
}

export function DealbreakerIcon({ size = 15, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className} {...props}>
      <path
        d="M8 1.75L13.5 4V7.8C13.5 11.1 11.15 13.65 8 14.5C4.85 13.65 2.5 11.1 2.5 7.8V4L8 1.75Z"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 5.25V8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="11" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function WarningIcon({ size = 18, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className} {...props}>
      <path
        d="M10 2.5L18 16.5H2L10 2.5Z"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 8V11.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="10" cy="14.3" r="1" fill="currentColor" />
    </svg>
  );
}

export function StatusMetIcon({ size = 18, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className} {...props}>
      <circle cx="10" cy="10" r="8" fill="#2F6B47" />
      <path d="M6.5 10.2L8.9 12.6L13.7 7.6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatusPartialIcon({ size = 18, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className} {...props}>
      <circle cx="10" cy="10" r="7.5" fill="#FBF1E8" stroke="#7A3415" strokeWidth="1.6" />
      <path d="M10 2.5A7.5 7.5 0 0 1 10 17.5V2.5Z" fill="#7A3415" />
    </svg>
  );
}

export function StatusUnmetIcon({ size = 18, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className} {...props}>
      <circle cx="10" cy="10" r="8" fill="#84231F" />
      <path d="M7.2 7.2L12.8 12.8M12.8 7.2L7.2 12.8" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function StatusUnknownIcon({ size = 18, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className} {...props}>
      <circle cx="10" cy="10" r="7.5" fill="#E6ECE1" stroke="#3D5245" strokeWidth="1.6" />
      <path
        d="M8.2 7.8C8.2 6.8 9 6.1 10.1 6.1C11.1 6.1 11.9 6.75 11.9 7.65C11.9 8.4 11.4 8.85 10.65 9.25C10.1 9.55 9.9 9.9 9.9 10.55V10.9"
        stroke="#16241B"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="10" cy="13.5" r="1" fill="#16241B" />
    </svg>
  );
}

export function ChatBubbleIcon({ size = 20, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className} {...props}>
      <path
        d="M3.5 4.5H16.5C17.05 4.5 17.5 4.95 17.5 5.5V13.5C17.5 14.05 17.05 14.5 16.5 14.5H7.5L3.5 17.5V5.5C3.5 4.95 3.95 4.5 4.5 4.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M7 8.5H13M7 11.2H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ size = 18, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M5.5 5.5L14.5 14.5M14.5 5.5L5.5 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 18, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M12.5 4.5L7 10L12.5 15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 18, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M7.5 4.5L13 10L7.5 15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UploadIcon({ size = 18, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M10 13V4M10 4L6.5 7.5M10 4L13.5 7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 13.5V15.5C4 16.05 4.45 16.5 5 16.5H15C15.55 16.5 16 16.05 16 15.5V13.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function SendIcon({ size = 18, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M3.5 10L16.5 3.5L13 16.5L9.5 11.5L3.5 10Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9.5 11.5L16.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function PlusIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M3 8.5L6.3 11.8L13 4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrashIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M3 4.5H13M6 4.5V3H10V4.5M4.5 4.5L5.2 13H10.8L11.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EditIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M10.8 2.8L13.2 5.2L5.5 12.9H3.1V10.5L10.8 2.8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function ExternalLinkIcon({ size = 14, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M6.5 3.5H3.5V12.5H12.5V9.5M9.5 3.5H12.5V6.5M12.5 3.5L7.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BusIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className} {...props}>
      <rect x="3" y="2.5" width="10" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 7.5H13M5.5 12V13.8M10.5 12V13.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="5.5" cy="10" r="0.8" fill="currentColor" />
      <circle cx="10.5" cy="10" r="0.8" fill="currentColor" />
    </svg>
  );
}

export function BuildingIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M2.5 13.5H13.5M4 13.5V3.5H12V13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 6H7.5M8.5 6H9.5M6.5 8.5H7.5M8.5 8.5H9.5M7 13.5V11H9V13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function PinIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className} {...props}>
      <path
        d="M8 14C8 14 12.5 9.8 12.5 6.5C12.5 4.01 10.49 2 8 2C5.51 2 3.5 4.01 3.5 6.5C3.5 9.8 8 14 8 14Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="6.5" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function PrivacyShieldIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className} {...props}>
      <path
        d="M8 2L13 4V7.5C13 10.6 10.9 13 8 14C5.1 13 3 10.6 3 7.5V4L8 2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M6 8L7.4 9.4L10.3 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
