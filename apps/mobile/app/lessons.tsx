import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../src/components/Screen";
import { LETTERS } from "../src/domain/catalog";
import { useStudyStore } from "../src/store/study-store";
import { colors } from "../src/theme";

export default function Lessons() { const progress = useStudyStore((state) => state.progress); return <Screen><Text style={styles.title}>Letras do alfabeto</Text><Text style={styles.intro}>Siga em ordem ou revise uma letra já praticada.</Text><View style={styles.grid}>{LETTERS.map((lesson) => { const done = progress[lesson.id]?.completed; return <Link key={lesson.id} href={{ pathname: "/lesson/[id]", params: { id: lesson.id } }} asChild><Pressable accessibilityLabel={`Letra ${lesson.letter}${done ? ", concluída" : ""}`} style={StyleSheet.flatten([styles.tile, done && styles.done])}><Text style={[styles.letter, done && styles.doneText]}>{lesson.letter}</Text><Text style={[styles.state, done && styles.doneText]}>{done ? "Concluída" : `Lição ${lesson.order}`}</Text></Pressable></Link>; })}</View></Screen>; }
const styles = StyleSheet.create({ title: { fontSize: 30, fontWeight: "800", color: colors.text }, intro: { fontSize: 17, lineHeight: 25, color: colors.muted }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, tile: { width: "30%", minWidth: 88, minHeight: 100, borderRadius: 16, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }, done: { backgroundColor: colors.success, borderColor: colors.success }, letter: { fontSize: 38, fontWeight: "800", color: colors.primary }, state: { fontSize: 12, color: colors.muted }, doneText: { color: "white" } });
