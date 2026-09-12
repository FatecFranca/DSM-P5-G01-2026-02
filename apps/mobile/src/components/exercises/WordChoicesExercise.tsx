import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme";
import { AudioButton } from "../AudioButton";
import type { ExerciseRendererProps } from "./ChoiceExercise";

/** Cartões de palavra com lacuna: a letra da unidade entra na lacuna de exatamente uma delas. */
export function WordChoicesExercise({ exercise, letter = "", selected, disabled = false, onChoose, onInteract, onAudioPlay }: ExerciseRendererProps) {
  return <View style={styles.list}>
    <Text style={styles.helper}>Toque na palavra que combina com a letra {letter}.</Text>
    {(exercise.wordChoices ?? []).map((word) => {
      const chosen = selected === word.id;
      return <Pressable key={word.id} disabled={disabled} accessibilityRole="button" accessibilityLabel={`Completar palavra ${word.imageLabel}`} accessibilityState={{ selected: chosen, disabled }} onPress={() => { onInteract?.(); onChoose(word.id, word.id === exercise.answer); }} style={[styles.card, disabled && styles.disabled, chosen && (word.id === exercise.answer ? styles.correct : styles.selected)]}>
        <Text accessibilityLabel={`Imagem de ${word.imageLabel}`} style={styles.image}>{word.image}</Text>
        <AudioButton label={`Ouvir ${word.audioText}`} text={word.audioText} compact onPlay={() => { onInteract?.(); onAudioPlay?.(); }} />
        <View style={styles.row}><Text style={styles.part}>{word.before}</Text><View style={[styles.blank, chosen && styles.filledBlank]}><Text style={styles.blankText}>{chosen ? letter : "_"}</Text></View><Text style={styles.part}>{word.after}</Text></View>
        {chosen && <Text style={styles.completed}>{word.before}{letter}{word.after}</Text>}
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  list: { gap: 14 },
  helper: { color: colors.muted, fontSize: 18, lineHeight: 26 },
  card: { borderRadius: 20, padding: 10, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, alignItems: "center", gap: 4 },
  selected: { borderColor: colors.accent, backgroundColor: "#FFF8EA" },
  correct: { borderColor: colors.success, backgroundColor: "#DDF3E9" },
  image: { fontSize: 46 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  part: { color: colors.text, fontSize: 28, fontWeight: "800", letterSpacing: 1 },
  blank: { width: 52, height: 52, marginHorizontal: 4, borderWidth: 2, borderRadius: 10, borderColor: colors.primary, backgroundColor: "#F4F8FA", alignItems: "center", justifyContent: "center" },
  filledBlank: { borderColor: colors.success, backgroundColor: "#DDF3E9" },
  blankText: { color: colors.primary, fontSize: 30, fontWeight: "900" },
  completed: { color: colors.success, fontSize: 18, fontWeight: "800", letterSpacing: 1 },
  disabled: { opacity: 0.65 },
});
