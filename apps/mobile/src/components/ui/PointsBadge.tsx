import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../../theme";
import { PointsPaw } from "../brand/Decor";

/** "20 PONTOS!" dos pop-ups de conclusão do Figma: número sobre a almofada da pata (centro a ~66% da altura). */
export function PointsBadge({ points }: { points: number }) {
  return <View accessible accessibilityLabel={`${points} pontos`} style={styles.points}>
    <View style={styles.paw}>
      <PointsPaw width={100} />
      <Text style={styles.value}>{points}</Text>
    </View>
    <Text style={styles.label}>Pontos!</Text>
  </View>;
}

const styles = StyleSheet.create({
  points: { alignItems: "center", gap: 2 },
  paw: { width: 100, height: 89 },
  value: { position: "absolute", left: 0, right: 0, top: 40, textAlign: "center", color: colors.text, fontSize: 30, lineHeight: 36, fontFamily: fonts.bold },
  label: { color: colors.success, fontSize: 24, fontFamily: fonts.bold, textTransform: "uppercase" },
});
