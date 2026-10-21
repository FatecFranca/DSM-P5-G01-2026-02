import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getLeagueBoard, type LeaderboardEntry, type LeagueBoard } from "../src/api/client";
import { AudioButton } from "../src/components/AudioButton";
import { RankMedal } from "../src/components/brand/Badges";
import { AvatarJagua, MascotWave } from "../src/components/brand/Decor";
import { LeagueBadge } from "../src/components/brand/LeagueBadge";
import { BottomNav } from "../src/components/ui/BottomNav";
import { daysLeft, LEAGUES, leagueIndex, nextLeagueText, weekEndText } from "../src/domain/league";
import { withSession } from "../src/sync/session-retry";
import { syncNow } from "../src/sync/use-sync";
import { colors, FIGMA_FRAME_WIDTH, fonts } from "../src/theme";

const TOP_SIZE = 10;
// Com tão pouca gente na liga, o placar fica vazio: a tela convida a trazer alguém em vez de mostrar só a pessoa.
const FEW_MEMBERS = 3;
const INVITE = "Ainda tem pouca gente nesta liga. Convide alguém para aprender a ler com você!";

/** Uma linha do placar da semana: medalha (ou número), avatar, nome e pontos; a linha da pessoa fica verde. */
function RankRow({ entry, scale, last }: { entry: LeaderboardEntry; scale: number; last: boolean }) {
  const medal = entry.position <= 3 ? (entry.position as 1 | 2 | 3) : null;
  const label = `${entry.me ? "Você" : entry.name}, ${entry.position}º lugar, ${entry.points} pontos nesta semana`;
  return <View accessible accessibilityLabel={label} style={[styles.row, entry.me && styles.rowMe, !last && styles.rowDivider]}>
    <View style={styles.rank}>
      {medal ? <RankMedal rank={medal} size={28 * scale} /> : <Text style={[styles.rankText, entry.me && styles.textMe]}>{entry.position}</Text>}
    </View>
    <AvatarJagua size={40 * scale} />
    <Text style={[styles.name, entry.me && styles.textMe]} numberOfLines={1}>{entry.me ? "Você" : entry.name}</Text>
    <Text style={[styles.points, entry.me && styles.textMe]}>{entry.points} pts</Text>
  </View>;
}

/** Faixa de selos: as ligas já alcançadas coloridas, a atual em destaque, as próximas em cinza. */
function LeagueStrip({ current, scale }: { current: number; scale: number }) {
  return <View style={styles.strip} accessible={false}>
    {LEAGUES.map((league, index) => <LeagueBadge key={league.id} id={league.id} size={(index === current ? 78 : 40) * scale} locked={index > current} />)}
  </View>;
}

/** Aba Ranking, no estilo das ligas do Duolingo: a liga vem dos pontos acumulados e o placar é da semana. */
export default function Ranking() {
  const s = useWindowDimensions().width / FIGMA_FRAME_WIDTH;
  const [board, setBoard] = useState<LeagueBoard | null>(null);
  const [failed, setFailed] = useState(false);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    let cancelled = false;
    // Sincroniza antes: as lições recém-feitas só contam no placar depois de chegar ao servidor.
    void syncNow().catch(() => undefined).then(() => withSession((token) => getLeagueBoard(token, TOP_SIZE)))
      .then((result) => { if (!cancelled) setBoard(result); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  const current = board ? leagueIndex(board.league.id) : 0;
  const days = board ? daysLeft(board.endsAt, new Date()) : 0;
  const meInTop = board?.entries.some((entry) => entry.me) ?? false;
  const rows = board ? [...board.entries, ...(meInTop ? [] : [board.me])] : [];
  const few = board !== null && board.members < FEW_MEMBERS;
  const gap = board !== null && !meInTop && board.me.position > board.entries.length + 1;
  const spoken = board
    ? `Liga ${board.league.name}. ${weekEndText(days)}. Você está em ${board.me.position}º lugar, com ${board.me.points} pontos nesta semana. ${nextLeagueText(board.totalPoints, board.next)}.${few ? ` ${INVITE}` : ""}`
    : "Ranking. Veja quem mais praticou nesta semana.";

  return <SafeAreaView style={styles.safe} edges={["top"]}>
    <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: 16 * s, paddingBottom: insets.bottom + 120 }]}>
      <View style={styles.hero}>
        <LeagueStrip current={current} scale={s} />
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" style={styles.title}>{board ? `Liga ${board.league.name}` : "Ranking"}</Text>
          <AudioButton label="Ouvir o ranking" text={spoken} compact />
        </View>
        {board && <Text style={styles.subtitle}>{weekEndText(days)}</Text>}
      </View>

      <View style={styles.card}>
        {!board && !failed && <ActivityIndicator style={styles.status} color={colors.action} accessibilityLabel="Carregando o ranking" />}
        {failed && <Text style={[styles.status, styles.offline]}>Conecte-se à internet para ver o ranking.</Text>}
        {rows.map((entry, index) => <View key={`${entry.position}-${entry.name}-${entry.me}`}>
          {gap && entry.me && <Text accessible={false} style={styles.dots}>⋮</Text>}
          <RankRow entry={entry} scale={s} last={index === rows.length - 1} />
        </View>)}
      </View>

      {few && <View style={styles.invite}>
        <MascotWave width={64 * s} />
        <Text style={styles.inviteText}>{INVITE}</Text>
      </View>}

      {board && <Text style={styles.footer}>{nextLeagueText(board.totalPoints, board.next)}</Text>}
    </ScrollView>
    <BottomNav active="ranking" />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { gap: 18, paddingTop: 12 },
  hero: { alignItems: "center", gap: 6 },
  strip: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 96 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.text },
  subtitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.accent },
  card: { backgroundColor: "#FFFFFF", borderRadius: 18, overflow: "hidden", borderWidth: 2, borderColor: "#ECE4D6" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingHorizontal: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: "#ECE4D6" },
  rowMe: { backgroundColor: "#DDF2D4" },
  rank: { width: 30, alignItems: "center" },
  rankText: { fontFamily: fonts.bold, fontSize: 17, color: colors.muted },
  name: { flex: 1, fontFamily: fonts.bold, fontSize: 17, color: colors.text, textTransform: "capitalize" },
  points: { fontFamily: fonts.semibold, fontSize: 16, color: colors.muted },
  textMe: { color: colors.action },
  dots: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.muted, textAlign: "center", borderBottomWidth: 1, borderBottomColor: "#ECE4D6" },
  status: { paddingVertical: 28 },
  offline: { fontFamily: fonts.medium, fontSize: 16, color: colors.muted, textAlign: "center" },
  invite: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, backgroundColor: "#E0E6D4" },
  inviteText: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.text },
  footer: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text, textAlign: "center" },
});
