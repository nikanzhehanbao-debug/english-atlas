import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAtlas } from "../app/state";
import { lessons, units } from "../content/lessons";
import { saveSettings } from "../lib/storage/repository";
import { Guide } from "../components/Guide";
import { FieldArt, Badge } from "../components/FieldArt";
import { Speak } from "../components/Speak";
export function PageTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="page-title">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <p className="muted">{children}</p>}
    </header>
  );
}
export function Home() {
  const { data } = useAtlas();
  if (!data) return null;
  const passed = data.progress.filter((p) => p.passed).length;
  const active = [...data.attempts]
    .filter((a) => !a.finishedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const next =
    active?.lessonId ??
    (!data.progress.find((p) => p.lessonId === "L01" && p.passed)
      ? "L01"
      : "L04");
  const today = new Date().toLocaleDateString();
  const doneToday = data.attempts.filter(
    (a) =>
      a.finishedAt && new Date(a.finishedAt).toLocaleDateString() === today,
  ).length;
  return (
    <>
      <PageTitle
        eyebrow="YOUR ENGLISH JOURNEY · PRE-A1"
        title="每一步，都算数。"
      >
        从一个字母、一句话开始，慢慢认识更大的世界。
      </PageTitle>
      <section className="hero field-cover">
        <div className="cover-copy">
          <span className="tag">起点地区 · 探索笔记 01</span>
          <h2>
            你好，英语探索者<span className="pixel">✦</span>
          </h2>
          <p>
            让好奇心带路。
            <br />
            今天，也为自己学一点英语。
          </p>
          <Link className="button primary" to={`/lesson/${next}`}>
            {active ? "继续学习" : "开始学习"} <span>→</span>
          </Link>
          <small>
            {next} · {lessons[next].title}
            {next === "L04" ? " · 体验课程" : ""}
          </small>
        </div>
        <div className="cover-window">
          <FieldArt region={0} />
          <Guide />
          <span className="companion-label">
            原创伙伴 / 小苔
            <br />
            <b>FIELD COMPANION 01</b>
          </span>
        </div>
      </section>
      <div className="stats">
        <section className="stat">
          <span className="stat-icon yellow">◷</span>
          <div>
            <p>今日目标</p>
            <strong>
              {data.settings.dailyTargetMinutes}
              <small> 分钟</small>
            </strong>
            <p className="muted">按自己的节奏安排</p>
          </div>
        </section>
        <section className="stat">
          <span className="stat-icon green">✓</span>
          <div>
            <p>已通过课程</p>
            <strong>
              {passed}
              <small> / 2 节可用课程</small>
            </strong>
            <p className="muted">今天完成 {doneToday} 次测验</p>
          </div>
        </section>
      </div>
      <section className="card">
        <div className="section-heading">
          <h2>我的起点地图</h2>
          <Link to="/learn">查看路线 →</Link>
        </div>
        <div className="journey-strip">
          <span className="island sky">Aa</span>
          <div>
            <p className="eyebrow">PRE-A1 · 入门前导</p>
            <h3>先认识，再表达</h3>
            <p className="muted">当前开放 2 / 12 课 · 长期旅程从这里开始</p>
          </div>
        </div>
        <progress value={passed} max={2} aria-label="可用课程通过进度" />
        <p className="caption">测验通过 ≠ 长期掌握，也不代表达到 A1。</p>
      </section>
      <div className="two-cols">
        <Link className="card link-card" to="/review">
          <span className="eyebrow">回顾与提取</span>
          <h3>为记忆留一点时间 ↗</h3>
          <p>复习调度尚未开放。可重新学习已开放课程。</p>
        </Link>
        <Link className="card link-card" to="/atlas">
          <span className="eyebrow">我的学习记录</span>
          <h3>翻开英语图鉴 ↗</h3>
          <p>已接触 {data.seen.length} 个词汇或字母条目。</p>
        </Link>
      </div>
    </>
  );
}
export function Learn() {
  const { data } = useAtlas();
  return (
    <>
      <PageTitle eyebrow="EXPLORE · 课程地图" title="你的第一段英语旅程">
        4 座小岛，12 个小小目的地。本轮仅开放 L01 和 L04。
      </PageTitle>
      <div className="map-banner">
        <span>起点地区</span>
        <strong>Pre-A1</strong>
        <span>认识 → 理解 → 练习 → 使用</span>
      </div>
      <div className="unit-grid">
        {units.map((unit, i) => (
          <section className={`unit unit-${i}`} key={unit.title}>
            <div className="region-window">
              <FieldArt region={i} />
              <span className="region-label">
                REGION 0{i + 1} /{" "}
                {["发音林地", "交流河湾", "日常山谷", "生活营地"][i]}
              </span>
            </div>
            <header>
              <span className="unit-number">0{i + 1}</span>
              <div>
                <p className="eyebrow">UNIT 0{i + 1}</p>
                <h2>{unit.title}</h2>
                <p>{unit.label}</p>
              </div>
            </header>
            <ol className="lesson-path">
              {unit.lessons.map(([id, title]) => {
                const progress = data?.progress.find((p) => p.lessonId === id);
                const active = data?.attempts.some(
                  (a) => a.lessonId === id && !a.finishedAt,
                );
                const open = !!lessons[id];
                const content = (
                  <>
                    <span className={`node ${open ? "available" : ""}`}>
                      {open ? (progress?.passed ? "✓" : id.slice(1)) : "·"}
                    </span>
                    <span>
                      <strong>{title}</strong>
                      <span className="lesson-state">
                        {id} · {id === "L04" ? "体验课程 · " : ""}
                        {open
                          ? active
                            ? "进行中"
                            : progress?.passed
                              ? `已通过 · 最好 ${progress.bestScore}%`
                              : "可以开始"
                          : "后续开放"}
                      </span>
                    </span>
                    {open &&
                      (progress?.passed ? (
                        <Badge earned />
                      ) : (
                        <span aria-hidden="true">→</span>
                      ))}
                  </>
                );
                return (
                  <li key={id}>
                    {open ? (
                      <Link to={`/lesson/${id}`}>{content}</Link>
                    ) : (
                      <div
                        className="locked"
                        aria-label={`${id} ${title}，后续开放`}
                      >
                        {content}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
      <p className="caption">
        L04 为独立体验入口，不代表 L02、L03 已解锁。其他课程将在后续阶段开放。
      </p>
    </>
  );
}
export function Review() {
  return (
    <>
      <PageTitle eyebrow="REVISIT · 复习" title="给记忆一点生长的时间" />
      <section className="card empty">
        <div className="empty-icon">↻</div>
        <span className="tag">后续版本开放</span>
        <h2>复习调度正在等待下一阶段</h2>
        <p>
          本轮尚未生成复习队列，因此没有待复习数量。
          <br />
          你可以返回课程地图，重新学习 L01 或 L04。
        </p>
        <p className="caption">一次测验通过只记录课程通过，不记录“已掌握”。</p>
        <Link className="button primary" to="/learn">
          回到课程地图 →
        </Link>
      </section>
    </>
  );
}
export function Atlas() {
  const { data } = useAtlas();
  const seen = new Set(data?.seen.map((s) => s.itemId));
  const items = Object.values(lessons)
    .flatMap((l) => l.items.map((item) => ({ ...item, lessonId: l.lessonId })))
    .map((item, index) => ({
      ...item,
      atlasNumber: String(index + 1).padStart(3, "0"),
    }))
    .filter((i) => seen.has(i.itemId));
  return (
    <>
      <PageTitle
        eyebrow="FIELD NOTES · 英语图鉴"
        title="把遇见的英语，记下来。"
      >
        教学卡点击“已阅读这张卡”后记录为“已接触”，不代表已经掌握。
      </PageTitle>
      <p className="collection-count">
        {items.length.toString().padStart(2, "0")}{" "}
        <span>个已接触条目 · 字母与词句分别记录</span>
      </p>
      {!items.length ? (
        <section className="card empty">
          <div className="empty-icon">▧</div>
          <h2>图鉴的第一页，留给你</h2>
          <p>学习第一张教学卡后，这里将出现真实记录。</p>
          <Link className="button primary" to="/learn">
            去认识新词句 →
          </Link>
        </section>
      ) : (
        <div className="atlas-grid">
          {items.map((item) => (
            <article className="card word-card" key={item.itemId}>
              <div className="archive-tab">ATLAS No.{item.atlasNumber}</div>
              <div className="section-heading">
                <span className="eyebrow">
                  {item.lessonId} / {item.itemId.split("-").slice(1).join("-")}
                </span>
                <span className="tag">已接触</span>
              </div>
              <h2 lang="en">{item.term}</h2>
              <p>{item.meaning}</p>
              <div className="example">
                <p lang="en">{item.example}</p>
                <p className="muted">{item.translation}</p>
              </div>
              <Speak text={item.example} />
            </article>
          ))}
        </div>
      )}
      <p className="caption">
        M1 仅记录接触状态；延迟复习、掌握度、检索与完整词卡系统尚未实现。
      </p>
    </>
  );
}
export function Settings() {
  const { data, refresh } = useAtlas();
  const [target, setTarget] = useState(data?.settings.dailyTargetMinutes ?? 15);
  const [rate, setRate] = useState(data?.settings.speechRate ?? 0.85);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await saveSettings({
        dailyTargetMinutes: target,
        speechRate: rate,
        updatedAt: "",
      });
      await refresh();
      setStatus("设置已保存到本机。");
    } catch {
      setStatus("保存失败，原设置仍保留。请检查浏览器存储权限后重试。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle eyebrow="PREFERENCES · 设置" title="找到适合自己的节奏">
        每天一点点，让学习成为轻松的日常。
      </PageTitle>
      <form className="card settings-form" onSubmit={submit}>
        <label htmlFor="target">
          每日目标 <span>学习时间计划</span>
        </label>
        <select
          id="target"
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
        >
          {[5, 10, 15, 20, 30].map((n) => (
            <option key={n} value={n}>
              {n} 分钟 / 天
            </option>
          ))}
        </select>
        <p className="caption">
          这是你的学习计划；M1 暂不自动统计有效学习分钟数。
        </p>
        <label htmlFor="rate">
          英文朗读语速 <span>保存后生效</span>
        </label>
        <select
          id="rate"
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
        >
          <option value={0.65}>较慢 · 0.65×</option>
          <option value={0.85}>入门推荐 · 0.85×</option>
          <option value={1}>标准 · 1×</option>
        </select>
        <button className="button primary" disabled={busy} type="submit">
          {busy ? "正在保存…" : "保存设置"}
        </button>
        {status && <p role="status">{status}</p>}
      </form>
      <section className="card">
        <h2>你的数据，留在你的设备</h2>
        <p>
          课程进度、练习记录、接触条目与设置保存在当前浏览器的 IndexedDB
          中。无需账号，不上传学习记录。
        </p>
        <p className="caption">
          清除浏览器网站数据、使用无痕模式或更换浏览器可能丢失记录。备份导入导出属于
          M3，当前尚未提供。语音由设备与浏览器提供，部分语音服务可能需要联网。
        </p>
      </section>
    </>
  );
}
