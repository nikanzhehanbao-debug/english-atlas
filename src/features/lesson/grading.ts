import type { Question } from "../../content/schema";
export function normalize(text: string, caseSensitive = false) {
  const value = text
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
    .trim()
    .replace(/[.!。！]+$/, "")
    .trim()
    .replace(/\s+/g, " ");
  return caseSensitive ? value : value.toLowerCase();
}
export function grade(question: Question, answer: string) {
  return question.answers.some(
    (expected) =>
      normalize(expected, question.caseSensitive) ===
      normalize(answer, question.caseSensitive),
  );
}
export function result(correct: number, total: number) {
  return {
    score: total ? Math.round((correct / total) * 100) : 0,
    passed: total > 0 && correct / total >= 0.8,
  };
}
