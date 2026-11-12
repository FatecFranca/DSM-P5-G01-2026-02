import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { gapAccessibilityLabel, gapParts } from "../../domain/gaps";
import type { Exercise } from "../../domain/types";
import { ManagedIllustration } from "../../assets/ManagedIllustration";
import { colors, fonts } from "../../theme";
import { PictureCircle } from "../brand/Decor";

/** Texto com lacunas: cada casa vazia é uma letra que falta (src/domain/gaps.ts). */
export function GapText({ text, options, size = 42, style }: { text: string; options?: readonly string[]; size?: number; style?: StyleProp<ViewStyle> }) {
  const slotWidth = size * 0.72;
  // Lacuna e texto ficam na mesma linha; só frases longas quebram.
  return <View accessible accessibilityLabel={`Palavra com espaço vazio: ${gapAccessibilityLabel(text)}`} style={[styles.row, text.length <= 16 && styles.noWrap, style]}>
    {gapParts(text, options).map((part, index) => part.kind === "text"
      ? <Text key={index} style={[styles.text, { fontSize: size, lineHeight: size * 1.2 }]}>{part.text}</Text>
      : <View key={index} style={styles.gap}>{Array.from({ length: part.slots }, (_, slot) => <View key={slot} style={[styles.slot, { width: slotWidth, height: size * 1.05 }]} />)}</View>)}
  </View>;
}

/** Figura do exercício: desenho embarcado quando existe, senão o emoji grande num círculo. */
export function ExerciseFigure({ exercise, size = 124 }: { exercise: Pick<Exercise, "imageAsset" | "imageUri" | "imageLabel" | "image">; size?: number }) {
  if (exercise.imageAsset) return <ManagedIllustration assetId={exercise.imageAsset} sourceUri={exercise.imageUri} accessibilityLabel={exercise.imageLabel ?? "Ilustração contextual"} size={size * 1.6} />;
  if (!exercise.image) return null;
  return <View accessibilityRole="image" accessibilityLabel={exercise.imageLabel ?? "Figura"} style={[styles.picture, { width: size, height: size }]}>
    <PictureCircle size={size} />
    <Text accessible={false} style={[styles.emoji, { fontSize: size * 0.55 }]}>{exercise.image}</Text>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "center", columnGap: 10, rowGap: 6 },
  text: { color: colors.text, fontFamily: fonts.semibold, letterSpacing: 4, textAlign: "center" },
  noWrap: { flexWrap: "nowrap" },
  gap: { flexDirection: "row", gap: 5 },
  slot: { borderBottomWidth: 4, borderColor: colors.text },
  picture: { alignItems: "center", justifyContent: "center", alignSelf: "center" },
  emoji: { textAlign: "center" },
});
