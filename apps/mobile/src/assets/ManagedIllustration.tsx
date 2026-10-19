import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { resolveMediaUrl } from "../api/client";
import { isKnownIllustration } from "./illustration-manifest";
import { ContextIllustration } from "./illustrations";
import { isManagedMediaId } from "./managed-media";

type Props = { assetId?: string; sourceUri?: string; accessibilityLabel: string; size?: number };

/**
 * Ativos embarcados continuam funcionando sem rede. Mídia do Estúdio usa a
 * cópia local da API e, se ela não estiver disponível, expõe uma alternativa
 * textual acessível em vez de uma área vazia.
 */
export function ManagedIllustration({ assetId, sourceUri, accessibilityLabel, size = 220 }: Props) {
  const [failed, setFailed] = useState(false);
  if (assetId && isKnownIllustration(assetId)) return <ContextIllustration assetId={assetId} accessibilityLabel={accessibilityLabel} size={size} />;
  const uri = assetId && isManagedMediaId(assetId) ? resolveMediaUrl(sourceUri, assetId) : undefined;
  if (uri && !failed) return <Image source={{ uri }} accessibilityRole="image" accessibilityLabel={accessibilityLabel} onError={() => setFailed(true)} resizeMode="contain" style={[styles.image, { width: size, height: size * .72 }]} />;
  return <View accessibilityRole="image" accessibilityLabel={`${accessibilityLabel}. Imagem indisponível; use o áudio e as opções para continuar.`} style={[styles.fallback, { width: size, height: size * .72 }]}>
    <Text accessible={false} style={styles.fallbackIcon}>🖼️</Text>
    <Text accessible={false} style={styles.fallbackText}>Imagem indisponível</Text>
  </View>;
}

const styles = StyleSheet.create({
  image: { alignSelf: "center" },
  fallback: { alignSelf: "center", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 18, backgroundColor: "#F6F1E7" },
  fallbackIcon: { fontSize: 42 }, fallbackText: { color: "#234B5A", fontSize: 16, fontWeight: "700" },
});
