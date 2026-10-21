import { router } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AvatarJagua } from "../src/components/brand/Decor";
import { BottomNav } from "../src/components/ui/BottomNav";
import { LinkCard, PointsCard, ProfileBackdrop, StreakCard } from "../src/components/ui/ProfileCards";
import { useLearnerStats } from "../src/profile/useLearnerStats";
import { setSetting, USER_NAME_KEY } from "../src/storage/database";
import { useAuthStore } from "../src/store/auth-store";
import { colors, FIGMA_FRAME_WIDTH, fonts } from "../src/theme";

// Tela "Meu Perfil" do Figma (/config, 1:94): avatar, nome, pontuação, dias seguidos e sair.
export default function Profile() {
  const s = useWindowDimensions().width / FIGMA_FRAME_WIDTH;
  const { name, points, streak, position } = useLearnerStats();
  const logout = useAuthStore((state) => state.logout);
  // O progresso fica no aparelho; só a sessão e o nome guardado saem.
  const confirmLogout = () => Alert.alert("Sair da conta?", "Suas lições continuam salvas neste aparelho.", [
    { text: "Cancelar", style: "cancel" },
    { text: "Sair", style: "destructive", onPress: () => { void setSetting(USER_NAME_KEY, "").then(logout).then(() => router.replace("/auth")); } },
  ]);
  const navSpace = useSafeAreaInsets().bottom + 110;
  return <SafeAreaView style={styles.safe} edges={["top"]}>
    <ProfileBackdrop />
    <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: 16 * s, paddingBottom: navSpace }]}>
      <Text accessibilityRole="header" style={styles.title}>Meu Perfil</Text>
      <View style={styles.identity}>
        <AvatarJagua size={100 * s} />
        <Text style={styles.name} numberOfLines={1} accessibilityLabel={name ? `Nome: ${name}` : "Nome não informado"}>{name ?? " "}</Text>
      </View>
      <View>
        <PointsCard points={points} position={position} />
        <View style={{ height: 18 * s }} />
        <StreakCard streak={streak} />
        <View style={{ height: 18 * s }} />
        <LinkCard label="Minhas conquistas" audio="Minhas conquistas: veja os selos que você já ganhou" onPress={() => router.push("/achievements")} />
        <View style={{ height: 18 * s }} />
        <LinkCard label="Sair" audio="Sair da conta" onPress={confirmLogout} />
      </View>
    </ScrollView>
    <BottomNav active="perfil" />
  </SafeAreaView>;
}

// Figma 1:94: título, identidade e cartões ocupam a altura toda, com espaço sobrando dividido entre os blocos.
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: "space-evenly", paddingTop: 8 },
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.text, textAlign: "center" },
  identity: { alignItems: "center", gap: 10 },
  name: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, color: colors.text, textAlign: "center" },
});
