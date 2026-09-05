# Dual Axis Dodge — Project Handoff & Development Log

> 新接手者先看这里。本文件既是项目交接说明，也是持续更新日志。
>
> 维护规则：**每一次实际功能、修复、玩法、性能、兼容性、测试或部署流程更新，都必须在同一次开发轮次中补一条日志。** 临时工作流/临时补丁文件的创建与清理如果没有改变游戏行为，可合并写在对应功能条目里，不必单独制造噪音。

## 1. 项目一句话说明

Dual Axis Dodge 是一个以**同一名玩家双手同时操作**为核心的横屏网页反应游戏。

经典模式的核心玩法：

- 横向角色只做左右移动，对应障碍从上往下。
- 纵向角色只做上下移动，对应障碍横向穿过半屏。
- 两个半屏可镜像互换；角色、障碍入口、障碍方向和反应距离必须一起镜像，不能只换角色位置。
- 任意一侧碰撞，整局立即结束。
- 主分数是生存时间。
- 手机横屏 + 双指独立触控是第一优先级；电脑键盘是完整支持的平台，但不能反过来破坏移动端体验。

项目目前还提供可选的“自由移动”模式，但**轴向锁定/经典玩法仍是默认和设计基准**。自由移动的纪录与经典模式分开，不能污染经典模式成绩。

## 2. 当前代码结构

项目是轻量静态站点，没有前端框架：

- `README.md`：GitHub 首页接手入口，指向本日志并给出最小运行/测试说明。
- `index.html`：绝大多数 UI、Canvas 绘制、状态机、输入、难度、碰撞、音频逻辑都在这里。
- `sw.js`：PWA/离线缓存与版本更新策略。
- `manifest.webmanifest`：PWA manifest。
- `icon.svg`：应用图标。
- `tests/input-regression.mjs`：键盘输入与帧率无关性回归测试。
- `tests/touch-ownership-regression.mjs`：双指独立控制、跨中线 ownership 稳定性、候选 pointer 提升与 Pointer/Touch Events 兼容路径回归测试。
- `tests/spawn-fairness-regression.mjs`：刷怪公平性/安全区回归测试。
- `tests/lifecycle-audio-regression.mjs`：页面后台/前台生命周期、countdown 中断 race、Wake Lock、Web Audio Safari fallback、手势解锁与非致命恢复回归测试。
- `tests/resource-races-regression.mjs`：在 Node VM 中执行实际运行时函数，控制浏览器异步请求完成顺序，验证音乐按钮、延迟音频恢复与 Wake Lock ownership。
- `.github/workflows/input-regression.yml`：在相关代码/测试变动时运行输入、刷怪公平性、触控 ownership 与生命周期/音频回归。
- `PROJECT_LOG.md`：本文件；每轮实际更新必须同步维护。

部署目标：GitHub Pages，`main` 直接作为线上版本来源。

## 3. 不能轻易破坏的技术约束

### 输入

- 键盘不能使用“keydown 每触发一次固定移动 N px”的实现。
- 正确模型是：`keydown/keyup` 只维护 held-state，`requestAnimationFrame -> update(dt)` 按真实时间连续驱动。
- 经典模式：A/D 或 ←/→ 控制横向角色；W/S 或 ↑/↓ 控制纵向角色。
- 相反方向同时按必须互相抵消；横向和纵向输入必须可同时存在。
- `keyup`、`blur`、`visibilitychange`、`pagehide`、暂停、Game Over、重开都必须清理输入状态，避免粘键。
- 手机必须继续允许左右半屏两个 pointer/touch 同时独立拥有控制权。

### 碰撞

- 高速移动不能只做单帧终点碰撞。
- 当前做法按“障碍最大位移”和“玩家最大位移”动态分段，单段位移保持在约 7px 以内。
- 自由移动时玩家位移要按二维距离计算，不能只看 X 或 Y，否则斜向高速移动可能穿透。

### 左右互换

互换不是 UI 换标签，而是完整玩法镜像：

- 横向/纵向角色切换到另一物理半屏。
- 对应障碍生成入口一起镜像。
- 横向飞行障碍运动方向一起反转。
- 出界判定一起反转。
- 难度/反应距离按镜像后的有效路径计算。
- 游戏中互换应先进入安全暂停，避免切换瞬间误撞或粘指。

