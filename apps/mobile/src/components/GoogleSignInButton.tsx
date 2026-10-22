import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import { signInWithGoogleIdToken } from "../firebase";
import { useAuthStore } from "../store/auth-store";
import { colors, fonts, radius } from "../theme";

WebBrowser.maybeCompleteAuthSession();

const ids = (Constants.expoConfig?.extra?.googleClientIds ?? {}) as { web?: string; ios?: string; android?: string };
// O hook do Google exige o client ID da plataforma atual; sem ele o botão nem é montado.
export const googleSignInAvailable = Platform.OS === "ios" ? !!ids.ios : Platform.OS === "android" ? !!ids.android : !!ids.web;

export function GoogleSignInButton({ disabled, onError, onSuccess }: { disabled?: boolean; onError: (message: string | undefined) => void; onSuccess: () => void }) {
  const loginWithFirebase = useAuthStore((s) => s.loginWithFirebase);
  const [busy, setBusy] = useState(false);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({ webClientId: ids.web || undefined, iosClientId: ids.ios || undefined, androidClientId: ids.android || undefined });
  useEffect(() => {
    if (!response) return;
    if (response.type === "success") {
      const idToken = response.params.id_token;
      if (!idToken) { onError("O Google não devolveu a identificação."); return; }
      setBusy(true);
      signInWithGoogleIdToken(idToken).then(loginWithFirebase).then(onSuccess).catch((cause) => onError(cause instanceof Error ? cause.message : "Não foi possível entrar com o Google.")).finally(() => setBusy(false));
    } else if (response.type === "error") onError("Não foi possível entrar com o Google.");
  }, [response]);
  return <Pressable accessibilityRole="button" accessibilityLabel="Entrar com o Google" disabled={disabled || busy || !request} onPress={() => { onError(undefined); void promptAsync(); }} style={[styles.button, (disabled || busy || !request) && styles.off]}>
    <Text style={styles.g}>G</Text><Text style={styles.label}>{busy ? "Aguarde..." : "Entrar com o Google"}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, borderWidth: 1, borderColor: colors.link, borderRadius: radius.pill, backgroundColor: colors.surface },
  off: { opacity: 0.5 },
  g: { fontFamily: fonts.bold, fontSize: 22, color: "#4285F4" },
  label: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
});
