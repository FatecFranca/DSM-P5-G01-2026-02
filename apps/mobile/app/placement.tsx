import { Redirect, router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { AudioButton } from "../src/components/AudioButton";
import { PlacementDemo, PlacementQuestion } from "../src/components/placement/PlacementQuestion";
import { CelebrationCard } from "../src/components/ui/CelebrationCard";
import { PointsBadge } from "../src/components/ui/PointsBadge";
import { PrimaryButton } from "../src/components/ui/PrimaryButton";
import { QuizLayout } from "../src/components/ui/QuizLayout";
import { SkipQuizDialog } from "../src/components/ui/SkipQuizDialog";
import { levelLabel } from "../src/domain/levels";
import { PLACEMENT_DEMO, PLACEMENT_INTRO, PLACEMENT_ITEMS, PLACEMENT_OUTRO, PLACEMENT_QUIZ_VERSION, placementGuidance, type PlacementResponses } from "../src/domain/placement";
import { placementPointsOf, scoreOf, type PlacementRecord } from "../src/domain/placement-record";
import { getSetting, PLACEMENT_DONE_KEY, savePlacement } from "../src/storage/database";
import { usePlacementStore } from "../src/store/placement-store";
import { syncNow } from "../src/sync/use-sync";
import { colors, fonts } from "../src/theme";

type Phase = "intro" | "demo" | "quiz";
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const TOTAL = PLACEMENT_ITEMS.length;

/**
 * Quiz de nivelamento (bancoquestoesequiz/QUIZ_NIVELAMENTO.md, contracts/placement-quiz.json): abertura, demonstração
 * sem pontuação e doze questões, uma por tela, em ordem de faixa. Cada questão registra a primeira resposta
 * confirmada ou "pulada"; nada indica certo ou errado durante o quiz. Pode ser refeito pelo Perfil (`?retake=1`).
 */
export default function Placement() {
  const { retake } = useLocalSearchParams<{ retake?: string }>();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => { void getSetting(PLACEMENT_DONE_KEY).then((done) => setAllowed(retake === "1" || done !== "1")); }, [retake]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const responses = useRef<Record<string, number | null>>({});
  const [finished, setFinished] = useState<PlacementRecord>();
  const [skipOpen, setSkipOpen] = useState(false);
  const saving = useRef(false);
  const setPlacement = usePlacementStore((state) => state.setPlacement);

  const finish = async (answers: PlacementResponses, skipped: boolean) => {
    if (saving.current) return;
    saving.current = true;
    const record: PlacementRecord = { resultId: makeId(), quizVersion: PLACEMENT_QUIZ_VERSION, completedAt: new Date().toISOString(), skipped, responses: answers };
    try {
      await savePlacement(record);
      setPlacement(record);
      void syncNow().catch(() => undefined);
      if (skipped) router.replace("/lessons"); else setFinished(record);
    } catch {
      saving.current = false;
      Alert.alert("Não foi possível salvar", "Suas respostas não foram registradas. Tente novamente.");
    }
  };

  const answer = (choice: number | null) => {
    const item = PLACEMENT_ITEMS[index];
    if (!item || Object.hasOwn(responses.current, item.id)) return;
    responses.current = { ...responses.current, [item.id]: choice };
    if (index + 1 >= TOTAL) void finish(responses.current, false);
    else setIndex(index + 1);
  };

  // Interromper conta como quiz incompleto: o resultado fica provisório (fácil) e pode ser refeito no Perfil.
  // Ao refazer, parar só descarta a nova tentativa e mantém o resultado anterior.
  const confirmStop = () => retake === "1"
    ? Alert.alert("Parar o nivelamento?", "Seu resultado anterior continua valendo.", [
      { text: "Continuar o quiz", style: "cancel" },
      { text: "Parar", style: "destructive", onPress: () => (router.canGoBack() ? router.back() : router.replace("/lessons")) },
    ])
    : Alert.alert("Parar o nivelamento?", "Você começa pelas letras e pode refazer o quiz depois, no Perfil.", [
      { text: "Continuar o quiz", style: "cancel" },
      { text: "Parar", style: "destructive", onPress: () => { void finish(responses.current, false); } },
    ]);
  const leaveIntro = () => (retake === "1" && router.canGoBack() ? router.back() : setSkipOpen(true));

  if (finished) {
    const score = scoreOf(finished);
    const points = placementPointsOf(finished);
    const lead = "Você completou o quiz e ganhou:";
    const guidance = placementGuidance(score);
    return <>
      <Stack.Screen options={{ headerShown: false }} />
      <CelebrationCard title="Muito bem!" message={lead}
        audioText={`Muito bem! ${lead} ${points} pontos! ${guidance} ${PLACEMENT_OUTRO}`}
        primary={{ label: "Continuar", onPress: () => router.replace("/lessons") }}>
        <PointsBadge points={points} />
        <Text style={styles.result}>{score.provisional ? "Sugestão para começar: Letras" : `Sugestão para começar: ${levelLabel(score.startLevel)}`}</Text>
        <Text style={styles.resultNote}>{guidance}</Text>
      </CelebrationCard>
    </>;
  }

  if (allowed === false) return <Redirect href="/lessons" />;
  if (allowed === null) return null;

  if (phase === "intro") {
    return <>
      <Stack.Screen options={{ headerShown: false }} />
      <QuizLayout prompt="Antes de começar" promptAudio={PLACEMENT_INTRO} promptAudioLabel="Ouvir mensagem" closeLabel="Sair do nivelamento" onClose={leaveIntro}
        progress={{ current: 0, total: TOTAL, accessibilityLabel: `Nivelamento com ${TOTAL} perguntas` }}>
        <Text style={styles.intro}>{PLACEMENT_INTRO}</Text>
        <PrimaryButton uppercase label="Começar" onPress={() => setPhase("demo")} />
        <View style={styles.skipRow}>
          <AudioButton label="Ouvir: pular o quiz" text="Pular o quiz e começar pelas letras" compact />
          <Pressable accessibilityRole="button" style={styles.link} onPress={() => setSkipOpen(true)}><Text style={styles.linkText}>Pular o quiz</Text></Pressable>
        </View>
      </QuizLayout>
      {/* Pop-up "pular quiz" do Figma (1:315): pular leva ao básico, então pedimos confirmação. */}
      <SkipQuizDialog visible={skipOpen} onCancel={() => setSkipOpen(false)} onConfirm={() => { setSkipOpen(false); void finish({}, true); }} />
    </>;
  }

  if (phase === "demo") {
    return <>
      <Stack.Screen options={{ headerShown: false }} />
      <QuizLayout prompt={PLACEMENT_DEMO.instruction} promptAudioLabel="Ouvir instrução" closeLabel="Sair do nivelamento" onClose={confirmStop}
        progress={{ current: 0, total: TOTAL, accessibilityLabel: "Treino antes do nivelamento" }}>
        <PlacementDemo options={PLACEMENT_DEMO.options} answer={PLACEMENT_DEMO.answer} onDone={() => setPhase("quiz")} />
      </QuizLayout>
    </>;
  }

  const item = PLACEMENT_ITEMS[index];
  return <>
    <Stack.Screen options={{ headerShown: false }} />
    <QuizLayout key={item.id} prompt={item.instruction} promptAudioLabel="Ouvir pergunta" closeLabel="Sair do nivelamento" onClose={confirmStop}
      progress={{ current: index + 1, total: TOTAL, accessibilityLabel: `Nivelamento: pergunta ${index + 1} de ${TOTAL}` }}>
      <PlacementQuestion key={item.id} item={item} onAnswer={answer} />
    </QuizLayout>
  </>;
}

const styles = StyleSheet.create({
  intro: { color: colors.text, fontSize: 21, lineHeight: 30, fontFamily: fonts.medium, textAlign: "center" },
  skipRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  link: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  linkText: { color: colors.text, fontSize: 15, fontFamily: fonts.semibold, textDecorationLine: "underline", textTransform: "uppercase" },
  result: { color: colors.text, fontSize: 18, fontFamily: fonts.bold, textAlign: "center", marginTop: 8 },
  resultNote: { color: colors.text, fontSize: 16, lineHeight: 23, fontFamily: fonts.regular, textAlign: "center" },
});