### 状态机

主要状态：`idle -> countdown -> running -> paused / over`。

任何新增功能都要明确它在这些状态下是否允许操作。尤其避免：

- 暂停后旧按键仍生效。
- 后台恢复后时间/角色突然跳跃。
- countdown 被后台/旋转等中断后，旧 timeout 回调把状态重新切回 `running`。
- countdown 期间残留 pointer 或 keyboard state。
- Game Over 后仍在更新玩家目标位置。

### 音频

- Web Audio 在 iOS/iPadOS/Android 浏览器可能因为 autoplay policy 保持 `suspended`。
- 音频启动/恢复必须建立在真实用户手势和 `AudioContext.resume()` 上，并允许无音频能力时安静降级。
- 背景音乐不要只堆低频；手机小扬声器对低频表现弱。
- 页面从后台回来时需要尝试恢复音频，但失败不能影响游戏主循环。

### PWA / 缓存

- 改动线上行为后要关注 Service Worker 缓存是否会让手机继续使用旧版本。
- 调整缓存策略/核心文件时应考虑 bump cache key。
- 页面导航目前优先网络，失败时回退缓存；不要把用户长期锁死在旧 HTML。

## 4. 每轮开发的标准流程

1. 读取 `README.md` 和本文件的当前交接快照/最近日志，再读取最新 `main`、最近 commit、现有测试和 GitHub Pages 状态。
2. 明确本轮唯一最有价值的小步，不为了“有更新”而堆功能。
3. 修改前确认不会破坏经典核心玩法、双指触控和左右镜像公平性。
4. 修改代码。
5. 至少检查：JavaScript 语法、状态机、碰撞、双指、键盘、横竖屏/后台、音频降级、不同尺寸、高难度阶段中与本次变更相关的风险。
6. 运行已有回归测试；如果本次修的是曾经发生过的 bug，优先把它写成永久回归测试。
7. **更新本文件，记录本轮改动。**
8. 提交 `main`。
9. 确认 GitHub Pages 构建/部署；失败就继续修，不把失败状态留给下一位接手者。

注意：日志通常应与功能代码放在同一个提交里。这样不会因为“为了记录部署成功再提交日志”而递归触发新的 Pages 部署。Pages 的最终成功状态以对应 commit 的 GitHub Actions 历史为准。

## 5. 每条日志的固定格式

后续新增条目统一放到“更新记录”最上方，建议格式：

```text
### YYYY-MM-DD HH:mm (Asia/Shanghai) — 一句话标题

- 目标：为什么做。
- 判断：根因/产品判断。
- 改动：实际改变了什么；涉及哪些文件/关键函数。
- 行为约束：哪些核心行为明确保持不变。
- 测试：实际跑了什么，结果如何。
- Commit：SHA + message。
- Pages：该功能 commit 的部署结果；若提交时仍 pending，写 pending，并在下一轮日志中确认上一轮最终状态。
- 后续：下一位接手者最值得继续看的问题。
```

不要只写“优化体验”“修复 bug”这种无法交接的信息。要写出**为什么、哪里、怎么验证、有什么边界条件**。

## 6. 当前交接快照

更新时间：2026-09-05 12:51 (Asia/Shanghai)

