import type { ChallengeQuestion } from "../features/challenge/model";
const input = (
  questionId: string,
  prompt: string,
  answers: string[],
  explanation: string,
  caseSensitive = false,
): ChallengeQuestion => ({
  questionId,
  type: "input",
  prompt,
  answers,
  explanation,
  caseSensitive,
});
export const challengeContentVersion = 1;
export const challenges: Record<
  string,
  {
    title: string;
    notes: string;
    audioText: string;
    questions: ChallengeQuestion[];
  }
> = {
  L01: {
    title: "看清字形，写出拼写",
    notes:
      "拼写是按顺序列出字母，不是把字母名称当作单词音素。先观察给出的词形，再主动写出字母；本挑战不要求猜单词发音。区分大写 I、小写 i 和小写 l（L 的小写）。",
    audioText: "B",
    questions: [
      input(
        "L01-CH1-Q1",
        "把 b d p q 改写成对应的大写字母，按原顺序用空格分隔。",
        ["B D P Q"],
        "b/d/p/q 方向相似，但分别对应 B/D/P/Q。先逐个确认字形，再按顺序写。",
        true,
      ),
      {
        questionId: "L01-CH1-Q2",
        type: "choice",
        prompt: "表格要求填写“小写 L”。应该填哪一个字形？",
        options: ["I", "l", "i"],
        answers: ["l"],
        caseSensitive: true,
        explanation:
          "小写 L 写作 l。大写 I 写作 I，小写 i 有点；不能只根据外形相似互换。",
      },
      input(
        "L01-CH1-Q3",
        "观察单词 map。把它的三个字母都写成大写，按词中顺序用空格分隔。",
        ["M A P"],
        "map 的字母顺序是 m、a、p，对应 M A P；这是字母拼写，不是把三个字母名称当成 map 的读音。",
        true,
      ),
      input(
        "L01-CH1-Q4",
        "把 G J Q 改写成对应的小写字母，按原顺序用空格分隔。",
        ["g j q"],
        "大写 G/J/Q 对应 g/j/q。j 的点不能省略成别的字母，q 不等于 p。",
        true,
      ),
      input(
        "L01-CH1-Q5",
        "名字 Liam 的字母是 L i a m。将它们全部改为大写，按原顺序用空格分隔。",
        ["L I A M"],
        "Liam 的第二个字母是小写 i，改成大写 I；不要因为 L 和 I 字形相近而替换它们。",
        true,
      ),
      input(
        "L01-CH1-Q6",
        "观察名字 Ben。不要重排字母；将它的全部字母改成小写，不加空格。",
        ["ben"],
        "Ben → ben：只改变大小写，保留 b、e、n 的顺序。人名在真实句子中通常首字母大写，这里只是指定的字形练习。",
        true,
      ),
      {
        questionId: "L01-CH1-Q7",
        type: "output",
        prompt:
          "自己选一个 3–5 个字母的英文名（可用化名），写出原名、大写拼写和小写拼写。参考格式：Mia / M I A / m i a。这里只做文字自检，不自动判分。",
        reference: "例如：Leo / L E O / l e o。你可以使用其他英文名。",
        checkpoints: [
          "大写和小写代表同一组字母",
          "字母数量与顺序一致",
          "能区分 I/i 与 L/l；不用真实个人资料",
        ],
      },
    ],
  },
  L04: {
    title: "在情境里介绍自己",
    notes:
      "I 与 am 搭配；单数身份名词前用 a/an，感受形容词前不加冠词。名字前不加 a。封闭题按明确要求判分；最后的自主表达只给参考与自评，不用固定字符串判错。",
    audioText: "I am a student.",
    questions: [
      input(
        "L04-CH1-Q1",
        "修正 I is tired.。写出完整正确句子，I am 或 I’m 均可。",
        ["I am tired", "I'm tired"],
        "I 与 am 搭配，不能用 is；tired 是形容词，不需要 a/an。",
      ),
      input(
        "L04-CH1-Q2",
        "情境：你在活动中扮演 Leo，是一名学生。写两句介绍，先名字后身份，用句号分隔；I am 或 I’m 均可。",
        [
          "I am Leo. I am a student",
          "I'm Leo. I'm a student",
          "I am Leo. I'm a student",
          "I'm Leo. I am a student",
        ],
        "名字前不加冠词；单数身份 student 前加 a。参考：I’m Leo. I’m a student.。句号用于分隔题目要求的两句。",
      ),
      input(
        "L04-CH1-Q3",
        "修正 I am a artist.。保留 artist，写出完整正确句子。",
        ["I am an artist", "I'm an artist"],
        "artist 以元音音素开头，单数身份表达用 an artist；a/an 看发音，而不是单纯看字母。",
      ),
      input(
        "L04-CH1-Q4",
        "情境：忙了一天，现在想表达“我累了”。用 I’m 缩写写一句完整英文。",
        ["I'm tired"],
        "参考：I’m tired.。缩写要保留撇号；感受 tired 前不加 a/an。本题明确要求用 I’m。",
      ),
      {
        questionId: "L04-CH1-Q5",
        type: "choice",
        prompt: "情境：你是一名教师，此刻很开心。哪一组表达同时正确？",
        options: [
          "I am teacher. I am a happy.",
          "I am a teacher. I am happy.",
          "I is a teacher. I happy.",
        ],
        answers: ["I am a teacher. I am happy."],
        explanation:
          "teacher 是单数身份名词，需要 a；happy 是形容词，不加 a；两个句子的主语 I 都要与 am 搭配。",
      },
      input(
        "L04-CH1-Q6",
        "把 I’m a teacher. 改写成不含缩写的完整句子。",
        ["I am a teacher"],
        "I’m 展开为 I am；a teacher 部分保持不变。不要把 am 改成 is。",
      ),
      {
        questionId: "L04-CH1-Q7",
        type: "output",
        prompt:
          "在新同学见面会上，用 2–3 句英文介绍名字、身份与此刻感受。可用化名和课内词汇，不要求真实个人资料。自由表达只做参考与自评，不自动判错。",
        reference:
          "例如：I’m Mia. I’m a student. I’m happy. 也可以用完整形式 I am，或替换为其他合适名字、身份与感受。",
        checkpoints: [
          "I 与 am 搭配，I’m 的撇号正确",
          "名字前不用 a；单数身份名词前用合适的 a/an",
          "感受形容词前不用 a/an；句意符合自己想表达的内容",
        ],
      },
    ],
  },
};
