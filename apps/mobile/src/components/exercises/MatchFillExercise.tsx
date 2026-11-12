import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ManagedIllustration } from "../../assets/ManagedIllustration";
import { gapAccessibilityLabel, gapParts } from "../../domain/gaps";
import { colors, fonts, radius, shadows } from "../../theme";
import { AudioButton } from "../AudioButton";
import { CheckCircleIcon } from "../brand/Decor";
import { PrimaryButton } from "../ui/PrimaryButton";
import type { ExerciseRendererProps } from "./ChoiceExercise";

/**
 * Ligar figura e peça que falta (modelos 1B e 2A): cada figura tem o nome com uma lacuna. A linha marcada recebe a
 * peça tocada e a marcação passa para a próxima vazia; tocar numa linha preenchida permite trocar a peça.
 */
export function MatchFillExercise({ exercise, selected, disabled = false, onChoose, onInteract, onAudioPlay }: ExerciseRendererProps) {
  const rows = exercise.matchRows ?? [];
  const options = exercise.options ?? [];
  const [filled, setFilled] = useState<(string | undefined)[]>(() => rows.map(() => undefined));
  const [active, setActive] = useState(0);
  useEffect(() => { if (selected === undefined) { setFilled(rows.map(() => undefined)); setActive(0); } }, [exercise.id, selected, rows.length]);
  const complete = rows.length > 0 && filled.every(Boolean);
  const answered = selected !== undefined;
  const place = (option: string) => {
    if (disabled || answered) return;
    onInteract?.();
    const next = filled.map((value, index) => index === active ? option : value);
    setFilled(next);
    const empty = next.findIndex((value, index) => index > active && !value);
    setActive(empty >= 0 ? empty : Math.max(0, next.findIndex((value) => !value)));
  };
  return <View testID={`exercise-${exercise.id}`} style={styles.container}>
    {rows.map((row, index) => {
      const value = filled[index];
      const marked = !answered && index === active;
      const verdict = answered ? (value === row.answer ? styles.right : styles.wrong) : undefined;
      return <Pressable key={`${row.word}-${index}`} disabled={disabled || answered} accessibilityRole="button" accessibilityState={{ selected: marked }}
        accessibilityLabel={`Figura ${index + 1}: ${gapAccessibilityLabel(row.masked)}${value ? `, preenchida com ${value}` : ""}`}
        onPress={() => { onInteract?.(); setActive(index); }} style={[styles.row, marked && styles.activeRow, verdict]}>
        <View style={styles.figure}>{row.imageAsset ? <ManagedIllustration assetId={row.imageAsset} accessibilityLabel={`Figura ${index + 1}`} size={78} />
          : <Text accessible={false} style={styles.emoji}>{row.image}</Text>}</View>
        <View style={styles.word}>
          {gapParts(row.masked, options).map((part, partIndex) => part.kind === "text"
            ? <Text key={partIndex} style={styles.wordText}>{part.text}</Text>
            : <View key={partIndex} style={[styles.gap, { minWidth: 30 * part.slots + 12 }, value && styles.gapFilled]}><Text style={styles.gapText}>{value ?? ""}</Text></View>)}
        </View>
        <AudioButton label={`Ouvir o nome da figura ${index + 1}`} text={row.word} compact onPlay={() => { onInteract?.(); onAudioPlay?.(); }} />
      </Pressable>;
    })}
    <View style={styles.options}>{options.map((option) => <Pressable key={option} disabled={disabled || answered} accessibilityRole="button" accessibilityLabel={`Escolher ${option}`}
      onPress={() => place(option)} style={[styles.option, (disabled || answered) && styles.disabled]}><Text style={styles.optionText}>{option}</Text></Pressable>)}</View>
    {!answered && !disabled && <View style={styles.confirmRow}>
      <AudioButton label="Ouvir: confirmar" text="Confirmar" compact />
      <PrimaryButton style={styles.confirm} uppercase label="Confirmar" icon={<CheckCircleIcon size={26} />} disabled={!complete}
        onPress={() => { const answer = filled.join(","); onChoose(answer, answer === exercise.answer); }} />
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 10, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 2, borderColor: "transparent", ...shadows.card },
  activeRow: { borderColor: colors.action },
  right: { backgroundColor: colors.selectedBg },
  wrong: { borderColor: colors.accent, backgroundColor: colors.careBg },
  figure: { width: 72, alignItems: "center" },
  emoji: { fontSize: 46 },
  word: { flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", columnGap: 6 },
  wordText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 28, letterSpacing: 2 },
  gap: { height: 46, borderRadius: radius.sm, borderWidth: 2, borderStyle: "dashed", borderColor: colors.track, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  gapFilled: { borderStyle: "solid", borderColor: colors.action },
  gapText: { color: colors.text, fontFamily: fonts.bold, fontSize: 26 },
  options: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 6 },
  option: { minWidth: 74, minHeight: 64, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, ...shadows.card },
  optionText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 32 },
  disabled: { opacity: 0.6 },
  confirmRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  confirm: { flex: 1 },
});
