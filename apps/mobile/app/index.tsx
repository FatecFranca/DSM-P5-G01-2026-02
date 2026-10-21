import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { IntroScreen } from "../src/components/IntroScreen";
import { Screen } from "../src/components/Screen";
import { getSetting, PLACEMENT_DONE_KEY } from "../src/storage/database";
import { colors, fonts } from "../src/theme";
import { useAuthStore } from "../src/store/auth-store";

/** Rota de entrada, sem tela própria: login, depois introdução e nivelamento no primeiro acesso, depois a Trilha. */
export default function Entry() {
  const status = useAuthStore((state) => state.status);
  const [placementDone, setPlacementDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (status === "anonymous") return;
    void getSetting(PLACEMENT_DONE_KEY).then((done) => setPlacementDone(done === "1"));
  }, [status]);

  if (status === "anonymous") return <Redirect href="/auth" />;
  if (placementDone === null) return <Screen><Text style={styles.body}>Preparando…</Text></Screen>;
  if (placementDone === false) return <IntroScreen />;
  return <Redirect href="/lessons" />;
}

const styles = StyleSheet.create({
  body: { color: colors.muted, fontSize: 19, lineHeight: 28, marginTop: 10, fontFamily: fonts.regular },
});
