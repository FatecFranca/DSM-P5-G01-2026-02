import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import Svg, { Path } from "react-native-svg";
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
    <GoogleGIcon /><Text style={styles.label}>{busy ? "Aguarde..." : "Entrar com o Google"}</Text>
  </Pressable>;
}

/** Logo oficial "G" do Google, nas quatro cores padrão da marca. */
function GoogleGIcon({ size = 24 }: { size?: number }) {
  return <Svg accessible={false} width={size} height={size} viewBox="0 0 48 48">
    <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </Svg>;
}

const styles = StyleSheet.create({
  button: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, borderWidth: 1, borderColor: colors.link, borderRadius: radius.pill, backgroundColor: colors.surface },
  off: { opacity: 0.5 },
  label: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
});
