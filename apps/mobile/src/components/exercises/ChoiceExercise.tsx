import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Exercise } from "../../domain/types";
import { colors, fonts, radius, shadows } from "../../theme";
import { AudioButton } from "../AudioButton";
import { CheckCircleIcon } from "../brand/Decor";
import { PrimaryButton } from "../ui/PrimaryButton";
import { ManagedIllustration } from "../../assets/ManagedIllustration";
import { ExerciseFigure, GapText } from "./GapText";

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
  const pictures = exercise.optionImages;
  const wide = !pictures && (exercise.options ?? []).some((option) => option.length > 3);
  const [pending, setPending] = useState<string>();
  const label = exercise.contextLabel;
  return <View testID={`exercise-${exercise.id}`}>
    {(exercise.imageAsset || exercise.image || label) && <View style={styles.contextCard}>
      {/* Figura e áudio lado a lado; a palavra lacunada embaixo, para o CONFIRMAR caber na tela sem rolar. */}
      <View style={styles.figureRow}>
        {exercise.imageAsset ? <ManagedIllustration assetId={exercise.imageAsset} sourceUri={exercise.imageUri} accessibilityLabel={exercise.imageLabel ?? "Ilustração contextual"} size={170} /> : <ExerciseFigure exercise={exercise} size={110} />}
        {exercise.inlineAudio && <AudioButton label="Ouvir a palavra" text={exercise.ttsText} compact onPlay={() => { onInteract?.(); onAudioPlay?.(); }} />}
      </View>
      {label && (label.includes("_") ? <GapText text={label} options={exercise.options} size={label.length > 16 ? 28 : 40} style={styles.fullRow} />
        : <Text style={label.length <= 16 ? styles.maskedWord : styles.contextLabel}>{label}</Text>)}
    </View>}
    {exercise.type === "find_in_word" && <Text style={styles.contextWord}>{exercise.contextWord}</Text>}
    {exercise.type === "compare_words" && <Text accessibilityLabel={`Comparar ${exercise.compareWords?.join(" e ")}`} style={styles.contextWord}>{exercise.compareWords?.join("  ↔  ")}</Text>}
    {exercise.type === "sentence_fill_word" && <Text style={styles.sentence}>{exercise.sentence}</Text>}
    <View style={styles.options}>{exercise.options?.map((option) => {
      const chosen = selected === option;
      const marked = !selected && pending === option;
      const picture = pictures?.[option];
      return <Pressable key={option} disabled={disabled} accessibilityRole="button" accessibilityLabel={picture ? `Escolher a figura de ${option.toLowerCase()}` : `Escolher ${option}`} accessibilityState={{ selected: chosen || marked, disabled }} onPress={() => { onInteract?.(); setPending(option); }} style={[styles.option, wide && styles.wideOption, picture && styles.pictureOption, disabled && !chosen && styles.disabled, marked && styles.correct, chosen && (option === exercise.answer ? styles.correct : styles.selected)]}>
        {picture ? (picture.imageAsset ? <ManagedIllustration assetId={picture.imageAsset} accessibilityLabel={option} size={120} /> : <Text accessible={false} style={styles.pictureText}>{picture.image}</Text>)
          : <Text style={[styles.optionText, wide && styles.wideText]}>{option}</Text>}
      </Pressable>;
    })}</View>
    {/* Modelos de pergunta do Figma: tocar só marca a opção; CONFIRMAR envia (fica apagado até haver escolha). */}
    {!selected && !disabled && <View style={styles.confirmRow}>
      <AudioButton label="Ouvir: confirmar" text="Confirmar" compact />
      <PrimaryButton style={styles.confirm} uppercase label="Confirmar" icon={<CheckCircleIcon size={26} />} disabled={!pending}
        onPress={() => { if (pending) onChoose(pending, pending === exercise.answer); }} />
    </View>}
  </View>;
}

// Figma (Quiz 1:381): sand cards with soft shadow; the chosen correct answer glows green. Sizes are scaled up from the
// 320px-wide frame (95×54 cards, 32px letters) to keep large touch targets.
const styles = StyleSheet.create({
  options: { flexDirection: "row", flexWrap: "wrap", gap: 16, justifyContent: "center", marginVertical: 16 },
  option: { minWidth: 124, minHeight: 76, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, ...shadows.card },
  wideOption: { minWidth: "100%", minHeight: 72 },
  optionText: { fontSize: 40, color: colors.text, fontFamily: fonts.semibold },
  wideText: { fontSize: 30, letterSpacing: 1 },
  selected: { backgroundColor: "#FFF1D6", borderWidth: 2, borderColor: colors.accent },
  correct: { backgroundColor: colors.selectedBg, ...shadows.selected },
  contextWord: { alignSelf: "center", color: colors.text, fontSize: 40, fontFamily: fonts.bold, letterSpacing: 3, marginVertical: 18, textAlign: "center" },
  sentence: { alignSelf: "center", color: colors.text, fontSize: 28, fontFamily: fonts.semibold, letterSpacing: 1, marginVertical: 18, textAlign: "center" },
  contextCard: { alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 12, marginTop: 4 },
  figureRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 },
  fullRow: { width: "100%" },
  pictureOption: { minWidth: 128, minHeight: 112, padding: 6 },
  pictureText: { fontSize: 64 }, contextLabel: { color: colors.text, fontSize: 22, fontFamily: fonts.semibold, textAlign: "center" }, disabled: { opacity: 0.65 },
  confirmRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  confirm: { flex: 1 },
  maskedWord: { color: colors.text, fontSize: 42, fontFamily: fonts.semibold, letterSpacing: 5, textAlign: "center" },
});
