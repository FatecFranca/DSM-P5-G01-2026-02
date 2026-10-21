import { router, Stack } from "expo-router";
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import mascotWave from "../../assets/brand/mascot-wave.png";
import { colors, FIGMA_FRAME_WIDTH, fonts, palette, shadows } from "../theme";
import { AudioButton } from "./AudioButton";
import { CheckCircleIcon, CornerShape, LogoSpark } from "./brand/Decor";

const INTRO_AUDIO =
  "Olá! Eu sou o Jagua, vou te ajudar na sua jornada! Primeiro vamos fazer um quiz para identificar onde devemos iniciar. " +
  "Sempre que precisar ouvir algo clique no botão verde com o ícone de som e tudo será repetido, não esqueça de aumentar o seu volume!";

// Tela Introdução do Figma (1:313, frame 320×608): cartão areia com o Jagua acenando, aviso de áudio e botão PRÓXIMO.
// Medidas em px do frame, multiplicadas por `s` (largura da tela / 320).
export function IntroScreen({ onNext }: { onNext?: () => void }) {
  const { width, height } = useWindowDimensions();
  const s = width / FIGMA_FRAME_WIDTH;
  const insets = useSafeAreaInsets();
  const next = onNext ?? (() => router.replace("/placement"));
  const cardTop = Math.max(24 * s, insets.top + 8);
  // Telas mais altas que o frame (608): o texto desce um pouco e o resto fica ancorado no fundo.
  const extra = Math.max(0, height - 608 * s - (cardTop - 24 * s));
  // Deslocamento dos itens posicionados pelo topo do cartão.
  const dy = cardTop - 24 * s + extra * 0.4;

  return <View style={styles.root}>
    <Stack.Screen options={{ headerShown: false }} />

    {/* Ondas amarela e verde no canto inferior esquerdo */}
    <Svg accessible={false} pointerEvents="none" style={styles.abs} width={204 * s} height={79.5 * s} viewBox="0 0 204 79.4998" preserveAspectRatio="none">
      <Path d="M204 79.4998C64.5 -33 95 55 0 0V79.4998L204 79.4998Z" fill={palette.yellow} />
    </Svg>
    <Svg accessible={false} pointerEvents="none" style={styles.abs} width={226 * s} height={65 * s} viewBox="0 0 226 65" preserveAspectRatio="none">
      <Path d="M226 65C52.7333 50.3642 95.6733 18.0795 0 0V65H226Z" fill={palette.green} />
    </Svg>
    <CornerShape scale={s} style={{ position: "absolute", left: -37 * s, top: -4 * s }} />

    {/* Cartão */}
    <View style={[styles.card, { left: 8 * s, right: 8 * s, top: cardTop, bottom: 77 * s, borderTopLeftRadius: 90 * s, borderBottomRightRadius: 90 * s }]} />

    {/* Três manchas atrás do canto inferior direito (caixa de 246×283 girada 24°) */}
    <View pointerEvents="none" style={{ position: "absolute", left: 224 * s, top: 481.8 * s, width: 246.289 * s, height: 283.367 * s, transform: [{ rotate: "24deg" }] }}>
      <Svg accessible={false} style={{ position: "absolute", left: -25 * s, top: 0 }} width={282.143 * s} height={308.639 * s} viewBox="0 0 282.143 308.639">
        <Path d="M256.519 119.698C250.437 168.13 199.215 201.579 142.112 194.408C85.009 187.238 41.372 98.3366 47.454 49.9044C53.5359 1.4721 173.269 15.2893 230.373 22.4601C287.476 29.631 262.601 71.2658 256.519 119.698Z" fill={palette.yellowSoft} />
        <Path d="M243.46 145.753C249.182 192.686 195.251 218.31 142.886 224.695C90.5209 231.079 37.5835 163.342 31.861 116.409C26.1386 69.4761 57.8515 61.3793 110.216 54.9945C162.581 48.6097 237.737 98.8204 243.46 145.753Z" fill={palette.blue} />
        <Path d="M250.912 195.256C250.912 244.068 204.066 283.639 146.279 283.639C88.4919 283.639 25 228.611 25 179.799C25 130.986 88.4919 106.873 146.279 106.873C204.066 106.873 250.912 146.443 250.912 195.256Z" fill={palette.green} fillOpacity={0.9} />
      </Svg>
    </View>

    <Text accessibilityRole="header" style={[styles.hello, { top: (55.5 - 19) * s + dy, fontSize: 32 * s, lineHeight: 38 * s }]}>Olá!</Text>
    <Text style={[styles.text, { left: 40 * s, width: 227 * s, top: 88 * s + dy, fontSize: 20 * s, lineHeight: 21 * s }]}>Eu sou o Jagua, vou te ajudar na sua jornada!</Text>
    <View pointerEvents="none" style={{ position: "absolute", left: 175 * s, top: 82 * s + dy }}><LogoSpark size={13.696 * s} /></View>
    <Text style={[styles.text, { left: 38 * s, width: 253 * s, top: 150 * s + dy, fontSize: 20 * s, lineHeight: 21 * s, fontFamily: fonts.semibold }]}>Primeiro vamos fazer um quiz para identificar onde devemos iniciar.</Text>
    <Text style={[styles.text, { left: 37 * s, width: 271 * s, top: 232 * s + dy, fontSize: 20 * s, lineHeight: 21 * s }]}>
      Sempre que precisar ouvir algo clique no botão verde com o ícone de som e tudo será repetido, <Text style={styles.underline}>não esqueça de aumentar o seu volume!</Text>
    </Text>

    {/* Fechar */}
    <Pressable accessibilityRole="button" accessibilityLabel="Fechar introdução" onPress={next} hitSlop={12} style={[styles.close, { left: 266 * s, top: 41 * s + cardTop - 24 * s, width: 25 * s, height: 25 * s, borderRadius: 12.5 * s }]}>
      <Text style={[styles.closeText, { fontSize: 16 * s }]}>X</Text>
    </Pressable>

    {/* Áudio grande, PRÓXIMO e áudio pequeno ancorados no fundo do cartão */}
    <View style={{ position: "absolute", left: 143 * s, bottom: 196 * s, width: 60 * s, height: 60 * s }}>
      <AudioButton label="Ouvir introdução" text={INTRO_AUDIO} size={60 * s} />
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Próximo" onPress={next} style={[styles.next, { right: 16 * s, bottom: 150 * s, width: 119 * s, height: 35 * s, borderRadius: 30 * s, gap: 5 * s }]}>
      <CheckCircleIcon size={15.59 * s} />
      <Text style={[styles.nextText, { fontSize: 12 * s }]}>PROXÍMO</Text>
    </Pressable>
    <View style={{ position: "absolute", left: 228 * s, bottom: 108 * s, width: 34 * s, height: 34 * s }}>
      <AudioButton label="Ouvir próximo" text="Próximo" size={34 * s} />
    </View>

    {/* Jagua acenando (178×267), por cima do cartão */}
    <Image accessible={false} source={mascotWave} resizeMode="cover" style={[styles.mascot,{ left: -5 * s, bottom: -7 * s, width: 178 * s, height: 267 * s }]} />
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, overflow: "hidden" },
  abs: { position: "absolute", left: 0, bottom: 0 },
  card: { position: "absolute", backgroundColor: colors.surface, ...shadows.sheet },
  hello: { position: "absolute", left: 0, right: 0, textAlign: "center", fontFamily: fonts.bold, color: colors.text, elevation: 12 },
  text: { position: "absolute", fontFamily: fonts.regular, color: colors.text, elevation: 12 },
  underline: { textDecorationLine: "underline" },
  close: { position: "absolute", alignItems: "center", justifyContent: "center", backgroundColor: palette.beige, elevation: 12 },
  closeText: { fontFamily: fonts.regular, color: colors.muted },
  next: { position: "absolute", flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.action, ...shadows.cta, elevation: 12 },
  nextText: { fontFamily: fonts.semibold, color: palette.white },
  mascot: { position: "absolute", elevation: 13 },
});
