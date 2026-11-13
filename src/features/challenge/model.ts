import type { Question } from "../../content/schema";
export type ChallengeQuestion =
  | Question
  | {
      questionId: string;
      type: "output";
      prompt: string;
      reference: string;
      checkpoints: string[];
    };
export interface ChallengeAnswer {
  questionId: string;
  answer: string;
  correct: boolean | null;
  selfRating?: "practice" | "independent";
  initialSelfRating?: "practice" | "independent";
  outputMode?: "independent-first";
  selfRatingUpdatedAt?: string;
  answeredAt: string;
}
export interface ChallengeAttempt {
  attemptId: string;
  lessonId: string;
  contentVersion: 1;
  questionIds: string[];
  answers: ChallengeAnswer[];
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
}
