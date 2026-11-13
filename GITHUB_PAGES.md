# English Atlas · GitHub Pages 发布准备

> 历史说明：本文记录发布准备阶段。用户已通过 [Issue #1](https://github.com/nikanzhehanbao-debug/english-atlas/issues/1) 授权首次推送与 Pages 部署；文中的“尚未”描述的是准备时状态。当前发布状态、实际站点链接及验收结果以该 Issue 和仓库 Actions 为准。

本轮仅准备 M1 的独立仓库和预览发布配置，不开发 M2。尚未创建远程仓库、推送、启用 Pages 或发布网站。

## 本地配置

项目根目录 `/workspace/english-atlas` 已独立执行 `git init --initial-branch=main`。没有引用父目录或其他项目的 Git 仓库，没有配置远程。源码、两课内容和 IndexedDB 仓库逻辑保留。

- `vite.config.ts`：`base: "/english-atlas/"`。
- `src/app/main.tsx`：使用 HashRouter。原应用壳拆至 `src/app/App.tsx`，便于直接测试实际导航。
- 路由采用 `/english-atlas/#/learn`、`/english-atlas/#/lesson/L01` 和 `/english-atlas/#/lesson/L04`。刷新时浏览器只向服务器请求 `/english-atlas/`；hash 中的课程路径由客户端处理，不需要 Pages 提供 SPA rewrite。
- 跳到主要内容的链接只移动焦点，不把 hash 覆盖成 `#main`。
- 原 `public/_redirects` 为历史 Cloudflare 配置，保留原文件，GitHub Pages 不使用它。
- `dist` 与所有本地压缩包不入 Git；工作流生成并上传站点构建产物。

## 工作流行为

`.github/workflows/pages.yml`：

1. `main` 的 push、面向 `main` 的 PR、手动触发运行工作流。
2. Node.js 24 + `npm ci`，按顺序执行 lint、测试、构建。任一步失败则后续停止。
3. PR 只检查，不发布，不具有 Pages 写权限。
4. 仅 `main` 的非 PR 运行上传 `dist`，部署 job 等待检查/构建成功后运行。
5. 部署 job 使用 `github-pages` environment，`pages: write`、`id-token: write`；其余默认仅 `contents: read`。部署地址从 `actions/deploy-pages` 的输出取得。
6. 不需要自定义 PAT、数据库密钥、Cloudflare 令牌或其他仓库 Secrets。

## 公开文件检查

已检查候选源码、课程、文档、配置、依赖锁文件，扫描私钥头、GitHub/API token、AWS access key、明显凭据赋值、邮箱和中国大陆手机号等模式，未发现命中。模式扫描不等于保证不存在所有敏感信息；首次推送前仍应复核 staged diff。

`.gitignore` 已排除：`node_modules`、`dist`、`.npm-cache`、编译缓存、zip、日志、coverage、`.env*`（模板除外）、私钥证书、凭据 JSON、`.aws`、`.codex`、上传附件、备份/导出目录及数据库文件。原交付 zip 仍保留在本机，但不进入仓库。

学习记录位于浏览器 IndexedDB，不在项目文件或 Git 候选文件中；没有读取或打包个人学习数据。课程示例 Mia/Leo 是教学文本。文档里的 `/workspace/english-atlas` 是环境路径。未引入第三方统计、付费 API 或官方角色素材。

## IndexedDB 行为

数据库仍为 `english-atlas-m1`，schemaVersion 仍为 1，没有清理、迁移或更名。设置、教学位置、逐题答案、通过状态、最好成绩和结算防重逻辑不变。

同一 origin 下切换 hash 路由不影响进度。`localhost` 与 `https://<owner>.github.io` 是不同 origin，原本地记录不会自动出现在 Pages。相同账户的不同 Pages 项目通常共享 origin，但本项目使用独立数据库名；手机和平板、不同浏览器各自保存数据。M1 暂无跨设备同步和备份导入导出。

## 实际检查结果

- `npm run lint`：通过，退出码 0。
- `npm run test`：4 个文件、29 项全部通过，9.14 秒。包含原 26 项教学/存储/界面测试与新增 3 项 Pages hash 路由检查。
- `npm run build`：TypeScript 与 Vite 通过，退出码 0；50 个模块，4.86 秒。
- 构建后的 JS/CSS 地址均为 `/english-atlas/assets/...`，对应文件存在。
- Actions YAML 已解析，触发条件、部署依赖和最小 job 权限已静态核对；尚未在 GitHub Actions 实际执行。
- 新增测试覆盖 L01/L04 hash 深链接、界面卸载重挂、已有设置和教学位置保留、地图跳转、前缀保持以及跳到主要内容不改变课程地址。
- 测试采用 jsdom + fake-indexeddb，不能替代真实 GitHub Pages 地址、安卓触控、语音或浏览器重启验收。
- 首次并行运行测试与构建时，两课长流程遇到 5 秒默认超时；将这两项多步测试的限时设为 15 秒后，完整测试重跑通过。没有删减断言。

原 M1_REPORT.md 的 26 项测试与 Cloudflare 参数是上一轮历史记录，以本文件描述当前部署准备状态。

## GitHub 身份与待确认操作

只读身份检查已确认当前 GitHub 账户为 `nikanzhehanbao-debug`。GitHub CLI 在环境代理外的 `gh api user` 能成功返回该账户；沙箱内的 auth status 曾错误报告 token 无效，因此不能仅凭该沙箱提示要求重新登录。没有打印或写入令牌。

对 `nikanzhehanbao-debug/english-atlas` 的只读查询返回 HTTP 404；这表示当前身份下未找到或无权访问，不是仓库不存在的绝对证明。创建时仍应再次检查：若存在同名仓库，应停止并核对用途，不覆盖、不强推、不自动复用其他项目。

需要用户确认的具体发布操作：

1. 仓库所有者使用 `nikanzhehanbao-debug`（或用户指定的账户/组织），创建名称为 `english-atlas` 的独立仓库。
2. 确定仓库公开性。推荐用于本轮 Pages 验收的 public 仓库；公开将同时公开源码、课程和已审阅的项目文档。private 仓库能否使用 Pages 取决于 GitHub 套餐和组织策略；private 仓库不自动保证网站私有。
3. 只将本项目已审核文件提交、设置该新仓库的 origin，首次推送 `main`。不推送 zip、缓存、浏览器数据或其他项目。不要 force push。
4. 在该仓库启用 Actions，将 Settings → Pages → Build and deployment → Source 设置为 **GitHub Actions**，允许 Pages environment 从 `main` 部署。若空仓库尚不能设置 Pages，可首次推送后设置，再重新运行工作流。
5. 等待 Actions 检查、构建和 Pages 部署成功，检查服务实际返回的 HTTPS 地址及 hash 课程链接，再提供实机验收地址。

当前尚无已部署 URL。若所有者保持当前账户、仓库名保持 `english-atlas`、不配置自定义域名，预期地址为 `https://nikanzhehanbao-debug.github.io/english-atlas/`；这是格式预期，不是已验证上线地址。

所需权限：创建仓库及其管理权限、写入本项目源码和 workflow 文件、启用 Actions/Pages、查看运行与部署结果。若 GitHub App 授权范围仅覆盖现有仓库，创建后可能需把新仓库加入授权范围。若使用细粒度 token，需要该仓库的 Contents/Workflows 写权限及适用的仓库管理/Pages 权限；传统 PAT 写 workflow 需要 workflow scope。不要在聊天、源码或 Git 远程 URL 中粘贴令牌，应通过 GitHub 连接或凭据管理流程授权。

## 部署后的安卓验收

服务实际部署成功后，用安卓 Chrome 打开返回的 HTTPS 站点地址；L01、L04 的分享地址必须保留 `#/lesson/...`。分别检查直接打开和刷新课程、前进后退、做题结算、同一地址退出重开保存、手机/平板布局、软键盘、语音和降级提示。手机和平板的进度不自动互通。
