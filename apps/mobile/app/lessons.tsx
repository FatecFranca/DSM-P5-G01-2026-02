import { router } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line } from "react-native-svg";
import tree from "../assets/trail/tree.webp";
import { TrailCorner } from "../src/components/brand/Decor";
import { TRAIL_LINE, TrailCard, TrailDot, TrailScene } from "../src/components/ui/Trail";
import { useContentStore } from "../src/content/store";
import { nextTrailUnit, stageStatus, TRAIL_STAGES, unitsForStage, type TrailStageId, type TrailStatus } from "../src/domain/trail";
import { useStudyStore } from "../src/store/study-store";
import { FIGMA_FRAME_WIDTH, fonts, palette } from "../src/theme";

// Posições do Figma (9:138, quadro de 320 px): centro e topo de cada cartão, bolinha do caminho e fonte do rótulo.
const LAYOUT: Record<TrailStageId, { x: number; y: number; dot: [number, number]; fontSize: number; label: string }> = {
  "letras": { x: 174, y: 417, dot: [174, 406], fontSize: 15, label: "Letras" },
  "vogais": { x: 265, y: 317, dot: [204, 340], fontSize: 13, label: "Vogais" },
  "consoantes": { x: 59, y: 297, dot: [120, 319], fontSize: 9, label: "Consoantes" },
  "silabas-simples": { x: 265, y: 227, dot: [204, 248], fontSize: 11, label: "Sílabas\nsimples" },
  "silabas-complexas": { x: 59, y: 197, dot: [120, 218], fontSize: 10, label: "Sílabas\ncomplexas" },
  "palavras": { x: 174, y: 87, dot: [174, 140], fontSize: 12, label: "Palavras" },
};
// A árvore no Figma: imagem 1024×1536 em "cover", desenhada em 349,3×524 a partir de (-10,15; 51).
const TREE = { left: -10.15, top: 51, width: 349.3, height: 524 };
const STATUS_LABEL: Record<TrailStatus, string> = { done: "concluída", current: "etapa atual", available: "liberada", locked: "bloqueada" };

export default function Lessons() {
  const progress = useStudyStore((state) => state.progress);
  const tracks = useContentStore((state) => state.tracks);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const s = width / FIGMA_FRAME_WIDTH;
  const next = nextTrailUnit(tracks, progress);
  const stages = TRAIL_STAGES.map((stage) => {
    const units = unitsForStage(tracks, stage);
    return { stage, units, status: stageStatus(units, progress, next) };
  });

  return <TrailScene scale={s}>
    {(navHeight) => {
      // A árvore cabe entre o título e o menu, apoiada no menu; em telas altas sobra creme em cima, nunca corta os galhos.
      const titleBottom = insets.top + 51 * s;
      const bottom = height - navHeight + 14 * s;
      const k = Math.max(0.1, Math.min((bottom - titleBottom) / TREE.height, s));
      const treeWidth = TREE.width * k;
      const treeLeft = (width - treeWidth) / 2;
      const treeTop = bottom - TREE.height * k;
      const at = (x: number, y: number) => ({ x: treeLeft + (x - TREE.left) * k, y: treeTop + (y - TREE.top) * k });
      const dots = stages.map(({ stage }) => at(...LAYOUT[stage.id].dot));
      const cardWidth = 100 * k;

      return <View style={StyleSheet.absoluteFill} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
        {height > 0 && <>
          <Image accessible={false} source={tree} resizeMode="stretch" style={{ position: "absolute", left: treeLeft, top: treeTop, width: treeWidth, height: TREE.height * k }} />
          <TrailCorner side="left" scale={s} />
          <TrailCorner side="right" scale={s} />
          <Text accessibilityRole="header" style={[styles.title, { top: insets.top + 12 * s, fontSize: 20 * s }]}>Trilha</Text>

          <Svg accessible={false} pointerEvents="none" style={StyleSheet.absoluteFill}>
            {dots.slice(1).map((dot, index) => (
              <Line key={index} x1={dots[index].x} y1={dots[index].y} x2={dot.x} y2={dot.y} stroke={TRAIL_LINE} strokeWidth={2 * k} strokeDasharray={`${3.74 * k} ${3.74 * k}`} />
            ))}
          </Svg>
          {stages.map(({ stage, status }, index) => {
            const size = 12 * k;
            return <TrailDot key={stage.id} reached={status === "done" || status === "current"} size={size} style={{ position: "absolute", left: dots[index].x - size / 2, top: dots[index].y - size / 2 }} />;
          })}

          {stages.map(({ stage, units, status }) => {
            const layout = LAYOUT[stage.id];
            const point = at(layout.x, layout.y);
            const left = Math.min(Math.max(point.x - cardWidth / 2, 6), width - cardWidth - 6);
            const shown = units.length ? status : "locked";
            return <TrailCard
              key={stage.id}
              label={layout.label}
              status={shown}
              scale={k}
              fontSize={layout.fontSize}
              accessibilityLabel={`${stage.title}, ${STATUS_LABEL[shown]}`}
              onPress={() => router.push({ pathname: "/trail/[stage]", params: { stage: stage.id } })}
              style={{ left, top: point.y }}
            />;
          })}
        </>}
      </View>;
    }}
  </TrailScene>;
}

const styles = StyleSheet.create({
  title: { position: "absolute", left: 0, right: 0, textAlign: "center", fontFamily: fonts.bold, color: palette.navy, textTransform: "uppercase" },
});
