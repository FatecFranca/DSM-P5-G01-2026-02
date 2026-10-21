import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { colors, fonts, fontSize, palette } from "../../theme";

type ProgressBarProps = { current: number; total: number; accessibilityLabel?: string; style?: StyleProp<ViewStyle> };

/** Quiz progress from Figma: one dot per step, a beige track with green gradient fill and a "1/10" counter. */
export function ProgressBar({ current, total, accessibilityLabel, style }: ProgressBarProps) {
  const ratio = Math.min(1, Math.max(0, current / Math.max(1, total)));
  const dots = Math.min(total, 12);
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel ?? `Atividade ${current} de ${total}`} accessibilityValue={{ min: 0, max: total, now: current }} style={[styles.wrap, style]}>
    <View style={styles.dots}>{Array.from({ length: dots }, (_, index) => <View key={index} style={[styles.dot, index < Math.round(ratio * dots) && styles.dotDone]} />)}</View>
    <View style={styles.track}>
      <Svg width={`${ratio * 100}%`} height={6}>
        <Defs><LinearGradient id="fill" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor={palette.green} /><Stop offset="1" stopColor={palette.greenBright} /></LinearGradient></Defs>
        <Rect width="100%" height={6} rx={3} fill="url(#fill)" />
      </Svg>
    </View>
    <Text style={styles.counter}>{current}/{total}</Text>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 6, width: "62%" },
  dots: { flexDirection: "row", justifyContent: "space-between" },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.track },
  dotDone: { backgroundColor: colors.action },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.track, overflow: "hidden" },
  counter: { fontFamily: fonts.regular, fontSize: fontSize.caption, color: colors.muted },
});
