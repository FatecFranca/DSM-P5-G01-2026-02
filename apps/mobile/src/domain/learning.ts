import type { ExerciseType, InferenceResult, LessonProgress } from "./types";

export type Feedback = { kind: "success" | "try-again" | "incorrect"; title: string; message: string };

export function feedbackFor(result: InferenceResult, expected: string): Feedback {
  if (result.uncertain || result.confidence < 0.7) return { kind: "try-again", title: "Vamos tentar mais uma vez?", message: "Não consegui reconhecer o traço com segurança. Você pode apagar e escrever novamente, sem perder progresso." };
  if (result.className === expected) return { kind: "success", title: "Muito bem!", message: `Reconheci a letra ${expected}. Continue no seu ritmo.` };
  return { kind: "incorrect", title: "Vamos observar o formato", message: `O traço se pareceu com ${result.className}. Veja o modelo e tente novamente quando quiser.` };
}

export function nextProgress(current: LessonProgress | undefined, type: ExerciseType, correct: boolean): LessonProgress {
  // Remove o tipo antigo de escrita caso exista progresso salvo de uma versão anterior.
  const completedTypes = (current?.completedTypes ?? []).filter((item) => item !== ("write" as ExerciseType));
  const updated = correct && !completedTypes.includes(type) ? [...completedTypes, type] : completedTypes;
  return { lessonId: current?.lessonId ?? "current", completedTypes: updated, score: updated.length, completed: updated.length === 3, updatedAt: new Date().toISOString() };
}