- 本轮基于 main `6d861765c7f021eb335245d6ad5f680fe00a7b98`，其 GitHub Pages run `33654816639` 和 Project log guard 已确认 `completed / success`；玩家可见玩法沿用 `b1a3fa32` 的精简结算。
- 本轮 `Fix audio gesture and screen wake-lock races` 修复音乐按钮 capture/click 竞态、延迟 resume 覆盖静音/后台状态，以及防熄屏请求在暂停后才返回的竞态；Pages 最终状态以该提交的 Actions 历史为准。
- Game Over 当前只突出最终成绩、最佳成绩、撞击轴、到达 LEVEL 与 NEAR MISS；历史局数据及 `window.__dualAxisHealth` 诊断仍保留在底层。
- 键盘输入已经是 held-state + `update(dt)` 连续驱动，并有永久回归测试。
- 目前已有键盘输入、移动端双指 ownership、刷怪公平性、页面生命周期/Web Audio 与 countdown 中断 race 的永久回归保护，并统一纳入 `.github/workflows/input-regression.yml`。
- `interruptGame()` 对 `running/countdown` 先递增 `countdownToken` 再进入 `paused`；countdown 的 tick 与最终切换都必须再次核对 token/state，保证旧定时回调不能在后台恢复后复活游戏。
- 页面生命周期已有 `pagehide` 输入清理/安全暂停保护；前台可见时会按状态恢复 Wake Lock，并对 Web Audio 做 best-effort 恢复。
- Web Audio 使用 `AudioContext || webkitAudioContext`，`resume()` 失败不会阻塞游戏；后续真实 pointer/touch/keyboard 手势仍会再次尝试 `ensureAudio(true)` 并 prime 输出。
- 经典轴向锁定仍是项目核心基准；自由移动是可选模式。
- 移动端双指 ownership 已有结构与状态模型回归保护；仍需在真实低帧/高刷屏设备验证 `pointerrawupdate`/coalesced events 的时序、触控延迟与抖动。
- 项目继续保持轻量小游戏定位：不主动扩玩法或堆系统，后续只处理真实 bug、明显手感问题或明确体验需求。

## 7. 更新记录

### 2026-09-05 12:51 (Asia/Shanghai) — 修复音频和防熄屏异步竞态

- 目标：优化 GitHub Pages 上的现有小游戏，优先解决可复现的音乐按钮失效与后台资源状态问题。
- 判断：document 的 capture-phase 手势监听先于音乐按钮 click 恢复 AudioContext；若恢复在 click 前完成，按钮会把本应“激活声音”的操作误判为“关闭音乐”。另有 `resume()` 在静音/隐藏之后完成、Wake Lock 在暂停后返回或多个请求乱序返回的竞态，原结构测试未覆盖。
- 改动：`index.html` 的全局音频解锁排除音乐按钮及其子元素，由按钮自行解锁；`ensureAudio()` 在异步 resume 后重新检查静音/页面隐藏状态；短音和静音 prime buffer 播放结束后断开节点。Wake Lock 使用 token、pending 去重和 sentinel 身份检查，释放过期锁，捕获异步 release 拒绝，并响应系统 release。`sw.js` 缓存键从 v3 升至 v4，安装后刷新核心资源。
- 行为约束：不改变玩法、双指 ownership、左右镜像、移动速度、障碍、碰撞、难度、音量参数或成绩格式；保持 GitHub Pages 为部署目标，不使用 Sites。
- 测试：四套现有 Node 回归全部通过。新增 `tests/resource-races-regression.mjs` 执行实际源码函数，覆盖 pointer/touch/keyboard 音乐按钮事件顺序、关闭/重开、Safari fallback、resume 拒绝后重试、静音/后台期间延迟恢复、音频节点清理、重复及乱序 Wake Lock 请求、系统释放和 release 拒绝；已纳入现有 Input regression CI。将新测试应用于修改前 HTML，实际复现“首次点击关闭声音”的失败；修复后通过。HTML 脚本、SW 语法及 manifest/核心资源检查通过。
- Commit：本条提交 — `Fix audio gesture and screen wake-lock races`。
- CI / Pages：提交时 pending；同轮确认对应提交的 Input regression、Project log guard 和 GitHub Pages 最终状态，不通过额外文档提交递归触发部署。
- 遗留风险：以上为 Node 中执行实际函数的回归，不等同真机浏览器端到端测试；Android/iOS 的实际扬声器听感、系统手势和锁屏恢复需真机确认。下一步以真实使用反馈为准，避免扩大玩法或重复堆测试。

### 2026-09-02 22:17 (Asia/Shanghai) — 修正当前交接基线与部署状态

