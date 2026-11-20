import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export function TerrariumMark({ size = 32, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* Faceted glass terrarium vessel */}
      <path
        d="M11 4H21L27 13L23 27H9L5 13L11 4Z"
        fill="#DFEAE2"
        stroke="#16241B"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M5 13H27"
        stroke="#16241B"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Botanical sprout inside */}
      <path
        d="M16 24V14"
        stroke="#2F6B47"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 18C12.5 18 11 15.5 11 13C13.8 13 16 14.8 16 18Z"
        fill="#2F6B47"
      />
      <path
        d="M16 15.5C19.2 15.5 21 13.2 21 10.5C18.1 10.5 16 12.4 16 15.5Z"
        fill="#2F6B47"
      />
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
