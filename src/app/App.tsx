import { NavLink, Route, Routes, Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAtlas } from "./state";
import { Home, Learn, Review, Atlas, Settings } from "../pages/Pages";
import { LessonPage } from "../pages/Lesson";
import { ChallengePage } from "../pages/Challenge";
const nav = [
  ["/", "⌂", "首页"],
  ["/learn", "⚑", "课程"],
  ["/review", "↻", "复习"],
  ["/atlas", "▧", "图鉴"],
  ["/settings", "⚙", "设置"],
];
export function App() {
  const { data, error, refresh } = useAtlas();
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.title = `英语图鉴 · ${location.pathname.startsWith("/lesson") ? "课程学习" : (nav.find(([path]) => path === location.pathname)?.[2] ?? "探索")}`;
  }, [location.pathname]);
  return (
    <>
      <a
        className="skip"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        跳到主要内容
      </a>
      <aside className="sidebar">
        <Link className="brand" to="/">
          <span className="brand-mark">
            a<span>✦</span>
          </span>
          <span>
            英语图鉴<small>ENGLISH ATLAS</small>
          </span>
        </Link>
        <p className="nav-caption">一页一页，探索英语</p>
        <nav aria-label="主要导航">
          {nav.map(([path, icon, label]) => (
            <NavLink key={path} to={path} end={path === "/"}>
              <span className="nav-icon" aria-hidden="true">
                {icon}
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>✦</span>
          <p>
            不必一步到达远方。
            <br />
            先学好今天这一页。
          </p>
          <small>PRE-A1 · 起点地区</small>
        </div>
      </aside>
      <header className="mobile-brand">
        <Link to="/">
          ✦ 英语图鉴 <small>ENGLISH ATLAS</small>
        </Link>
      </header>
      <main id="main" tabIndex={-1}>
        <div className="topline">
          <span>学习手记 / ENGLISH ATLAS</span>
          <span className="local-dot">本机保存 · M1</span>
        </div>
        {error ? (
          <section className="card error" role="alert">
            <h1>暂时无法读取学习记录</h1>
            <p>{error}</p>
            <button className="button primary" onClick={() => void refresh()}>
              重新读取
            </button>
          </section>
        ) : !data ? (
          <p role="status">正在读取本机学习记录…</p>
        ) : (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/lesson/:id" element={<LessonPage />} />
            <Route path="/lesson/:id/challenge" element={<ChallengePage />} />
            <Route path="/review" element={<Review />} />
            <Route path="/atlas" element={<Atlas />} />
            <Route path="/settings" element={<Settings />} />
            <Route
              path="*"
              element={
                <section className="card">
                  <h1>这一页还没有收录</h1>
                  <Link className="button primary" to="/">
                    返回首页
                  </Link>
                </section>
              }
            />
          </Routes>
        )}
        <footer>
          ENGLISH ATLAS <span>✦</span> 从好奇开始，让语言生长。
        </footer>
      </main>
    </>
  );
}
