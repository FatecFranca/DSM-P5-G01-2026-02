import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme";
import type { ExerciseRendererProps } from "./ChoiceExercise";

/** Separador entre as peças na resposta: sílabas formam "CA-SA", palavras formam "A SALA É GRANDE". */
export const joinTokens = (type: string, picked: string[]) => picked.join(type === "word_from_syllables" ? "-" : " ");

/** Montagem por toque: o aprendiz toca as peças na ordem; ao usar todas, a resposta é avaliada. */
export function OrderExercise({ exercise, selected, onChoose }: ExerciseRendererProps) {
  const tokens = exercise.tokens ?? [];
  const [picked, setPicked] = useState<number[]>([]);
  useEffect(() => { if (selected === undefined) setPicked([]); }, [selected, exercise.id]);
  const assembled = joinTokens(exercise.type, picked.map((index) => tokens[index]));
  const pick = (index: number) => {
    const next = [...picked, index];
    setPicked(next);
    if (next.length === tokens.length) { const answer = joinTokens(exercise.type, next.map((position) => tokens[position])); onChoose(answer, answer === exercise.answer); }
  };
  const done = picked.length === tokens.length && tokens.length > 0;
  return <View style={styles.container}>
    <View accessibilityLiveRegion="polite" style={[styles.assembly, done && (assembled === exercise.answer ? styles.correct : styles.wrong)]}>
      <Text style={styles.assembled}>{assembled || "…"}</Text>
    </View>
    <View style={styles.tokens}>{tokens.map((token, index) => {
      const used = picked.includes(index);
      return <Pressable key={`${token}-${index}`} disabled={used || done} accessibilityRole="button" accessibilityLabel={`Peça ${token}`} accessibilityState={{ disabled: used || done }} onPress={() => pick(index)} style={[styles.token, used && styles.usedToken]}>
        <Text style={[styles.tokenText, used && styles.usedText]}>{token}</Text>
      </Pressable>;
    })}</View>
    {picked.length > 0 && <Pressable accessibilityRole="button" onPress={() => { setPicked([]); }} style={styles.reset}><Text style={styles.resetText}>Apagar e tentar de novo</Text></Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 16, marginVertical: 12 },
  assembly: { minHeight: 72, borderRadius: 16, borderWidth: 2, borderStyle: "dashed", borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  correct: { borderStyle: "solid", borderColor: colors.success, backgroundColor: "#DDF3E9" },
  wrong: { borderStyle: "solid", borderColor: colors.accent, backgroundColor: "#FFF8EA" },
  assembled: { color: colors.text, fontSize: 28, fontWeight: "800", letterSpacing: 1, textAlign: "center" },
  tokens: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  token: { minWidth: 84, minHeight: 72, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 3, borderColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  usedToken: { opacity: 0.35 },
  tokenText: { fontSize: 30, color: colors.primary, fontWeight: "800", letterSpacing: 1 },
  usedText: { color: colors.muted },
  reset: { alignSelf: "center", minHeight: 48, justifyContent: "center", paddingHorizontal: 16 },
  resetText: { color: colors.primary, fontSize: 17, fontWeight: "700" },
});
