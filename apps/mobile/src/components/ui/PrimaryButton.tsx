import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { colors, fonts, radius, shadows } from "../../theme";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  /** "solid": green pill (Entrar, CONFIRMAR). "outline": blue-bordered pill (Entrar com o Google). */
  variant?: "solid" | "outline";
  icon?: ReactNode;
  disabled?: boolean;
  uppercase?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Pill button from Figma. Height grows to 56 so it stays a comfortable touch target. */
export function PrimaryButton({ label, onPress, variant = "solid", icon, disabled = false, uppercase = false, accessibilityLabel, style }: PrimaryButtonProps) {
  const solid = variant === "solid";
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.base, solid ? styles.solid : styles.outline, disabled && styles.disabled, pressed && styles.pressed, style]}>
    {icon}
    <Text style={[styles.label, solid ? styles.solidLabel : styles.outlineLabel, uppercase && styles.uppercase]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  base: { minHeight: 56, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 20 },
  solid: { backgroundColor: colors.action, ...shadows.card },
  outline: { borderWidth: 1, borderColor: colors.link, backgroundColor: "transparent" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  label: { fontFamily: fonts.semibold, fontSize: 18 },
  solidLabel: { color: colors.onAction },
  outlineLabel: { color: colors.link },
  uppercase: { textTransform: "uppercase", fontSize: 20 },
});
