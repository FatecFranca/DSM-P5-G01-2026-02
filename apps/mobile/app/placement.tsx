import { Redirect, router, Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AudioButton } from "../src/components/AudioButton";
import { CelebrationCard } from "../src/components/ui/CelebrationCard";
import { PointsBadge } from "../src/components/ui/PointsBadge";
import { QuizLayout } from "../src/components/ui/QuizLayout";
import { SkipQuizDialog } from "../src/components/ui/SkipQuizDialog";
import { PLACEMENT_QUESTIONS, recommendPlacementLevel } from "../src/domain/placement";
import type { LearningLevelId } from "../src/domain/levels";
import { levelLabel } from "../src/domain/levels";
import { placementPoints } from "../src/domain/points";
import { getSetting, PLACEMENT_DONE_KEY, PLACEMENT_LEVEL_KEY, PLACEMENT_POINTS_KEY, setSetting } from "../src/storage/database";
import { colors, fonts, radius, shadows } from "../src/theme";

export default function Placement() {
  // O nivelamento é só do primeiro acesso: quem já fez (ou pulou) volta para a Trilha.
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => { void getSetting(PLACEMENT_DONE_KEY).then((done) => setAllowed(done !== "1")); }, []);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [selected, setSelected] = useState<string>();
  const [finished, setFinished] = useState<{ level: LearningLevelId; points: number }>();
  const [skipOpen, setSkipOpen] = useState(false);
  const question = PLACEMENT_QUESTIONS[index];
  const options = useMemo(() => question?.options ?? [], [question]);

  const finish = async (answers: boolean[]) => {
    const level = recommendPlacementLevel(answers);
    const points = placementPoints(answers);
    await setSetting(PLACEMENT_DONE_KEY, "1");
    await setSetting(PLACEMENT_LEVEL_KEY, String(level));
    await setSetting(PLACEMENT_POINTS_KEY, String(points));
    setFinished({ level, points });
  };

  const choose = async (option: string) => {
    if (!question || selected) return;
    const correct = option === question.answer;
    setSelected(option);
    const nextResults = [...results, correct];
    setResults(nextResults);
    // Continua só enquanto acerta; o primeiro erro fecha o nivelamento no nível atual.
    if (!correct || index >= PLACEMENT_QUESTIONS.length - 1) {
      await finish(nextResults);
      return;
    }
    setIndex((value) => value + 1);
    setSelected(undefined);
  };

  const startFromBeginning = async () => {
    await setSetting(PLACEMENT_DONE_KEY, "1");
    await setSetting(PLACEMENT_LEVEL_KEY, "1");
    router.replace("/lessons");
  };

  // Pop-up "finalizar quiz" do Figma (1:512); a sugestão de nível vai no áudio e aparece na Trilha.
  if (finished) {
    const lead = "Você completou o quiz e ganhou:";
    return <>
      <Stack.Screen options={{ headerShown: false }} />
      <CelebrationCard title="Muito bem!" message={lead}
        audioText={`Muito bem! ${lead} ${finished.points} pontos! Sugestão para começar: ${levelLabel(finished.level)}.`}
        primary={{ label: "Continuar", onPress: () => router.replace("/lessons") }}>
        <PointsBadge points={finished.points} />
      </CelebrationCard>
    </>;
  }

  if (allowed === false) return <Redirect href="/lessons" />;
  if (allowed === null || !question) return null;

  // Tela "/quiz" do Figma: o nivelamento é o quiz inicial, com "PULAR QUIZ" no rodapé.
  const wide = options.some((option) => option.length > 3);
  const skipText = "Pular e começar pelas letras";
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <QuizLayout prompt={question.instruction} promptAudio={question.ttsText} promptAudioLabel="Ouvir pergunta" closeLabel="Sair do nivelamento"
        onClose={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        progress={{ current: index + 1, total: PLACEMENT_QUESTIONS.length, accessibilityLabel: `Nivelamento: pergunta ${index + 1} de ${PLACEMENT_QUESTIONS.length}` }}>
        <Text style={styles.helper}>Responda tocando. Não é preciso digitar.</Text>
        <View style={styles.options}>
          {options.map((option) => {
            const isSelected = selected === option;
            const isCorrect = option === question.answer;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityLabel={option}
                disabled={Boolean(selected)}
                onPress={() => void choose(option)}
                style={StyleSheet.flatten([
                  styles.option,
                  wide && styles.wideOption,
                  isSelected && isCorrect && styles.optionCorrect,
                  isSelected && !isCorrect && styles.optionWrong,
                ])}
              >
                <Text style={[styles.optionText, wide && styles.wideText]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.skipRow}>
          <AudioButton label="Ouvir: pular o nivelamento" text={skipText} compact />
          <Pressable accessibilityRole="button" style={styles.link} onPress={() => setSkipOpen(true)}>
            <Text style={styles.linkText}>{skipText}</Text>
          </Pressable>
        </View>
      </QuizLayout>
      {/* Pop-up "pular quiz" do Figma (1:315): pular leva ao básico, então pedimos confirmação. */}
      <SkipQuizDialog visible={skipOpen} onCancel={() => setSkipOpen(false)} onConfirm={() => { setSkipOpen(false); void startFromBeginning(); }} />
    </>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.action, fontSize: 14, fontFamily: fonts.bold, letterSpacing: 1 },
  title: { color: colors.text, fontSize: 30, fontFamily: fonts.bold, marginTop: 8 },
  body: { color: colors.muted, fontSize: 18, lineHeight: 26, fontFamily: fonts.regular },
  note: { color: colors.muted, fontSize: 15, lineHeight: 22, fontFamily: fonts.regular },
  helper: { color: colors.muted, fontSize: 16, lineHeight: 22, fontFamily: fonts.regular, textAlign: "center" },
  options: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 18, marginVertical: 8 },
  option: { minWidth: 124, minHeight: 76, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, ...shadows.card },
  wideOption: { minWidth: "100%", minHeight: 64 },
  optionCorrect: { backgroundColor: colors.selectedBg, ...shadows.selected },
  optionWrong: { borderWidth: 2, borderColor: colors.danger, backgroundColor: colors.dangerBg },
  optionText: { color: colors.text, fontSize: 40, fontFamily: fonts.semibold, textAlign: "center" },
  wideText: { fontSize: 24 },
  skipRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  primary: { minHeight: 56, borderRadius: radius.pill, backgroundColor: colors.action, alignItems: "center", justifyContent: "center", ...shadows.card },
  primaryText: { color: colors.onAction, fontSize: 18, fontFamily: fonts.semibold },
  secondary: { minHeight: 56, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.link, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.link, fontSize: 18, fontFamily: fonts.semibold },
  link: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  linkText: { color: colors.text, fontSize: 15, fontFamily: fonts.semibold, textDecorationLine: "underline", textTransform: "uppercase" },
});
