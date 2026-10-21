// Design tokens extracted from Figma "PROSA-APP" (file XAbRRhu5TyYpJOsgNXiqh1, screens Início 1:7 and Quiz 1:381).
// The Figma file has no published variables, so values were read from the layers directly.

export const palette = {
  cream: "#F4EDE2", // screen background
  sand: "#F6F3EF", // bottom sheet, cards, speech bubble
  navy: "#092E4B", // titles, body text, answer letters
  blue: "#185B80", // input borders, secondary button text
  green: "#28724C", // primary button, audio button
  greenBright: "#34A853", // selected answer glow, progress gradient end
  greenDark: "#0D3721", // shadow leaf in the celebration card waves
  taupe: "#8A806C", // progress counter, close button
  beige: "#DDCFB4", // progress track, picture circle
  yellow: "#F8C54F", // decorative corner shapes
  yellowSoft: "#F9CD63", // login hero blob, logo spark
  amber: "#F2A33A", // current paw on the streak pop-up (1:1061)
  white: "#FFFFFF",
  orange: "#D97706", // not in Figma yet, kept from previous theme
  red: "#A33A2B", // not in Figma yet, kept from previous theme
} as const;

// Semantic colors. Keys kept from the previous theme so existing screens keep compiling.
export const colors = {
  background: palette.cream,
  surface: palette.sand,
  primary: palette.navy,
  action: palette.green,
  accent: palette.orange,
  success: palette.green,
  successBright: palette.greenBright,
  // Figma: rgba(52,168,83,0.25) over the sand surface, made opaque because Android draws elevation shadows
  // through translucent fills (a darker box shows inside the card).
  selectedBg: "#C6E0C8",
  careBg: "#FFF1D6", // wrong-but-recoverable answer, "try again" feedback (not in Figma yet)
  dangerBg: "#F8E6E3", // wrong answer in placement (not in Figma yet)
  text: palette.navy,
  link: palette.blue,
  placeholder: "rgba(24,91,128,0.5)",
  muted: palette.taupe,
  border: palette.blue,
  track: palette.beige,
  onAction: palette.white,
  danger: palette.red,
} as const;

// Fonts used in Figma, loaded in app/_layout.tsx. Use fontFamily instead of fontWeight with these
// (Android ignores fontWeight on custom families).
export const fonts = {
  brand: "SourceSerifPro_400Regular", // "PROSA" logo
  light: "Inter_300Light",
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const fontSize = { caption: 12, small: 14, body: 15, bodyLg: 16, title: 20, answer: 32, brand: 40 } as const;

export const radius = { xs: 5, sm: 10, md: 15, lg: 25, pill: 30, sheet: 90 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 20, xl: 28 } as const;

export const sizes = { audioButton: 34, input: 35, primaryButton: 44, answerCard: { width: 95, height: 54 } } as const;

/** Width of the Figma mobile frames. Decorative layout (mascot, shapes) scales by screenWidth / FIGMA_FRAME_WIDTH. */
export const FIGMA_FRAME_WIDTH = 320;

export const shadows = {
  card: { shadowColor: "#000000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 5 },
  selected: { shadowColor: palette.greenBright, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 1, shadowRadius: 15, elevation: 6 },
  cta: { shadowColor: "#000000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.8, shadowRadius: 15, elevation: 8 },
  sheet: { shadowColor: palette.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 15, elevation: 10 },
} as const;
