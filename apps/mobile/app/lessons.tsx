import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { AudioButton } from "../src/components/AudioButton";
import { CornerShape, LockIcon, MascotPeek, PawIcon } from "../src/components/brand/Decor";
import { Screen } from "../src/components/Screen";
import { useContentStore } from "../src/content/store";
import { isLessonUnlocked, lessonNeedsReview } from "../src/domain/learning";
import { LEARNING_LEVELS, levelForUnitKind, unitsForLevel, type LearningLevelId } from "../src/domain/levels";
import type { Unit } from "../src/domain/types";
import { useStudyStore } from "../src/store/study-store";
import { colors, FIGMA_FRAME_WIDTH, fonts, palette, radius, shadows } from "../src/theme";

type UnitState = { done: boolean; unlocked: boolean; review: boolean };
type NodeKind = "done" | "current" | "available" | "review" | "locked";

// Zigue-zague da trilha: deslocamento horizontal de cada pata (em px do frame 320), repetido a cada 4 lições.
const ZIGZAG = [0, 56, 0, -56] as const;
const PAW = 68;
const PAW_CURRENT = 86;

/** Nome falado e escrito da unidade: "letra B" na trilha fônica, o título nas temáticas. */
const unitName = (unit: Unit) => (unit.letter ? `letra ${unit.letter}` : unit.title);
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export default function Lessons() {
  const progress = useStudyStore((state) => state.progress);
  const itemStates = useStudyStore((state) => state.itemStates);
  const tracks = useContentStore((state) => state.tracks);
  const s = useWindowDimensions().width / FIGMA_FRAME_WIDTH;
  const now = new Date();
  const stateOf = (unit: Unit): UnitState => {
    const done = progress[unit.id]?.completed === true;
    return { done, unlocked: done || isLessonUnlocked(unit, progress), review: lessonNeedsReview(unit, itemStates, now) };
  };

  const phonics = tracks.find((track) => track.kind === "phonics");
  const phonicsUnits = [...(phonics?.units ?? [])].sort((a, b) => (a.phase ?? 0) - (b.phase ?? 0) || a.order - b.order);
  const unitsOf = (levelId: LearningLevelId): Unit[] => (levelId === 1 ? phonicsUnits : unitsForLevel(tracks, levelId));
  const ordered = ([1, 2, 3, 4] as const).flatMap(unitsOf);
  const reviewUnits = ordered.filter((unit) => stateOf(unit).unlocked && stateOf(unit).review);
  // Próxima lição: a primeira liberada e não concluída; sem nenhuma, a primeira revisão pendente.
  const nextUnit = ordered.find((unit) => stateOf(unit).unlocked && !stateOf(unit).done) ?? reviewUnits[0] ?? null;
  const nextIsReview = nextUnit !== null && stateOf(nextUnit).done;

  const nodeKind = (unit: Unit): NodeKind => {
    const { done, unlocked, review } = stateOf(unit);
    if (unit.id === nextUnit?.id) return "current";
    if (review && unlocked) return "review";
    if (done) return "done";
    return unlocked ? "available" : "locked";
  };

  const bubbleText = nextUnit === null
    ? "Você completou tudo! Volte amanhã para revisar."
    : nextIsReview
      ? `Hora de revisar: ${unitName(nextUnit)}.`
      : `Vamos continuar? Próxima lição: ${unitName(nextUnit)}.`;

  const node = (unit: Unit, index: number, position: number, total: number) => {
    const kind = nodeKind(unit);
    const { done, review } = stateOf(unit);
    const current = kind === "current";
    const size = (current ? PAW_CURRENT : PAW) * s;
    const fill = { done: palette.yellow, current: palette.amber, available: colors.surface, review: colors.careBg, locked: "transparent" }[kind];
    const stroke = { done: "none", current: "none", available: colors.primary, review: colors.accent, locked: colors.track }[kind];
    const caption = kind === "review" ? "Revisar" : kind === "done" ? "Concluída" : kind === "current" ? (nextIsReview ? "Revisar" : "Começar") : "";
    const stateLabel = kind === "locked" ? ", bloqueada" : kind === "review" ? ", para revisar" : done ? ", concluída" : current ? ", próxima" : "";
    return (
      <Link key={unit.id} href={{ pathname: "/lesson/[id]", params: { id: unit.id } }} asChild>
        <Pressable
          disabled={kind === "locked"}
          accessibilityRole="button"
          accessibilityLabel={`${capitalize(unitName(unit))}, lição ${position} de ${total}${stateLabel}`}
          style={({ pressed }) => [styles.node, { transform: [{ translateX: ZIGZAG[index % ZIGZAG.length] * s }] }, pressed && styles.pressed]}
        >
          <View style={[styles.paw, { width: size, height: size }, current && styles.pawCurrent]}>
            <PawIcon size={size} fill={fill} stroke={stroke} strokeWidth={stroke === "none" ? 0 : 4} />
            <View style={styles.pawLabel}>
              {kind === "locked"
                ? <LockIcon size={18 * s} />
                : <Text style={[styles.pawText, { fontSize: (current ? 30 : 24) * s }, (kind === "available" || kind === "review") && styles.pawTextMuted]}>{unit.letter ?? String(position)}</Text>}
            </View>
          </View>
          {!unit.letter && <Text style={[styles.nodeTitle, kind === "locked" && styles.nodeTitleLocked]} numberOfLines={2}>{unit.title}</Text>}
          {caption ? <Text style={[styles.caption, (kind === "review" || current) && styles.captionStrong, review && styles.captionReview]}>{caption}</Text> : null}
        </Pressable>
      </Link>
    );
  };

  const path = (units: Unit[], total: number, offset = 0) => (
    <View style={styles.path}>
      <Svg accessible={false} pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Line x1="50%" y1={30 * s} x2="50%" y2="100%" stroke={colors.track} strokeWidth={3} strokeDasharray="8 8" strokeLinecap="round" />
      </Svg>
      {units.map((unit, index) => node(unit, offset + index, offset + index + 1, total))}
    </View>
  );

  const renderLevel = (levelId: LearningLevelId) => {
    const level = LEARNING_LEVELS.find((item) => item.id === levelId)!;
    if (levelId === 5) {
      return (
        <View key={level.id} style={styles.level}>
          <Text style={styles.levelTitle}>{level.title}</Text>
          <Text style={styles.intro}>{level.description}</Text>
          {reviewUnits.length === 0
            ? <Text style={styles.gate}>Nenhuma revisão pendente agora. Continue praticando os níveis anteriores.</Text>
            : path(reviewUnits, reviewUnits.length)}
        </View>
      );
    }
    const units = unitsOf(levelId);
    if (!units.length) return null;
    if (levelId === 1) {
      let offset = 0;
      return (
        <View key={level.id} style={styles.level}>
          <Text style={styles.levelTitle}>{level.title}</Text>
          <Text style={styles.intro}>{level.description}</Text>
          {([1, 2, 3] as const).map((phase) => {
            const items = units.filter((unit) => unit.phase === phase);
            if (!items.length) return null;
            const start = offset;
            offset += items.length;
            return (
              <View key={phase}>
                <Text style={styles.phaseSubtitle}>{items[0].phaseTitle}</Text>
                {path(items, units.length, start)}
              </View>
            );
          })}
        </View>
      );
    }
    return (
      <View key={level.id} style={styles.level}>
        <Text style={styles.levelTitle}>{level.title}</Text>
        <Text style={styles.intro}>{level.description}</Text>
        <Text style={styles.gate}>As atividades abrem conforme as letras que você já domina.</Text>
        {path(units, units.length)}
      </View>
    );
  };

  const continueCard = () => {
    if (nextUnit === null) {
      return (
        <Link href="/progress" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel="Tudo em dia. Ver meu progresso" style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            <View style={styles.cardBadge}><PawIcon size={44 * s} fill={palette.yellow} /></View>
            <View style={styles.cardBody}>
              <Text style={styles.cardEyebrow}>TUDO EM DIA</Text>
              <Text style={styles.cardTitle}>Ver meu progresso</Text>
            </View>
            <Chevron />
          </Pressable>
        </Link>
      );
    }
    const levelId = levelForUnitKind(nextUnit.kind);
    const levelUnits = unitsOf(levelId);
    const position = levelUnits.findIndex((unit) => unit.id === nextUnit.id) + 1;
    const level = LEARNING_LEVELS.find((item) => item.id === levelId)!;
    const title = capitalize(unitName(nextUnit));
    const meta = `Lição ${position} de ${levelUnits.length} · ${level.shortTitle}`;
    return (
      <Link href={{ pathname: "/lesson/[id]", params: { id: nextUnit.id } }} asChild>
        <Pressable accessibilityRole="button" accessibilityLabel={`${nextIsReview ? "Revisar" : "Continuar"}: ${title}. ${meta}`} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
          <View style={styles.cardBadge}>
            <Text style={[styles.cardBadgeText, { fontSize: (nextUnit.letter ? 34 : 24) * s }]}>{nextUnit.letter ?? String(position)}</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardEyebrow}>{nextIsReview ? "REVISAR" : "CONTINUAR"}</Text>
            <Text style={styles.cardTitle} numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
            <Text style={styles.cardMeta}>{meta}</Text>
          </View>
          <Chevron />
        </Pressable>
      </Link>
    );
  };

  return (
    <Screen>
      <CornerShape scale={s} pointerEvents="none" style={{ position: "absolute", top: -30 * s, left: -80 * s }} />
      <Text accessibilityRole="header" style={styles.title}>Trilhas</Text>

      {/* Jagua espia por cima do cartão "Continuar", com um balão de fala à esquerda, como no quiz e nos pop-ups. */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.bubble}>
            <AudioButton label="Ouvir o Jagua" text={bubbleText} compact />
            <Text style={styles.bubbleText}>{bubbleText}</Text>
          </View>
          <MascotPeek width={118 * s} style={[styles.peek, { marginBottom: -6 * s, marginRight: -4 * s }]} />
        </View>
        {continueCard()}
      </View>

      <Text style={styles.intro}>Cinco níveis progressivos: letras, sílabas, palavras, frases e consolidação. As atividades que você errou voltam na mesma sessão.</Text>
      {LEARNING_LEVELS.map((level) => renderLevel(level.id))}
    </Screen>
  );
}

