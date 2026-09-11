import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../src/components/Screen";
import { useContentStore } from "../src/content/store";
import { isLessonUnlocked } from "../src/domain/learning";
import type { Unit } from "../src/domain/types";
import { useStudyStore } from "../src/store/study-store";
import { colors } from "../src/theme";

export default function Lessons() {
  const progress = useStudyStore((state) => state.progress);
  const tracks = useContentStore((state) => state.tracks);
  const stateOf = (unit: Unit) => { const done = progress[unit.id]?.completed === true; return { done, unlocked: done || isLessonUnlocked(unit, progress) }; };
  const tile = (unit: Unit, label: string, big: string) => {
    const { done, unlocked } = stateOf(unit);
    return <Link key={unit.id} href={{ pathname: "/lesson/[id]", params: { id: unit.id } }} asChild>
      <Pressable disabled={!unlocked} accessibilityRole="button" accessibilityLabel={`${label}${done ? ", concluída" : !unlocked ? ", bloqueada" : ""}`} style={StyleSheet.flatten([styles.tile, unit.kind !== "letter" && styles.wideTile, done && styles.done, !unlocked && styles.locked])}>
        <Text style={[unit.kind === "letter" ? styles.letter : styles.unitTitle, done && styles.doneText]}>{unlocked ? big : "•"}</Text>
        <Text style={[styles.state, done && styles.doneText]}>{done ? "Concluída" : unlocked ? label : "Bloqueada"}</Text>
      </Pressable>
    </Link>;
  };
  return <Screen>
    <Text style={styles.title}>Trilha de aprendizagem</Text>
    <Text style={styles.intro}>Aprenda em pequenas etapas. Você pode revisar uma letra já praticada.</Text>
    {tracks.map((track) => track.kind === "phonics"
      ? [1, 2, 3].map((phase) => {
        const items = track.units.filter((unit) => unit.phase === phase);
        if (!items.length) return null;
        return <View key={`${track.id}-${phase}`}><Text style={styles.phaseTitle}>{items[0].phaseTitle}</Text><View style={styles.grid}>{items.map((unit) => tile(unit, `Lição ${unit.order}`, unit.letter ?? ""))}</View></View>;
      })
      : <View key={track.id}>
        <Text style={styles.phaseTitle}>{track.title}</Text>
        {track.description && <Text style={styles.intro}>{track.description}</Text>}
        <Text style={styles.gate}>As atividades abrem conforme as letras que você já domina.</Text>
        <View style={styles.grid}>{track.units.map((unit) => tile(unit, unit.title, unit.title))}</View>
      </View>)}
  </Screen>;
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: "800", color: colors.text },
  intro: { fontSize: 17, lineHeight: 25, color: colors.muted },
  gate: { fontSize: 15, lineHeight: 22, color: colors.muted, marginBottom: 8 },
  phaseTitle: { fontSize: 21, fontWeight: "800", color: colors.text, marginTop: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { width: "30%", minWidth: 88, minHeight: 100, borderRadius: 16, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 8 },
  wideTile: { width: "100%" },
  done: { backgroundColor: colors.success, borderColor: colors.success },
  locked: { opacity: 0.5 },
  letter: { fontSize: 38, fontWeight: "800", color: colors.primary },
  unitTitle: { fontSize: 22, fontWeight: "800", color: colors.primary, textAlign: "center" },
  state: { fontSize: 12, color: colors.muted },
  doneText: { color: "white" },
});
