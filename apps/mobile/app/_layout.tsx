import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { loadContent, refreshContent } from "../src/content/store";
import { getProgress, initializeDatabase } from "../src/storage/database";
import { colors } from "../src/theme";
import { useStudyStore } from "../src/store/study-store";
import { useAuthStore } from "../src/store/auth-store";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 2 }, mutations: { retry: 0 } } });
export default function RootLayout() {
  const [ready, setReady] = useState(false); const [error, setError] = useState<string>();
  const hydrateProgress = useStudyStore((state) => state.hydrateProgress);
  const restore = useAuthStore((state) => state.restore);
  useEffect(() => { Promise.all([initializeDatabase().then(() => loadContent()).then(getProgress), restore()]).then(([items]) => { hydrateProgress(items); setReady(true); void refreshContent().catch(() => undefined); }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Falha ao abrir dados locais")); }, [hydrateProgress, restore]);
  if (error) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}><Text accessibilityRole="alert">Não foi possível preparar o modo offline. {error}</Text></View>;
  if (!ready) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.primary} size="large" accessibilityLabel="Preparando aplicativo" /></View>;
  return <QueryClientProvider client={queryClient}><Stack screenOptions={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: "white", headerTitleStyle: { fontWeight: "700" } }}><Stack.Screen name="index" options={{ title: "Alfabetiza" }} /><Stack.Screen name="auth" options={{ title: "Entrar" }} /><Stack.Screen name="lessons" options={{ title: "Lições" }} /><Stack.Screen name="lesson/[id]" options={{ title: "Atividade" }} /><Stack.Screen name="progress" options={{ title: "Meu progresso" }} /></Stack></QueryClientProvider>;
}
