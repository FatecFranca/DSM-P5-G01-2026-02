import * as Speech from "expo-speech";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import { ManagedIllustration } from "../../assets/ManagedIllustration";
import { PLACEMENT_GAP, stimulusParts, type PlacementItem, type PlacementOption } from "../../domain/placement";
import { colors, fonts, radius, shadows } from "../../theme";
import { AudioButton } from "../AudioButton";
import { CheckCircleIcon } from "../brand/Decor";
import { PrimaryButton } from "../ui/PrimaryButton";

const speak = (text: string) => { void Speech.stop().then(() => Speech.speak(text, { language: "pt-BR", rate: 0.8, pitch: 1 })); };

type ChoiceProps = {
  options: readonly (PlacementOption & { shape?: "circle" | "square" })[];
  pending?: number;
  onPick: (choice: number) => void;
};

/** Opções do nivelamento: texto, ilustração ou forma. Tocar só marca; nada indica certo ou errado. */
function Options({ options, pending, onPick }: ChoiceProps) {
  const wide = options.some((option) => !option.image && !option.shape && option.label.length > 3);
  return <View style={styles.options}>
    {options.map((option, index) => {
      const choice = index + 1;
      const marked = pending === choice;
      return <Pressable key={option.label} accessibilityRole="button" accessibilityLabel={`Escolher ${option.label}`} accessibilityState={{ selected: marked }}
        onPress={() => onPick(choice)}
        style={[styles.option, wide && styles.wideOption, (option.image || option.shape) && styles.pictureOption, marked && styles.marked]}>
        {option.image ? <ManagedIllustration assetId={option.image} accessibilityLabel={option.label} size={128} />
          : option.shape ? <Svg accessibilityRole="image" accessibilityLabel={option.label} width={96} height={96} viewBox="0 0 96 96">
            {option.shape === "circle" ? <Circle cx="48" cy="48" r="40" fill={colors.link} /> : <Rect x="10" y="10" width="76" height="76" rx="6" fill={colors.accent} />}
          </Svg>
            : <Text style={[styles.optionText, wide && styles.wideText]}>{option.label}</Text>}
      </Pressable>;
    })}
  </View>;
}

/** Confirmar envia a escolha marcada; Pular registra a questão como pulada. */
function Actions({ pending, onConfirm, onSkip }: { pending?: number; onConfirm: () => void; onSkip?: () => void }) {
  return <View style={styles.actions}>
    <View style={styles.confirmRow}>
      <AudioButton label="Ouvir: confirmar" text="Confirmar" compact />
      <PrimaryButton style={styles.confirm} uppercase label="Confirmar" icon={<CheckCircleIcon size={26} />} disabled={pending === undefined} onPress={onConfirm} />
    </View>
    {onSkip && <Pressable accessibilityRole="button" accessibilityLabel="Pular esta questão" style={styles.link} onPress={onSkip}><Text style={styles.linkText}>Pular esta questão</Text></Pressable>}
  </View>;
}

/**
 * Uma questão por tela (QUIZ_NIVELAMENTO.md): o áudio da instrução fica no balão; o estímulo de escuta tem botão
 * próprio e toca uma vez ao abrir; o texto avaliado fica na tela e nunca é lido em voz alta.
 */
export function PlacementQuestion({ item, onAnswer }: { item: PlacementItem; onAnswer: (choice: number | null) => void }) {
  const [pending, setPending] = useState<number>();
  const { audio, image, image_alt: imageAlt, text } = item.stimulus;
  useEffect(() => { if (audio) speak(audio); }, [audio]);
  return <View style={styles.body}>
    {audio && <View style={styles.listen}><AudioButton label="Ouvir de novo" text={audio} /><Text style={styles.listenText}>Ouvir de novo</Text></View>}
    {image && <ManagedIllustration assetId={image} accessibilityLabel={imageAlt ?? "Ilustração"} size={200} />}
    {text && (text.includes(PLACEMENT_GAP)
      ? <View accessible accessibilityLabel={`Texto com espaço vazio: ${text.replaceAll(PLACEMENT_GAP, "espaço")}`} style={styles.gapRow}>
        {stimulusParts(item).map((part, index) => part.kind === "text"
          ? <Text key={index} style={styles.reading}>{part.text}</Text>
          : <View key={index} style={styles.gap}>{Array.from({ length: part.slots }, (_, slot) => <View key={slot} style={styles.slot} />)}</View>)}
      </View>
      : <Text style={[styles.reading, text.length > 24 && styles.longReading]}>{text}</Text>)}
    <Options options={item.options} pending={pending} onPick={setPending} />
    <Actions pending={pending} onConfirm={() => { if (pending !== undefined) onAnswer(pending); }} onSkip={() => onAnswer(null)} />
  </View>;
}

/** Demonstração sem pontuação: mostra como marcar e confirmar. Erro só explica e deixa tentar de novo. */
export function PlacementDemo({ options, answer, onDone }: { options: ChoiceProps["options"]; answer: number; onDone: () => void }) {
  const [pending, setPending] = useState<number>();
  const [hint, setHint] = useState<string>();
  return <View style={styles.body}>
    <Text style={styles.helper}>Treino: esta atividade não conta pontos.</Text>
    <Options options={options} pending={pending} onPick={(choice) => { setPending(choice); setHint(undefined); }} />
    {hint && <Text accessibilityRole="alert" style={styles.hint}>{hint}</Text>}
    <Actions pending={pending} onConfirm={() => {
      if (pending === answer) { onDone(); return; }
      const message = `Esse é o ${options[(pending ?? 1) - 1]?.label.toLowerCase()}. Toque no ${options[answer - 1]?.label.toLowerCase()} e depois em Confirmar.`;
      setHint(message); speak(message);
    }} />
  </View>;
}

const styles = StyleSheet.create({
  body: { gap: 16, alignItems: "stretch" },
  listen: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  listenText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 20 },
  reading: { alignSelf: "center", color: colors.text, fontFamily: fonts.bold, fontSize: 38, letterSpacing: 3, textAlign: "center", lineHeight: 48 },
  gapRow: { alignSelf: "center", flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 14 },
  gap: { flexDirection: "row", gap: 6 },
  slot: { width: 34, height: 46, borderBottomWidth: 4, borderColor: colors.text },
  longReading: { fontSize: 24, lineHeight: 34, letterSpacing: 1 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 16, justifyContent: "center", marginVertical: 8 },
  option: { minWidth: 104, minHeight: 76, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, borderWidth: 2, borderColor: "transparent", ...shadows.card },
  wideOption: { minWidth: "100%", minHeight: 64 },
  pictureOption: { padding: 6 },
  marked: { backgroundColor: colors.selectedBg, borderColor: colors.action, ...shadows.selected },
  optionText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 36, textAlign: "center" },
  wideText: { fontSize: 22 },
  actions: { gap: 6 },
  confirmRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  confirm: { flex: 1 },
  link: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  linkText: { color: colors.text, fontSize: 16, fontFamily: fonts.semibold, textDecorationLine: "underline", textTransform: "uppercase" },
  helper: { color: colors.muted, fontSize: 16, lineHeight: 22, fontFamily: fonts.regular, textAlign: "center" },
  hint: { color: colors.text, backgroundColor: colors.careBg, borderRadius: radius.md, padding: 14, fontSize: 17, lineHeight: 24, fontFamily: fonts.medium, textAlign: "center" },
});
