import { describe, expect, it } from "vitest";
import { lessonIdFor } from "./content-ids";
import { deriveProgress, dueItems, isLessonUnlocked, lessonNeedsReview } from "./learning";
import { applyResult, type ItemState } from "./scheduler";
import type { Unit } from "./types";

const now = new Date("2026-09-16T10:00:00Z");
const hours = (value: number) => new Date(now.getTime() + value * 60 * 60 * 1000);
const exercise = (id: string, type: Unit["exercises"][number]["type"]) => ({ id, type, itemKind: "letter" as const, instruction: "", ttsText: "", answer: "A", requiredLetters: "" });
const unit: Unit = { id: "lesson-A", trackId: "alphabet", kind: "letter", title: "Letra A", order: 1, letter: "A", prerequisiteLetters: [], exercises: [exercise("exercise-A-listen", "listen_choose"), exercise("exercise-A-recognize", "recognize_letter")] };
const result = (itemId: string, results: boolean[], at = hours(-1)): ItemState => results.reduce<ItemState | undefined>((current, correct, index) => applyResult(current, { itemId, unitId: unit.id, correct, now: new Date(at.getTime() + index * 60_000) }), undefined)!;

describe("aprendizagem respeitosa", () => {
  it("deriva o progresso da unidade a partir dos itens", () => {
    expect(deriveProgress(unit, {}, now)).toMatchObject({ lessonId: "lesson-A", completed: false, status: "available", attempts: 0, completedTypes: [] });
    const partial = deriveProgress(unit, { "exercise-A-listen": result("exercise-A-listen", [false, true]) }, now);
    expect(partial).toMatchObject({ completed: false, status: "learning", attempts: 2, correctAttempts: 1, accuracy: 0.5, completedTypes: ["listen_choose"], score: 1 });
    const full = deriveProgress(unit, { "exercise-A-listen": result("exercise-A-listen", [true]), "exercise-A-recognize": result("exercise-A-recognize", [true]) }, now, { lessonId: "lesson-A", completedTypes: [], score: 0, completed: false, reviewCount: 2, updatedAt: "" });
    expect(full).toMatchObject({ completed: true, status: "mastered", reviewCount: 2, nextReviewAt: hours(7).toISOString() });
    const lapsed = deriveProgress(unit, { "exercise-A-listen": result("exercise-A-listen", [true, false]), "exercise-A-recognize": result("exercise-A-recognize", [true]) }, now);
    expect(lapsed).toMatchObject({ completed: false, status: "learning" });
  });

  it("marca revisão quando um item dominado venceu", () => {
    const states = { "exercise-A-listen": result("exercise-A-listen", [true], hours(-9)), "exercise-A-recognize": result("exercise-A-recognize", [true]) };
    expect(dueItems(unit, states, now).map((item) => item.id)).toEqual(["exercise-A-listen"]);
    expect(lessonNeedsReview(unit, states, now)).toBe(true);
    expect(deriveProgress(unit, states, now).status).toBe("needs_review");
    expect(lessonNeedsReview(unit, states, hours(-10))).toBe(false);
  });

  it("libera uma letra somente quando todos os pré-requisitos foram dominados", () => {
    const lesson = { prerequisiteLetters: ["A", "E", "I", "O", "U"] };
    const complete = Object.fromEntries(lesson.prerequisiteLetters.map((letter) => [lessonIdFor(letter), { completed: true }]));
    expect(isLessonUnlocked({ prerequisiteLetters: [] }, {})).toBe(true);
    expect(isLessonUnlocked(lesson, complete)).toBe(true);
    expect(isLessonUnlocked(lesson, { ...complete, [lessonIdFor("U")]: { completed: false } })).toBe(false);
  });

  it("libera uma unidade temática pelas letras, nunca pela trilha", () => {
    const casa = { prerequisiteLetters: ["A", "E", "M", "L", "S", "C"] };
    const letters = (list: string) => Object.fromEntries([...list].map((letter) => [lessonIdFor(letter), { completed: true }]));
    expect(isLessonUnlocked(casa, letters("AEIOUML"))).toBe(false);
    expect(isLessonUnlocked(casa, letters("AEIOUMLPSTRNDC"))).toBe(true);
  });
});
