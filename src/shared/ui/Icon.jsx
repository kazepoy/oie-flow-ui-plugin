// SPDX-License-Identifier: MPL-2.0
// Line icons (24 × 24 grid, stroked). Names describe what they show.

const PATHS = {
  filter: "M3 4h18l-7 8v7l-4 2v-9z",
  transformer: "M3 7h16l-4-4M21 17H5l4 4",
  connector: "M4 5h16v12H4zM8 21h8M12 17v4",
  response: "M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3",
  script: "M8 5l-6 7 6 7M16 5l6 7-6 7",
  attachment: "M8 13l7-7a3 3 0 014 4L9 20a5 5 0 01-7-7L13 2",
  system: "M3 4h18v6H3zM3 14h18v6H3zM7 7h.01M7 17h.01",
  reply: "M20 12H6m5-6l-6 6 6 6",
  help: "M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01M12 22a10 10 0 100-20 10 10 0 000 20z",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
  refresh: "M21 12a9 9 0 11-2.6-6.4M21 3v6h-6",
  chevron: "M9 6l6 6-6 6",
  close: "M6 6l12 12M18 6L6 18",
  flow: "M3 6h5v4H3zM16 3h5v4h-5zM16 14h5v4h-5zM8 8h4v8h4M12 5h4M12 16h4",
  expand: "M4 9l8-6 8 6M4 15l8 6 8-6",
  collapse: "M4 3l8 6 8-6M4 21l8-6 8 6"
};

/** @param {{ name: keyof typeof PATHS, label?: string }} props */
export function Icon({ name, label }) {
  return (
    <svg className="ofu-icon" viewBox="0 0 24 24" role={label ? "img" : undefined}
      aria-label={label} aria-hidden={label ? undefined : true}>
      <path d={PATHS[name] ?? PATHS.script} />
    </svg>
  );
}

/** SVG path of an icon, for platform.registerIcon. */
export const iconPath = name => PATHS[name];