- 目标：消除 `PROJECT_LOG.md` 与最新 main 的事实冲突，避免下一轮维护者误以为运行时仍停留在 `553e3de`。
- 判断：上一轮 `b1a3fa32` 已实际修改 Game Over 可见摘要，因此“当前运行时仍以 `553e3de` 为基线”的快照已经过期；同时 Pages #154 已在提交后成功完成，不应继续保留 `pending` 状态。
- 改动：仅更新 `PROJECT_LOG.md` 的当前交接快照和上一条 Game Over 记录的 CI / Pages 状态，明确当前 main 为 `b1a3fa32`、Pages #154 为 `completed / success`，并记录当前轻量小游戏维护边界。
- 行为约束：不修改 `index.html`、测试、输入、玩法、难度、碰撞、音频、PWA、持久化数据或任何玩家可见行为。
- 测试：本轮仅纠正文档事实；已重新读取当前 main、最近提交、四个现有回归测试文件清单和 Pages #154 实际结果。因为没有运行时代码/测试变化，不重复执行 Node 回归。
- Commit：本条提交 — `Correct current handoff baseline`。
- CI / Pages：上一玩家可见版本 `b1a3fa32` 的 Pages #154 已确认成功；本条纯文档提交触发的新 Pages 仅用于同步站点源码，不改变游戏行为。
- 遗留风险：真机 Safari/iPadOS 音频恢复与高刷双指输入质量仍属于无法仅靠当前结构测试完全覆盖的风险。
- 下一步：保持轻量小游戏定位；无明确真实问题时不制造功能更新，出现真实 bug 或明显手感问题再做最小修复。

### 2026-09-02 22:16 (Asia/Shanghai) — 精简 Game Over 结算信息

- 目标：项目定位保持为轻量小游戏，结算页应突出“坚持多久”和立即重开，而不是展示一长串历史分析数据。
- 判断：当前 Game Over 把最近局数、横/纵向死亡次数、平均死亡时间、样本门槛和趋势全部塞进一行，信息密度过高，与简单小游戏定位不匹配；这些历史数据对维护诊断仍有价值，不应删除底层记录。
- 改动：仅调整 `index.html` 的 `gameOver()` 可见摘要，保留最终成绩、个人/档位最佳、撞击轴、到达 LEVEL 和 NEAR MISS；不再把最近样本、H/V 次数、平均时间和趋势显示给玩家。`recordRun()`、`recentBalance()`、`layoutBalance()` 与 `window.__dualAxisHealth` 仍保留，因此本地历史数据和诊断能力不丢失。
- 行为约束：不修改移动、障碍、难度、碰撞、双指 ownership、键盘、左右镜像、经典/自由模式、成绩计算、音频、PWA 或本地历史数据格式。
- 测试：提交前运行现有四套 Node 回归：键盘输入、刷怪公平性、双指 ownership、生命周期/音频/countdown race；并检查 `index.html` 中不再引用 `balance` 变量生成 Game Over 文案。
- Commit：`b1a3fa32c6f0b35418eb3f60eaf0dbc9db92e31b` — `Simplify game over summary`。
- CI / Pages：GitHub Pages build #154 已确认 `completed / success`；本轮功能变更此前的回归检查均已通过，没有遗留失败状态。
- 遗留风险：本轮只减信息，不改变逻辑；唯一需要真机确认的是小屏横屏下精简后的结算视觉间距是否仍自然。
- 下一步：小游戏定位下不主动扩玩法；后续只处理真实 bug、明显手感问题或用户明确提出的体验问题。

### 2026-09-02 21:26 (Asia/Shanghai) — 防止中断后的旧 countdown 回调复活游戏

- 目标：补足页面生命周期测试里最容易出现竞态的边界：玩家在 `3/2/1/GO` 倒计时期间切后台、旋转或触发其他安全中断后，已经排队的 `setTimeout` 不能在稍后把 `paused` 偷偷改回 `running`。
- 判断：当前运行时实现已经采用正确的 token 失效模型：`interruptGame()` 对 `running/countdown` 先 `++countdownToken` 再进入 `paused`，倒计时 tick 与最终 `state='running'` 都重新核对 token/state；本轮没有证据需要改运行时代码，最有价值的是把这个 race contract 做成永久、确定性的测试。
- 改动：扩展 `tests/lifecycle-audio-regression.mjs`，新增结构检查，要求中断时递增 token、tick 拒绝 stale token、最终完成回调再次核对 token/state；同时新增纯状态模型，模拟旧 timeout 已捕获 token、随后后台中断、旧回调再执行，断言状态仍保持 `paused`，并验证已暂停状态不会重复中断。
- 行为约束：不修改 `index.html`、移动速度、难度、碰撞、双指 ownership、键盘控制、左右镜像、经典/自由模式、成绩、音频或 PWA 缓存；玩家可见行为保持不变。
- 测试：该测试仍通过现有 `Input regression` workflow 与键盘、刷怪公平性、触控 ownership、生命周期/音频回归一起执行；本轮功能提交后第一次 `Project log guard` 因尚未同步日志按预期失败，补本条日志后必须确认 guard、Input regression 与 Pages 最终成功。
- Commit：`8fac9694f6c2e3f347d586ce1a01e20ae2d0d0b2` — `Guard interrupted countdown lifecycle state`；本条日志提交 — `Document interrupted countdown regression guard`。
- CI / Pages：提交日志时 pending；本轮结束前确认最终 main 的 Project log guard、Input regression 与 GitHub Pages。
- 遗留风险：纯状态模型可锁住 token/state 合约，但不能完全模拟浏览器冻结/恢复定时器、BFCache 或 iOS Safari 的任务调度顺序。
- 下一步：若没有真机条件，优先为 `pagehide/visibilitychange/orientation` 组合建立更接近真实事件顺序的浏览器级回归；有真机则优先测 iOS/iPadOS 的后台/锁屏恢复与高刷双指输入质量。

