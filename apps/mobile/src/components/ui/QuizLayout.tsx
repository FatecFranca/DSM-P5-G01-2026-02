import { useState, type PropsWithChildren } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, FIGMA_FRAME_WIDTH, fonts, radius, shadows } from "../../theme";
import { AudioButton } from "../AudioButton";
import { CornerShape, Mascot } from "../brand/Decor";
import { ProgressBar } from "./ProgressBar";

type QuizLayoutProps = PropsWithChildren<{
  /** Enunciado mostrado no balão. */
  prompt: string;
  /** O que o botão de áudio do balão fala; por padrão, o próprio enunciado. */
  promptAudio?: string;
  promptAudioLabel?: string;
  onPromptAudio?: () => void;
  progress: { current: number; total: number; accessibilityLabel?: string };
  onClose: () => void;
  closeLabel?: string;
}>;

// Mascote no frame do Figma: 177 de largura, topo em -9.6.
const MASCOT_WIDTH = 177;
const MASCOT_TOP = -9.6;

/**
 * Layout do Quiz no Figma (1:381, frame 320×608): topo com fechar, progresso e mascote; enunciado num balão;
 * conteúdo numa folha areia. Posições em unidades do frame, multiplicadas por s (largura da tela / 320).
 */
export function QuizLayout({ prompt, promptAudio, promptAudioLabel = "Ouvir enunciado", onPromptAudio, progress, onClose, closeLabel = "Sair da atividade", children }: QuizLayoutProps) {
  const s = useWindowDimensions().width / FIGMA_FRAME_WIDTH;
  const [sheetY, setSheetY] = useState<number>();
  // As patas do mascote terminam a ~91% da altura da imagem (o PNG tem margem transparente embaixo).
  // Com balão curto a folha sobe; o respiro do topo garante que o conteúdo comece abaixo das patas.
  const pawsBottom = (MASCOT_TOP + MASCOT_WIDTH * 1.5 * 0.91) * s;
  const sheetPaddingTop = sheetY === undefined ? 34 : Math.max(34, pawsBottom - sheetY + 12);
  return <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
    <CornerShape scale={s} style={{ position: "absolute", top: -10 * s, left: -60 * s }} />
    <ScrollView contentContainerStyle={styles.content}>
      <Mascot width={MASCOT_WIDTH * s} style={[styles.mascot, { top: MASCOT_TOP * s, right: -58 * s }]} />
      <View style={[styles.top, { paddingLeft: 10 * s, paddingTop: 20 * s }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} hitSlop={12} style={[styles.close, { marginLeft: 4 * s }]} onPress={onClose}><Text style={styles.closeText}>X</Text></Pressable>
        <ProgressBar style={{ width: 180 * s }} current={progress.current} total={progress.total} accessibilityLabel={progress.accessibilityLabel} />
      </View>
      <View style={[styles.bubble, { marginLeft: 10 * s, width: 186 * s, minHeight: 83 * s }]}>
        <AudioButton label={promptAudioLabel} text={promptAudio ?? prompt} compact onPlay={onPromptAudio} />
        <Text style={styles.bubbleText}>{prompt}</Text>
      </View>
      <View style={[styles.sheet, { paddingTop: sheetPaddingTop }]} onLayout={(event) => setSheetY(event.nativeEvent.layout.y)}>
        {children}
        {/* Espaço para os cantos decorativos não cobrirem o fim do conteúdo. */}
        <View style={{ height: 70 * s }} />
      </View>
    </ScrollView>
    {/* Cantos inferiores ficam por cima da folha, como no Figma; não capturam toques. */}
    <CornerShape scale={s} flipY pointerEvents="none" style={{ position: "absolute", bottom: -18 * s, left: -43 * s }} />
    <CornerShape scale={s} flipX flipY pointerEvents="none" style={{ position: "absolute", bottom: -18 * s, right: -51 * s }} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, overflow: "hidden" },
  content: { flexGrow: 1 },
  // zIndex: o mascote é desenhado por cima da folha (no Figma as patas passam da borda dela).
  mascot: { position: "absolute", zIndex: 1 },
  top: { gap: 12, alignItems: "flex-start" },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.track, alignItems: "center", justifyContent: "center" },
  closeText: { fontFamily: fonts.regular, fontSize: 18, color: colors.muted },
  bubble: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14, padding: 12, backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: radius.xs, borderBottomRightRadius: radius.lg, borderBottomLeftRadius: radius.sm, ...shadows.card },
  bubbleText: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, textTransform: "uppercase" },
  sheet: { flexGrow: 1, justifyContent: "center", marginTop: 24, paddingHorizontal: 20, gap: 14, backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet },
});
