import { useQuery } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { isUnauthorized } from "../src/api/errors";
import { Screen } from "../src/components/Screen";
import { useContentStore } from "../src/content/store";
import { LEARNING_LEVELS, unitsForLevel } from "../src/domain/levels";
import { getProgress } from "../src/storage/database";
import { useSync } from "../src/sync/use-sync";
import { colors, fonts, radius, shadows } from "../src/theme";

export default function Progress() {
  const query = useQuery({ queryKey: ["progress"], queryFn: getProgress });
  const sync = useSync();
  const tracks = useContentStore((state) => state.tracks);
  const isDone = (unitId: string) => query.data?.some((item) => item.lessonId === unitId && item.completed) ?? false;
  const letters = tracks.filter((track) => track.kind === "phonics").flatMap((track) => track.units);
  const completed = letters.filter((unit) => isDone(unit.id)).length;
  return (
    <Screen>
      <Text style={styles.title}>Meu progresso no Prosa</Text>
      <View style={styles.card}>
        <Text style={styles.number}>{completed} de {letters.length}</Text>
        <Text style={styles.label}>letras dominadas</Text>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: letters.length, now: completed }} style={styles.track}>
          <View style={[styles.fill, { width: `${(completed / Math.max(letters.length, 1)) * 100}%` }]} />
        </View>
      </View>
      <View style={styles.phases}>
        {LEARNING_LEVELS.map((level) => {
          if (level.id === 1) {
            return (
              <View key={level.id} style={styles.phase}>
                <Text style={styles.phaseTitle}>{level.title}</Text>
                <Text style={styles.phaseLabel}>{completed} de {letters.length} letras concluídas</Text>
              </View>
            );
          }
          if (level.id === 5) {
            const reviewable = tracks.flatMap((track) => track.units).filter((unit) => isDone(unit.id)).length;
            return (
              <View key={level.id} style={styles.phase}>
                <Text style={styles.phaseTitle}>{level.title}</Text>
                <Text style={styles.phaseLabel}>{reviewable} unidades elegíveis para revisão espaçada</Text>
              </View>
            );
          }
          const units = unitsForLevel(tracks, level.id);
          if (!units.length) return null;
          return (
            <View key={level.id} style={styles.phase}>
              <Text style={styles.phaseTitle}>{level.title}</Text>
              <Text style={styles.phaseLabel}>{units.filter((unit) => isDone(unit.id)).length} de {units.length} etapas concluídas</Text>
            </View>
          );
        })}
      </View>
      <Pressable disabled={sync.isPending} onPress={() => sync.mutate()} style={styles.button}>
        <Text style={styles.buttonText}>{sync.isPending ? "Sincronizando..." : "Sincronizar agora"}</Text>
      </Pressable>
      {sync.isSuccess && <Text accessibilityRole="alert" style={styles.success}>{sync.data ? `${sync.data} item(ns) sincronizado(s).` : "Tudo está atualizado."}</Text>}
      {sync.isError && <Text accessibilityRole="alert" style={styles.warning}>{isUnauthorized(sync.error) ? "Sua sessão expirou. Entre novamente para sincronizar." : "Você continua no modo offline. Tentaremos novamente depois."}</Text>}
      <Text style={styles.note}>O progresso fica salvo neste aparelho e entra numa fila segura quando não há conexão.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, color: colors.text, fontFamily: fonts.bold },
  card: { backgroundColor: colors.surface, padding: 22, borderRadius: radius.md, ...shadows.card },
  number: { fontSize: 36, fontFamily: fonts.bold, color: colors.text },
  label: { fontSize: 17, fontFamily: fonts.regular, color: colors.muted },
  track: { height: 14, borderRadius: 7, backgroundColor: colors.track, overflow: "hidden", marginTop: 16 },
  fill: { height: "100%", backgroundColor: colors.action },
  phases: { gap: 12 },
  phase: { backgroundColor: colors.surface, padding: 16, borderRadius: radius.md, ...shadows.card },
  phaseTitle: { fontSize: 18, fontFamily: fonts.bold, color: colors.text },
  phaseLabel: { fontSize: 15, fontFamily: fonts.regular, color: colors.muted, marginTop: 4 },
  button: { minHeight: 56, borderRadius: radius.pill, backgroundColor: colors.action, alignItems: "center", justifyContent: "center", ...shadows.card },
  buttonText: { color: colors.onAction, fontSize: 18, fontFamily: fonts.semibold },
  success: { color: colors.success, fontSize: 16, fontFamily: fonts.semibold },
  warning: { color: colors.accent, fontSize: 16, fontFamily: fonts.semibold },
  note: { color: colors.muted, fontSize: 15, lineHeight: 22, fontFamily: fonts.regular },
});
