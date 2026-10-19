import { Link, Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AudioButton } from "../src/components/AudioButton";
import { Screen } from "../src/components/Screen";
import { levelLabel, type LearningLevelId } from "../src/domain/levels";
import { getSetting, PLACEMENT_DONE_KEY, PLACEMENT_LEVEL_KEY } from "../src/storage/database";
import { colors } from "../src/theme";
import { useAuthStore } from "../src/store/auth-store";

export default function Home() {
  const status = useAuthStore((state) => state.status);
  const [placementDone, setPlacementDone] = useState<boolean | null>(null);
  const [placementLevel, setPlacementLevel] = useState<LearningLevelId | null>(null);

  useEffect(() => {
    if (status === "anonymous") return;
    void Promise.all([getSetting(PLACEMENT_DONE_KEY), getSetting(PLACEMENT_LEVEL_KEY)]).then(([done, level]) => {
      setPlacementDone(done === "1");
      const parsed = Number(level);
      setPlacementLevel(parsed >= 1 && parsed <= 5 ? (parsed as LearningLevelId) : null);
    });
  }, [status]);

  if (status === "anonymous") return <Redirect href="/auth" />;
  if (placementDone === null) return <Screen><Text style={styles.body}>Preparando…</Text></Screen>;
  if (placementDone === false) return <Redirect href="/placement" />;

  return (
    <Screen>
      <View>
        <Text style={styles.eyebrow}>PROSA</Text>
        <Text style={styles.title}>Ler é descobrir um novo mundo</Text>
        <Text style={styles.body}>Atividades curtas, guiadas por áudio, no seu ritmo.</Text>
        {placementLevel ? <Text style={styles.hint}>Sugestão do nivelamento: {levelLabel(placementLevel)}</Text> : null}
      </View>
      <AudioButton label="Ouvir boas-vindas" text="Bem-vindo ao Prosa. Ler é descobrir um novo mundo. Vamos praticar no seu ritmo." />
      <Link href="/lessons" asChild>
        <Pressable style={styles.primary} accessibilityRole="button">
          <Text style={styles.primaryText}>Começar estudo</Text>
        </Pressable>
      </Link>
      <Link href="/progress" asChild>
        <Pressable style={styles.secondary} accessibilityRole="button">
          <Text style={styles.secondaryText}>Ver meu progresso</Text>
        </Pressable>
      </Link>
      <Link href="/placement" asChild>
        <Pressable style={styles.link} accessibilityRole="button">
          <Text style={styles.linkText}>Refazer nivelamento</Text>
        </Pressable>
      </Link>
      <Text style={styles.privacy}>Guardamos apenas o resultado das atividades para acompanhar seu progresso.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.accent, fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  title: { color: colors.text, fontSize: 30, fontWeight: "800", marginTop: 8 },
  body: { color: colors.muted, fontSize: 19, lineHeight: 28, marginTop: 10 },
  hint: { color: colors.primary, fontSize: 16, fontWeight: "700", marginTop: 12 },
  primary: { minHeight: 64, backgroundColor: colors.primary, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "white", fontSize: 20, fontWeight: "800" },
  secondary: { minHeight: 60, borderWidth: 2, borderColor: colors.primary, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.primary, fontSize: 18, fontWeight: "700" },
  link: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  linkText: { color: colors.primary, fontSize: 16, fontWeight: "700", textDecorationLine: "underline" },
  privacy: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: "auto" },
});
