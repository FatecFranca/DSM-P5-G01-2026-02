import type { PropsWithChildren } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, FIGMA_FRAME_WIDTH, fonts, palette, shadows } from "../../theme";
import { AudioButton } from "../AudioButton";
import { CardWaves, CheckCircleIcon, CornerShape, MascotPeek, Sprig } from "../brand/Decor";
import { PrimaryButton } from "./PrimaryButton";

type Action = { label: string; onPress: () => void };
type CelebrationCardProps = PropsWithChildren<{
  title: string;
  message: string;
  /** Texto lido pelo botão de áudio do topo do cartão. */
  audioText: string;
  primary: Action;
  secondary?: Action;
  /** Ondas no rodapé do cartão; o pop-up de conquista (9:554) não tem. */
  waves?: boolean;
}>;

/**
 * Pop-ups de conclusão do Figma (1:690 "finalizar conjunto de exercícios", 1:1063 "finalizar etapa"): Jagua espiando
 * por cima de um cartão creme com borda amarela, ramos ao lado do título, CONTINUAR e ondas no rodapé.
 * Medidas do frame 320×608 multiplicadas por s.
 */
export function CelebrationCard({ title, message, audioText, primary, secondary, waves = true, children }: CelebrationCardProps) {
  const s = useWindowDimensions().width / FIGMA_FRAME_WIDTH;
  return <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
    <CornerShape scale={s} style={{ position: "absolute", top: -10 * s, left: -60 * s }} />
    <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: 10 * s, paddingTop: 24 * s, paddingBottom: 24 * s }]}>
      {/* No Figma o Jagua fica 13,5 à direita do centro e apoia as patas 12 abaixo da borda do cartão. */}
      <MascotPeek width={231 * s} style={[styles.peek, { marginLeft: 27 * s, marginBottom: -14 * s }]} />
      <View style={[styles.card, { borderRadius: 60 * s }]}>
        <View style={[styles.cardClip, { borderRadius: 58 * s }]}>
          <View style={[styles.body, { paddingTop: 16 * s, paddingHorizontal: 18 * s }]}>
            <AudioButton label="Ouvir mensagem" text={audioText} size={46 * s} />
            <View style={styles.titleRow}>
              <Sprig side="left" scale={s * 0.8} />
              <Text accessibilityRole="header" style={[styles.title, { fontSize: 30 * s }]} adjustsFontSizeToFit numberOfLines={1}>{title}</Text>
              <Sprig side="right" scale={s * 0.8} />
            </View>
            <Text style={styles.message}>{message}</Text>
            {children}
            <View style={styles.actionRow}>
              <AudioButton label={`Ouvir: ${primary.label}`} text={primary.label} compact />
              <PrimaryButton style={styles.grow} uppercase label={primary.label} icon={<CheckCircleIcon size={26} />} onPress={primary.onPress} />
            </View>
            {secondary && <View style={styles.linkRow}>
              <AudioButton label={`Ouvir: ${secondary.label}`} text={secondary.label} compact />
              <Pressable accessibilityRole="button" style={styles.link} onPress={secondary.onPress}><Text style={styles.linkText}>{secondary.label}</Text></Pressable>
            </View>}
          </View>
          {waves ? <CardWaves style={{ marginTop: 18 * s }} /> : <View style={{ height: 24 * s }} />}
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, overflow: "hidden" },
  content: { flexGrow: 1, justifyContent: "center" },
  // Elevation acima do cartão (shadows.sheet usa 10) para as patas ficarem por cima da borda no Android.
  peek: { alignSelf: "center", zIndex: 2, elevation: 11 },
  // Sombra no contêiner externo; o interno recorta as ondas nos cantos arredondados.
  card: { backgroundColor: colors.background, borderWidth: 2, borderColor: palette.yellow, ...shadows.sheet },
  cardClip: { overflow: "hidden" },
  body: { alignItems: "center", gap: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", alignSelf: "stretch" },
  title: { flexShrink: 1, color: colors.text, fontFamily: fonts.bold, textTransform: "uppercase", textAlign: "center" },
  message: { color: colors.text, fontFamily: fonts.medium, fontSize: 17, lineHeight: 23, textAlign: "center", textTransform: "uppercase" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, alignSelf: "stretch", marginTop: 6 },
  grow: { flex: 1 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  link: { minHeight: 48, justifyContent: "center" },
  linkText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15, textDecorationLine: "underline", textTransform: "uppercase" },
});
