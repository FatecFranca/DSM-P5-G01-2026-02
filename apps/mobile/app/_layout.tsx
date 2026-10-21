import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { SourceSerifPro_400Regular } from "@expo-google-fonts/source-serif-pro";
import { useFonts } from "expo-font";
import { router, Stack, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, Text, View } from "react-native";
import { loadContent, refreshContent } from "../src/content/store";
import { getItemStates, getProgress, initializeDatabase } from "../src/storage/database";
import { colors, fonts } from "../src/theme";
import { useStudyStore } from "../src/store/study-store";
import { useAuthStore } from "../src/store/auth-store";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 2 }, mutations: { retry: 0 } } });
export default function RootLayout() {
  // Falha ao carregar fontes não bloqueia o app: o texto cai na fonte do sistema.
  const [fontsLoaded, fontError] = useFonts({ Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, SourceSerifPro_400Regular });
  const [ready, setReady] = useState(false); const [error, setError] = useState<string>();
  const hydrate = useStudyStore((state) => state.hydrate);
  const restore = useAuthStore((state) => state.restore);
  const status = useAuthStore((state) => state.status);
  const segments = useSegments();
  useEffect(() => {
    Promise.all([initializeDatabase().then(() => loadContent()).then(() => Promise.all([getProgress(), getItemStates()])), restore()])
      .then(([[progress, itemStates]]) => { hydrate(progress, itemStates); setReady(true); void refreshContent().catch(() => undefined); })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Falha ao abrir dados locais"));
  }, [hydrate, restore]);
  // Sem sessão, nenhuma tela do app fica aberta: assim que o token some (logout, refresh recusado, armazenamento vazio), volta ao login.
  useEffect(() => {
    if (ready && status === "anonymous" && segments[0] !== "auth") router.replace("/auth");
  }, [ready, status, segments]);
  useEffect(() => {
    if (!ready || (!fontsLoaded && !fontError)) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshContent().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [ready]);
  if (error) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}><Text accessibilityRole="alert">Não foi possível preparar o modo offline. {error}</Text></View>;
  if (!ready || (!fontsLoaded && !fontError)) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} size="large" accessibilityLabel="Preparando aplicativo" /></View>;
  return <QueryClientProvider client={queryClient}><Stack screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTintColor: colors.text, headerTitleStyle: { fontFamily: fontsLoaded ? fonts.semibold : undefined }, contentStyle: { backgroundColor: colors.background } }}><Stack.Screen name="index" options={{ headerShown: false }} /><Stack.Screen name="auth" options={{ headerShown: false }} /><Stack.Screen name="placement" options={{ title: "Nivelamento" }} /><Stack.Screen name="lessons" options={{ headerShown: false }} /><Stack.Screen name="profile" options={{ headerShown: false }} /><Stack.Screen name="ranking" options={{ headerShown: false }} /><Stack.Screen name="achievements" options={{ headerShown: false }} /><Stack.Screen name="lesson/[id]" options={{ headerShown: false }} /><Stack.Screen name="trail/[stage]" options={{ headerShown: false }} /><Stack.Screen name="progress" options={{ title: "Meu progresso" }} /></Stack></QueryClientProvider>;
}
