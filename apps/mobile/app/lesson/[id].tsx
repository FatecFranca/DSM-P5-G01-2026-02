import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AudioButton } from "../../src/components/AudioButton";
import { rendererFor } from "../../src/components/exercises/registry";
import { Screen } from "../../src/components/Screen";
import { useContentStore } from "../../src/content/store";
import { canonicalLessonId } from "../../src/domain/content-ids";
import { deriveProgress, isLessonUnlocked, type Feedback } from "../../src/domain/learning";
import { applyResult } from "../../src/domain/scheduler";
import { SESSION_POLICY_VERSION, buildSession, reinsert, sessionSummary } from "../../src/domain/session";
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
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [outcome, setOutcome] = useState({ correct: 0, errors: 0, recoveredItemIds: [] as string[], audioPlays: 0 });
  const seen = useRef<Record<string, number>>({});
  const shownAt = useRef(Date.now());
  const firstInteractionAt = useRef<number | undefined>(undefined);
  const audioRepeats = useRef(0);
  const accessToken = useAuthStore((state) => state.accessToken);
  const answered = useRef(false);
  const submitting = useRef(false);
  const failedItems = useRef(new Set<string>());
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

  const choose = async (answer: string, correct: boolean) => {
    if (!exercise || submitting.current || feedback) return;
    submitting.current = true;
    setSaving(true);
    const word = exercise.wordChoices?.find((item) => item.id === answer);
    setSelected(answer);
    try {
      await submit(exercise, answer, correct);
      const recovered = correct && failedItems.current.has(exercise.id);
      if (!correct) failedItems.current.add(exercise.id);
      setOutcome((current) => ({ correct: current.correct + (correct ? 1 : 0), errors: current.errors + (correct ? 0 : 1), recoveredItemIds: recovered ? [...current.recoveredItemIds, exercise.id] : current.recoveredItemIds, audioPlays: current.audioPlays }));
      const successMessage = exercise.successFeedback ?? (exercise.type === "complete_word" ? `A letra ${unit.letter ?? ""} completa a palavra ${word?.word ?? ""}.` : exercise.itemKind === "letter" ? "Você relacionou a letra, o som e a palavra." : `Isso mesmo: ${exercise.ttsText}.`);
      const retryMessage = exercise.errorFeedback ?? (exercise.itemKind === "letter" ? `Ouça a palavra de novo e procure a letra ${unit.letter ?? ""}. Você verá este desafio outra vez.` : "Observe o contexto e ouça de novo. Você verá este desafio outra vez.");
      setFeedback(correct ? { kind: "success", title: "Muito bem!", message: successMessage } : { kind: "try-again", title: "Vamos aprender com esse erro", message: retryMessage });
    } catch {
      setSelected(undefined);
      setFeedback({ kind: "incorrect", title: "Não foi possível salvar", message: "Sua resposta não foi registrada. Tente novamente." });
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  // Acerto sai da fila; erro volta até três posições adiante. A sessão só termina com a fila vazia.
  const next = () => {
    if (!exercise) return;
    const remaining = feedback?.kind === "success" ? queue.slice(1) : reinsert(queue.slice(1), exercise);
    if (!remaining.length) { setCompleted(true); return; }
    setQueue(remaining);
    setPosition((value) => value + 1);
    setFeedback(undefined);
    setSelected(undefined);
  };

  const heading = `${position + 1} · ${queue.length} restante${queue.length === 1 ? "" : "s"} · ${unit.title}`;

  if (completed) {
    const summary = sessionSummary(outcome);
    return <Screen>
      <Text style={styles.celebration}>Lição concluída!</Text>
      <Text style={styles.summaryLead}>Você praticou {unit.title.toLowerCase()} e terminou todos os desafios.</Text>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}><Text style={styles.summaryValue}>{summary.correct}</Text><Text style={styles.summaryLabel}>acertos</Text></View>
        <View style={styles.summaryCard}><Text style={styles.summaryValue}>{summary.errors}</Text><Text style={styles.summaryLabel}>erros</Text></View>
        <View style={styles.summaryCard}><Text style={styles.summaryValue}>{summary.recovered}</Text><Text style={styles.summaryLabel}>erros recuperados</Text></View>
        <View style={styles.summaryCard}><Text style={styles.summaryValue}>{summary.audioPlays}</Text><Text style={styles.summaryLabel}>áudios ouvidos</Text></View>
      </View>
      <Text style={styles.encouragement}>{summary.errors === 0 ? "Excelente: você acertou sem precisar repetir." : summary.recovered === summary.recoveredItemIds.length && summary.recovered > 0 ? "Você voltou aos desafios e transformou erros em aprendizagem." : "Cada tentativa fortalece a leitura. Continue praticando."}</Text>
      <Pressable accessibilityRole="button" style={styles.next} onPress={() => router.replace("/lessons")}><Text style={styles.nextText}>Continuar aprendendo</Text></Pressable>
      <Pressable accessibilityRole="button" style={styles.continue} onPress={() => router.replace("/progress")}><Text style={styles.continueText}>Ver meu progresso</Text></Pressable>
    </Screen>;
  }

  if (!exercise) return <Screen><Text style={styles.instruction}>Sessão concluída.</Text></Screen>;
  const Renderer = rendererFor(exercise.type);
  const isLast = queue.length === 1 && feedback?.kind === "success";

  return <Screen>
    <View accessibilityLabel={`Progresso da sessão: ${position + 1} de pelo menos ${session.queue.length}`} style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, ((position + 1) / Math.max(1, position + queue.length)) * 100)}%` }]} /></View>
    <Text style={styles.kicker}>{heading}</Text>
    {exercise.skill && <Text style={styles.skill}>{exercise.skill}{exercise.difficulty ? ` · ${exercise.difficulty}` : ""}</Text>}
    <Text style={styles.instruction}>{exercise.instruction}</Text>
    <AudioButton label="Ouvir enunciado" text={exercise.instruction} onPlay={() => { audioRepeats.current += 1; setOutcome((current) => ({ ...current, audioPlays: current.audioPlays + 1 })); interact(); }} />
    {!exercise.inlineAudio && exercise.ttsText !== exercise.instruction && <AudioButton label={exercise.itemKind === "letter" ? "Ouvir pista" : "Ouvir conteúdo"} text={exercise.ttsText} onPlay={() => { audioRepeats.current += 1; setOutcome((current) => ({ ...current, audioPlays: current.audioPlays + 1 })); interact(); }} />}
    <Renderer key={`${exercise.id}-${position}`} exercise={exercise} letter={unit.letter} selected={selected} disabled={saving || Boolean(feedback)} onChoose={(answer, correct) => { void choose(answer, correct); }} onInteract={interact} onAudioPlay={() => { audioRepeats.current += 1; setOutcome((current) => ({ ...current, audioPlays: current.audioPlays + 1 })); }} />
    {saving && <Text accessibilityLiveRegion="polite" style={styles.saving}>Salvando resposta…</Text>}
    {feedback && <View accessibilityRole="alert" style={[styles.feedback, feedback.kind === "success" ? styles.success : styles.care]}><Text style={styles.feedbackTitle}>{feedback.title}</Text><Text style={styles.feedbackText}>{feedback.message}</Text></View>}
    {feedback && <Pressable accessibilityRole="button" style={feedback.kind === "success" ? styles.next : styles.continue} onPress={next}><Text style={feedback.kind === "success" ? styles.nextText : styles.continueText}>{isLast ? "Ver progresso" : feedback.kind === "success" ? "Próxima atividade" : "Continuar"}</Text></Pressable>}
  </Screen>;
}

const styles = StyleSheet.create({
  kicker: { color: colors.accent, fontWeight: "800", fontSize: 15 },
  skill: { color: colors.muted, fontWeight: "700", fontSize: 15 },
  progressTrack: { height: 12, borderRadius: 6, backgroundColor: colors.border, overflow: "hidden" }, progressFill: { height: "100%", borderRadius: 6, backgroundColor: colors.success },
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
  saving: { color: colors.muted, fontSize: 16, fontWeight: "700", textAlign: "center" },
  celebration: { color: colors.success, fontSize: 34, fontWeight: "900", textAlign: "center" }, summaryLead: { color: colors.text, fontSize: 20, lineHeight: 29, textAlign: "center" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, summaryCard: { width: "47%", padding: 16, borderRadius: 16, alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  summaryValue: { color: colors.primary, fontSize: 32, fontWeight: "900" }, summaryLabel: { color: colors.muted, fontSize: 15, fontWeight: "700", textAlign: "center" }, encouragement: { padding: 16, borderRadius: 14, backgroundColor: "#DDF3E9", color: colors.text, fontSize: 18, lineHeight: 26, textAlign: "center" },
});
