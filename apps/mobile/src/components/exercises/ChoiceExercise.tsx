import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Exercise } from "../../domain/types";
import { colors } from "../../theme";
import { AudioButton } from "../AudioButton";

export type ExerciseRendererProps = {
  exercise: Exercise;
  /** Letra da unidade, quando a unidade é de letra. */
  letter?: string;
  selected?: string;
  disabled?: boolean;
  onChoose: (answer: string, correct: boolean) => void;
  /** Primeiro toque útil no exercício, para medir o tempo até a primeira interação. */
  onInteract?: () => void;
  /** Áudios dentro do renderer também contam na telemetria do item. */
  onAudioPlay?: () => void;
};

/** Grade de opções: letras, sílabas, palavras ou posições. Palavras longas ganham botões largos. */
export function ChoiceExercise({ exercise, selected, disabled = false, onChoose, onInteract, onAudioPlay }: ExerciseRendererProps) {
  const wide = (exercise.options ?? []).some((option) => option.length > 3);
  return <View>
    {(exercise.image || exercise.contextLabel) && <View style={styles.contextCard} accessibilityLabel={exercise.imageLabel ?? exercise.contextLabel ?? "Contexto da atividade"}>
      {exercise.image && <Text accessible={false} style={styles.image}>{exercise.image}</Text>}
      {exercise.contextLabel && <Text accessibilityLabel={exercise.maskedWord ? `Palavra com uma letra faltando: ${exercise.contextLabel.replace("_", "espaço")}` : undefined} style={exercise.maskedWord ? styles.maskedWord : styles.contextLabel}>{exercise.contextLabel}</Text>}
      {exercise.inlineAudio && <AudioButton label="Ouvir a palavra" text={exercise.ttsText} compact onPlay={() => { onInteract?.(); onAudioPlay?.(); }} />}
    </View>}
    {exercise.type === "find_in_word" && <Text style={styles.contextWord}>{exercise.contextWord}</Text>}
    {exercise.type === "compare_words" && <Text accessibilityLabel={`Comparar ${exercise.compareWords?.join(" e ")}`} style={styles.contextWord}>{exercise.compareWords?.join("  ↔  ")}</Text>}
    {exercise.type === "sentence_fill_word" && <Text style={styles.sentence}>{exercise.sentence}</Text>}
    <View style={styles.options}>{exercise.options?.map((option) => {
      const chosen = selected === option;
      return <Pressable key={option} disabled={disabled} accessibilityRole="button" accessibilityLabel={`Escolher ${option}`} accessibilityState={{ selected: chosen, disabled }} onPress={() => { onInteract?.(); onChoose(option, option === exercise.answer); }} style={[styles.option, wide && styles.wideOption, disabled && styles.disabled, chosen && (option === exercise.answer ? styles.correct : styles.selected)]}>
        <Text style={[styles.optionText, wide && styles.wideText]}>{option}</Text>
      </Pressable>;
    })}</View>
  </View>;
}

const styles = StyleSheet.create({
  options: { flexDirection: "row", flexWrap: "wrap", gap: 14, justifyContent: "center", marginVertical: 20 },
  option: { minWidth: 92, minHeight: 92, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 3, borderColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  wideOption: { minWidth: "100%", minHeight: 72 },
  optionText: { fontSize: 42, color: colors.primary, fontWeight: "800" },
  wideText: { fontSize: 30, letterSpacing: 1 },
  selected: { borderColor: colors.accent, backgroundColor: "#FFF8EA" },
  correct: { borderColor: colors.success, backgroundColor: "#DDF3E9" },
  contextWord: { alignSelf: "center", color: colors.primary, fontSize: 42, fontWeight: "900", letterSpacing: 4, marginVertical: 18 },
  sentence: { alignSelf: "center", color: colors.text, fontSize: 28, fontWeight: "800", letterSpacing: 1, marginVertical: 18, textAlign: "center" },
  contextCard: { alignItems: "center", gap: 6, padding: 12, marginTop: 12, borderRadius: 18, backgroundColor: colors.surface },
  image: { fontSize: 64 }, contextLabel: { color: colors.text, fontSize: 20, fontWeight: "700", textAlign: "center" }, disabled: { opacity: 0.65 },
  maskedWord: { color: colors.primary, fontSize: 42, fontWeight: "900", letterSpacing: 5, textAlign: "center" },
});