function Chevron() {
  return <Svg accessible={false} width={16} height={26} viewBox="0 0 16 26"><Path d="M3 3l10 10L3 23" fill="none" stroke={colors.primary} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontFamily: fonts.bold, color: colors.text, textAlign: "center" },
  intro: { fontSize: 17, lineHeight: 25, fontFamily: fonts.regular, color: colors.muted },
  gate: { fontSize: 15, lineHeight: 22, fontFamily: fonts.regular, color: colors.muted, marginBottom: 8 },

  hero: { gap: 0 },
  heroTop: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  // zIndex: as patas do Jagua passam por cima da borda do cartão, como nos pop-ups.
  peek: { zIndex: 1 },
  bubble: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18, padding: 12, backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: radius.lg, borderBottomRightRadius: radius.xs, borderBottomLeftRadius: radius.sm, ...shadows.card },
  bubbleText: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },

  card: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 92, paddingVertical: 14, paddingLeft: 14, paddingRight: 18, backgroundColor: colors.surface, borderRadius: radius.md, ...shadows.card },
  cardBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.track, alignItems: "center", justifyContent: "center" },
  cardBadgeText: { fontFamily: fonts.bold, color: colors.text },
  cardBody: { flex: 1, gap: 2 },
  cardEyebrow: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1, color: colors.success },
  cardTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  cardMeta: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },

  level: { marginTop: 10 },
  levelTitle: { fontSize: 21, fontFamily: fonts.bold, color: colors.text, marginTop: 8 },
  phaseSubtitle: { fontSize: 15, fontFamily: fonts.semibold, color: colors.muted, textAlign: "center", marginTop: 14, textTransform: "uppercase", letterSpacing: 1 },

  path: { alignItems: "center", gap: 12, paddingVertical: 10 },
  node: { alignItems: "center", width: 132 },
  paw: { alignItems: "center", justifyContent: "center" },
  pawCurrent: { ...shadows.card },
  // Centro da almofada da pata (69% da altura no PawIcon).
  pawLabel: { position: "absolute", left: 0, right: 0, top: "40%", bottom: 0, alignItems: "center", justifyContent: "center" },
  pawText: { fontFamily: fonts.bold, color: colors.text },
  pawTextMuted: { color: colors.primary },
  nodeTitle: { marginTop: 2, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 19, color: colors.text, textAlign: "center" },
  nodeTitleLocked: { color: colors.muted },
  caption: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted },
  captionStrong: { fontFamily: fonts.semibold, color: colors.success },
  captionReview: { color: colors.accent },
});
