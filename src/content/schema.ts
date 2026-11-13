export interface Item {
  itemId: string;
  term: string;
  meaning: string;
  example: string;
  translation: string;
}
export interface TeachingCard {
  id: string;
  title: string;
  text: string;
  examples: { en: string; zh: string }[];
  itemIds: string[];
  alphabet?: boolean;
}
export interface Question {
  questionId: string;
  type: "choice" | "input" | "order";
  prompt: string;
  options?: string[];
  answers: string[];
  explanation: string;
  caseSensitive?: boolean;
}
export interface Lesson {
  lessonId: string;
  title: string;
  subtitle: string;
  goals: string[];
  cards: TeachingCard[];
  items: Item[];
  questions: Question[];
}
