import { router, usePathname } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, palette, shadows } from "../../theme";
import { CrownIcon } from "../brand/Badges";
import { PointsPaw, UserIcon } from "../brand/Decor";

export type BottomTab = "ranking" | "trilhas" | "perfil";
const ROUTES = { ranking: "/ranking", trilhas: "/lessons", perfil: "/profile" } as const;
const INACTIVE = "#777368";

/**
 * Menu inferior do Figma (1:172): Ranking e Perfil nas laterais, Trilhas num círculo azul que salta da barra.
 * A aba Home do Figma saiu: tudo o que ela mostrava já existe na Trilha e no Perfil.
 * Troca de aba com replace, como um menu de abas: não empilha telas no voltar.
 */
export function BottomNav({ active }: { active: BottomTab }) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  // Numa tela interna da aba (os exercícios de uma etapa da trilha), tocar na própria aba volta para a raiz dela.
  const go = (tab: BottomTab) => {
    if (tab !== active) router.replace(ROUTES[tab]);
    else if (pathname !== ROUTES[tab]) { if (router.canGoBack()) router.back(); else router.replace(ROUTES[tab]); }
  };
  const side = (tab: BottomTab, label: string, icon: (color: string) => ReactNode) => {
    const selected = tab === active;
    return <Pressable accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} onPress={() => go(tab)} style={styles.side}>
      <View style={[styles.sideInner, selected && styles.selected]}>
        {icon(selected ? colors.action : INACTIVE)}
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      </View>
    </Pressable>;
  };
  return <View accessibilityRole="tablist" style={[styles.bar, { paddingBottom: insets.bottom }]}>
    {side("ranking", "Ranking", (color) => <CrownIcon size={24} color={color} />)}
    <Pressable accessibilityRole="tab" accessibilityLabel="Trilhas" accessibilityState={{ selected: active === "trilhas" }} onPress={() => go("trilhas")} style={styles.center}>
      <View style={styles.circle}><PointsPaw width={40} variant="white" /></View>
      <Text style={[styles.label, active === "trilhas" && styles.labelSelected]}>Trilhas</Text>
    </Pressable>
    {side("perfil", "Perfil", (color) => <UserIcon size={24} color={color} />)}
  </View>;
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 22, backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, ...shadows.card },
  side: { minWidth: 72, alignItems: "center" },
  // Destaque da aba ativa: caixa verde translúcida colada na base, como no Figma (rgba(52,168,83,0.4) sobre o creme).
  sideInner: { alignItems: "center", justifyContent: "flex-end", gap: 2, minWidth: 64, minHeight: 58, paddingTop: 8, paddingBottom: 6, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  selected: { backgroundColor: "#ADD3A8" },
  center: { alignItems: "center", paddingBottom: 6, marginTop: -34 },
  circle: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: palette.white, backgroundColor: palette.blue, alignItems: "center", justifyContent: "center", ...shadows.card },
  label: { fontFamily: fonts.regular, fontSize: 12, color: INACTIVE, textTransform: "uppercase" },
  labelSelected: { color: colors.action },
});
