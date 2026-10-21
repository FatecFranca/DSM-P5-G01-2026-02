import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { formatAchievementDate, type AchievementStatus } from "../../domain/achievements";
import { colors, FIGMA_FRAME_WIDTH, fonts, palette, shadows } from "../../theme";
import { AchievementBadge } from "../brand/Badges";
import { PointsPaw } from "../brand/Decor";
import { CelebrationCard } from "./CelebrationCard";

/**
 * Pop-up "Parabéns" do Figma (9:554): o Jagua espiando, o selo da conquista num cartão com borda amarela e os pontos
 * ganhos numa pata. `position` aparece quando há várias conquistas novas em fila ("1 de 3").
 */
export function AchievementUnlockedCard({ achievement, onContinue, position }: { achievement: AchievementStatus; onContinue: () => void; position?: { index: number; total: number } }) {
  const s = useWindowDimensions().width / FIGMA_FRAME_WIDTH;
  const date = achievement.achievedAt ? formatAchievementDate(achievement.achievedAt) : null;
  const message = "Você desbloqueou uma nova conquista!";
  const counter = position && position.total > 1 ? ` (${position.index + 1} de ${position.total})` : "";
  const pawWidth = 52 * s;
  const pawHeight = pawWidth * 69.25 / 78;
  return <CelebrationCard title="Parabéns" message={message + counter} waves={false}
    audioText={`Parabéns! ${message} ${achievement.title}. ${achievement.description} Você ganhou ${achievement.reward} pontos!`}
    primary={{ label: "Continuar", onPress: onContinue }}>
    <View accessible accessibilityLabel={`Conquista: ${achievement.title}${date ? `, em ${date}` : ""}`} style={[styles.card, { borderRadius: 24 * s, paddingVertical: 10 * s, paddingHorizontal: 14 * s }]}>
      <AchievementBadge icon={achievement.icon} tone={achievement.tone} unlocked size={60 * s} />
      <View style={styles.cardText}>
        <Text style={styles.title}>{achievement.title}</Text>
        {date && <Text style={styles.date}>{date}</Text>}
      </View>
    </View>
    <View accessible accessibilityLabel={`${achievement.reward} pontos conquistados`} style={styles.points}>
      <View style={{ width: pawWidth, height: pawHeight }}>
        <PointsPaw width={pawWidth} />
        <Text style={[styles.pawNumber, { top: pawHeight * 0.66 - 9 }]}>{achievement.reward}</Text>
      </View>
      <Text style={styles.pointsText}>{"Pontos\nconquistados!"}</Text>
    </View>
  </CelebrationCard>;
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 14, alignSelf: "stretch", backgroundColor: colors.background, borderWidth: 2, borderColor: palette.yellow, ...shadows.sheet },
  cardText: { flex: 1, alignItems: "center", gap: 2 },
  title: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 22, color: colors.text, textAlign: "center" },
  date: { fontFamily: fonts.medium, fontSize: 13, color: "#959392" },
  points: { flexDirection: "row", alignItems: "center", gap: 10 },
  pawNumber: { position: "absolute", left: 0, right: 0, textAlign: "center", fontFamily: fonts.bold, fontSize: 15, lineHeight: 18, color: colors.text },
  pointsText: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 18, color: colors.action, textTransform: "uppercase" },
});
