import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, FIGMA_FRAME_WIDTH, fonts, radius, shadows } from "../../theme";
import { AudioButton } from "../AudioButton";
import { ArrowRightIcon, PointsPaw, ProfileBlobs, ProfileWaves } from "../brand/Decor";

/** Linha do perfil no Figma: botão de áudio à esquerda e cartão areia com sombra azul à direita. */
function Row({ audio, audioLabel, onPress, accessibilityLabel, children }: { audio: string; audioLabel: string; onPress?: () => void; accessibilityLabel: string; children: ReactNode }) {
  const card = <View style={styles.card}>{children}{onPress && <ArrowRightIcon size={24} />}</View>;
  return <View style={styles.row}>
    <AudioButton label={audioLabel} text={audio} compact />
    {onPress
      ? <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [styles.grow, pressed && styles.pressed]}>{card}</Pressable>
      : <View accessible accessibilityLabel={accessibilityLabel} style={styles.grow}>{card}</View>}
  </View>;
}

/** "Minha pontuação: 365 Pts | 25° Lugar" (Figma 1:133). O lugar só aparece quando o placar respondeu. */
export function PointsCard({ points, position }: { points: number; position: number | null }) {
  const spoken = `Minha pontuação: ${points} pontos${position ? `, ${position}º lugar` : ""}.`;
  return <Row audio={spoken} audioLabel="Ouvir minha pontuação" accessibilityLabel={spoken}>
    <View style={styles.body}>
      <Text style={styles.caption}>Minha pontuação:</Text>
      <View style={styles.scoreLine}>
        <Text style={styles.big}>{points}</Text><Text style={styles.unit}>Pts</Text>
        {position !== null && <><View style={styles.divider} /><Text style={styles.big}>{position}°</Text><Text style={styles.unit}>Lugar</Text></>}
      </View>
    </View>
  </Row>;
}

/** Pata com número na almofada; o centro da almofada fica a ~68% da altura do desenho. */
function PawDay({ value, width, variant, color, fontSize }: { value: number; width: number; variant: "gradient" | "filled" | "outline"; color: string; fontSize: number }) {
  const height = width * 69.25 / 78;
  const lineHeight = fontSize * 1.2;
  return <View style={{ width, height }}>
    <PointsPaw width={width} variant={variant} />
    <Text style={[styles.pawNumber, { top: height * 0.68 - lineHeight / 2, fontSize, lineHeight, color }]}>{value}</Text>
  </View>;
}

/** "Dias seguidos" (Figma 1:109): dia anterior em amarelo, hoje grande em gradiente, o próximo só no contorno. */
export function StreakCard({ streak }: { streak: number }) {
  const s = useWindowDimensions().width / FIGMA_FRAME_WIDTH;
  const spoken = streak === 1 ? "Você estudou 1 dia seguido." : `Você estudou ${streak} dias seguidos.`;
  return <Row audio={`Dias seguidos. ${spoken}`} audioLabel="Ouvir dias seguidos" accessibilityLabel={`Dias seguidos: ${streak}`}>
    <View style={[styles.body, styles.center]}>
      <Text style={styles.title}>Dias seguidos:</Text>
      <View style={styles.paws}>
        {streak > 1 && <PawDay value={streak - 1} width={42 * s} variant="filled" color={colors.action} fontSize={17} />}
        <PawDay value={streak} width={70 * s} variant="gradient" color={colors.text} fontSize={30} />
        <PawDay value={streak + 1} width={42 * s} variant="outline" color={colors.text} fontSize={17} />
      </View>
    </View>
  </Row>;
}

/** Cartão de ação com seta, como o "SAIR" do Figma (1:156). */
export function LinkCard({ label, onPress, audio }: { label: string; onPress: () => void; audio?: string }) {
  return <Row audio={audio ?? label} audioLabel={`Ouvir: ${label}`} accessibilityLabel={label} onPress={onPress}>
    <Text style={[styles.title, styles.grow]}>{label}</Text>
  </Row>;
}

/** Fundo do perfil: blobs girados no canto superior esquerdo e ondas atrás do menu inferior. */
export function ProfileBackdrop() {
  const s = useWindowDimensions().width / FIGMA_FRAME_WIDTH;
  // O menu do app é mais alto que o do Figma (alvos de toque e margem do sistema); as ondas crescem junto
  // para continuar aparecendo acima dele.
  const navExtra = useSafeAreaInsets().bottom + 30;
  return <>
    <View pointerEvents="none" style={{ position: "absolute", left: -256 * s, top: -307 * s, width: 446.5 * s, height: 444.5 * s, alignItems: "center", justifyContent: "center" }}>
      <ProfileBlobs scale={s} />
    </View>
    <ProfileWaves style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 93 * s + navExtra }} />
  </>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  grow: { flex: 1 },
  pressed: { opacity: 0.85 },
  card: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 18, borderRadius: radius.md, backgroundColor: colors.surface, ...shadows.sheet },
  body: { flex: 1, gap: 2 },
  center: { alignItems: "center", gap: 8 },
  caption: { fontFamily: fonts.medium, fontSize: 16, color: colors.text, textTransform: "uppercase" },
  scoreLine: { flexDirection: "row", alignItems: "baseline", gap: 6, flexWrap: "wrap" },
  big: { fontFamily: fonts.bold, fontSize: 30, color: colors.action },
  unit: { fontFamily: fonts.semibold, fontSize: 16, color: colors.action },
  divider: { width: 1, height: 30, marginHorizontal: 6, backgroundColor: "#777368", alignSelf: "center" },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, textTransform: "uppercase" },
  paws: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 14 },
  pawNumber: { position: "absolute", left: 0, right: 0, textAlign: "center", fontFamily: fonts.bold },
});
