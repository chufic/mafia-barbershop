import type { SVGProps } from "react";

export type IconName =
  | "phone"
  | "whatsapp"
  | "telegram"
  | "max"
  | "apple"
  | "google-play"
  | "close"
  | "check"
  | "clock"
  | "pin"
  | "star"
  | "arrow"
  | "arrow-left"
  | "external"
  | "menu"
  | "scissors"
  | "calendar"
  | "shield"
  | "user"
  | "trash"
  | "map"
  | "search";

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

const common = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Инлайновые иконки: без внешних библиотек и CDN. */
export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {renderPath(name)}
    </svg>
  );
}

function renderPath(name: IconName) {
  switch (name) {
    case "phone":
      return (
        <path
          {...common}
          d="M6.6 3.9 4.9 5.6c-.9.9-1 2.3-.4 3.5a20.4 20.4 0 0 0 10.4 10.4c1.2.6 2.6.5 3.5-.4l1.7-1.7-4.2-4.2-1.8 1.8a16.2 16.2 0 0 1-5.1-5.1l1.8-1.8-4.2-4.2Z"
        />
      );
    case "whatsapp":
      return (
        <>
          <path
            {...common}
            d="M12 3.5a8.4 8.4 0 0 0-7.2 12.7L3.6 20.4l4.3-1.1A8.4 8.4 0 1 0 12 3.5Z"
          />
          <path
            {...common}
            d="M9.1 8.4c-.3.1-.6.5-.6.9 0 2.4 2.1 4.6 4.7 5.1.5.1 1-.2 1.2-.5l.3-.7c.1-.3 0-.5-.2-.7l-1.1-.7c-.2-.1-.5-.1-.7.1l-.4.4a4.6 4.6 0 0 1-2.2-2.1l.4-.5c.2-.2.2-.4.1-.6l-.6-1c-.2-.3-.5-.4-.9-.2Z"
          />
        </>
      );
    case "telegram":
      return (
        <path
          {...common}
          d="m21 4.5-2.8 14.2c-.2 1-1.2 1.3-2 .8l-5-3.6-2.4 2.3c-.3.3-.6.5-1.1.5l.4-4.6 8.5-7.7-10.4 6.5-4.5-1.4c-1-.3-1-1 .2-1.4L20 3.4c.8-.3 1.5.2 1 1.1Z"
        />
      );
    case "max":
      return (
        <>
          <path {...common} d="M4 20V4l16 16V4" />
        </>
      );
    case "apple":
      return (
        <g fill="currentColor">
          <path d="M16.5 12.8c0-2 1.6-3 1.7-3.1-1-1.4-2.4-1.7-3-1.7-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2.1 2.5 2.1 1 0 1.4-.6 2.6-.6 1.2 0 1.5.6 2.6.6 1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.1-.9-2.1-3Z" />
          <path d="M14.6 6.4c.5-.6.9-1.5.8-2.4-.8 0-1.8.5-2.4 1.2-.5.6-.9 1.5-.8 2.3.9.1 1.8-.5 2.4-1.1Z" />
        </g>
      );
    case "google-play":
      return (
        <g fill="currentColor">
          <path d="M4 3.2c-.3.3-.5.7-.5 1.2v15.2c0 .5.2.9.5 1.2l8.3-8.8L4 3.2Z" opacity="0.9" />
          <path d="m15.6 9.2-2.8-1.6L4.6 2.6c-.2-.1-.4-.1-.6-.1L12.4 12l3.2-2.8Z" opacity="0.65" />
          <path d="m15.6 14.8-3.2-2.8L4 21.5c.2 0 .4 0 .6-.1l8.2-5 2.8-1.6Z" opacity="0.8" />
          <path d="m19.8 10.9-4.2-1.7-3.2 2.8 3.2 2.8 4.2-1.7c1-.5 1-1.7 0-2.2Z" />
        </g>
      );
    case "close":
      return <path {...common} d="M6 6l12 12M18 6 6 18" />;
    case "check":
      return <path {...common} d="m4.5 12.5 5 5 10-11" />;
    case "clock":
      return (
        <>
          <circle {...common} cx="12" cy="12" r="8.5" />
          <path {...common} d="M12 7.5V12l3 2" />
        </>
      );
    case "pin":
      return (
        <>
          <path {...common} d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
          <circle {...common} cx="12" cy="10" r="2.5" />
        </>
      );
    case "star":
      return (
        <path
          d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.8-5.3-2.9-5.3 2.9 1.1-5.8L3.5 9.7l5.9-.8L12 3.5Z"
          fill="currentColor"
        />
      );
    case "arrow":
      return <path {...common} d="M4.5 12h15m0 0-5.5-5.5M19.5 12l-5.5 5.5" />;
    case "arrow-left":
      return <path {...common} d="M19.5 12h-15m0 0L10 6.5M4.5 12 10 17.5" />;
    case "external":
      return (
        <>
          <path {...common} d="M14 4h6v6" />
          <path {...common} d="M20 4 10.5 13.5" />
          <path {...common} d="M19 14.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4.5" />
        </>
      );
    case "menu":
      return <path {...common} d="M3.5 7h17M3.5 12h17M3.5 17h17" />;
    case "scissors":
      return (
        <>
          <circle {...common} cx="6.5" cy="6.5" r="2.5" />
          <circle {...common} cx="6.5" cy="17.5" r="2.5" />
          <path {...common} d="M8.7 8.2 20 18M8.7 15.8 20 6" />
        </>
      );
    case "calendar":
      return (
        <>
          <rect {...common} x="3.5" y="5.5" width="17" height="15" rx="2.5" />
          <path {...common} d="M8 3.5v4M16 3.5v4M3.5 10.5h17" />
        </>
      );
    case "shield":
      return (
        <>
          <path {...common} d="M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6l-7-2.5Z" />
          <path {...common} d="m9 12 2 2 4-4.5" />
        </>
      );
    case "user":
      return (
        <>
          <circle {...common} cx="12" cy="8.5" r="3.5" />
          <path {...common} d="M5 20c.7-3.3 3.5-5 7-5s6.3 1.7 7 5" />
        </>
      );
    case "trash":
      return (
        <>
          <path {...common} d="M4.5 7h15M9.5 4.5h5M7 7l.8 12.5h8.4L17 7" />
          <path {...common} d="M10.5 10.5v6M13.5 10.5v6" />
        </>
      );
    case "map":
      return (
        <>
          <path {...common} d="m3.5 6.5 5-2 7 2 5-2v13l-5 2-7-2-5 2v-13Z" />
          <path {...common} d="M8.5 4.5v13M15.5 6.5v13" />
        </>
      );
    case "search":
      return (
        <>
          <circle {...common} cx="10.8" cy="10.8" r="6.3" />
          <path {...common} d="m15.6 15.6 4.4 4.4" />
        </>
      );
    default:
      return null;
  }
}
