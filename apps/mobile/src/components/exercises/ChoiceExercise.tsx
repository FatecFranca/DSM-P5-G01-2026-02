import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Exercise } from "../../domain/types";
import { colors, fonts, radius, shadows } from "../../theme";
import { AudioButton } from "../AudioButton";
import { PictureCircle } from "../brand/Decor";
import { ManagedIllustration } from "../../assets/ManagedIllustration";

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
    {(exercise.imageAsset || exercise.image || exercise.contextLabel) && <View style={styles.contextCard}>
      {exercise.imageAsset && <ManagedIllustration assetId={exercise.imageAsset} sourceUri={exercise.imageUri} accessibilityLabel={exercise.imageLabel ?? "Ilustração contextual"} />}
      {exercise.image && <View style={styles.picture}><PictureCircle size={124} /><Text accessible={false} style={styles.image}>{exercise.image}</Text></View>}
      {exercise.contextLabel && <Text accessibilityLabel={exercise.maskedWord ? `Palavra com uma letra faltando: ${exercise.contextLabel.replace("_", "espaço")}` : undefined} style={exercise.maskedWord ? styles.maskedWord : styles.contextLabel}>{exercise.contextLabel}</Text>}
      {exercise.inlineAudio && <AudioButton label="Ouvir a palavra" text={exercise.ttsText} compact onPlay={() => { onInteract?.(); onAudioPlay?.(); }} />}
    </View>}
    {exercise.type === "find_in_word" && <Text style={styles.contextWord}>{exercise.contextWord}</Text>}
    {exercise.type === "compare_words" && <Text accessibilityLabel={`Comparar ${exercise.compareWords?.join(" e ")}`} style={styles.contextWord}>{exercise.compareWords?.join("  ↔  ")}</Text>}
    {exercise.type === "sentence_fill_word" && <Text style={styles.sentence}>{exercise.sentence}</Text>}
    <View style={styles.options}>{exercise.options?.map((option) => {
      const chosen = selected === option;
      return <Pressable key={option} disabled={disabled} accessibilityRole="button" accessibilityLabel={`Escolher ${option}`} accessibilityState={{ selected: chosen, disabled }} onPress={() => { onInteract?.(); onChoose(option, option === exercise.answer); }} style={[styles.option, wide && styles.wideOption, disabled && !chosen && styles.disabled, chosen && (option === exercise.answer ? styles.correct : styles.selected)]}>
        <Text style={[styles.optionText, wide && styles.wideText]}>{option}</Text>
      </Pressable>;
    })}</View>
  </View>;
}

// Figma (Quiz 1:381): sand cards with soft shadow; the chosen correct answer glows green. Sizes are scaled up from the
// 320px-wide frame (95×54 cards, 32px letters) to keep large touch targets.
const styles = StyleSheet.create({
  options: { flexDirection: "row", flexWrap: "wrap", gap: 18, justifyContent: "center", marginVertical: 20 },
  option: { minWidth: 124, minHeight: 76, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, ...shadows.card },
  wideOption: { minWidth: "100%", minHeight: 72 },
  optionText: { fontSize: 40, color: colors.text, fontFamily: fonts.semibold },
  wideText: { fontSize: 30, letterSpacing: 1 },
  selected: { backgroundColor: "#FFF1D6", borderWidth: 2, borderColor: colors.accent },
  correct: { backgroundColor: colors.selectedBg, ...shadows.selected },
  contextWord: { alignSelf: "center", color: colors.text, fontSize: 40, fontFamily: fonts.bold, letterSpacing: 3, marginVertical: 18, textAlign: "center" },
  sentence: { alignSelf: "center", color: colors.text, fontSize: 28, fontFamily: fonts.semibold, letterSpacing: 1, marginVertical: 18, textAlign: "center" },
  contextCard: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 14, padding: 12, marginTop: 12 },
  picture: { width: 124, height: 124, alignItems: "center", justifyContent: "center" },
  image: { fontSize: 68 }, contextLabel: { color: colors.text, fontSize: 22, fontFamily: fonts.semibold, textAlign: "center" }, disabled: { opacity: 0.65 },
  maskedWord: { color: colors.text, fontSize: 42, fontFamily: fonts.semibold, letterSpacing: 5, textAlign: "center" },
});
