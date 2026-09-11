import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AudioButton } from "../../src/components/AudioButton";
import { rendererFor } from "../../src/components/exercises/registry";
import { Screen } from "../../src/components/Screen";
import { useContentStore } from "../../src/content/store";
import { canonicalLessonId } from "../../src/domain/content-ids";
import { deriveProgress, isLessonUnlocked, type Feedback } from "../../src/domain/learning";
import { applyResult } from "../../src/domain/scheduler";
import { SESSION_POLICY_VERSION, buildSession, reinsert } from "../../src/domain/session";
import type { Exercise, Unit } from "../../src/domain/types";
import { rankNext } from "../../src/api/client";
import { saveAttempt, saveItemState } from "../../src/storage/database";
import { useAuthStore } from "../../src/store/auth-store";
import { useStudyStore } from "../../src/store/study-store";
import { colors } from "../../src/theme";

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const dayBucket = (now: Date) => now.toISOString().slice(0, 10);

/**
 * Resolve a unidade antes de montar a sessão. O conteúdo pode ainda não estar carregado (link direto, recarga de
 * bundle), e a sessão depende da unidade já existir: por isso ela vive em LessonSession, montado só quando há unidade.
 */
export default function Lesson() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const units = useContentStore((state) => state.units);
  const progress = useStudyStore((state) => state.progress);
  const unit = units.find((item) => item.id === canonicalLessonId(String(id)));

  useEffect(() => {
    if (!units.length) return;
    if (!unit || !isLessonUnlocked(unit, progress)) router.replace("/lessons");
  }, [progress, unit, units.length]);

  if (!unit) return <Screen><Text style={styles.instruction}>{units.length ? "Atividade não encontrada." : "Preparando atividade…"}</Text></Screen>;
  return <LessonSession unit={unit} />;
}

