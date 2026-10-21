import { router } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AudioButton } from "../src/components/AudioButton";
import { AchievementBadge } from "../src/components/brand/Badges";
import { MascotWave } from "../src/components/brand/Decor";
import { AchievementUnlockedCard } from "../src/components/ui/AchievementUnlockedCard";
import { BottomNav } from "../src/components/ui/BottomNav";
import { ProfileBackdrop } from "../src/components/ui/ProfileCards";
import { formatAchievementDate, type AchievementStatus } from "../src/domain/achievements";
import { markCelebrated, useAchievements } from "../src/profile/achievements";
import { colors, FIGMA_FRAME_WIDTH, fonts } from "../src/theme";

const INTRO = "Colecione selos e mostre tudo o que você já conquistou!";

const spoken = (item: AchievementStatus) => item.unlocked
  ? `${item.title}. Conquistado${item.achievedAt ? ` em ${formatAchievementDate(item.achievedAt)}` : ""}.`
  : `${item.title}. ${item.description} Você tem ${item.current} de ${item.target}.`;

/** Um selo da grade: conquistado mostra a data; bloqueado, a barra de progresso (Figma 9:435). Tocar lê o selo. */
function BadgeCell({ item, width, scale }: { item: AchievementStatus; width: number; scale: number }) {
  const ratio = item.target ? Math.min(1, item.current / item.target) : 0;
  const speak = () => { void Speech.stop().then(() => Speech.speak(spoken(item), { language: "pt-BR", rate: 0.85, pitch: 1 })); };
  return <Pressable accessibilityRole="button" accessibilityLabel={spoken(item)} accessibilityHint="Toque para ouvir" onPress={speak} style={({ pressed }) => [styles.cell, { width }, pressed && styles.pressed]}>
    <AchievementBadge icon={item.icon} tone={item.tone} unlocked={item.unlocked} size={64 * scale} />
    <Text style={styles.cellTitle} numberOfLines={3}>{item.title}</Text>
    {item.unlocked
      ? item.achievedAt && <Text style={styles.cellMeta}>{formatAchievementDate(item.achievedAt)}</Text>
      : <View style={styles.progressRow}>
        <View style={styles.track}><View style={[styles.fill, { width: `${ratio * 100}%` }]} /></View>
        <Text style={styles.cellMeta}>{item.current}/{item.target}</Text>
      </View>}
  </Pressable>;
}

/** Tela "Minhas conquistas" do Figma (9:435): faixa com o Jagua e a grade de selos, conquistados primeiro. */
export default function Achievements() {
  const { width } = useWindowDimensions();
  const s = width / FIGMA_FRAME_WIDTH;
  const { board, fresh } = useAchievements();
  const [queue, setQueue] = useState<AchievementStatus[]>([]);
  const insets = useSafeAreaInsets();
  const close = () => (router.canGoBack() ? router.back() : router.replace("/profile"));
  // Conquistas de placar (pódio, primeiro lugar) só são descobertas aqui, com a rede: o pop-up aparece nesta tela.
  useEffect(() => { setQueue(board.filter((item) => fresh.includes(item.id))); }, [board, fresh]);
  useEffect(() => () => { void Speech.stop(); }, []);
  const dismiss = () => { const [current, ...rest] = queue; if (current) void markCelebrated([current.id]); setQueue(rest); };

  const gutter = 16 * s;
  const cellWidth = (width - gutter * 2 - 8 * 2) / 3;
  const unlocked = board.filter((item) => item.unlocked).length;
  return <SafeAreaView style={styles.safe} edges={["top"]}>
    <ProfileBackdrop />
    <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: gutter, paddingBottom: insets.bottom + 120 }]}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>Minhas conquistas</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={12} onPress={close} style={styles.close}><Text style={styles.closeText}>X</Text></Pressable>
      </View>
      <View style={styles.bannerRow}>
        <AudioButton label="Ouvir" text={`${INTRO} Você já tem ${unlocked} de ${board.length} selos.`} compact />
        <View style={[styles.banner, { minHeight: 85 * s, paddingRight: 92 * s }]}>
          <Text style={styles.bannerText}>{INTRO}</Text>
          <View pointerEvents="none" style={[styles.mascotClip, { width: 100 * s, height: 96 * s }]}>
            <MascotWave width={84 * s} style={{ marginLeft: 12 * s, marginTop: 2 * s }} />
          </View>
        </View>
      </View>
      <Text style={styles.count}>{unlocked} de {board.length} selos</Text>
      <View style={styles.grid}>
        {board.map((item) => <BadgeCell key={item.id} item={item} width={cellWidth} scale={s} />)}
      </View>
    </ScrollView>
    <BottomNav active="perfil" />
    <Modal visible={queue.length > 0} animationType="fade" onRequestClose={dismiss}>
      {queue[0] && <AchievementUnlockedCard achievement={queue[0]} onContinue={dismiss} />}
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { gap: 18, paddingTop: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 48 },
  title: { fontFamily: fonts.bold, fontSize: 22, color: colors.text, textAlign: "center", textTransform: "uppercase" },
  close: { position: "absolute", right: 0, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.track, alignItems: "center", justifyContent: "center" },
  closeText: { fontFamily: fonts.regular, fontSize: 18, color: colors.muted },
  bannerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  // Faixa verde-clara (#E0E6D4) com o Jagua acenando saindo pela direita.
  banner: { flex: 1, justifyContent: "center", paddingLeft: 12, paddingVertical: 10, borderRadius: 15, backgroundColor: "#E0E6D4" },
  bannerText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 17, color: colors.text, textAlign: "center", textTransform: "uppercase" },
  mascotClip: { position: "absolute", right: -6, bottom: 0, overflow: "hidden" },
  count: { fontFamily: fonts.semibold, fontSize: 15, color: colors.muted, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", columnGap: 8, rowGap: 22 },
  cell: { alignItems: "center", gap: 4 },
  pressed: { opacity: 0.7 },
  cellTitle: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 15, color: colors.text, textAlign: "center" },
  cellMeta: { fontFamily: fonts.medium, fontSize: 12, color: "#959392" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  track: { width: 46, height: 8, borderRadius: 30, backgroundColor: "#D9D9D9", overflow: "hidden" },
  fill: { height: 8, borderRadius: 30, backgroundColor: colors.action },
});
