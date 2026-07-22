/**
 * Shared design tokens (SDD.md §3.3), extracted from
 * design-reference/Scattered Oaks Farms.dc.html on 2026-07-21.
 *
 * This is the one file a future Design Iteration Workflow update
 * (Requirements.md §6.4) needs to touch to restyle the whole site
 * consistently — every component, public or admin, imports from here.
 *
 * The source prototype used several near-identical warm-neutral text
 * shades (lightness 0.27/0.35/0.40/0.45 at hue ~50-55) inconsistently
 * across sections; consolidated here into a 3-step text hierarchy
 * (primary/body/muted) rather than preserving every micro-variation.
 */

export const fontImportUrl =
  'https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap';

export const fonts = {
  heading: "'Quicksand', sans-serif",
  body: "'Nunito', sans-serif",
  mono: 'ui-monospace, monospace',
} as const;

export const fontWeights = {
  heading: { medium: 500, semibold: 600, bold: 700 },
  body: { regular: 400, semibold: 600, bold: 700, extrabold: 800 },
} as const;

export const colors = {
  background: 'oklch(0.96 0.025 85)', // warm cream/sand page background
  surface: 'oklch(0.99 0.01 85)', // cards, modals, form panels
  surfaceAlt: 'oklch(0.93 0.03 80)', // hero gradient / Available Animals section bg

  text: {
    primary: 'oklch(0.27 0.03 50)', // nav links, primary body copy
    body: 'oklch(0.35 0.03 55)', // paragraph copy (hero, About)
    muted: 'oklch(0.45 0.02 55)', // stat labels, card meta, blurbs
  },
  heading: 'oklch(0.32 0.04 195)', // all headings — dark teal, distinct from body text

  accent: {
    DEFAULT: 'oklch(0.5 0.08 195)', // primary teal — links, buttons, "for sale" badge
    hover: 'oklch(0.4 0.09 195)',
    deep: 'oklch(0.4 0.07 195)', // contact section background
  },
  accent2: {
    DEFAULT: 'oklch(0.55 0.1 60)', // secondary terracotta/rust — eyebrow labels, stat numbers
    bright: 'oklch(0.6 0.1 60)', // badges, footer social icon, logo wordmark accent
    text: 'oklch(0.4 0.1 55)', // text set against transparent/light terracotta (e.g. outline button label)
    border: 'oklch(0.68 0.11 65)', // sticky nav bottom border
  },

  status: {
    forSale: { bg: 'oklch(0.5 0.08 195)', text: 'oklch(0.99 0.01 85)' },
    pending: { bg: 'oklch(0.65 0.1 65)', text: 'oklch(0.99 0.01 85)' },
    comingSoon: { bg: 'oklch(0.99 0.01 85)', text: 'oklch(0.55 0.1 60)' },
    notForSale: { bg: 'oklch(0.55 0.02 50)', text: 'oklch(0.99 0.01 85)' },
  },

  overlay: 'oklch(0.15 0.02 50 / 0.85)', // modal/lightbox backdrop
  modalMedia: 'oklch(0.2 0.02 50)', // photo/video letterbox background in the detail lightbox
  footer: 'oklch(0.27 0.03 50)', // footer background (same value as text.primary — dark oak-brown)
  border: 'oklch(0.85 0.02 80)', // form input borders

  // [ADDED] 2026-07-22 (M6) — no destructive-action color existed before the
  // admin CMS's delete confirmations (animals, gallery photos, admin users).
  danger: {
    DEFAULT: 'oklch(0.5 0.18 25)', // delete buttons, destructive confirmation text
    bg: 'oklch(0.94 0.03 25)', // danger-tinted panel/badge background
  },
} as const;

export const radius = {
  pill: '999px', // nav CTA, filter tabs, badges, buttons
  card: '18px', // animal cards
  cardLarge: '24px', // hero photo, About photo
  cardSmall: '14px', // gallery tiles
  modal: '20px',
  input: '10px',
  circle: '50%', // logo, close buttons
} as const;

export const containers = {
  maxWidth: '1180px', // page sections
  narrow: '640px', // contact form
  modal: '920px', // animal detail lightbox
  galleryModal: '820px', // gallery lightbox
} as const;

export const shadows = {
  card: '0 6px 18px oklch(0.3 0.04 60 / 0.1)',
  heroPhoto: '0 20px 40px oklch(0.3 0.05 195 / 0.25)',
  ctaButton: '0 4px 14px oklch(0.5 0.08 195 / 0.35)',
  badge: '0 8px 20px oklch(0.4 0.08 60 / 0.3)',
} as const;

/** Hero badge "bob" animation — define once as a global @keyframes and reference by name. */
export const animations = {
  bob: {
    name: 'bob',
    keyframes: '0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}',
    css: 'bob 4s ease-in-out infinite',
  },
} as const;
