import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Exercise } from "../../domain/types";
import { colors } from "../../theme";

export type ExerciseRendererProps = {
  exercise: Exercise;
  /** Letra da unidade, quando a unidade é de letra. */
  letter?: string;
  selected?: string;
  onChoose: (answer: string, correct: boolean) => void;
  /** Primeiro toque útil no exercício, para medir o tempo até a primeira interação. */
  onInteract?: () => void;
};

/** Grade de opções: letras, sílabas, palavras ou posições. Palavras longas ganham botões largos. */
export function ChoiceExercise({ exercise, selected, onChoose }: ExerciseRendererProps) {
  const wide = (exercise.options ?? []).some((option) => option.length > 3);
  return <View>
    {exercise.type === "find_in_word" && <Text style={styles.contextWord}>{exercise.contextWord}</Text>}
    {exercise.type === "sentence_fill_word" && <Text style={styles.sentence}>{exercise.sentence}</Text>}
    <View style={styles.options}>{exercise.options?.map((option) => {
      const chosen = selected === option;
      return <Pressable key={option} accessibilityRole="button" accessibilityLabel={`Escolher ${option}`} accessibilityState={{ selected: chosen }} onPress={() => onChoose(option, option === exercise.answer)} style={[styles.option, wide && styles.wideOption, chosen && (option === exercise.answer ? styles.correct : styles.selected)]}>
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
});
