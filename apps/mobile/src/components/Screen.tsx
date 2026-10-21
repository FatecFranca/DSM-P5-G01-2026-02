import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme";
import { BottomNav, type BottomTab } from "./ui/BottomNav";

/**
 * Com `bottomNav`, a tela ganha o menu inferior do Figma. Essas telas não têm cabeçalho, então reservam a margem
 * segura de cima; a de baixo fica com o menu.
 */
export function Screen({ children, bottomNav }: PropsWithChildren<{ bottomNav?: BottomTab }>) {
  return <SafeAreaView style={styles.safe} edges={bottomNav ? ["top"] : ["bottom"]}>
    <ScrollView contentContainerStyle={[styles.content, bottomNav && styles.withNav]}>{children}</ScrollView>
    {bottomNav && <BottomNav active={bottomNav} />}
  </SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, gap: 18, flexGrow: 1 }, withNav: { paddingBottom: 48 } });
