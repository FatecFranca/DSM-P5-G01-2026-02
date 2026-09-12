import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme";
import { selectedPositionsAnswer } from "../../domain/session";
import type { ExerciseRendererProps } from "./ChoiceExercise";

/** Caça à letra: cada caractere é um alvo grande e a confirmação evita acerto parcial acidental. */
export function MultiSelectExercise({ exercise, selected, disabled, onChoose, onInteract }: ExerciseRendererProps) {
  const word = exercise.contextWord ?? "";
  const expected = exercise.targetPositions ?? [...word].flatMap((character, index) => character === exercise.answer ? [index] : []);
  const [positions, setPositions] = useState<number[]>([]);
  useEffect(() => { if (selected === undefined) setPositions([]); }, [exercise.id, selected]);
  const toggle = (index: number) => {
    if (disabled) return;
    onInteract?.();
    setPositions((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index]);
  };
  const submit = () => {
    const answer = selectedPositionsAnswer(positions);
    onChoose(answer, answer === selectedPositionsAnswer(expected));
  };
  return <View style={styles.container}>
    <View style={styles.word} accessibilityLabel={`Palavra ${word}`}>
      {[...word].map((character, index) => <Pressable key={`${character}-${index}`} disabled={disabled || character === " "} accessibilityRole="checkbox" accessibilityLabel={`Letra ${character}, posição ${index + 1}`} accessibilityState={{ checked: positions.includes(index), disabled }} onPress={() => toggle(index)} style={[styles.letter, positions.includes(index) && styles.marked]}><Text style={[styles.letterText, positions.includes(index) && styles.markedText]}>{character}</Text></Pressable>)}
    </View>
    <Text style={styles.helper}>{positions.length ? `${positions.length} marcada${positions.length === 1 ? "" : "s"}` : "Toque em todas as letras pedidas."}</Text>
    <Pressable disabled={disabled || positions.length === 0} accessibilityRole="button" accessibilityState={{ disabled: disabled || positions.length === 0 }} onPress={submit} style={[styles.confirm, (disabled || positions.length === 0) && styles.disabled]}><Text style={styles.confirmText}>Confirmar</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 16, marginVertical: 16 }, word: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 },
  letter: { minWidth: 50, minHeight: 64, paddingHorizontal: 8, borderRadius: 12, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  marked: { borderColor: colors.primary, backgroundColor: "#DDECF5" }, letterText: { color: colors.text, fontSize: 34, fontWeight: "900" }, markedText: { color: colors.primary },
  helper: { color: colors.muted, fontSize: 17, textAlign: "center" }, confirm: { minHeight: 56, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }, disabled: { opacity: 0.4 }, confirmText: { color: "white", fontSize: 18, fontWeight: "800" },
});
