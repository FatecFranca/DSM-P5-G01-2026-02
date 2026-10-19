import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AudioButton } from "../src/components/AudioButton";
import { Screen } from "../src/components/Screen";
import { placementGuidance, PLACEMENT_QUESTIONS, recommendPlacementLevel } from "../src/domain/placement";
import type { LearningLevelId } from "../src/domain/levels";
import { levelLabel } from "../src/domain/levels";
import { PLACEMENT_DONE_KEY, PLACEMENT_LEVEL_KEY, setSetting } from "../src/storage/database";
import { colors } from "../src/theme";

export default function Placement() {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [selected, setSelected] = useState<string>();
  const [finished, setFinished] = useState<{ level: LearningLevelId }>();
  const question = PLACEMENT_QUESTIONS[index];
  const options = useMemo(() => question?.options ?? [], [question]);

  const finish = async (answers: boolean[]) => {
    const level = recommendPlacementLevel(answers);
    await setSetting(PLACEMENT_DONE_KEY, "1");
    await setSetting(PLACEMENT_LEVEL_KEY, String(level));
    setFinished({ level });
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

  if (finished) {
    return (
      <Screen>
        <Text style={styles.eyebrow}>NIVELAMENTO</Text>
        <Text style={styles.title}>Sugestão: {levelLabel(finished.level)}</Text>
        <Text style={styles.body}>{placementGuidance(finished.level)}</Text>
        <Text style={styles.note}>Isso só orienta o ponto de partida. Você pode estudar qualquer atividade já liberada.</Text>
        <Pressable accessibilityRole="button" style={styles.primary} onPress={() => router.replace("/lessons")}>
          <Text style={styles.primaryText}>Ir para a trilha</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => void startFromBeginning()}>
          <Text style={styles.secondaryText}>Começar pelas letras</Text>
        </Pressable>
      </Screen>
    );
  }

  if (!question) return null;

  return (
    <Screen>
      <Text style={styles.eyebrow}>NIVELAMENTO · {index + 1} de {PLACEMENT_QUESTIONS.length}</Text>
      <Text style={styles.title}>{question.instruction}</Text>
      <Text style={styles.body}>Responda tocando. Não é preciso digitar.</Text>
      <AudioButton label="Ouvir pergunta" text={question.ttsText} />
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
                isSelected && isCorrect && styles.optionCorrect,
                isSelected && !isCorrect && styles.optionWrong,
              ])}
            >
              <Text style={styles.optionText}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable accessibilityRole="button" style={styles.link} onPress={() => void startFromBeginning()}>
        <Text style={styles.linkText}>Pular e começar pelas letras</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.accent, fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  title: { color: colors.text, fontSize: 30, fontWeight: "800", marginTop: 8 },
  body: { color: colors.muted, fontSize: 18, lineHeight: 26 },
  note: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  options: { gap: 12 },
  option: { minHeight: 64, borderRadius: 16, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  optionCorrect: { borderColor: colors.success, backgroundColor: "#DDF3E9" },
  optionWrong: { borderColor: colors.danger, backgroundColor: "#F8E6E3" },
  optionText: { color: colors.text, fontSize: 20, fontWeight: "800", textAlign: "center" },
  primary: { minHeight: 60, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "white", fontSize: 18, fontWeight: "800" },
  secondary: { minHeight: 60, borderRadius: 15, borderWidth: 2, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.primary, fontSize: 18, fontWeight: "800" },
  link: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  linkText: { color: colors.primary, fontSize: 16, fontWeight: "700", textDecorationLine: "underline" },
});