### 2026-09-02 21:06 (Asia/Shanghai) — 固化页面生命周期与 Web Audio 恢复保护

- 目标：Safari/iPadOS 在后台切换后可能暂停 AudioContext，而 autoplay policy 可能拒绝无手势的 `resume()`；此前运行时已经有恢复逻辑，但没有永久测试保护，后续重构容易静默破坏后台安全或手势二次解锁路径。
- 判断：检查当前 `index.html` 后确认没有需要立即改手感/运行时的真实 bug：`visibilitychange` 回到前台会 best-effort 调 `recoverAudio()`，`ensureAudio(false)` 的失败为非致命；真实 pointer/touch/keyboard 手势另有 `ensureAudio(true)` 路径并 prime 输出。因此本轮最有价值的小步是把这些不变量写成回归测试，而不是重复改正确代码。
- 改动：新增 `tests/lifecycle-audio-regression.mjs`，结构性检查 `pagehide`/`visibilitychange` 的暂停、输入与帧时间安全，前台 Wake Lock 恢复，`AudioContext || webkitAudioContext` Safari fallback，`resume()` 与失败降级，pointer/touch/keyboard 真实手势解锁、`primeAudioOutput()`，以及隐藏/未 running 时音乐调度保持静默；随后把该测试接入 `.github/workflows/input-regression.yml`。
- 行为约束：不修改 `index.html`、移动速度、难度曲线、碰撞、双指 ownership、键盘控制、左右镜像、经典/自由模式、成绩或 PWA 缓存；玩家可见行为保持不变。
- 测试：新测试由 Node `assert` 直接读取当前 `index.html`，锁定后台→前台→手势恢复链路；CI 同时继续运行 `input-regression.mjs`、`spawn-fairness-regression.mjs`、`touch-ownership-regression.mjs`。最终 CI/Pages 状态在本轮提交后核对。
- Commit：`806679515442bc03d3355dc61270389da7937318` — `Add lifecycle audio regression coverage`；`745b3b2587ec495cd506fe3d9c56ac44b08b6567` — `Run lifecycle audio regression in CI`；本条日志提交 — `Document lifecycle audio regression coverage`。
- CI / Pages：提交时 pending；本轮结束前检查最终 main 的 Input regression、Project log guard 与 GitHub Pages。
- 遗留风险：结构回归测试只能证明关键恢复路径仍存在，不能模拟 iOS/iPadOS 的真实 autoplay policy、AudioSession/系统中断、锁屏或 Safari BFCache 调度。
- 下一步：优先做真机 Safari/iPadOS 的“运行中→后台/锁屏→返回→首次触摸”场景验证；若暂时无真机条件，则继续补可自动化的页面生命周期状态模型测试，或测试高刷双指输入抖动/事件丢失。

### 2026-09-02 20:26 (Asia/Shanghai) — 为移动端双指 ownership 建立永久回归保护

