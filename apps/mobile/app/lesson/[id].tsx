import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AudioButton } from "../../src/components/AudioButton";
import { Screen } from "../../src/components/Screen";
import { LETTERS } from "../../src/domain/catalog";
import { nextProgress, type Feedback } from "../../src/domain/learning";
import { saveAttempt, saveProgress } from "../../src/storage/database";
import { useStudyStore } from "../../src/store/study-store";
import { colors } from "../../src/theme";

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function Lesson() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = LETTERS.find((item) => item.id === id) ?? LETTERS[0];
  const [step, setStep] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>();
  const [selectedChoiceId, setSelectedChoiceId] = useState<string>();
  const startedAt = useRef(Date.now());
  const progress = useStudyStore((state) => state.progress[lesson.id]);
  const setProgress = useStudyStore((state) => state.setProgress);
  const exercise = lesson.exercises[step];

  const submit = async (answer: string, correct: boolean) => {
    const attempt = { clientAttemptId: makeId(), lessonId: lesson.id, exerciseId: exercise.id, exerciseType: exercise.type, answer, correct, durationMs: Date.now() - startedAt.current, createdAt: new Date().toISOString() };
    await saveAttempt(attempt);
    const updated = { ...nextProgress(progress, exercise.type, correct), lessonId: lesson.id };
    await saveProgress(updated);
    setProgress(updated);
  };

  const choose = (option: string) => {
    const correct = option === exercise.answer;
    const word = exercise.wordChoices?.find((item) => item.id === option);
    const successMessage = exercise.type === "complete_word" ? `A letra ${lesson.letter} completa a palavra ${word?.word ?? ""}.` : "Quando estiver pronto, siga para a próxima atividade.";
    setFeedback(correct ? { kind: "success", title: "Muito bem!", message: successMessage } : { kind: "try-again", title: "Quase lá", message: `Observe a imagem e ouça a palavra mais uma vez. Onde a letra ${lesson.letter} faz sentido?` });
    setSelectedChoiceId(option);
    void submit(option, correct);
  };

  const next = () => {
    if (step === lesson.exercises.length - 1) {
      router.replace("/progress");
      return;
    }
    setStep((value) => value + 1);
    setFeedback(undefined);
    setSelectedChoiceId(undefined);
    startedAt.current = Date.now();
  };

  const isLast = step === lesson.exercises.length - 1;
  const heading = useMemo(() => `${step + 1} de ${lesson.exercises.length} · Letra ${lesson.letter}`, [lesson.exercises.length, lesson.letter, step]);
  const wordChoices = exercise.wordChoices ?? [];

  return <Screen>
    <Text style={styles.kicker}>{heading}</Text>
    <Text style={styles.instruction}>{exercise.instruction}</Text>
    <AudioButton label={exercise.type === "complete_word" ? "Ouvir enunciado" : "Repetir instrução"} text={exercise.instruction} />
    {exercise.type === "complete_word" && <Text style={styles.helper}>Toque no quadrado ou na imagem da palavra que combina com a letra {lesson.letter}.</Text>}
    {exercise.type === "complete_word" ? <View style={styles.wordList}>{wordChoices.map((word) => {
      const selected = selectedChoiceId === word.id;
      return <Pressable key={word.id} accessibilityRole="button" accessibilityLabel={`Completar palavra ${word.imageLabel}`} onPress={() => choose(word.id)} style={[styles.wordCard, selected && (word.id === exercise.answer ? styles.correctCard : styles.selectedCard)]}>
        <Text accessibilityLabel={`Imagem de ${word.imageLabel}`} style={styles.image}>{word.image}</Text>
        <AudioButton label={`Ouvir ${word.audioText}`} text={word.audioText} compact />
        <View style={styles.wordRow}><Text style={styles.wordPart}>{word.before}</Text><View style={[styles.blank, selected && styles.filledBlank]}><Text style={styles.blankText}>{selected ? lesson.letter : "_"}</Text></View><Text style={styles.wordPart}>{word.after}</Text></View>
        {selected && <Text style={styles.completedWord}>{word.before}{lesson.letter}{word.after}</Text>}
      </Pressable>;
    })}</View> : <View style={styles.options}>{exercise.options?.map((option) => <Pressable key={option} accessibilityRole="button" accessibilityLabel={`Escolher letra ${option}`} onPress={() => choose(option)} style={styles.option}><Text style={styles.optionText}>{option}</Text></Pressable>)}</View>}
    {feedback && <View accessibilityRole="alert" style={[styles.feedback, feedback.kind === "success" ? styles.success : styles.care]}><Text style={styles.feedbackTitle}>{feedback.title}</Text><Text style={styles.feedbackText}>{feedback.message}</Text></View>}
    {feedback?.kind === "success" && <Pressable accessibilityRole="button" style={styles.next} onPress={next}><Text style={styles.nextText}>{isLast ? "Ver progresso" : "Próxima atividade"}</Text></Pressable>}
  </Screen>;
}

const styles = StyleSheet.create({
  kicker: { color: colors.accent, fontWeight: "800", fontSize: 15 },
  instruction: { color: colors.text, fontWeight: "800", fontSize: 29, lineHeight: 38 },
  helper: { color: colors.muted, fontSize: 18, lineHeight: 26 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 14, justifyContent: "center", marginVertical: 20 },
  option: { minWidth: 92, minHeight: 92, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 3, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
  optionText: { fontSize: 42, color: colors.primary, fontWeight: "800" },
  wordList: { gap: 14 },
  wordCard: { borderRadius: 20, padding: 10, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, alignItems: "center", gap: 4 },
  selectedCard: { borderColor: colors.accent, backgroundColor: "#FFF8EA" },
  correctCard: { borderColor: colors.success, backgroundColor: "#DDF3E9" },
  image: { fontSize: 46 },
  wordRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  wordPart: { color: colors.text, fontSize: 28, fontWeight: "800", letterSpacing: 1 },
  blank: { width: 52, height: 52, marginHorizontal: 4, borderWidth: 2, borderRadius: 10, borderColor: colors.primary, backgroundColor: "#F4F8FA", alignItems: "center", justifyContent: "center" },
  filledBlank: { borderColor: colors.success, backgroundColor: "#DDF3E9" },
  blankText: { color: colors.primary, fontSize: 30, fontWeight: "900" },
  completedWord: { color: colors.success, fontSize: 18, fontWeight: "800", letterSpacing: 1 },
  feedback: { borderRadius: 16, padding: 18 },
  success: { backgroundColor: "#DDF3E9" },
  care: { backgroundColor: "#FFF1D6" },
  feedbackTitle: { color: colors.text, fontSize: 20, fontWeight: "800" },
  feedbackText: { color: colors.text, fontSize: 17, lineHeight: 25, marginTop: 5 },
  next: { minHeight: 60, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  nextText: { color: "white", fontSize: 18, fontWeight: "800" },
});
