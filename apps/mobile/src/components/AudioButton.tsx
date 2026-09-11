import * as Speech from "expo-speech";
import Svg, { Path } from "react-native-svg";
import { Pressable, StyleSheet } from "react-native";

type AudioButtonProps = {
  label?: string;
  text: string;
  compact?: boolean;
  /** Chamado a cada reprodução; a lição conta repetições de áudio por item. */
  onPlay?: () => void;
};

export function AudioButton({ label = "Ouvir instrução", text, compact = false, onPlay }: AudioButtonProps) {
  const speak = async () => {
    onPlay?.();
    await Speech.stop();
    Speech.speak(text, { language: "pt-BR", rate: 0.85, pitch: 1 });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={text}
      onPress={() => { void speak(); }}
      style={({ pressed }) => [styles.button, compact && styles.compactButton, pressed && styles.pressed]}
    >
      <Svg accessible={false} width={compact ? 28 : 38} height={compact ? 28 : 38} viewBox="0 0 40 40">
        <Path d="M7 16h5l8-7v22l-8-7H7z" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinejoin="round" />
        <Path d="M25 14c3.5 3.5 3.5 8.5 0 12M29.5 9.5c6 6 6 15 0 21" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: "#4E9C76" },
  compactButton: { width: 48, height: 48, borderRadius: 24 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
