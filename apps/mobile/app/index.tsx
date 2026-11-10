import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { IntroScreen } from "../src/components/IntroScreen";
import { Screen } from "../src/components/Screen";
import { getSetting, PLACEMENT_DONE_KEY } from "../src/storage/database";
import { colors, fonts } from "../src/theme";
import { useAuthStore } from "../src/store/auth-store";
import { syncNow } from "../src/sync/use-sync";

/** Rota de entrada, sem tela própria: login, depois introdução e nivelamento no primeiro acesso, depois a Trilha. */
export default function Entry() {
  const status = useAuthStore((state) => state.status);
  const [placementDone, setPlacementDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (status === "anonymous") return;
    let cancelled = false;
    // Aparelho novo ou reinstalado: antes de mostrar o quiz, tenta trazer da API um nivelamento já feito (até 3 s).
    const restore = (done: string | null) => done === "1" ? Promise.resolve(done)
      : Promise.race([syncNow().catch(() => 0), new Promise((resolve) => setTimeout(resolve, 3000))]).then(() => getSetting(PLACEMENT_DONE_KEY));
    void getSetting(PLACEMENT_DONE_KEY).then(restore).then((done) => { if (!cancelled) setPlacementDone(done === "1"); });
    return () => { cancelled = true; };
  }, [status]);

  if (status === "anonymous") return <Redirect href="/auth" />;
  if (placementDone === null) return <Screen><Text style={styles.body}>Preparando…</Text></Screen>;
  if (placementDone === false) return <IntroScreen />;
  return <Redirect href="/lessons" />;
}

const styles = StyleSheet.create({
  body: { color: colors.muted, fontSize: 19, lineHeight: 28, marginTop: 10, fontFamily: fonts.regular },
});
