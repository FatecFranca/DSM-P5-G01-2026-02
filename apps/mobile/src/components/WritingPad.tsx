import { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import type { Point } from "../inference/letter-classifier";
import { colors } from "../theme";

export function WritingPad({ letter, onSubmit }: { letter: string; onSubmit: (points: Point[]) => void }) {
  const [points, setPoints] = useState<Point[]>([]);
  const pointsRef = useRef(points); pointsRef.current = points;
  const appendPoint = (event: GestureResponderEvent) => {
    const nativeEvent = event?.nativeEvent;
    if (!nativeEvent || !Number.isFinite(nativeEvent.locationX) || !Number.isFinite(nativeEvent.locationY)) return;
    setPoints((items) => [...items, { x: nativeEvent.locationX, y: nativeEvent.locationY }]);
  };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: appendPoint,
    onPanResponderMove: appendPoint,
  }), []);
  return <View>
    <View accessibilityLabel={`Área para escrever a letra ${letter}`} accessibilityHint="Deslize o dedo para desenhar" style={styles.pad} {...responder.panHandlers}>
      <Text style={styles.guide}>{letter}</Text>
      {points.map((point, index) => <View key={`${index}-${point.x}`} style={[styles.dot, { left: point.x - 5, top: point.y - 5 }]} />)}
    </View>
    <View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => setPoints([])} style={styles.secondary}><Text style={styles.secondaryText}>Apagar</Text></Pressable><Pressable accessibilityRole="button" disabled={!points.length} onPress={() => onSubmit(pointsRef.current)} style={[styles.primary, !points.length && styles.disabled]}><Text style={styles.primaryText}>Verificar letra</Text></Pressable></View>
  </View>;
}
const styles = StyleSheet.create({ pad: { height: 320, overflow: "hidden", borderRadius: 20, borderWidth: 3, borderColor: colors.primary, backgroundColor: colors.surface, position: "relative" }, guide: { position: "absolute", alignSelf: "center", fontSize: 240, lineHeight: 310, color: "#E0E6E9", fontWeight: "700" }, dot: { position: "absolute", width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary }, actions: { flexDirection: "row", gap: 12, marginTop: 16 }, secondary: { flex: 1, minHeight: 56, borderRadius: 14, borderWidth: 2, borderColor: colors.primary, alignItems: "center", justifyContent: "center" }, secondaryText: { color: colors.primary, fontSize: 17, fontWeight: "700" }, primary: { flex: 2, minHeight: 56, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }, primaryText: { color: "white", fontSize: 17, fontWeight: "700" }, disabled: { opacity: 0.4 } });
