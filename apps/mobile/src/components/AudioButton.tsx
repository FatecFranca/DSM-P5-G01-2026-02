import * as Speech from "expo-speech";
import { useEffect, useRef } from "react";
import Svg, { Path } from "react-native-svg";
import { Pressable, StyleSheet } from "react-native";
import { colors, shadows } from "../theme";

type AudioButtonProps = {
  label?: string;
  text: string;
  compact?: boolean;
  /** Diâmetro em px; sobrescreve `compact` (usado na introdução, que tem botões de 60 e 34). */
  size?: number;
  /** Chamado a cada reprodução; a lição conta repetições de áudio por item. */
  onPlay?: () => void;
};

export function AudioButton({ label = "Ouvir instrução", text, compact = false, size, onPlay }: AudioButtonProps) {
  const iconSize = size ? size * 0.7 : compact ? 28 : 38;
  const played = useRef(false);
  // O áudio pertence à tela: ao sair dela (ou trocar de atividade), para o que este botão iniciou.
  useEffect(() => () => { if (played.current) void Speech.stop(); }, []);
  const speak = async () => {
    onPlay?.();
    played.current = true;
    await Speech.stop();
    Speech.speak(text, { language: "pt-BR", rate: 0.85, pitch: 1 });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={text}
      onPress={() => { void speak(); }}
      style={({ pressed }) => [styles.button, compact && styles.compactButton, size ? { width: size, height: size, borderRadius: size / 2 } : null, pressed && styles.pressed]}
    >
      <Svg accessible={false} width={iconSize} height={iconSize} viewBox="0 0 40 40">
        <Path d="M7 16h5l8-7v22l-8-7H7z" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinejoin="round" />
        <Path d="M25 14c3.5 3.5 3.5 8.5 0 12M29.5 9.5c6 6 6 15 0 21" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: colors.action, ...shadows.card },
  compactButton: { width: 48, height: 48, borderRadius: 24 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
