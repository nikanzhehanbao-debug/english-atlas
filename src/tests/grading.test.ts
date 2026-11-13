import { describe, it, expect } from "vitest";
import { grade, result } from "../features/lesson/grading";
import { alphabet, lessons, units } from "../content/lessons";
describe("课程内容与判题", () => {
  it("4 单元 12 课，仅两课可用，26 字母完整", () => {
    expect(units).toHaveLength(4);
    expect(units.flatMap((u) => u.lessons)).toHaveLength(12);
    expect(Object.keys(lessons)).toEqual(["L01", "L04"]);
    expect(alphabet.join("")).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  });
  for (const lesson of Object.values(lessons)) {
    it(`${lesson.lessonId} 的全部标准答案与干扰选项正确判定，ID 唯一`, () => {
      expect(lesson.questions.length).toBeGreaterThanOrEqual(6);
      expect(new Set(lesson.questions.map((q) => q.questionId)).size).toBe(
        lesson.questions.length,
      );
      expect(lesson.questions.some((q) => q.type === "input")).toBe(true);
      for (const q of lesson.questions) {
        for (const a of q.answers) expect(grade(q, a)).toBe(true);
        if (q.type === "choice")
          for (const option of q.options!)
            expect(grade(q, option)).toBe(q.answers.includes(option));
        expect(q.explanation.length).toBeGreaterThan(10);
      }
    });
  }
  it("大小写题不接受错误字形", () => {
    const q = lessons.L01.questions[2];
    expect(grade(q, "m")).toBe(true);
    expect(grade(q, "M")).toBe(false);
  });
  it("缩写接受弯引号、多余空白和标点，但不接受缺撇号", () => {
    const q = lessons.L04.questions[7];
    expect(grade(q, "  I’m   Mia.  ")).toBe(true);
    expect(grade(q, "Im Mia")).toBe(false);
    expect(grade(q, "I'm a Mia.")).toBe(false);
  });
  it("感受题接受两种正确句型，拒绝冠词错误", () => {
    const q = lessons.L04.questions[6];
    expect(grade(q, "I am tired.")).toBe(true);
    expect(grade(q, "I'm tired")).toBe(true);
    expect(grade(q, "I am a tired.")).toBe(false);
  });
  it("阈值以原始比例为准，不能因四舍五入通过", () => {
    expect(result(8, 10)).toEqual({ score: 80, passed: true });
    expect(result(7, 10).passed).toBe(false);
    expect(result(0, 0).passed).toBe(false);
    expect(result(159, 200)).toEqual({ score: 80, passed: false });
  });
});
