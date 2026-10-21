import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import type { TrailStatus } from "../../domain/trail";
import { colors, fonts, palette } from "../../theme";
import { SolidLockIcon, TrailWaves } from "../brand/Decor";
import { BottomNav } from "./BottomNav";

// Cores dos cartões da trilha no Figma (9:179 e 9:182).
const CARD_BG = "#F5E4C1";
const BORDER_LOCKED = "#8C592F";
const BORDER_OPEN = "#3D8C2F";
const DOT_DONE = { fill: palette.green, stroke: "#05371D" };
const DOT_IDLE = { fill: palette.beige, stroke: palette.navy };
export const TRAIL_LINE = palette.beige;
/** Parte das ondas (92 px no Figma) que fica escondida atrás do menu inferior. */
const NAV_OVERLAP = 47;

/**
 * Moldura das telas da trilha: o conteúdo ocupa a tela toda, as ondas verdes e amarelas ficam atrás do menu
 * inferior, que flutua por cima como no Figma. `children` recebe a altura do menu para reservar espaço.
 */
export function TrailScene({ scale, children }: { scale: number; children: (navHeight: number) => ReactNode }) {
  const [navHeight, setNavHeight] = useState(0);
  return <View style={styles.scene}>
    {children(navHeight)}
    <View pointerEvents="none" style={[styles.waves, { height: 92 * scale, bottom: Math.max(0, navHeight - NAV_OVERLAP * scale) }]}><TrailWaves /></View>
    <View style={styles.nav} onLayout={(event) => setNavHeight(event.nativeEvent.layout.height)}><BottomNav active="trilhas" /></View>
  </View>;
}

/** Cartão bege de uma etapa ou exercício: borda verde e brilho no atual, cadeado no bloqueado. */
export function TrailCard({ label, status, scale, fontSize, accessibilityLabel, onPress, style }: {
  label: string; status: TrailStatus; scale: number; fontSize: number; accessibilityLabel: string; onPress: () => void; style?: StyleProp<ViewStyle>;
}) {
  const locked = status === "locked";
  return <Pressable
    disabled={locked}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{ disabled: locked }}
    onPress={onPress}
    hitSlop={6}
    style={({ pressed }) => [
      styles.card,
      { width: 100 * scale, height: 42 * scale, borderRadius: 15 * scale, borderWidth: 3 * scale, paddingHorizontal: 6 * scale },
      { borderColor: locked || status === "available" ? BORDER_LOCKED : BORDER_OPEN },
      status === "current" && styles.glow,
      pressed && styles.pressed,
      style,
    ]}
  >
    <Text style={[styles.label, { fontSize: fontSize * scale, lineHeight: fontSize * scale * 1.2 }]} numberOfLines={2} adjustsFontSizeToFit>{label}</Text>
    {locked && <View style={{ marginLeft: 4 * scale }}><SolidLockIcon size={15 * scale} /></View>}
  </Pressable>;
}

/** Bolinha do caminho: verde nas etapas já alcançadas, bege nas demais. */
export function TrailDot({ reached, size, style }: { reached: boolean; size: number; style?: StyleProp<ViewStyle> }) {
  const { fill, stroke } = reached ? DOT_DONE : DOT_IDLE;
  return <Svg accessible={false} pointerEvents="none" width={size} height={size} viewBox="0 0 12 12" style={style}>
    <Circle cx={6} cy={6} r={5} fill={fill} stroke={stroke} strokeWidth={2} />
  </Svg>;
}

const styles = StyleSheet.create({
  scene: { flex: 1, backgroundColor: colors.background, overflow: "hidden" },
  waves: { position: "absolute", left: 0, right: 0 },
  nav: { position: "absolute", left: 0, right: 0, bottom: 0 },
  card: { position: "absolute", flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: CARD_BG },
  // Figma: drop shadow 0 0 15 #28724C. No Android, elevation com shadowColor (API 28+).
  glow: { shadowColor: palette.green, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 15, elevation: 10 },
  label: { flexShrink: 1, fontFamily: fonts.bold, color: palette.navy, textAlign: "center", textTransform: "uppercase" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});
