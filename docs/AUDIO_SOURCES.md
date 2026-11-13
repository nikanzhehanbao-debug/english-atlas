# M1.1 A · 英语语音来源与验收

本阶段修复已知语音服务缺口，不代表 Android 实机验收通过。未使用付费 API 或他人未授权录音。

## 静态音频

`public/audio` 的 51 个 MP3 为本项目根据自编课程文本、在本地离线合成的真实语音文件：26 个字母名称、L04 全部核心词与教学例句，以及 L01 示例。不是空文件、占位音、远程 TTS 链接或真人录音。只在用户点按后请求目标文件，`preload=none`，不预下载整套资源。

- 合成引擎：Piper TTS 1.8.0，https://github.com/OHF-Voice/piper1-gpl ，引擎为 GPL-3.0；引擎和模型不打包进网站，仅发布合成输出。GPL 对程序输出的说明：https://www.gnu.org/licenses/gpl-faq.html#WhatCaseIsOutputGPL 。
- 语音模型：rhasspy/piper-voices，`en_US-ljspeech-high`。来源：https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/ljspeech/high 。模型卡副本见 AUDIO_MODEL_CARD.md；模型卡标明训练数据为 public domain。
- 数据许可来源：LJ Speech 官方 https://keithito.com/LJ-Speech-Dataset/ ，明确为公共领域语音数据；没有采用 lessac 等另有录音许可的模型。
- 内容是教学用合成英语，不表示真人授权配音、官方标准发音或某人背书。项目合成输出在法律允许范围内按 CC0-1.0 提供（仅适用于 `public/audio`），https://creativecommons.org/publicdomain/zero/1.0/ 。模型与引擎自身许可不因此改变。
- 22,050Hz 原始合成波形，经 FFmpeg 响度归一化为 64kbps MP3。稳定清单 `src/content/audio-manifest.json` 记录文件名、实际输入文本、SHA-256 和 `pending-listening` 审核状态。
- 字母使用 “The letter A.” 等明确上下文，避免单独 A 被读为冠词。Z 为美式英语。教学文字已区分字母名称和音素。

## 审核边界

已检查输入文本、覆盖、文件哈希、音频可解码性、非零波形与播放状态机；这不能代替人耳审音。所有静态资源 **发音与自然度待人工实听**，界面明确标为合成示范。未经用户/英语审校者逐项实听核验，不将它们用于自动判分的字母听辨或最小对立对考试。后续阶段可用不计分的听读自检支持练习；不把“点播放”计作“已通过口语”。

## 重建

临时 Python 虚拟环境安装 `piper-tts==1.8.0`；下载上述模型、同名 `.onnx.json` 到工作区外，系统须有 FFmpeg。然后执行：

```sh
python scripts/generate-audio.py docs/audio-input.json /path/to/en_US-ljspeech-high.onnx
```

无需在 CI 或客户端安装语音工具。模型文件不提交，生成文件总量与哈希可在 PR 中审核。语音数据来自课程静态文本，未读取或上传学习者资料。

## 播放与回退

- 优先静态 MP3，只有 `playing` / TTS `onstart` 事件之后显示正在播放。`play()` promise 完成不算已开始，更不代表用户听到声音。
- 静态资源失败、播放策略拦截或 8 秒未开始：显示明确错误，提供再次点按和“改用设备朗读”；不自动跨越用户手势尝试另一音源。
- TTS 首次列表为空：监听 `voiceschanged`，最多等 3 秒；准备好后请再次点按，保持移动端用户手势。无英语语音则提示安卓系统安装路径。
- 一次只允许一个播放实例；重复点按重播、可停止；组件离开只停止自己拥有的播放。沿用已保存语速，支持基本 `playbackRate`。
- 未覆盖文本走 TTS；诊断区分 API 不支持、无英语包、启动超时、加载/解码失败。静态音频可解码也不能证明设备外放、音量或语音听辨正确。

## Android / 平板人工验收

等待 PR 审查及用户同意后再发布。逐个点按 26 字母和 L04 核心词句，确认内容与清单一致，检查正常/静音/重播/中止/语速；断网或模拟 404 后检查错误提示及手动 TTS 回退；设备首次英语 voice 延迟、未装英语包、安装后返回重试均需验证。当前未宣称实机通过。

## 本轮实际验证记录

- 51 个 MP3，合计 478,596 bytes；FFmpeg 全量实际解码通过，解码时长 0.232–6.269 秒，最小波形 RMS 0.0894。短词长度不等于质量评价。
- 隔离 Chromium，390px 视口，访问本地开发版字母 A：音频请求 HTTP 206，真实媒体 playing/ended 均触发；没有使用用户现有浏览器数据。这仍不证明物理外放和人耳发音正确。
- 状态机覆盖静态优先、播放错误、无声启动超时、异步 voice 列表、重播/停止和过期回调隔离；原课程/IndexedDB 测试保留。
- 分阶段 PR 为依赖链；workflow 的 PR 检查扩展为任意目标分支，只有 main 的非 PR 才可部署。
