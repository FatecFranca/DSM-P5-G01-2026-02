import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme";
import type { ExerciseRendererProps } from "./ChoiceExercise";
import { ManagedIllustration } from "../../assets/ManagedIllustration";
import { joinTokens } from "./order";

export { joinTokens } from "./order";

/** Montagem por toque com confirmação explícita: permite corrigir a sequência antes de avaliá-la. */
export function OrderExercise({ exercise, selected, disabled = false, onChoose, onInteract }: ExerciseRendererProps) {
  const tokens = exercise.tokens ?? [];
  const [picked, setPicked] = useState<number[]>([]);
  useEffect(() => { if (selected === undefined) setPicked([]); }, [selected, exercise.id]);
  const assembled = joinTokens(exercise.type, picked.map((index) => tokens[index]));
  const pick = (index: number) => {
    onInteract?.();
    const next = [...picked, index];
    setPicked(next);
  };
  const done = picked.length === tokens.length && tokens.length > 0;
  return <View style={styles.container}>
    {exercise.imageAsset && <View style={styles.context}><ManagedIllustration assetId={exercise.imageAsset} sourceUri={exercise.imageUri} accessibilityLabel={exercise.imageLabel ?? "Ilustração contextual"} /></View>}
    <View accessibilityLiveRegion="polite" style={[styles.assembly, done && (assembled === exercise.answer ? styles.correct : styles.wrong)]}>
      <Text style={styles.assembled}>{assembled || "…"}</Text>
    </View>
    <View style={styles.tokens}>{tokens.map((token, index) => {
      const used = picked.includes(index);
      return <Pressable key={`${token}-${index}`} disabled={disabled || used || done} accessibilityRole="button" accessibilityLabel={`Peça ${token}`} accessibilityState={{ disabled: disabled || used || done }} onPress={() => pick(index)} style={[styles.token, used && styles.usedToken]}>
        <Text style={[styles.tokenText, used && styles.usedText]}>{token}</Text>
      </Pressable>;
    })}</View>
    {done && <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel="Confirmar resposta montada" onPress={() => { onInteract?.(); onChoose(assembled, assembled === exercise.answer); }} style={styles.confirm}><Text style={styles.confirmText}>Confirmar resposta</Text></Pressable>}
    {picked.length > 0 && <View style={styles.actions}><Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel="Desfazer última peça" onPress={() => setPicked((current) => current.slice(0, -1))} style={styles.reset}><Text style={styles.resetText}>Desfazer</Text></Pressable><Pressable disabled={disabled} accessibilityRole="button" onPress={() => setPicked([])} style={styles.reset}><Text style={styles.resetText}>Limpar</Text></Pressable></View>}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 16, marginVertical: 12 },
  context: { alignItems: "center" },
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
  actions: { flexDirection: "row", justifyContent: "center", gap: 18 },
  confirm: { minHeight: 56, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  confirmText: { color: "white", fontSize: 18, fontWeight: "800" },
});