function LessonSession({ unit }: { unit: Unit }) {
  const allProgress = useStudyStore((state) => state.progress);
  const itemStates = useStudyStore((state) => state.itemStates);
  const setProgress = useStudyStore((state) => state.setProgress);
  const setItemState = useStudyStore((state) => state.setItemState);

  // A sessão é montada uma vez por abertura da unidade: vencidos e fracos primeiro, novos na ordem do currículo.
  const [session] = useState(() => { const now = new Date(); return { id: makeId(), startedAt: now, queue: buildSession({ exercises: unit.exercises, states: itemStates, now, seed: `${unit.id}:${dayBucket(now)}:${Object.keys(itemStates).length}` }) }; });
  const [queue, setQueue] = useState<Exercise[]>(session.queue);
  const [position, setPosition] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>();
  const [selected, setSelected] = useState<string>();
  const seen = useRef<Record<string, number>>({});
  const shownAt = useRef(Date.now());
  const firstInteractionAt = useRef<number | undefined>(undefined);
  const audioRepeats = useRef(0);
  const accessToken = useAuthStore((state) => state.accessToken);
  const answered = useRef(false);
  const served = useRef<{ by: "rules" | "model"; policy: string; model?: string }>({ by: "rules", policy: SESSION_POLICY_VERSION });
  const exercise = queue[0];

  // Ranking no servidor é opcional (docs/adr/0004): só reordena a fila local, e só antes da primeira resposta.
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    rankNext({ session_id: session.id, unit_id: unit.id, candidate_item_ids: session.queue.map((item) => item.id), session_size: session.queue.length }, accessToken)
      .then((ranking) => {
        if (cancelled || answered.current) return;
        const order = new Map(ranking.items.map((item) => [item.item_id, item.rank]));
        served.current = { by: ranking.source === "model" ? "model" : "rules", policy: ranking.policy_version, model: ranking.model_version ?? undefined };
        seen.current = {};
        setQueue([...session.queue].sort((a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER)));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [accessToken, session, unit.id]);

  useEffect(() => {
    shownAt.current = Date.now(); firstInteractionAt.current = undefined; audioRepeats.current = 0;
    if (exercise) seen.current[exercise.id] = (seen.current[exercise.id] ?? 0) + 1;
  }, [exercise?.id, position]);

  const interact = () => { firstInteractionAt.current ??= Date.now(); };

  const submit = async (current: Exercise, answer: string, correct: boolean) => {
    const now = new Date();
    interact();
    answered.current = true;
    const attempt = {
      clientAttemptId: makeId(), lessonId: unit.id, exerciseId: current.id, exerciseType: current.type, answer, correct,
      durationMs: now.getTime() - shownAt.current, createdAt: now.toISOString(),
      sessionId: session.id, positionInSession: position + 1, attemptIndexInItem: seen.current[current.id] ?? 1, audioRepeats: audioRepeats.current,
      timeToFirstInteractionMs: (firstInteractionAt.current ?? now.getTime()) - shownAt.current,
      servedBy: served.current.by, servedPolicyVersion: served.current.policy, servedModelVersion: served.current.model,
    };
    await saveAttempt(attempt);
    const state = applyResult(itemStates[current.id], { itemId: current.id, unitId: unit.id, correct, now });
    const states = { ...itemStates, [current.id]: state };
    const previous = allProgress[unit.id];
    const derived = deriveProgress(unit, states, now, previous);
    // Fechar uma sessão em unidade já concluída conta como revisão.
    const closing = queue.length === 1 && correct;
    const progress = closing && previous?.completed ? { ...derived, reviewCount: (previous.reviewCount ?? 0) + 1 } : derived;
    await saveItemState(state, progress);
    setItemState(state);
    setProgress(progress);
  };

  const choose = (answer: string, correct: boolean) => {
    if (!exercise) return;
    const word = exercise.wordChoices?.find((item) => item.id === answer);
    const successMessage = exercise.type === "complete_word" ? `A letra ${unit.letter ?? ""} completa a palavra ${word?.word ?? ""}.` : exercise.itemKind === "letter" ? "Quando estiver pronto, siga para a próxima atividade." : `Isso mesmo: ${exercise.ttsText}.`;
    const retryMessage = exercise.itemKind === "letter" ? `Ouça de novo e observe onde a letra ${unit.letter ?? ""} faz sentido. Esta atividade vai voltar daqui a pouco.` : "Ouça de novo com calma. Esta atividade vai voltar daqui a pouco.";
    setFeedback(correct ? { kind: "success", title: "Muito bem!", message: successMessage } : { kind: "try-again", title: "Quase lá", message: retryMessage });
    setSelected(answer);
    void submit(exercise, answer, correct);
  };

  // Acerto sai da fila; erro volta até três posições adiante. A sessão só termina com a fila vazia.
  const next = () => {
    if (!exercise) return;
    const remaining = feedback?.kind === "success" ? queue.slice(1) : reinsert(queue.slice(1), exercise);
    if (!remaining.length) { router.replace("/progress"); return; }
    setQueue(remaining);
    setPosition((value) => value + 1);
    setFeedback(undefined);
    setSelected(undefined);
  };

  const heading = useMemo(() => `${Math.min(position + 1, session.queue.length + position)} · ${queue.length} restante${queue.length === 1 ? "" : "s"} · ${unit.title}`, [position, queue.length, session.queue.length, unit.title]);
  if (!exercise) return <Screen><Text style={styles.instruction}>Sessão concluída.</Text></Screen>;
  const Renderer = rendererFor(exercise.type);
  const isLast = queue.length === 1 && feedback?.kind === "success";

  return <Screen>
    <Text style={styles.kicker}>{heading}</Text>
    <Text style={styles.instruction}>{exercise.instruction}</Text>
    <AudioButton label={exercise.itemKind === "letter" ? "Repetir instrução" : "Ouvir de novo"} text={exercise.ttsText} onPlay={() => { audioRepeats.current += 1; interact(); }} />
    <Renderer key={`${exercise.id}-${position}`} exercise={exercise} letter={unit.letter} selected={selected} onChoose={choose} onInteract={interact} />
    {feedback && <View accessibilityRole="alert" style={[styles.feedback, feedback.kind === "success" ? styles.success : styles.care]}><Text style={styles.feedbackTitle}>{feedback.title}</Text><Text style={styles.feedbackText}>{feedback.message}</Text></View>}
    {feedback && <Pressable accessibilityRole="button" style={feedback.kind === "success" ? styles.next : styles.continue} onPress={next}><Text style={feedback.kind === "success" ? styles.nextText : styles.continueText}>{isLast ? "Ver progresso" : feedback.kind === "success" ? "Próxima atividade" : "Continuar"}</Text></Pressable>}
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
  continue: { minHeight: 60, borderRadius: 15, borderWidth: 2, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
  continueText: { color: colors.primary, fontSize: 18, fontWeight: "800" },
});
