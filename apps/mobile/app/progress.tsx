import { useQuery } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../src/components/Screen";
import { useContentStore } from "../src/content/store";
import { getProgress } from "../src/storage/database";
import { useSync } from "../src/sync/use-sync";
import { colors } from "../src/theme";

export default function Progress() {
  const query = useQuery({ queryKey: ["progress"], queryFn: getProgress });
  const sync = useSync();
  const tracks = useContentStore((state) => state.tracks);
  const isDone = (unitId: string) => query.data?.some((item) => item.lessonId === unitId && item.completed) ?? false;
  const letters = tracks.filter((track) => track.kind === "phonics").flatMap((track) => track.units);
  const completed = letters.filter((unit) => isDone(unit.id)).length;
  return <Screen>
    <Text style={styles.title}>Meu progresso</Text>
    <View style={styles.card}>
      <Text style={styles.number}>{completed} de {letters.length}</Text>
      <Text style={styles.label}>letras dominadas</Text>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: letters.length, now: completed }} style={styles.track}><View style={[styles.fill, { width: `${(completed / Math.max(letters.length, 1)) * 100}%` }]} /></View>
    </View>
    <View style={styles.phases}>
      {[1, 2, 3].map((phase) => {
        const phaseLetters = letters.filter((unit) => unit.phase === phase);
        if (!phaseLetters.length) return null;
        return <View key={phase} style={styles.phase}><Text style={styles.phaseTitle}>{phaseLetters[0].phaseTitle}</Text><Text style={styles.phaseLabel}>{phaseLetters.filter((unit) => isDone(unit.id)).length} de {phaseLetters.length} concluídas</Text></View>;
      })}
      {tracks.filter((track) => track.kind === "theme").map((track) => <View key={track.id} style={styles.phase}><Text style={styles.phaseTitle}>{track.title}</Text><Text style={styles.phaseLabel}>{track.units.filter((unit) => isDone(unit.id)).length} de {track.units.length} etapas concluídas</Text></View>)}
    </View>
    <Pressable disabled={sync.isPending} onPress={() => sync.mutate()} style={styles.button}><Text style={styles.buttonText}>{sync.isPending ? "Sincronizando..." : "Sincronizar agora"}</Text></Pressable>
    {sync.isSuccess && <Text accessibilityRole="alert" style={styles.success}>{sync.data ? `${sync.data} item(ns) sincronizado(s).` : "Tudo está atualizado."}</Text>}
    {sync.isError && <Text accessibilityRole="alert" style={styles.warning}>Você continua no modo offline. Tentaremos novamente depois.</Text>}
    <Text style={styles.note}>O progresso fica salvo neste aparelho e entra numa fila segura quando não há conexão.</Text>
  </Screen>;
}

const styles = StyleSheet.create({ title: { fontSize: 30, color: colors.text, fontWeight: "800" }, card: { backgroundColor: colors.surface, padding: 22, borderRadius: 18 }, number: { fontSize: 36, fontWeight: "800", color: colors.primary }, label: { fontSize: 17, color: colors.muted }, track: { height: 14, borderRadius: 7, backgroundColor: colors.border, overflow: "hidden", marginTop: 16 }, fill: { height: "100%", backgroundColor: colors.success }, phases: { gap: 10 }, phase: { backgroundColor: colors.surface, padding: 16, borderRadius: 14 }, phaseTitle: { fontSize: 18, fontWeight: "800", color: colors.text }, phaseLabel: { fontSize: 15, color: colors.muted, marginTop: 4 }, button: { minHeight: 60, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }, buttonText: { color: "white", fontSize: 18, fontWeight: "800" }, success: { color: colors.success, fontSize: 16, fontWeight: "700" }, warning: { color: colors.accent, fontSize: 16, fontWeight: "700" }, note: { color: colors.muted, fontSize: 15, lineHeight: 22 } });
