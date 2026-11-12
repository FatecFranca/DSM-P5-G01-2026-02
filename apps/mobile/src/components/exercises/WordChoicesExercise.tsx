import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, shadows } from "../../theme";
import { AudioButton } from "../AudioButton";
import type { ExerciseRendererProps } from "./ChoiceExercise";
import { ManagedIllustration } from "../../assets/ManagedIllustration";

/** Cartões de palavra com lacuna: a letra da unidade entra na lacuna de exatamente uma delas. */
export function WordChoicesExercise({ exercise, letter: unitLetter = "", selected, disabled = false, onChoose, onInteract, onAudioPlay }: ExerciseRendererProps) {
  const letter = exercise.targetLetter ?? unitLetter;
  return <View testID={`exercise-${exercise.id}`} style={styles.list}>
    <Text style={styles.helper}>Toque na palavra que combina com a letra {letter}.</Text>
    {(exercise.wordChoices ?? []).map((word) => {
      const chosen = selected === word.id;
      return <Pressable key={word.id} disabled={disabled} accessibilityRole="button" accessibilityLabel={`Completar palavra ${word.imageLabel}`} accessibilityState={{ selected: chosen, disabled }} onPress={() => { onInteract?.(); onChoose(word.id, word.id === exercise.answer); }} style={[styles.card, disabled && styles.disabled, chosen && (word.id === exercise.answer ? styles.correct : styles.selected)]}>
        {word.imageAsset ? <ManagedIllustration assetId={word.imageAsset} accessibilityLabel={`Imagem de ${word.imageLabel}`} size={84} /> : <Text accessibilityLabel={`Imagem de ${word.imageLabel}`} style={styles.image}>{word.image}</Text>}
        <View style={styles.row}><Text style={styles.part}>{word.before}</Text><View style={[styles.blank, chosen && styles.filledBlank]}><Text style={styles.blankText}>{chosen ? letter : "_"}</Text></View><Text style={styles.part}>{word.after}</Text></View>
        <AudioButton label={`Ouvir ${word.audioText}`} text={word.audioText} compact onPlay={() => { onInteract?.(); onAudioPlay?.(); }} />
        {chosen && <Text style={styles.completed}>{word.before}{letter}{word.after}</Text>}
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  helper: { color: colors.muted, fontSize: 18, lineHeight: 26, fontFamily: fonts.regular },
  // Cartão em linha (figura, palavra lacunada, áudio): três cabem na tela sem rolar.
  card: { borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.surface, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, ...shadows.card },
  selected: { borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.careBg },
  correct: { backgroundColor: colors.selectedBg, ...shadows.selected },
  image: { fontSize: 44, width: 60, textAlign: "center" },
  row: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  part: { color: colors.text, fontSize: 28, fontFamily: fonts.semibold, letterSpacing: 1 },
  blank: { width: 46, height: 50, marginHorizontal: 4, borderWidth: 2, borderRadius: radius.sm, borderStyle: "dashed", borderColor: colors.track, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  filledBlank: { borderStyle: "solid", borderColor: colors.successBright, backgroundColor: colors.selectedBg },
  blankText: { color: colors.text, fontSize: 30, fontFamily: fonts.bold },
  completed: { width: "100%", textAlign: "center", color: colors.success, fontSize: 18, fontFamily: fonts.bold, letterSpacing: 1 },
  disabled: { opacity: 0.65 },
});
