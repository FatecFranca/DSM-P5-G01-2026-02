import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AudioButton } from "../../src/components/AudioButton";
import { rendererFor } from "../../src/components/exercises/registry";
import { Screen } from "../../src/components/Screen";
import { useContentStore } from "../../src/content/store";
import { canonicalLessonId } from "../../src/domain/content-ids";
import { isLessonUnlocked, nextProgress, type Feedback } from "../../src/domain/learning";
import { saveAttempt, saveProgress } from "../../src/storage/database";
import { useStudyStore } from "../../src/store/study-store";
import { colors } from "../../src/theme";

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function Lesson() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const units = useContentStore((state) => state.units);
  const unit = units.find((item) => item.id === canonicalLessonId(String(id))) ?? units[0];
  const [step, setStep] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>();
  const [selected, setSelected] = useState<string>();
  const startedAt = useRef(Date.now());
  const progress = useStudyStore((state) => state.progress[unit.id]);
  const setProgress = useStudyStore((state) => state.setProgress);
  const exercise = unit.exercises[step];
  const allProgress = useStudyStore((state) => state.progress);

  useEffect(() => {
    if (!isLessonUnlocked(unit, allProgress)) router.replace("/lessons");
  }, [allProgress, unit]);

  const submit = async (answer: string, correct: boolean) => {
    const attempt = { clientAttemptId: makeId(), lessonId: unit.id, exerciseId: exercise.id, exerciseType: exercise.type, answer, correct, durationMs: Date.now() - startedAt.current, createdAt: new Date().toISOString() };
    await saveAttempt(attempt);
    const updated = { ...nextProgress(progress, exercise.type, correct, unit.exercises.map((item) => item.type)), lessonId: unit.id };
    await saveProgress(updated);
    setProgress(updated);
  };

  const choose = (answer: string, correct: boolean) => {
    const word = exercise.wordChoices?.find((item) => item.id === answer);
    const successMessage = exercise.type === "complete_word" ? `A letra ${unit.letter ?? ""} completa a palavra ${word?.word ?? ""}.` : exercise.itemKind === "letter" ? "Quando estiver pronto, siga para a próxima atividade." : `Isso mesmo: ${exercise.ttsText}.`;
    const retryMessage = exercise.itemKind === "letter" ? `Ouça de novo e observe onde a letra ${unit.letter ?? ""} faz sentido.` : "Ouça de novo com calma e tente outra vez.";
    setFeedback(correct ? { kind: "success", title: "Muito bem!", message: successMessage } : { kind: "try-again", title: "Quase lá", message: retryMessage });
    setSelected(answer);
    void submit(answer, correct);
  };

  const retry = () => { setFeedback(undefined); setSelected(undefined); };

  const next = () => {
    if (step === unit.exercises.length - 1) {
      router.replace("/progress");
      return;
    }
    setStep((value) => value + 1);
    setFeedback(undefined);
    setSelected(undefined);
    startedAt.current = Date.now();
  };

  const isLast = step === unit.exercises.length - 1;
  const heading = useMemo(() => `${step + 1} de ${unit.exercises.length} · ${unit.title}`, [unit.exercises.length, unit.title, step]);
  const Renderer = rendererFor(exercise.type);

  return <Screen>
    <Text style={styles.kicker}>{heading}</Text>
    <Text style={styles.instruction}>{exercise.instruction}</Text>
    <AudioButton label={exercise.itemKind === "letter" ? "Repetir instrução" : "Ouvir de novo"} text={exercise.ttsText} />
    <Renderer exercise={exercise} letter={unit.letter} selected={selected} onChoose={choose} />
    {feedback && <View accessibilityRole="alert" style={[styles.feedback, feedback.kind === "success" ? styles.success : styles.care]}><Text style={styles.feedbackTitle}>{feedback.title}</Text><Text style={styles.feedbackText}>{feedback.message}</Text></View>}
    {feedback?.kind === "success" && <Pressable accessibilityRole="button" style={styles.next} onPress={next}><Text style={styles.nextText}>{isLast ? "Ver progresso" : "Próxima atividade"}</Text></Pressable>}
    {feedback?.kind === "try-again" && exercise.tokens && <Pressable accessibilityRole="button" style={styles.retry} onPress={retry}><Text style={styles.retryText}>Tentar de novo</Text></Pressable>}
  </Screen>;
}

const styles = StyleSheet.create({
  kicker: { color: colors.accent, fontWeight: "800", fontSize: 15 },
  instruction: { color: colors.text, fontWeight: "800", fontSize: 29, lineHeight: 38 },
  feedback: { borderRadius: 16, padding: 18 },
  success: { backgroundColor: "#DDF3E9" },
  care: { backgroundColor: "#FFF1D6" },
  feedbackTitle: { color: colors.text, fontSize: 20, fontWeight: "800" },
  feedbackText: { color: colors.text, fontSize: 17, lineHeight: 25, marginTop: 5 },
  next: { minHeight: 60, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  nextText: { color: "white", fontSize: 18, fontWeight: "800" },
  retry: { minHeight: 60, borderRadius: 15, borderWidth: 2, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
  retryText: { color: colors.primary, fontSize: 18, fontWeight: "800" },
});