- 目标：手机横屏双指是第一优先级，但此前只有键盘输入和刷怪公平性的永久测试；双指 ownership、跨中线拖动和 owner 释放后的候选提升主要靠人工理解代码，重构时容易静默退化。
- 判断：当前实现本身保持了正确模型：pointer 在按下时绑定物理半屏，移动时读取已保存的 side，不因跨中线重新归属；每个半屏只有一个 owner，同侧额外 pointer 作为候选，owner 释放后用候选的最新位置立即提升。当前没有证据需要改变运行时行为，因此本轮优先固化这些不变量而不是改手感参数。
- 改动：新增 `tests/touch-ownership-regression.mjs`，检查 `touch-action:none`、Pointer Capture、`pointercancel`/`lostpointercapture`、coalesced events、能力检测后的 `pointerrawupdate` 和 Touch Events fallback；测试内用纯状态模型验证左右双指独立 ownership、跨中线不抢手、同侧候选不抢 owner、owner 释放后候选按最新坐标提升。随后把新测试接入 `.github/workflows/input-regression.yml`，`README.md` 同步补充测试入口。
- 行为约束：不修改 `index.html` 运行时逻辑、移动速度、难度、碰撞、左右镜像、自由/经典模式或成绩数据；经典模式和手机双指控制行为保持原样。
- 测试：功能提交前执行 `node --check` 检查内联游戏脚本，并运行键盘输入、刷怪公平性和新双指 ownership 三套回归；新测试覆盖双侧同时按、跨中线 ownership 稳定、第三指候选、释放提升、cancel/capture/raw/coalesced/fallback 结构保护。
- Commit：本条日志与测试所在功能提交 — `Add touch ownership regression coverage`；永久 CI workflow 的接入在同一开发轮次完成。
- CI / Pages：提交时 pending；本轮结束前确认 Input regression、Project log guard 与 GitHub Pages 最终结果。
- 遗留风险：该测试能防结构和状态机回归，但不能替代 iOS/Android 真机对 `pointerrawupdate`、coalesced sample 顺序、浏览器调度和高刷触控延迟的测量。
- 下一步：优先验证 Safari/iPadOS 页面生命周期 + Web Audio 恢复组合；如果先获得真机条件，则测 60/90/120/144Hz 双指高速拖动的输入延迟、抖动和丢事件。

### 2026-09-02 20:07 (Asia/Shanghai) — 建立可持续的接手入口与强制日志流程

- 目标：不仅创建日志文件，还要保证以后新开发者能发现它、自动开发任务也不会漏记。
- 判断：单独放一个 `PROJECT_LOG.md` 仍可能被新接手者忽略；而“每次更新记日志”如果只依赖聊天记忆，长期一定会漏。
- 改动：新增根目录 `README.md`，作为 GitHub 首页接手入口，明确先读 `PROJECT_LOG.md`、核心玩法、代码结构、测试命令与 Pages 部署规则；同时更新每小时自动开发任务，强制每轮开始先读取日志，并要求任何实际更新与日志在同一轮完成、尽量同一提交。
- 行为约束：只改交接文档和自动开发流程，不修改 `index.html`、输入、碰撞、难度、音频或 PWA 运行逻辑。
- 测试：核对根目录、`tests/` 和 `.github/workflows/input-regression.yml`，确认 README 写出的测试命令与仓库现状一致；本轮无运行时代码变化，因此不重复执行游戏回归。
- Commit：`fe290c59` — `Add project handoff entrypoint`；本条日志所在提交 — `Document handoff entrypoint and logging policy`。
- Pages：游戏行为基线 `aaa4a88b` 已确认 build #138 成功；本轮文档提交触发的新 Pages 构建在本条提交后验证，日志不为记录自身部署结果制造递归提交。
- 后续：所有功能提交都应带对应日志；如果未来引入更多源码文件/构建工具，优先更新 README 的结构说明与本文件的技术约束，再继续开发。

### 2026-09-02 20:04 (Asia/Shanghai) — 建立项目交接日志

