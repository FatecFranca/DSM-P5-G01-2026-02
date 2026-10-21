import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useRef } from "react";
import { Image, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import branches from "../../assets/trail/branches.webp";
import jaguaLying from "../../assets/trail/jagua-lying.webp";
import jaguaPeek from "../../assets/trail/jagua-peek.webp";
import jaguaSitting from "../../assets/trail/jagua-sitting.webp";
import { TrailCard, TrailDot, TrailScene } from "../../src/components/ui/Trail";
import { useContentStore } from "../../src/content/store";
import { nextTrailUnit, trailStage, unitsForStage, unitStatus, type TrailStatus } from "../../src/domain/trail";
import { useStudyStore } from "../../src/store/study-store";

// Figma 9:224 e 13:1538: galhos 852×1847 desenhados em 321×696 a partir de x = -1. Cada imagem leva três exercícios,
// de baixo para cima; as imagens se empilham quando a etapa tem mais lições.
const TILE = { width: 321, height: 696 };
/**
 * Centro e topo de cada cartão e centro da bolinha, relativos ao topo da imagem. Cada galho tem sua pose do Jagua
 * (13:1538), mostrada só no galho do exercício atual: deitado no de baixo, sentado no do meio, espiando no de cima.
 */
const SLOTS = [
  { x: 163, y: 410.5, dot: [164, 399.5], jagua: { source: jaguaLying, left: 18.5, top: 373.2, width: 97.15, height: 64.77, rotate: "-4.77deg" } },
  { x: 74, y: 242.5, dot: [135, 263.5], jagua: { source: jaguaSitting, left: 164, top: 241.5, width: 86, height: 74, rotate: "0deg" } },
  { x: 163, y: 105.5, dot: [102, 125.5], jagua: { source: jaguaPeek, left: 124.2, top: 66.1, width: 71.63, height: 47.75, rotate: "0.52deg" } },
] as const;
/** No Figma a imagem desce 68,5 px abaixo do topo do menu. */
const UNDER_NAV = 68.5;
const STATUS_LABEL: Record<TrailStatus, string> = { done: "concluído", current: "próximo", available: "liberado", locked: "bloqueado" };

export default function TrailStageScreen() {
  const { stage: stageId } = useLocalSearchParams<{ stage: string }>();
  const stage = trailStage(stageId);
  const progress = useStudyStore((state) => state.progress);
  const tracks = useContentStore((state) => state.tracks);
  const { width } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  // Medidas para abrir já no galho atual: só rola quando a tela, o conteúdo e o menu foram medidos.
  const sizes = useRef({ viewport: 0, content: 0, nav: 0, scrolled: false });
  if (!stage) return <Redirect href="/lessons" />;

  const k = width / TILE.width;
  const tileHeight = TILE.height * k;
  const units = unitsForStage(tracks, stage);
  const next = nextTrailUnit(tracks, progress);
  const statuses = units.map((unit) => unitStatus(unit, progress, next));
  const tiles = Math.max(1, Math.ceil(units.length / SLOTS.length));
  // O Jagua fica no exercício atual; com a etapa toda feita, no último concluído; em etapa fechada, some.
  const currentIndex = statuses.indexOf("current");
  const jaguaIndex = currentIndex >= 0 ? currentIndex : statuses.lastIndexOf("done");
  const focusIndex = Math.max(0, jaguaIndex);
  const focusTile = Math.floor(focusIndex / SLOTS.length);
  const tileTop = (tile: number) => (tiles - 1 - tile) * tileHeight;

  // Abre com o exercício atual no meio da área visível, acima do menu.
  const scrollToCurrent = () => {
    const { viewport, content, nav, scrolled } = sizes.current;
    if (scrolled || !viewport || !content || !nav) return;
    const paddingBottom = Math.max(0, nav - UNDER_NAV * k);
    // O conteúdo ainda não recebeu o espaço do menu: espera a próxima medição.
    if (Math.abs(content - Math.max(viewport, paddingBottom + tiles * tileHeight)) > 1) return;
    const treeTop = content - paddingBottom - tiles * tileHeight;
    const cardCenter = treeTop + tileTop(focusTile) + (SLOTS[focusIndex % SLOTS.length].y + 21) * k;
    const y = Math.min(Math.max(0, cardCenter - (viewport - nav) / 2), Math.max(0, content - viewport));
    sizes.current.scrolled = true;
    // Um quadro depois do layout: no Android o scrollTo logo na medição às vezes é ignorado.
    requestAnimationFrame(() => scroll.current?.scrollTo({ y, animated: false }));
  };

  return <TrailScene scale={k}>
    {(navHeight) => {
      if (navHeight && !sizes.current.nav) { sizes.current.nav = navHeight; scrollToCurrent(); }
      return <ScrollView
        ref={scroll}
        style={StyleSheet.absoluteFill}
        accessibilityLabel={`Trilha ${stage.title}`}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(0, navHeight - UNDER_NAV * k) }]}
        onLayout={(event) => { sizes.current.viewport = event.nativeEvent.layout.height; scrollToCurrent(); }}
        onContentSizeChange={(_, contentHeight) => { sizes.current.content = contentHeight; scrollToCurrent(); }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: tiles * tileHeight }}>
          {Array.from({ length: tiles }, (_, tile) => (
            <Image key={tile} accessible={false} source={branches} resizeMode="stretch" style={{ position: "absolute", left: -k, top: tileTop(tile), width: TILE.width * k, height: tileHeight }} />
          ))}
          {jaguaIndex >= 0 && (() => {
            const { source, left, top, width: w, height: h, rotate } = SLOTS[jaguaIndex % SLOTS.length].jagua;
            return <Image accessible={false} source={source} resizeMode="contain" style={{ position: "absolute", left: left * k, top: tileTop(focusTile) + top * k, width: w * k, height: h * k, transform: [{ rotate }] }} />;
          })()}
          {units.map((unit, index) => {
            const slot = SLOTS[index % SLOTS.length];
            const top = tileTop(Math.floor(index / SLOTS.length));
            const status = statuses[index];
            const number = String(index + 1).padStart(2, "0");
            const size = 12 * k;
            return <View key={unit.id} style={StyleSheet.absoluteFill} pointerEvents="box-none">
              <TrailDot reached={status === "done" || status === "current"} size={size} style={{ position: "absolute", left: slot.dot[0] * k - size / 2, top: top + slot.dot[1] * k - size / 2 }} />
              <TrailCard
                label={`Exercício ${number}`}
                status={status}
                scale={k}
                fontSize={status === "current" ? 12 : 9}
                accessibilityLabel={`Exercício ${index + 1} de ${units.length}, ${unit.title}, ${STATUS_LABEL[status]}`}
                onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: unit.id } })}
                style={{ left: (slot.x - 50) * k, top: top + slot.y * k }}
              />
            </View>;
          })}
        </View>
      </ScrollView>;
    }}
  </TrailScene>;
}

const styles = StyleSheet.create({
  // Etapa curta em tela alta: a árvore fica apoiada no menu e sobra creme em cima.
  content: { flexGrow: 1, justifyContent: "flex-end" },
});
