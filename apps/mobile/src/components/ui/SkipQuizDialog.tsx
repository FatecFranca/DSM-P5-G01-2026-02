import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, FIGMA_FRAME_WIDTH, fonts, palette, shadows } from "../../theme";
import { AudioButton } from "../AudioButton";
import { CheckCircleIcon, CircleXIcon, CornerShape, HeroBlobs, MascotWave } from "../brand/Decor";

const QUESTION = "Tem certeza que deseja pular o quiz?";
const EXPLANATION = "Ele nos ajuda a entender onde podemos começar na sua jornada, sem ele iniciaremos do básico!";

/** Pílula bege do Figma com botão de áudio ao lado (VOLTAR / PULAR). */
function Choice({ label, icon, onPress }: { label: string; icon: ReactNode; onPress: () => void }) {
  return <View style={styles.choice}>
    <AudioButton label={`Ouvir: ${label}`} text={label} compact />
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.pill, pressed && styles.pressed]}>
      {icon}<Text style={styles.pillText}>{label}</Text>
    </Pressable>
  </View>;
}

/**
 * Pop-up "pular quiz" do Figma (1:315): confirma antes de pular o nivelamento, porque sem ele o aluno começa do básico.
 * Medidas do frame 320×608 multiplicadas por s.
 */
export function SkipQuizDialog({ visible, onCancel, onConfirm }: { visible: boolean; onCancel: () => void; onConfirm: () => void }) {
  const s = useWindowDimensions().width / FIGMA_FRAME_WIDTH;
  return <Modal visible={visible} animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} accessibilityViewIsModal>
      <CornerShape scale={s} style={{ position: "absolute", top: -14 * s, left: -48 * s }} />
      <HeroBlobs scale={0.62 * s} style={{ position: "absolute", right: -150 * s, bottom: -120 * s, transform: [{ rotate: "24deg" }] }} />
      <View style={[styles.card, { marginHorizontal: 8 * s, marginTop: 14 * s, minHeight: 507 * s, borderTopLeftRadius: 90 * s, borderBottomRightRadius: 90 * s, paddingTop: 70 * s }]}>
        <View style={styles.questionRow}>
          <AudioButton label="Ouvir a pergunta" text={`${QUESTION} ${EXPLANATION}`} size={60 * s} />
          <Text accessibilityRole="header" style={styles.question}>{QUESTION}</Text>
        </View>
        <Text style={styles.explanation}>{EXPLANATION}</Text>
        <View style={styles.choices}>
          <Choice label="Voltar" icon={<CircleXIcon size={22} />} onPress={onCancel} />
          <Choice label="Pular" icon={<CheckCircleIcon size={24} color={palette.navy} />} onPress={onConfirm} />
        </View>
      </View>
      <MascotWave width={178 * s} style={{ position: "absolute", left: -5 * s, bottom: -7 * s }} />
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, overflow: "hidden" },
  card: { backgroundColor: colors.surface, paddingHorizontal: 16, gap: 22, ...shadows.sheet },
  questionRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  question: { flex: 1, fontFamily: fonts.semibold, fontSize: 24, lineHeight: 30, color: colors.text },
  explanation: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 29, color: colors.text, paddingLeft: 12 },
  choices: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12, marginTop: 8 },
  choice: { flexDirection: "row", alignItems: "center", gap: 8 },
  pill: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, borderRadius: 30, backgroundColor: palette.beige, ...shadows.cta },
  pressed: { opacity: 0.85 },
  pillText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text, textTransform: "uppercase" },
});
