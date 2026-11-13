# English Atlas / 英语图鉴 — V0.1 开发资料包

项目目的：自用的长期英语学习系统，从 Pre-A1 起步，形成教学、练习、反馈、复习和成长图鉴；日后扩展到高阶英语及雅思专项训练。

**确定的设计风格：** 现代宝可梦周边启发的清新配色、图鉴收集、地图探索、轻像素元素；原则上使用原创或明确获授权的素材。

## 文件阅读顺序

1. `English_Atlas_V0.1_PRD.md` — 产品范围、页面、架构、数据与完整验收条件。
2. `VISUAL_STYLE_GUIDE.md` — 宝可梦风格的视觉参考、色板、响应式与交互规范。
3. `CURRICULUM_ROADMAP.md` — 从 Pre-A1 到 A1/A2/B1/B2 和雅思的课程规划与学习效果判定。
4. `CODEX_START_HERE.md` — **第一轮 M1** 可直接交给 Codex 的执行任务书。

## 开发约束

先完成 M1 纵向切片：6个页面及 L01、L04 两课真内容、真判分、IndexedDB 进度保存；再进入 M2 / M3 / M4。当前资料包**不含已运行的网站代码，也没有声称已经部署或测试**。

---

## M1 本地开发交付（2026-11-13）

本轮按 `CODEX_START_HERE.md` 实现，仅 L01 与 L04 体验课程可用。没有远程推送、部署或开通云服务。完整交付与测试报告见 [M1_REPORT.md](./M1_REPORT.md)。

### 安装与启动

要求 Node.js 22.12+（本轮使用 Node.js 24.22.1），npm 11。

```bash
cd /workspace/english-atlas
npm ci
npm run dev
```

打开 Vite 输出的本机地址，通常为 `http://localhost:5173/english-atlas/`。不要直接双击 `dist/index.html`。不同域名、端口和浏览器使用各自独立的 IndexedDB；更改访问地址不会迁移进度。

```bash
npm run lint
npm run test
npm run build
```

### 目录与模型

- `src/app`：入口、React Router 路由、共享 IndexedDB 快照。
- `src/components`：原创 SVG 向导、Web Speech API 朗读与中文降级。
- `src/content`：独立类型、四单元地图、L01/L04 教学卡与题目。
- `src/features/lesson`：纯函数判题、80% 通过阈值。
- `src/lib/storage`：IndexedDB 仓库、schemaVersion=2、事务去重。
- `src/pages`：六类页面、教学/练习/结算流程。
- `src/styles`：Tailwind CSS 4 入口、主题变量、响应式与减少动画规则。
- `src/tests`：Vitest、Testing Library、fake-indexeddb 测试。
- `public/_redirects`：保留原 Cloudflare 配置文件；GitHub Pages 不使用它，当前靠 HashRouter 支持刷新。

数据库名 `english-atlas-m1`，存储 `settings`、`lessonProgress`、`exerciseAttempts` 和 `seenItems`。每次学习有稳定 attemptId，每题用 questionId 防重，整次结算在同一事务中保存最好分、通过状态、次数与时间。历史通过不会被后来的低分覆盖。首次读取、设置保存、答题和结算均有加载或错误提示。词汇只在相应教学卡点击“已阅读”后记录为“已接触”。

### 功能演示

首页 → 课程 → L01 → 三张教学卡 → 十道练习 → 结算 → 首页/地图/图鉴核对真实记录。L04 可从地图直接进入，标注体验课程。教学中途离开，再打开同课选择“恢复本次学习”；答题反馈也可恢复。输入中尚未点击“检查答案”的草稿不保存。

### 已知限制与 M1 边界

- 360–430px 手机底部导航，800–1024px 平板侧栏；已实现响应式代码，但本轮**未完成浏览器视口及安卓实机验收**，不可据此宣称无溢出。原因与清单见报告。
- 两课各 10 题；通过仅表示本次课程测验达到 80%，不等于“已掌握”或达到 A1。
- 其余十课、复习算法、完整词卡与检索、备份导入导出、自动计时、PWA manifest/service worker 和离线缓存尚未实现。M1 不提供这些功能的假按钮或假进度。
- 无登录、云同步、付费 API、录音评分或 AI 口语评分。
- Web Speech API 依赖浏览器和已安装英语语音包；没有英语语音包时提供中文说明。部分设备首次加载语音列表较慢，可稍后再点击。单字母 TTS 未经标准录音核验，不用于辨音考试。
- 本地存储可能因清理网站数据、无痕模式、浏览器回收或更换浏览器而丢失。当前尚无备份功能。
- 日目标为分钟计划；M1 不显示虚构的已学分钟或连续天数。
- 自动化使用 jsdom 与 fake-indexeddb，不能替代浏览器磁盘存储、触控、软键盘、布局及可听语音实测。

### GitHub Pages 部署（当前方案，尚未发布）

最新用户指令将预览目标改为独立的 GitHub `english-atlas` 仓库与 GitHub Pages，不使用 Cloudflare 临时部署。具体操作、权限和检查结果见 [GITHUB_PAGES.md](./GITHUB_PAGES.md)。旧开发规范和 M1_REPORT 保留为历史资料；本节及 GITHUB_PAGES.md 描述当前配置。

- Vite `base`：`/english-atlas/`；开发入口也使用该前缀。
- 路由：HashRouter，例如 `/english-atlas/#/lesson/L01`。必须保留 `#`；直接打开 `/english-atlas/lesson/L01` 不受支持。
- 工作流：`.github/workflows/pages.yml`；主分支 `main`；Node.js 24；构建命令 `npm run build`；产物 `dist`。
- PR 执行依赖安装、lint、测试和构建；推送到 `main` 或从 `main` 手动运行后，通过检查才部署。部署使用 GitHub 自动生成的 GITHUB_TOKEN/OIDC，无需在代码或仓库 Secrets 中保存 PAT。
- IndexedDB 数据库名、版本与模型未更改。hash 改变不会清除同一 origin 的进度；切换到 GitHub Pages 新 origin 不会自动迁移原地址的记录。不会上传本机学习数据。
- GitHub 协作已由 [Issue #1](https://github.com/nikanzhehanbao-debug/english-atlas/issues/1) 授权启动。当前发布状态、实际站点链接与验证结果以该 Issue 和仓库 Actions 为准；GITHUB_PAGES.md 保留发布准备阶段记录。

### 安卓实测

开发机启动 Vite 后，可用 USB 调试执行 `adb reverse tcp:5173 tcp:5173`，在安卓 Chrome 打开 `http://localhost:5173/english-atlas/`。或者同一受信局域网访问 Vite 输出的 Network 地址；运行所在机器必须能被设备访问，云环境内的 localhost 并不是手机 localhost。

按报告清单检查 360/390/430px 手机、800/1024px 平板；完成两课、输入与组句、中断恢复、退出浏览器重开、返回导航、设置保存、发音与无语音包降级。保持同一访问地址与普通浏览模式。

## M1.1 · Issue #2 分阶段评审

语音阶段引入静态合成音频优先、可诊断的设备 TTS 回退。来源、许可、重建方法及待人工实听范围见 [AUDIO_SOURCES.md](docs/AUDIO_SOURCES.md)。静态文件覆盖与状态机测试不等于 Android 的实际可听输出和发音审校。各阶段通过 PR 评审；未经审查不合并、不部署，不开放其余十课。

M1.1 的可选挑战位于基础课介绍页/结果页，保留原基础题目和成绩；数据库 v2 仅新增挑战记录表。内容、评分边界、旧数据升级与回滚限制见 [TEACHING_M11.md](docs/TEACHING_M11.md)。
