import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../src/components/Screen";
import { useContentStore } from "../src/content/store";
import { isLessonUnlocked, lessonNeedsReview } from "../src/domain/learning";
import { LEARNING_LEVELS, unitsForLevel, type LearningLevelId } from "../src/domain/levels";
import type { Unit } from "../src/domain/types";
import { useStudyStore } from "../src/store/study-store";
import { colors } from "../src/theme";

export default function Lessons() {
  const progress = useStudyStore((state) => state.progress);
  const itemStates = useStudyStore((state) => state.itemStates);
  const tracks = useContentStore((state) => state.tracks);
  const now = new Date();
  const stateOf = (unit: Unit) => {
    const done = progress[unit.id]?.completed === true;
    return { done, unlocked: done || isLessonUnlocked(unit, progress), review: lessonNeedsReview(unit, itemStates, now) };
  };
  const tile = (unit: Unit, label: string, big: string) => {
    const { done, unlocked, review } = stateOf(unit);
    const state = review ? "Revisar" : done ? "Concluída" : unlocked ? label : "Bloqueada";
    return (
      <Link key={unit.id} href={{ pathname: "/lesson/[id]", params: { id: unit.id } }} asChild>
        <Pressable
          disabled={!unlocked}
          accessibilityRole="button"
          accessibilityLabel={`${label}${review ? ", para revisar" : done ? ", concluída" : !unlocked ? ", bloqueada" : ""}`}
          style={StyleSheet.flatten([styles.tile, unit.kind !== "letter" && styles.wideTile, done && !review && styles.done, review && styles.review, !unlocked && styles.locked])}
        >
          <Text style={[unit.kind === "letter" ? styles.letter : styles.unitTitle, done && !review && styles.doneText]}>{unlocked ? big : "•"}</Text>
          <Text style={[styles.state, done && !review && styles.doneText]}>{state}</Text>
        </Pressable>
      </Link>
    );
  };

  const reviewUnits = tracks.flatMap((track) => track.units).filter((unit) => stateOf(unit).unlocked && stateOf(unit).review);
  const phonics = tracks.find((track) => track.kind === "phonics");

  const renderLevel = (levelId: LearningLevelId) => {
    const level = LEARNING_LEVELS.find((item) => item.id === levelId)!;
    if (levelId === 1 && phonics) {
      return (
        <View key={level.id}>
          <Text style={styles.phaseTitle}>{level.title}</Text>
          <Text style={styles.intro}>{level.description}</Text>
          {[1, 2, 3].map((phase) => {
            const items = phonics.units.filter((unit) => unit.phase === phase);
            if (!items.length) return null;
            return (
              <View key={`${phonics.id}-${phase}`}>
                <Text style={styles.phaseSubtitle}>{items[0].phaseTitle}</Text>
                <View style={styles.grid}>{items.map((unit) => tile(unit, `Lição ${unit.order}`, unit.letter ?? ""))}</View>
              </View>
            );
          })}
        </View>
      );
    }
    if (levelId === 5) {
      return (
        <View key={level.id}>
          <Text style={styles.phaseTitle}>{level.title}</Text>
          <Text style={styles.intro}>{level.description}</Text>
          {reviewUnits.length === 0 ? (
            <Text style={styles.gate}>Nenhuma revisão pendente agora. Continue praticando os níveis anteriores.</Text>
          ) : (
            <View style={styles.grid}>{reviewUnits.map((unit) => tile(unit, "Revisar", unit.letter ?? unit.title))}</View>
          )}
        </View>
      );
    }
    const units = unitsForLevel(tracks, levelId);
    if (!units.length) return null;
    return (
      <View key={level.id}>
        <Text style={styles.phaseTitle}>{level.title}</Text>
        <Text style={styles.intro}>{level.description}</Text>
        <Text style={styles.gate}>As atividades abrem conforme as letras que você já domina.</Text>
        <View style={styles.grid}>{units.map((unit) => tile(unit, unit.title, unit.title))}</View>
      </View>
    );
  };

  return (
    <Screen>
      <Text style={styles.title}>Trilha Prosa</Text>
      <Text style={styles.intro}>Cinco níveis progressivos: letras, sílabas, palavras, frases e consolidação. As atividades que você errou voltam na mesma sessão.</Text>
      {LEARNING_LEVELS.map((level) => renderLevel(level.id))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: "800", color: colors.text },
  intro: { fontSize: 17, lineHeight: 25, color: colors.muted },
  gate: { fontSize: 15, lineHeight: 22, color: colors.muted, marginBottom: 8 },
  phaseTitle: { fontSize: 21, fontWeight: "800", color: colors.text, marginTop: 18 },
  phaseSubtitle: { fontSize: 17, fontWeight: "700", color: colors.muted, marginTop: 10, marginBottom: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { width: "30%", minWidth: 88, minHeight: 100, borderRadius: 16, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 8 },
  wideTile: { width: "100%" },
  done: { backgroundColor: colors.success, borderColor: colors.success },
  review: { borderColor: colors.accent, backgroundColor: "#FFF8EA" },
  locked: { opacity: 0.5 },
  letter: { fontSize: 38, fontWeight: "800", color: colors.primary },
  unitTitle: { fontSize: 22, fontWeight: "800", color: colors.primary, textAlign: "center" },
  state: { fontSize: 12, color: colors.muted },
  doneText: { color: "white" },
});