- 目标：让后续开发者不用依赖聊天记录或逐个翻 commit，也能快速理解项目目标、核心约束、当前架构、测试要求和历史决策。
- 判断：仓库此前没有根目录交接文档，重要的设计原因散落在 commit 与开发对话中，接手成本高，且容易把已修复过的问题重新引入。
- 改动：新增 `PROJECT_LOG.md`，定义项目核心玩法、输入/碰撞/镜像/状态机/音频/PWA 约束、标准开发流程、日志模板和当前交接快照。
- 行为约束：本次只新增文档，不修改游戏运行逻辑。
- 测试：无需运行时测试；创建前已确认当前 `main`、根目录结构、现有测试文件与最近 Pages 状态。
- Commit：`319860ed` — `Add project handoff and development log`。
- Pages：提交前已确认上一游戏行为 HEAD `aaa4a88b` 的 Pages build #138 为 `completed / success`；文档提交的最终部署状态以对应 GitHub Actions 历史为准。
- 后续：从下一次实际代码更新开始，功能改动与对应日志必须同轮完成；优先把“曾经真实发生过的 bug”转成永久回归测试，而不是只靠文字提醒。

### 2026-09-02 19:28 — 页面生命周期输入安全

- 目标：防止浏览器挂起/返回前进缓存等场景恢复后出现粘键或角色自行移动。
- 改动：加入 `pagehide` 安全暂停/输入清理路径。
- Commit：`e1fc5c3e` — `Pause and clear input on pagehide`。
- 结果：最终对应主分支 Pages 部署成功；之后仅清理了临时补丁 workflow。

### 2026-09-02 18:47 — 刷怪防永久安全区

- 目标：避免随机刷怪长期留下可挂机的固定安全区域。
- 改动：调整随机生成公平性，并增加永久回归测试与 CI 检查。
- Commit：`f61285d3` — `Prevent permanent safe zones in random spawns`；`c7a9d019` — `Run spawn fairness regression checks in CI`。
- 结果：功能保留，临时补丁辅助文件随后清理。

### 2026-09-02 18:26 — 键盘输入永久回归保护

- 目标：防止以后再次退回依赖操作系统 key repeat 的固定步进键盘实现。
- 改动：新增 `tests/input-regression.mjs` 和 CI 检查，覆盖 30/60/90/120/144Hz 位移一致性、并发双轴、相反方向抵消、keyup/blur/布局互换等。
- Commit：`9208a977` — `Add keyboard input regression test`；`3ed0dd87` — `Run input regression checks in CI`。
- 结果：测试成为长期项目保护线。

### 2026-09-02 17:52 — 新增轴向锁定 / 自由移动控制方式

- 目标：在不删除经典玩法的前提下，让玩家可选择是否固定在一个轴上移动。
- 改动：经典轴向锁定保留为基准；新增自由移动，手机仍按半屏双指独立控制；自由模式使用独立成绩/统计并适配二维分段碰撞。
- Commit：`4ae19ecd` — `Add axis-lock and free movement modes`。
- 结果：GitHub Pages 部署成功。

### 2026-09-02 17:26 — 完整镜像纵向障碍方向

- 目标：左右互换后保持相同反应窗口，而不是只移动角色导致障碍贴脸生成。
- 改动：互换时同步镜像纵向角色、横向飞行障碍的生成入口、运动方向、出界判定、现存障碍位置和反应距离计算。
- Commit：`f840beb` — `Mirror swapped obstacle direction and reaction path`。
- 结果：两种布局的有效反应路径保持对称。

### 2026-09-02 17:17 — 修正互换后的纵向角色物理位置

- 目标：切换到“左纵 · 右横”后，纵向角色应真正处在左侧对应位置，而不是仍贴近中线。
- 改动：纵向轨道位置由错误的半屏内比例放置修正为围绕中线的镜像公式。
- Commit：`7379614` — `Mirror vertical control position when sides swap`。

### 2026-09-02 之前 — 键盘连续移动主修复

- 目标：解决电脑端长按方向键延迟、卡顿、依赖操作系统按键重复率的问题。
- 改动：`keydown/keyup` 只维护按键集合，角色在 `requestAnimationFrame/update(dt)` 中按时间连续移动；相反方向抵消；暂停、失焦、后台、Game Over 等路径清键；分段碰撞覆盖键盘高速移动。
- 代表 Commit：`6ea718b` — `Finish frame-rate independent keyboard controls`。
- 结果：后续又加入永久输入回归测试，防止这一架构退化。

---

维护者提醒：当代码和本日志发生冲突时，以最新 `main` 代码和测试为事实来源，但应立即修正日志。日志存在的目的不是替代代码，而是保存“为什么这样设计”的上下文。
