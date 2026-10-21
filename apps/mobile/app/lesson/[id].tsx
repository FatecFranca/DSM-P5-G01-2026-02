import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Speech from "expo-speech";
import { AudioButton } from "../../src/components/AudioButton";
import { CheckCircleIcon } from "../../src/components/brand/Decor";
import { PointsBadge } from "../../src/components/ui/PointsBadge";
import { sessionPoints } from "../../src/domain/points";
import { AchievementUnlockedCard } from "../../src/components/ui/AchievementUnlockedCard";
import { CelebrationCard } from "../../src/components/ui/CelebrationCard";
import type { AchievementStatus } from "../../src/domain/achievements";
import { markCelebrated, syncAchievements } from "../../src/profile/achievements";
import { PrimaryButton } from "../../src/components/ui/PrimaryButton";
import { QuizLayout } from "../../src/components/ui/QuizLayout";
import { rendererFor } from "../../src/components/exercises/registry";
import { Screen } from "../../src/components/Screen";
import { useContentStore } from "../../src/content/store";
import { canonicalLessonId } from "../../src/domain/content-ids";
import { sessionIncentiveMessage, successIncentiveTitle } from "../../src/domain/incentives";
import { deriveProgress, isLessonOpen, type Feedback } from "../../src/domain/learning";
import { applyResult } from "../../src/domain/scheduler";
import { SESSION_POLICY_VERSION, buildSession, reinsert, sessionSummary } from "../../src/domain/session";
import type { Exercise, Unit } from "../../src/domain/types";
import { rankNext } from "../../src/api/client";
import { saveAttempt, saveItemState } from "../../src/storage/database";
import { useAuthStore } from "../../src/store/auth-store";
import { useStudyStore } from "../../src/store/study-store";
import { syncNow } from "../../src/sync/use-sync";
import { colors, fonts, radius } from "../../src/theme";

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const dayBucket = (now: Date) => now.toISOString().slice(0, 10);
/** Volta para a tela de onde a lição foi aberta (a etapa da trilha); sem histórico, para a árvore da trilha. */
const leaveLesson = () => (router.canGoBack() ? router.back() : router.replace("/lessons"));

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
    if (!unit || !isLessonOpen(unit, progress)) leaveLesson();
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
  const [resetVersion, setResetVersion] = useState(0);
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
      setFeedback(correct ? { kind: "success", title: successIncentiveTitle(exercise.id), message: successMessage } : { kind: "try-again", title: "Vamos aprender com esse erro", message: retryMessage });
    } catch {
      setSelected(undefined);
      setFeedback({ kind: "incorrect", title: "Não foi possível salvar", message: "Sua resposta não foi registrada. Tente novamente." });
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  // O erro é acolhido com a repetição automática do conteúdo, sem exigir outro toque.
  useEffect(() => {
    if (feedback?.kind !== "try-again" || !exercise) return;
    audioRepeats.current += 1;
    setOutcome((current) => ({ ...current, audioPlays: current.audioPlays + 1 }));
    void Speech.stop().then(() => Speech.speak(exercise.ttsText, { language: "pt-BR", rate: 0.85, pitch: 1 }));
  }, [exercise, feedback?.kind]);

  // Ao concluir, avalia as conquistas só com dados locais (sem esperar a rede) para mostrar o pop-up "Parabéns" depois do "Muito bem".
  const [unlocks, setUnlocks] = useState<AchievementStatus[]>([]);
  const [unlockIndex, setUnlockIndex] = useState<number | null>(null);
  useEffect(() => {
    if (!completed) return;
    let cancelled = false;
    // Manda as tentativas da lição ao servidor já agora: o ranking só conta o que foi sincronizado. Sem rede, fica na fila.
    void syncNow().catch(() => undefined);
    syncAchievements({ withRanking: false })
      .then((result) => { if (!cancelled) setUnlocks(result.board.filter((item) => result.fresh.includes(item.id))); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [completed]);

  const retryNow = () => {
    setFeedback(undefined);
    setSelected(undefined);
    setResetVersion((value) => value + 1);
    shownAt.current = Date.now();
    firstInteractionAt.current = undefined;
    audioRepeats.current = 0;
    submitting.current = false;
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

  const leave = leaveLesson;
  if (completed && unlockIndex !== null && unlocks[unlockIndex]) {
    const current = unlocks[unlockIndex];
    const advance = () => { void markCelebrated([current.id]); if (unlockIndex + 1 < unlocks.length) setUnlockIndex(unlockIndex + 1); else leave(); };
    return <AchievementUnlockedCard key={current.id} achievement={current} onContinue={advance} position={{ index: unlockIndex, total: unlocks.length }} />;
  }

  if (completed) {
    const summary = sessionSummary(outcome);
    const encouragement = sessionIncentiveMessage(unit.id, summary.errors === 0, summary.recovered > 0);
    const points = sessionPoints(summary);
    const lead = "Você completou os exercícios e ganhou:";
    // Pop-up 1:690 do Figma: pontuação numa pata, sem lista de acertos e erros.
    return <CelebrationCard title="Muito bem!" message={lead} audioText={`Muito bem! ${lead} ${points} pontos! ${encouragement}`}
      primary={{ label: "Continuar", onPress: () => (unlocks.length ? setUnlockIndex(0) : leave()) }}>
      <PointsBadge points={points} />
    </CelebrationCard>;
  }

  if (!exercise) return <Screen><Text style={styles.instruction}>Sessão concluída.</Text></Screen>;
  const Renderer = rendererFor(exercise.type);
  const isLast = queue.length === 1 && feedback?.kind === "success";

  const countAudio = () => { audioRepeats.current += 1; setOutcome((current) => ({ ...current, audioPlays: current.audioPlays + 1 })); interact(); };

  return <QuizLayout prompt={exercise.instruction} onPromptAudio={countAudio} onClose={leaveLesson}
    progress={{ current: position + 1, total: Math.max(1, position + queue.length), accessibilityLabel: `Progresso da sessão: ${position + 1} de pelo menos ${session.queue.length}` }}>
        {!exercise.inlineAudio && exercise.ttsText !== exercise.instruction && <View style={styles.hintRow}><AudioButton label={exercise.itemKind === "letter" ? "Ouvir pista" : "Ouvir conteúdo"} text={exercise.ttsText} compact onPlay={countAudio} /><Text style={styles.hintText}>{exercise.itemKind === "letter" ? "Ouvir pista" : "Ouvir conteúdo"}</Text></View>}
        <Renderer key={`${exercise.id}-${position}-${resetVersion}`} exercise={exercise} letter={unit.letter} selected={selected} disabled={saving || Boolean(feedback)} onChoose={(answer, correct) => { void choose(answer, correct); }} onInteract={interact} onAudioPlay={() => { audioRepeats.current += 1; setOutcome((current) => ({ ...current, audioPlays: current.audioPlays + 1 })); }} />
        {saving && <Text accessibilityLiveRegion="polite" style={styles.saving}>Salvando resposta…</Text>}
        {feedback && <View accessibilityRole="alert" style={[styles.feedback, feedback.kind === "success" ? styles.success : styles.care]}><Text style={styles.feedbackTitle}>{feedback.title}</Text><Text style={styles.feedbackText}>{feedback.message}</Text></View>}
        {feedback?.kind === "try-again" && <PrimaryButton label="Tentar novamente agora" variant="outline" onPress={retryNow} />}
        {feedback && feedback.kind !== "try-again" && <PrimaryButton label={isLast ? "Ver progresso" : feedback.kind === "success" ? "Próxima atividade" : "Tentar novamente"} variant={feedback.kind === "success" ? "solid" : "outline"} icon={feedback.kind === "success" ? <CheckCircleIcon size={26} /> : undefined} onPress={next} />}
        {!feedback && !saving && <Pressable accessibilityRole="button" accessibilityLabel="Reiniciar esta atividade" style={styles.restart} onPress={retryNow}><Text style={styles.restartText}>Reiniciar atividade</Text></Pressable>}
  </QuizLayout>;
}

const styles = StyleSheet.create({
  kicker: { color: colors.muted, fontFamily: fonts.medium, fontSize: 14, textAlign: "center", marginTop: 8 },
  skill: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, textAlign: "center" },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 12, alignSelf: "center" },
  hintText: { color: colors.text, fontFamily: fonts.medium, fontSize: 18 },
  instruction: { color: colors.text, fontFamily: fonts.bold, fontSize: 29, lineHeight: 38 },
  feedback: { borderRadius: radius.md, padding: 18 },
  success: { backgroundColor: colors.selectedBg },
  care: { backgroundColor: "#FFF1D6" },
  feedbackTitle: { color: colors.text, fontSize: 20, fontFamily: fonts.bold },
  feedbackText: { color: colors.text, fontSize: 17, lineHeight: 25, marginTop: 5, fontFamily: fonts.regular },
  saving: { color: colors.muted, fontSize: 16, fontFamily: fonts.medium, textAlign: "center" },
  restart: { alignSelf: "center", minHeight: 48, justifyContent: "center", paddingHorizontal: 16 },
  restartText: { color: colors.text, fontSize: 16, fontFamily: fonts.semibold, textDecorationLine: "underline", textTransform: "uppercase" },
});
