import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View, type TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AudioButton } from "../src/components/AudioButton";
import { BottomWaves, HeroBlobs, LockIcon, LogoSpark, MailIcon, Mascot } from "../src/components/brand/Decor";
import { PrimaryButton } from "../src/components/ui/PrimaryButton";
import { validateCredentials } from "../src/domain/auth";
import { useAuthStore } from "../src/store/auth-store";
import { colors, FIGMA_FRAME_WIDTH, fonts, radius, shadows } from "../src/theme";

/** Campo em pílula do Figma, com botão de áudio à esquerda que lê o que o campo pede. */
function Field({ audio, icon, ...input }: TextInputProps & { audio: string; icon?: ReactNode }) {
  return <View style={styles.fieldRow}>
    <AudioButton label={`Ouvir: ${input.accessibilityLabel ?? ""}`} text={audio} compact />
    <View style={styles.inputPill}>{icon}<TextInput placeholderTextColor={colors.placeholder} style={styles.input} {...input} /></View>
  </View>;
}

// Layout da tela Início no Figma (1:7): marca e mascote no topo, formulário numa folha areia com áudio em cada campo.
export default function Auth() { const [mode, setMode] = useState<"login" | "register">("login"); const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState<string>(); const [busy, setBusy] = useState(false); const login = useAuthStore((s) => s.login); const register = useAuthStore((s) => s.register);
  const submit = async () => { const errors = validateCredentials(email, password); if (mode === "register" && !name.trim()) errors.unshift("Informe como deseja ser chamado."); if (errors.length) return setError(errors.join(" ")); setBusy(true); setError(undefined); try { if (mode === "login") await login(email, password); else await register(name, email, password); router.replace("/"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível entrar."); } finally { setBusy(false); } };
  const greeting = mode === "login" ? "Para começar, digite seu e-mail" : "Para criar sua conta, digite seus dados";
  const s = useWindowDimensions().width / FIGMA_FRAME_WIDTH;
  return <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ height: 244 * s }}>
          <HeroBlobs scale={s} style={{ position: "absolute", top: -29.61 * s, right: -129.71 * s }} />
          <View style={[styles.brand, { top: 89 * s, width: 140 * s }]}>
            <View style={{ position: "absolute", left: 112 * s, top: -9 * s }}><LogoSpark size={17 * s} /></View>
            <Text accessibilityRole="header" style={[styles.logo, { fontSize: 40 * s, lineHeight: 40 * s }]}>PROSA</Text>
            <Text style={[styles.tagline, { fontSize: 16 * s, lineHeight: 18 * s }]}>Ler é descobrir{"\n"}um mundo novo</Text>
          </View>
        </View>
        <View style={styles.sheet}>
          <View style={styles.greetingRow}>
            <AudioButton label="Ouvir instruções" text={`Olá! ${greeting}. Se preferir, peça para um amigo ou familiar digitar para você.`} compact />
            <View style={styles.greetingText}>
              <Text style={styles.hello}>Olá!</Text>
              <Text style={styles.lead}>{greeting}</Text>
              <Text style={styles.helper}>Se preferir, peça para um amigo ou familiar digitar para você.</Text>
            </View>
          </View>
          {mode === "register" && <Field audio="Digite como deseja ser chamado" accessibilityLabel="Nome" placeholder="Como deseja ser chamado" value={name} onChangeText={setName} autoCapitalize="words" maxLength={80} />}
          <Field audio="Digite seu e-mail" icon={<MailIcon />} accessibilityLabel="E-mail" placeholder="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Field audio="Digite sua senha, com pelo menos oito caracteres" icon={<LockIcon />} accessibilityLabel="Senha" placeholder="Senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <View style={styles.fieldRow}>
            <AudioButton label="Ouvir botão" text={mode === "login" ? "Entrar" : "Criar conta"} compact />
            <PrimaryButton style={styles.grow} disabled={busy} label={busy ? "Aguarde..." : mode === "login" ? "Entrar  →" : "Criar conta  →"} accessibilityLabel={mode === "login" ? "Entrar" : "Criar conta"} onPress={() => void submit()} />
          </View>
          <Pressable accessibilityRole="button" onPress={() => { setMode(mode === "login" ? "register" : "login"); setError(undefined); }} style={styles.link}><Text style={styles.linkText}>{mode === "login" ? "Ainda não tenho conta" : "Já tenho conta"}</Text></Pressable>
        </View>
        <BottomWaves style={styles.waves} />
        {/* No Figma o mascote fica acima da folha, com as patas apoiadas na borda dela. */}
        <View pointerEvents="none" style={[styles.mascotLayer, { top: -37 * s, right: -63 * s }]}><Mascot width={219 * s} /></View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1 },
  brand: { position: "absolute", left: 0, alignItems: "center" },
  // Elevation acima da folha (shadows.sheet usa 10) para o mascote ser desenhado por cima no Android.
  mascotLayer: { position: "absolute", zIndex: 2, elevation: 11 },
  logo: { fontFamily: fonts.brand, letterSpacing: -0.4, color: colors.text },
  tagline: { fontFamily: fonts.regular, color: colors.text, textAlign: "center" },
  sheet: { flexGrow: 1, gap: 14, paddingHorizontal: 22, paddingTop: 34, paddingBottom: 96, backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, ...shadows.sheet },
  greetingRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginBottom: 6 },
  greetingText: { flex: 1, gap: 4 },
  hello: { fontFamily: fonts.bold, fontSize: 24, color: colors.text },
  lead: { fontFamily: fonts.medium, fontSize: 18, lineHeight: 23, color: colors.text },
  helper: { fontFamily: fonts.light, fontSize: 17, lineHeight: 22, color: colors.text },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  grow: { flex: 1 },
  inputPill: { flex: 1, minHeight: 56, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, borderWidth: 1, borderColor: colors.link, borderRadius: radius.pill },
  input: { flex: 1, minHeight: 54, fontFamily: fonts.regular, fontSize: 18, color: colors.text },
  error: { color: colors.danger, fontSize: 16, lineHeight: 23, fontFamily: fonts.medium },
  link: { minHeight: 52, alignItems: "center", justifyContent: "center" },
  linkText: { color: colors.link, fontFamily: fonts.semibold, fontSize: 17, textDecorationLine: "underline" },
  waves: { position: "absolute", left: 0, right: 0, bottom: 0 },
});
