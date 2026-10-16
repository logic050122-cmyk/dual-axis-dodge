# PLAYDOT / Dual Axis Dodge — Project Handoff & Development Log

> 新接手者先看这里。本文件既是项目交接说明，也是持续更新日志。
>
> 维护规则：**每一次实际功能、修复、玩法、性能、兼容性、测试或部署流程更新，都必须在同一次开发轮次中补一条日志。** 临时工作流/临时补丁文件的创建与清理如果没有改变游戏行为，可合并写在对应功能条目里，不必单独制造噪音。

## 0. 当前仓库说明（2026-10-15 起）

根 index.html 是 PLAYDOT，大厅中的双轴闪避位于 games/dual-axis-dodge/index.html；根 sw.js 为共用服务工作线程。第 1～6 节保留旧游戏历史设计，路径参考 README。

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

更新时间：2026-09-06 (Asia/Shanghai)

- 本轮以 `4ea3dcc3c6eb8dc4e4745ff92e453df7fdc918e8` 为基线，其 Input regression、Project log guard 与 Pages run `33945742060` 已确认成功。
- 本轮 `Improve landscape menus and touch controls` 优化手机横屏前端：左右分栏首页、可折叠角色位置设置、中文主按钮、顶部工具栏、更大的触控区域与更清晰的文字；游戏脚本逐字保持不变。发布结果以该提交的 Actions 历史为准。
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

### 2026-10-16 (Asia/Shanghai) — 节奏点击增加分段复盘与最弱乐句练习

- 目标：挑战档已经有四段固定长短乐句，但结算只显示整局命中/误点；玩家不知道具体弱在哪一段，也只能重跑全部 16 拍，固定谱面的学习价值没有转化为针对练习入口。
- 参考与判断：[Game Developer《Staying Power》](https://www.gamedeveloper.com/design/staying-power-rethinking-feedback-to-keep-players-in-the-game)强调把失败归因到可调整的策略会促进继续尝试；[Sonic Beat 移动节奏游戏复盘](https://www.gamedeveloper.com/audio/the-making-of-sonic-beat-solving-rhythm-gaming-for-mobile-devices)指出缺少 practice-friendly gameplay 会直接伤害体验。因此保留原谱面，只把整局反馈拆成可行动的乐句弱项，不靠继续加速或缩窄判定窗制造难度。
- 改动：`arcade-games.js` 记录每次有效命中的早/晚毫秒偏差，挑战结算逐段显示命中数与平均早/晚；按命中率最低、同率时绝对偏差最大的规则选择最弱乐句，并提供只重播该四拍的入口。专项练习保留原段内 600/800/1000ms 关系，结束后可再练本段或返回完整挑战；练习不写正式纪录。README、玩法审查、验收说明同步，根缓存 `v31→v32`。
- 行为约束：轻松档 12 个 1000ms 等拍、挑战完整 4×4 固定谱面、±280/210ms 判定窗、大按钮/空格键、卡顿安全暂停、静音与 `playdot:v1:pulse:easy/challenge` 旧成绩键不变；满拍且各段平均偏差低于 60ms 时不制造弱项。其他九款及双轴双指 ownership/完全镜像/碰撞/旧成绩不变。
- 测试：扩展 `tests/pulse-game-regression.mjs` 覆盖分段命中/偏差统计、最弱段选择、第三段时间归一化、完整挑战进入第二段专项、专项不刷新纪录、重复本段/返回完整挑战，并保留两档判定边界、固定谱面、键盘、暂停和卡顿保护。提交前运行全部 25 套 Node 回归、JS/SW/内联脚本语法与 diff 检查；结构 DOM 不代表真人节奏感、手机触控或布局验收。
- Commit：`Add focused phrase practice to rhythm tapping`（本条提交）。
- CI / Pages：提交时 pending；上一提交 `7a92fb9` 的 Input regression、Project log guard 与 Pages 已确认成功。发布后核对三项工作流并实际 GET 首页、扩展 JS、SW 与双轴入口。
- 后续：真机验证 320–430px 结果卡四段文字换行、最弱段按钮触达、空格/触控连续输入，以及普通玩家专项练习后同段命中是否提高、早晚偏差是否缩小；下一轮跳过节奏点击，继续轮换评估未改游戏。

### 2026-10-16 (Asia/Shanghai) — 修复记忆翻牌键盘焦点入口中断

- 问题：公开桌面 Chrome 实测轻松档点击“开始翻牌”后、挑战档 3 秒预览结束后，焦点均落回 `BODY`；键盘玩家必须重新从弹窗顶部遍历才能进入牌面。成功配对会禁用当前卡片，焦点还可能停在已禁用节点；结算同样没有把焦点交给重玩操作。
- 根因：`startMemory()` 会删除当前获得焦点的开始按钮，但创建/启用牌面后没有显式指定新的可操作目标；配对和结算状态切换也只更新 `disabled`/DOM，没有维护焦点链。
- 修复：`index.html` 新增 `focusPlayableMemoryCard()`；轻松档开局及挑战预览结束后聚焦第一张未禁用卡，配对成功后跳到下一张可玩卡，完成后聚焦主要“再练同一盘”按钮。只在离散状态切换时调用，不改变翻牌、预览、计步、失配或同盘规则；根缓存 `v30→v31`。
- 行为约束：鼠标/触屏事件、6/8 对、3 秒预览、不限时、同盘布局/对照、图案 ARIA 和旧成绩键不变；其他九款及双轴双指 ownership/镜像/碰撞/旧成绩不变。
- 测试：`tests/memory-challenge-regression.mjs` 新增轻松开局、挑战预览边界、配对禁用卡及结算主操作四段焦点回归；提交前运行全部 25 套 Node 回归、JS/SW/内联脚本语法与 diff 检查。结构 DOM/桌面键盘不替代 Android/iOS 真机触控或移动读屏验收。
- Commit：`Restore memory game keyboard focus flow`（本条提交）。
- CI / Pages：提交时 pending；上一提交 `20b9dad` 的 Input regression、Project log guard 与 Pages 已确认成功。发布后用真实桌面 Chrome 重走轻松/挑战焦点链，并 GET 首页、SW 与双轴入口。
- 后续：真机验证 TalkBack/VoiceOver 宣读顺序、320–430px 双按钮布局与触控后是否出现意外焦点样式；下一轮跳过记忆翻牌，继续巡检其他游戏的键盘/后台边界。

### 2026-10-16 (Asia/Shanghai) — 记忆翻牌增加同盘复练与上局对照

- 目标：记忆翻牌已有预览、失配和最长连对，但结算“再玩一局”总会随机换盘；步数变化混入图案位置运气，玩家看见失配后无法在同一位置验证是否真正记住。
- 参考与判断：[Game Developer《Learning by Design: Games as Learning Machines》](https://www.gamedeveloper.com/design/learning-by-design-games-as-learning-machines)总结了练习、掌握、再挑战的 expertise cycle；[Cognitive Flow](https://www.gamedeveloper.com/design/cognitive-flow-the-psychology-of-great-game-design)强调清楚目标与及时成绩反馈。因此只固定复练盘面并比较前后结果，不增加卡片、倒计时或随机惩罚。
- 改动：`index.html` 把结算主入口改为“再练同一盘”，精确复制卡片顺序并保留当前连续练习次数；结果卡用文字显示上次→本次的步数与失配，另保留“换一盘”重置会话。README、玩法审查、验收记录与根缓存 `v29→v30` 同步。
- 行为约束：轻松 6 对、挑战 8 对及原 3 秒预览、不限时、连对/失配即时反馈、图案与 ARIA 标签、旧 `playdot:v1:memory:easy/challenge` 最佳步数键不变；同盘次数/对照只存在当前内存，不新增持久化键。其他九款和双轴双指 ownership/完全镜像/碰撞/旧成绩不变。
- 测试：`tests/memory-challenge-regression.mjs` 新增同盘 16 个卡片 ID/位置逐项保持、尝试次数与前次快照、再次预览、9→8 步及失配 1→0 对照、主动换盘清空会话；提交前运行全部 25 套 Node 回归、JS/SW/内联脚本语法和 diff 检查。结构 DOM 不代表真实手机布局、触屏或人类记忆提升。
- Commit：`Add same-board mastery loop to memory`（本条提交）。
- CI / Pages：提交时 pending；上一提交 `c965a08` 的 Input regression、Project log guard 与 Pages 已确认成功。发布后核对本提交三项工作流，并实际 GET 首页、SW 与双轴入口。
- 后续：真机验证 320–430px 下两枚结算按钮、4×4 图案与挑战 3 秒观察；让普通玩家同盘连续玩三次，观察失配是否下降。下一轮跳过记忆翻牌，优先评估反应力测试或精准点击的失败复盘，而不是继续给记忆翻牌堆规则。

### 2026-10-16 (Asia/Shanghai) — 暂停时禁用后续游戏棋盘按钮

- 目标：修复真实桌面 Chrome 复现的暂停可访问性缺口。迷宫暂停后 `mazeStep()` 会拒绝移动，但四个方向按钮仍呈现为可用；点击无效果也无新反馈，与已经禁用的提示/重置控件不一致。
- 根因：`controls()` 只同步工具栏按钮，`pause()` 仅给 `extraBoard` 设置 `aria-disabled="true"`，没有把棋盘内原生 `button.disabled` 同步到暂停状态；父容器的 ARIA 状态不会自动禁用子按钮。
- 改动：`arcade-games.js` 的共享 `controls()` 在 `paused/over` 时禁用 `extraBoard` 内按钮，继续游戏后恢复；`tests/maze-game-regression.mjs` 固化方向键暂停禁用与恢复回归；根缓存 `v28→v29`，验收记录同步。
- 行为约束：迷宫路线、步数、提示、同图复练、22px 滑动阈值和 pointer ownership 不变；其他后续游戏仅获得一致的暂停原生禁用状态。原双轴文件、双指控制、镜像、碰撞与旧成绩键不变。
- 测试：提交前运行迷宫专项及全部 25 套 Node 回归、JS/SW/内联脚本语法和 diff 检查；发布后用真实桌面 Chrome 检查暂停时方向按钮为 disabled、继续后恢复，并 GET 首页、扩展 JS、SW 与双轴入口。结构 DOM/桌面浏览器不替代手机真机触控验收。
- Commit：`Disable board controls while paused`（本条提交）。
- CI / Pages：提交时 pending；上一提交 `3663086` 的 Input regression、Project log guard 与 Pages 已确认成功。
- 后续：真机验证 vivo/Android 与 iOS 上的焦点、长按、切后台恢复和连续滑动；没有真机证据前不继续改迷宫规则。

### 2026-10-16 (Asia/Shanghai) — 迷你迷宫增加同图复练与绕路复盘

- 目标：迷宫已有最短路效率分和一步提示，但结算后重新挑战会生成随机新图；玩家即使看到效率不满，也不能回到同一组岔路验证更短路线，缺少“失败复盘 → 针对练习 → 再挑战”的最短闭环。
- 参考与判断：[Game Developer《The Value of Repetition》](https://www.gamedeveloper.com/design/the-value-of-repetition)强调游戏可以把行动、反馈、重试压缩成紧密的掌握循环；[Finding Flow in Hard Games](https://www.gamedeveloper.com/design/oops-i-did-it-again-finding-flow-in-hard-games)把清楚目标、直接反馈和技能/挑战匹配列为 flow 条件。因此只让同一随机题可复练，不增加计时、迷宫尺寸或随机惩罚。
- 改动：`arcade-games.js` 的迷宫结算增加到达次数、本次多走步数和本图最佳绕路；主按钮改为“再走同一图”，保持迷宫对象和墙布局但重置位置、轨迹、步数与提示次数，结果卡另提供“换个新迷宫”。README、玩法审查、验收与根缓存 `v27→v28` 同步。
- 行为约束：5×5/7×7 树生成、起点/出口、方向按钮/键盘/滑动、22px 连续滑动阈值、pointer ownership、碰墙不计步、一步提示、原题重置、不限时、效率公式与原 `playdot:v1:maze:easy/challenge` 成绩键不变；本图最佳只在连续同图练习中保留，不新增存储键。双轴及其他九款不变。
- 测试：`tests/maze-game-regression.mjs` 新增一次往返绕行后结算 +2、同图墙布局保持、第二次最短路把本图最佳更新为 +0、换新图清空同图复盘状态；继续覆盖 2000 个连通树、提示、暂停、重置和第二指 ownership。提交前运行全部 25 套 Node 回归、JS/SW/内联脚本语法与 diff 检查。结构 DOM 不代表手机布局、真实连续滑动或真人路线学习。
- Commit：`Add same-maze route mastery replay`（本条提交）。
- CI / Pages：提交时 pending；上一提交 `6a2f19f` 的 Input regression、Project log guard 与 Pages 已确认成功。发布后核对本提交三项工作流，并实际 GET 首页、扩展 JS、SW 与双轴入口。
- 后续：真机验证 320–430px 结果卡、两枚重玩按钮、7×7 连续滑动和切后台；让普通玩家同图连续走三次，观察多走步数是否下降。下一轮跳过迷宫，按路线优先评估记忆翻牌同盘复练。

### 2026-10-16 (Asia/Shanghai) — 一笔连线支持从已解锁关卡开始练习

- 目标：一笔连线已有六关坡度、撤销和诚实提示，但每次重开都从第 1 关开始；卡在后段的玩家必须重复已掌握的教学图，原最高通关记录没有形成“失败难关 → 针对练习 → 再挑战”的入口。
- 参考与判断：[Game Developer 的无文字教学文章](https://www.gamedeveloper.com/audio/no-more-tutorials-how-to-convey-information-through-design)强调重要技能应在真实玩法里主动练习；[The End is Nigh 设计复盘](https://www.gamedeveloper.com/design/punishing-difficulty-conveys-a-personal-story-in-i-the-end-is-nigh-i-)记录强制从头重来过于挫败、已掌握区域需要跳过手段。因此迁移双轴闪避的起始等级逻辑，不新增随机难度或把教学关变成重复劳动。
- 改动：`arcade-games.js` 为一笔连线增加 44px 高“练习起点”选择；默认仍从第 1 关开始，完成第 N 关才解锁第 N+1 关，轻松/挑战分别最多 4/6 关，选择后连续练到模式终点。运行时按实际最高记录夹紧选项，改 DOM 不能越级；禁存储时沿用会话最佳继续解锁。CSS、README、玩法审查、验收和缓存 `v26→v27` 同步。
- 行为约束：六张固定图、边集合、起点、滑动/点按、44px 节点、pointer ownership、快滑取样、提示整段可解、撤销/重置/暂停均不变；原 `playdot:v1:line:easy/challenge` 仍只保存最高完成关数，不新增或迁移记录键。双轴双指 ownership/镜像/碰撞/旧成绩及其他九款不变。
- 测试：`tests/line-game-regression.mjs` 新增初始只解锁第 1 关、伪造第 4 关被夹回、挑战纪录 4 时可从第 5 关连续练到第 6 关并解锁、禁存储会话完成第 1 关后可从第 2 关开始；提交前运行全部 25 套 Node 回归、JS/SW/内联脚本语法和 diff 检查。结构 DOM 不代表手机原生下拉控件、窄屏布局或真人学习效果。
- Commit：`Add unlocked level practice to one-stroke`（本条提交）。
- CI / Pages：提交时 pending；上一提交 `0bca63e` 三项工作流均已成功。发布后核对本提交 Input regression、Project log guard、Pages，并实际 GET 首页、扩展 JS/CSS 与 SW。
- 后续：真机验证 320–430px 下选择器高度、关卡名换行、完成后解锁是否容易理解，以及从第 5 关连续练三次是否比每次从头开始更愿意重试；下一轮跳过一笔连线，优先评估迷宫探索复盘。

### 2026-10-16 (Asia/Shanghai) — 颜色分类增加最短路线目标与绕路复盘

- 目标：颜色分类已有可解生成、撤销和关卡变化，但完成 3/4 关后只有通关纪录；玩家看不到每次盒子选择是否让路线更精炼，重复游玩缺少能力进步的正向回报。
- 参考与判断：[Sid Meier 的 GDC interesting decisions 总结](https://www.gamedeveloper.com/design/gdc-2012-sid-meier-on-how-to-see-games-as-sets-of-interesting-decisions)强调有信息的决策及行动后果反馈；[Mini Metro 极简视觉设计复盘](https://www.gamedeveloper.com/design/video-behind-the-minimalistic-visual-design-of-i-mini-metro-i-)强调用清晰、简洁的界面传达系统信息。因此保留既有搬运规则，只把“路线质量”变成可观察、可练习、可重玩的目标，不加速、不缩盒子、不随机惩罚。
- 改动：`arcade-games.js` 新增广度优先 `sortRoute()`，从当前盘面给出精确最短路线；每关显示当前/最短步数，可选“提示路线”用虚线来源、双线目标、盒号和文字标出一步但不代移动。整局结算披露总路线、最短目标、多走步数、提示次数，并新增 `sortRoute:模式` 最少绕路纪录；大厅把它附在原通关纪录后。`arcade-games.css`、README、玩法审查与验收记录同步，根缓存 `v25→v26`。
- 行为约束：轻松 3 类/3 关、挑战 4 类/4 关、容量 3、两个备用盒、逆向可解生成、单块移动、撤销、原题重置和不限时全部不变；旧 `sort:easy/challenge` 成绩键不迁移，双轴双指 ownership/完全镜像/碰撞/旧成绩及其他九款规则不变。
- 测试：`tests/sort-game-regression.mjs` 保留 2000 题可解/数量/合法移动检查，并新增 200 个精确最短路线、提示不代移动、非颜色提示样式、撤销/重置/暂停、完成后撤销不重复累计、最佳绕路与禁存储会话纪录；`tests/platform-regression.mjs` 验证大厅路线纪录。提交前运行全部 25 套 Node 回归、JS/SW/内联脚本语法、diff 与工作树检查。结构 DOM 和 Node BFS 计时不代表真机布局、触控或低端手机性能。
- Commit：`Add route mastery feedback to color sorting`（本条提交）。
- CI / Pages：提交时 pending；上一提交 `4738d14` 的 Input regression、Project log guard 与 Pages 已确认成功。发布后核对本提交三项工作流，并实际 GET 首页、扩展 JS/CSS 与 SW。
- 后续：真机验证 320–430px 三列盒子、四项统计换行、提示轮廓与盒号辨认；连续玩三局观察“多走步数”是否下降。下一轮跳过颜色分类，优先评估一笔连线固定六关的路线选择深度或迷宫探索复盘。

### 2026-10-16 (Asia/Shanghai) — 找出不同暂停后保持当前棋盘

- 问题：质量巡检复现到找出不同无论在正常答题还是错按反馈期间暂停，恢复都会调用 `nextOdd()` 重新随机当前题；暂停因此能换掉难题，不符合“冻结游戏”的预期。此前回归只验证剩余时间冻结，没有验证棋盘对象与反馈阶段。
- 修复：`arcade-games.js` 为找出不同记录当前反馈结果。未作答或错按后暂停，恢复保留同一个棋盘并清除已结束的错按边框；只有答对后的 420ms 反馈被暂停打断时才生成下一题，避免重复计分或卡在已答题。根 Service Worker 缓存 `v24→v25`。
- 行为约束：题目生成、三阶段观察规则、45 秒计时、轻松十题、分数和 `playdot:v1:odd:easy/challenge` 成绩键不变；其他九款及双轴双指 ownership/完全镜像/碰撞/旧成绩不变。
- 测试：`tests/extra-games-regression.mjs` 新增正常暂停保持棋盘、错按反馈期暂停保持棋盘并清反馈、答对反馈期暂停只推进一次，同时继续覆盖倒计时冻结和旧回调失效；提交前运行全部 25 套 Node 回归、JS/SW 语法与 diff 检查。结构 DOM 不代表真实浏览器后台调度或手机触控。
- Commit：`Preserve odd-one-out board across pause`（本条提交）。
- CI / Pages：提交时 pending；上一提交 `7b32df1` 的 Input regression、Project log guard 与 Pages 已确认成功。发布后核对本提交三项工作流，并实际 GET 首页、扩展 JS 与 SW。
- 后续：真机验证挑战档正常暂停、错按后立即切后台、答对动画中切后台三条路径，确认当前题、剩余秒数与焦点都保持合理；下一轮跳过找出不同，继续巡检其他游戏。

### 2026-10-16 (Asia/Shanghai) — 找出不同挑战档增加三阶段观察策略

- 目标：原挑战档只通过 3×3→4×4 和更相近的形状增加压力，辨认策略始终不变；前几题目标还同时换色，可能形成颜色捷径。本轮只为这一款加入可学习、可复盘的观察坡度，不新增游戏、不缩小触控格，也不靠继续加速制造深度。
- 参考与判断：[Treisman 的视觉搜索研究](https://pubmed.ncbi.nlm.nih.gov/6461717/)区分单一特征搜索与需要集中注意的特征结合；[Game Developer 对 Brain Putty 的设计复盘](https://www.gamedeveloper.com/design/brain-putty---teaching-a-match-three-has-never-been-this-hard)则逐项教授 Shape、Color、Pattern 再组合使用。找出不同适合把这条逻辑落成“看轮廓 → 忽略颜色 → 找唯一组合”，形成每次答题都能说明所练策略的短循环，而不复制外部作品的素材或关卡。完整取舍写入 `docs/GAMEPLAY_REVIEW.md`。
- 改动：`arcade-games.js` 的挑战档前两题只比较轮廓，第 3–5 题加入两种重复颜色作为干扰，第 6 题起要求找到唯一“形状＋中央圆点”组合；组合题保证目标形状和圆点状态分别都不唯一。当前阶段、题目提示、针对错误的反馈和结算到达阶段均有文字，SVG 圆点、轮廓及无障碍标签不只靠颜色。README、首页卡片、玩法审查与验收说明同步，根 Service Worker 缓存 `v23→v24`。
- 行为约束：轻松档仍为十题不限时唯一形状，原目标配色、计分、45 秒挑战、本机键 `playdot:v1:odd:easy/challenge`、暂停冻结、键盘焦点和触控格尺寸不变。其他九款、双轴双指 ownership/完全镜像/碰撞/旧成绩及两入口离线策略不变。
- 测试：扩展 `tests/extra-games-regression.mjs`，两档共 2000 个棋盘验证唯一轮廓、颜色非捷径、唯一组合及单属性不唯一，并覆盖真实结构 DOM 的三阶段切换；提交前运行全部 25 套 Node 回归、JS/SW 语法与 diff 检查。结构 DOM 不代表浏览器布局、真实触屏或真人学习效果。
- Commit：`Add staged observation rules to odd one out`（本条提交）。
- CI / Pages：提交时 pending；发布后核对 Input regression、Project log guard、Pages，并实际 GET 首页、扩展 JS/CSS 与 SW 对照提交内容。
- 后续：真机验证 320–430px 下四项统计是否自然换行、4×4 图形中央圆点是否清晰、阶段提示是否会在 30 秒内被理解，以及三次重玩后能否更快进入组合阶段；下一轮跳过找出不同，优先评估颜色分类的规划深度或一笔连线的路线选择。

### 2026-10-16 (Asia/Shanghai) — 节奏点击挑战档增加固定四段乐句

- 目标：原节奏点击两档都只是全局等拍，挑战档主要靠 800ms 间隔和较窄窗口提高难度，缺少能识别、预判和反复练熟的内容；本轮只补一条可学习的节奏曲线，不新增游戏或靠缩小触控区加难。
- 参考与判断：[Game Developer 的模式与技能文章](https://www.gamedeveloper.com/design/player-skill-patterns-randomization)指出有序、可辨认的模式支持技能进步，随机化可能把它退化成纯反射；[flow 与游戏设计文章](https://www.gamedeveloper.com/design/the-flow-applied-to-game-design)把清晰目标、即时反馈和有定义的输入节奏列为短循环要素。因此使用固定四段谱面，让重玩能够形成预判，不用随机间隔制造不可复盘的失败。完整取舍写入 `docs/GAMEPLAY_REVIEW.md`。
- 改动：`arcade-games.js` 为两档显式保存目标时点；轻松档仍为 12 个 1000ms 等拍，挑战档先用四个 800ms 等拍建立基准，后续三段加入 600ms 短拍、1000ms 长拍及 1200ms 段间停顿。挑战共 4×4 拍且每局相同；拍点列表以间距/边框分组，进行中文字显示乐句与拍位，视觉判定框随当前拍间隔缩放。README、玩法审查、验收说明同步，根 Service Worker 缓存 `v22→v23`。
- 公平与保留：挑战最短间隔 600ms，大于两个 ±210ms 判定窗口合计 420ms，不存在一次输入同时落入相邻拍；分组、数字、文字和边框不只依靠颜色。大触控按钮、空格键、静音、减少动态、分数公式、本机键 `playdot:v1:pulse:easy/challenge`、卡顿安全暂停与暂停后 1 秒准备不变。其他九款、双轴 ownership/镜像/碰撞/旧成绩及两入口离线策略不变。
- 测试：扩展 `tests/pulse-game-regression.mjs` 覆盖固定谱面、轻松等拍、短拍/停顿、全部判定边界、窗口不重叠、四段文本、两档满分、重复输入、键盘、暂停恢复和渲染中断；提交前运行全部 25 套 Node 回归、JS/SW 语法与 diff 检查。结构 DOM 不代表浏览器布局、真实触屏或人类节奏感。
- Commit：`Add learnable phrases to rhythm tapping`（本条提交）。
- CI / Pages：提交时 pending；发布后核对 Input regression、Project log guard、Pages，并实际 GET 首页、扩展 JS/CSS 与 SW 对照提交内容。
- 后续：真机验证 320–430px 下四组拍点是否自然换行、动态判定框是否清晰、600/1000/1200ms 关系能否在 30 秒内被理解，以及三次重玩命中数是否有可观察提升；下一轮跳过节奏点击，基于最新日志评估找出不同的观察维度或一笔连线的路线选择。

### 2026-10-16 (Asia/Shanghai) — 节奏记忆增加失误拍复盘与同轮练习

- 目标：挑战档原来点错只结束并显示完成轮数，玩家不知道错在序列哪里，也无法针对失败的长度练习；补齐“失败可解释 → 定点练习 → 再挑战”闭环，而不靠继续加速或缩小按钮制造难度。
- 参考与判断：[Principles of Virtual Sensation](https://www.gamedeveloper.com/design/principles-of-virtual-sensation)强调反馈要准确传达游戏状态并帮助后续改进；[纠正反馈与检索练习研究](https://pubmed.ncbi.nlm.nih.gov/34634998/)说明检索后的纠正反馈是学习环节。节奏记忆天然是即时顺序检索，因此结算指出第几拍、正确/误按信号，再允许原样重播失败序列，比随机开新局更适合形成可练习技能。
- 改动：`index.html` 的挑战档在误按时保存本局失败序列和错误位置，结算以数字、形状和文字同时说明“第几拍应为何、实际按了什么”；新增“练习失误轮”，原样重播同一序列，练习中点错可看正确答案并不限次重看，完整复现后引导重新挑战。练习不延长序列、不写纪录。README、验收说明同步，根 Service Worker 缓存 `v21→v22`。
- 行为约束：轻松档仍可随时重看/重试；挑战档仍从 1 拍开始、每过一轮加 1 拍、首次点错结束；播放速度、触控尺寸、数字/形状/声音提示、本机键 `playdot:v1:sequence:easy/challenge` 及其他九款游戏不变。双轴双指 ownership、完整镜像、碰撞、旧成绩和两入口离线策略不变。
- 测试：扩展 `tests/sequence-memory-regression.mjs` 覆盖中段误按复盘、失败序列逐项保留、练习错误纠正、同轮重播、练成不污染纪录及重新挑战；提交前运行全部 25 套 Node 回归、内联/SW 语法和 diff 检查。结构 DOM 不代表浏览器布局、真实触屏或儿童理解测试。
- Commit：`Add focused retry loop to sequence memory`（本条提交）。
- CI / Pages：提交时 pending；发布后核对 Input regression、Project log guard、Pages，并实际 GET 首页与 SW 对照提交内容。
- 后续：真机验证 320–430px 下五个工具按钮换行、长复盘文字、四块连续点按手感和练习后重玩意愿；下一轮跳过节奏记忆，优先评估节奏点击的乐句变化或颜色分类的规划深度。

### 2026-10-15 (Asia/Shanghai) — 精准点击从单靶练习扩展为五关连击守关

- 目标：响应“除双轴外可玩性低”的实际反馈，把一款从单动作原型推进到有局面、失误原因和重复挑战空间的完整规则；不继续以数量和辅助功能代替玩法。
- 判断：原精准点击一个靶换一个位置，熟练后无目标优先级。第一版逐个出靶模拟也过于空闲，改为逐关成组、护盾/叉号混合、不同存活时间；关间回血或每靶 +25 分，形成保通关与争高分的选择。完整审查和参考写入 docs/GAMEPLAY_REVIEW.md。
- 改动：arcade-games.js 增加 aimWave/aimRun/aimAdvance/aimTap/aimUpgrade 纯规则与独立 createAimArcade 适配；五关、三生命、并发最多三靶，正常/双击护盾/避开叉号，5/10 连击 ×2/×3。轻松/挑战寿命下限 2200/1900ms，护盾多 300ms；固定九格大按钮、剩余秒数/条、符号/文字/轮廓、命中反馈。300ms 原位冷却、护盾 120ms 去抖，后台/卡顿暂停、继续一秒准备。index 默认街机入口并保留经典练习；CSS/CI/新回归/README/验收同步，SW v20→v21。
- 保留：十款入口数量、其他游戏规则、双轴核心、旧 aim:模式 成绩与所有原存储键；街机仅新增 aimArcade:模式，不迁移或清空。没有依赖、服务器或追踪。
- 测试：25 套全量回归通过（含旧双轴与 arcade-regression）；204 局两档五关规则模拟、固定速度策略、生命/连击/补给、过期边界、误双击、键盘、稳定输入节点、实际大厅完整流程/本机成绩、禁存储、后台/失焦/卡顿/恢复旧回调；语法/diff 检查通过。350ms 策略两档全通、900ms 轻松可通但挑战失败，只证明参数区分，不能证明真人娱乐性。
- Commit：`Turn aim practice into a five-wave arcade challenge`。
- CI / Pages：本轮同步至 47bb2e3，保留并发上线的左右交替练习、记忆预览/连对和反应左右选择及其全部测试，重新全量验证；此前三项均成功，本提交 pending，发布后查实际资源。
- 未完成：当前无受支持的浏览器/真实手机，视觉布局、触感、紧张程度与重玩意愿未验收。后续优先颜色分类的路线规划或节奏点击的乐句变化，基于当前试玩再决定，不同时重写全部游戏。

### 2026-10-15 (Asia/Shanghai) — 反应力挑战档增加左右选择判断

- 目标：两档此前都是看到信号后点击同一大按钮，挑战档只多一轮，与精准点击的“看见就点”也过于接近；增加可学习的刺激—响应判断，同时保留轻松档纯反应基线。
- 参考与判断：[Human Benchmark Reaction Time](https://humanbenchmark.com/tests/reactiontime)证明单刺激/单响应适合作为直接基线；[选择反应研究](https://pmc.ncbi.nlm.nih.gov/articles/PMC6428657/)使用左右刺激映射到左右响应，速度之外还要求正确选择；[Gameplay Flow](https://www.gamedeveloper.com/design/gameplay-flow-designing-for-player-immersion)强调可完成的技能挑战、清楚目标和即时反馈。因此挑战档采用“等信号→判断箭头→按对应方向→立即解释失误”，不缩短等待、不减少触控尺寸。
- 改动：`index.html` 为挑战档增加两个大方向按钮、左右箭头文字提示、方向误按即时反馈及结算复盘；`reactionChoices` 每局生成 5 个均衡方向，两侧各 2–3 次且不会连续三次同向。误按方向和抢跑都不计成绩并重试当前轮，原 5 次有效反应的中位数仍是成绩。新增 `tests/reaction-choice-regression.mjs` 并注册 CI；README/验收测试数同步，SW v19→v20。
- 保留：轻松档仍是原单按钮、4 轮和随机等待；挑战档仍需 5 次有效反应；`playdot:v1:reaction:easy/challenge` 旧纪录键与中位数算法不变；其他九款、双轴双指 ownership/镜像/碰撞/成绩键、两入口离线策略不变。
- 测试：提交前运行 5000 组方向生成公平性、挑战档抢跑/误按/正确/结算/重开/中断、轻松档兼容，以及全部 24 套 Node 回归、内联脚本与 SW 语法、diff 检查；结构 DOM 不代表真机触控或儿童试玩。
- Commit：`Add left-right choices to reaction challenge`（本条提交）。
- CI / Pages：本条提交时 pending，发布后核对三项 Actions，并 GET 公开首页与 SW 对照提交内容。
- 后续：真机验证 320–430px 竖屏与矮横屏的双按钮高度、左右拇指距离及箭头理解；下一轮跳过已连续优化的三款，优先评估节奏记忆的长期变化和失败复盘。

### 2026-10-15 (Asia/Shanghai) — 记忆翻牌挑战档增加观察、连对与失配复盘

- 目标：挑战档此前只从 6 对增加到 8 对，核心循环仍是逐张试探，能力提高只有步数结果，缺少开局可练习目标、过程反馈和可解释的失败复盘。
- 参考与判断：[Game Developer 的认知流文章](https://www.gamedeveloper.com/design/cognitive-flow-the-psychology-of-great-game-design)强调及时、清晰的表现反馈，[Gameplay Flow](https://www.gamedeveloper.com/design/gameplay-flow-designing-for-player-immersion)建议把挑战、所需技能、目标和即时/长期反馈一起设计。由此采用“观察全牌 3 秒→自主选择最有把握的配对→连对/失配反馈→结算复盘”，迁移双轴闪避的学习闭环，而不是增加倒计时、缩小卡片或随机惩罚。
- 改动：`index.html` 的挑战档开局暂时公开 16 张卡片并锁定输入，3 秒后同时盖回开始不限时配对；当前连对即时显示，失配归零，结算披露失配次数与最长连对。提取单卡显隐函数，保证预览、翻牌和盖回使用同一文字/ARIA 状态。新增 `tests/memory-challenge-regression.mjs` 并注册 CI；README/验收测试数同步，SW v18→v19。
- 保留：轻松档仍为 6 对且点击后立即可玩；挑战档仍为 8 对且不限时；原步数最佳规则和 `playdot:v1:memory:easy/challenge` 键不变；其他九款、双轴双指 ownership/镜像/碰撞/成绩键、两入口离线策略不变。
- 测试：提交前运行新增挑战回归、全部 23 套 Node 回归、内联脚本与 SW 语法、diff 检查；结构 DOM 不代表真实浏览器、手机触屏或儿童试玩。
- Commit：`Add preview and recall feedback to memory challenge`（本条提交）。
- CI / Pages：本条提交时 pending，发布后核对三项 Actions，并 GET 公开首页与 SW 对照提交内容。
- 后续：真机验证 320–430px 上四格统计与 4×4 图案辨认，观察 3 秒是否过载；参数只根据试玩反馈调整。下一轮优先评估反应力测试的多轮进步反馈，避免连续两轮修改同一游戏。

### 2026-10-15 (Asia/Shanghai) — 精准点击挑战模式增加左右穿梭与连中反馈

- 目标：挑战档此前主要缩小目标/压缩时间，学习空间有限；参照双轴闪避的注意力切换、可预判变化与 NEAR MISS 即时反馈。
- 判断：挑战档下一目标左右半区交替，给玩家可学习的眼手转移路线；连中次数累计、误触归零，最高连中计入本局结算。小于最小宽度时自动退化为全区域生成，避免目标越界。
- 改动：`index.html` 增加 `aimLane` 和目标分半区位置约束、四格统计、连中即时文字反馈和结算最高连中；`tests/aim-challenge-regression.mjs` 验证半区/边界/连击/计分/结束/重开/截止时刻，注册 CI；README 更新规则和测试数量，SW v17→v18。
- 保留：轻松模式原有目标随机分布，挑战档命中目标数、计时和目标尺寸不变；`aimScore` 计算及 `playdot:v1:aim:easy/challenge` 旧纪录键不变；其他九款、双轴双指镜像碰撞、离线独立入口不变；未添加账号或外部请求。
- 测试：提交前静态规则/边界校验；分支 CI 的 22 套 Node 回归 pending（不等于浏览器/真机验收）。
- Commit：`Add alternating aim lanes and combo feedback`（本条提交）。
- CI / Pages：本条提交时 pending，以上线后的 Actions 和公开资源实际核对为准。
- 后续：真机试玩验证 320px 屏两列统计高度、左右移动距离与触控舒适度；先收集反馈再改难度参数。


### 2026-10-15 (Asia/Shanghai) — 游戏厅新增「随机玩一款」

- 目标：十款游戏已足够丰富，但首次访问者仍需逐张卡片决定玩什么；提供一个低成本探索入口，不用继续堆第十一款相似游戏。
- 判断：随机入口只从当前分类的可见卡片中选择，并复用卡片原有按钮/链接点击路径，因此游戏打开、双轴跳转和最近游玩记录保持一致，不新增存储键。
- 改动：`index.html` 分类栏新增 44px「🎲 随机玩一款」按钮与 `chooseVisibleGame` 选择函数；监听采用可选挂载，保持测试/降级页面缺少该节点时仍可运行。新增 `tests/surprise-game-regression.mjs` 覆盖筛选、空集合、RNG 边界及原入口复用，纳入 CI；README/验收测试数同步，SW v16→v17。
- 保留：十款游戏规则、难度、成绩存储、双轴双指/镜像/碰撞及独立离线回退不变。
- 测试：提交前运行全部 21 套回归、内联脚本与 SW 语法检查、diff 检查；真实浏览器布局和手机触控仍不由 Node 自动化代替。
- Commit：`Add filtered surprise game discovery`（本条提交）。
- CI / Pages：提交时 pending；本轮需核对对应 Actions、Pages 及公开资源。
- 后续：真机确认窄屏分类栏换行与随机按钮触达性；有反馈再调整，不继续堆发现功能。

### 2026-10-15 (Asia/Shanghai) — 迷宫一步方向提示

- 目标：让儿童或初次玩家卡住时仍能继续，保留自行移动和观察路线的过程。
- 判断：复用当前格到出口的 BFS 路径，只提示下一格，不自动移动、不增加步数；虚线框、方向文字与目标方向键共同表达，不依赖颜色。
- 改动：arcade-games.js 新增 hintMaze，提示后聚焦可走方向键，移动清除提示；暂停不接受提示，原题重置保留本局提示次数，结算明确披露次数。SW v15→v16。
- 保留：两档不限时、5×5/7×7 生成、路线效率评分、本机记录键与双轴核心不变；提示不扣分，定位是休闲练习。
- 测试：20 套回归全部通过；两档提示不移动/不计步、暂停保护、重置保留用量、沿提示合法到达出口、结算披露，以及实际大厅控件焦点/移动清除；2000 个迷宫与旧双轴完整回归仍通过。JS 语法/diff 检查通过。
- Commit：`Add optional step hints to untimed maze`。
- CI / Pages：上一提交 f3b08a3 三项成功；本提交 pending，最终需核对公开资源。
- 后续：优先真实手机布局/滑动、旧 PWA 升级及试玩难度验收；当前环境未完成这些验收，不继续堆新玩法。

### 2026-10-15 (Asia/Shanghai) — 弱网脚本失败的可见反馈与历史保留

- 目标：避免扩展 JS 下载失败后五款卡片点了没反应，以及暂时缺少定义把最近记录过滤掉。
- 根因：旧目录仅来自运行时 config，模块缺失时 openGame 静默拒绝，recentAllowed 也排除了那些已有游戏。
- 改动：index 从静态卡片与运行时构成白名单目录，未加载入口明确禁用，提示可先玩其他游戏/重新加载；recent 的身份与显示名独立于当前模块可用性，恢复后正常开启；键盘钩子可降级缺少方法。旧四款与双轴仍可访问。SW v14→v15。
- 保留：玩法、成绩、历史上限四款及双轴文件不变；不引入新依赖或网络追踪。
- 测试：新增无模块场景先复现没有恢复入口；修复后全套 20 项通过，包括全部缺少脚本时四款可开/五款标记、重试动作、旧成绩不变、近期身份保留、恢复后入口重启；历史仍正常按最近四项淘汰。JS/diff 通过。
- Commit：`Expose missing game assets and preserve recent history`。
- CI / Pages：手机布局 77a3c3c 的三项在本轮核对；本提交 pending。
- 后续：迷宫一步方向提示，后做全量发布核对；实际弱网与浏览器渲染未验收。

### 2026-10-15 (Asia/Shanghai) — 手机安全区、横屏棋盘与键盘可读性

- 目标：改善矮横屏看不全棋盘/控制、刘海安全区与低对比辅助字；补分类/观察游戏的焦点稳定性。
- 判断：辅助文字多处计算对比度仅 2.6–3.5；不必改玩法，应增强文字与约束布局。分类额外抽查两档各 80 局最短解为 3–8/5–9 步，当前难度保留，不盲目加难。
- 改动：index 的 body/dialog 使用实际 safe-area inset，移动断点不再覆盖安全尺寸；加深辅助字、封面标签和页脚、略增小字。扩展脚本记录棋盘类型；矮横屏迷宫与方向键并排，分类单排，连线/找不同压缩到仍保留点击尺寸的棋盘，节拍缩短纵向留白。分类按钮保留只更新非交互子内容；找不同键盘答对后聚焦新棋盘，键盘结算聚焦重玩，触摸不强制抢焦点。SW v13→v14。
- 保留：规则、生成、难度/成绩与双轴文件不变。
- 测试：19 套回归通过，新增实际 DOM 分类选中/转移/撤销焦点与节点稳定、找不同键盘十关焦点；修改的文字配色对比均计算超过 4.5，具体样式为代码/数值审查，不是浏览器渲染或真机验收。JS/diff 检查通过。
- Commit：`Improve mobile safe areas board layouts and keyboard focus`。
- CI / Pages：成绩修复 1fbc6d5 的回归/日志/Pages 均成功；本提交 pending。
- 后续：弱网络扩展资源失败时的可见反馈与历史保留；真实刘海/横屏布局仍待验收。

### 2026-10-15 (Asia/Shanghai) — 临界计时与本机成绩容错

- 目标：截止后不多计成绩，坏记录不锁死最佳分，存储写失败也保留本次结果。
- 根因：精准点击 hit/miss 未核对绝对 deadline，间隔回调尚未运行时允许过时点击；旧大厅三个 best 比较直接 Number，NaN 阻止新纪录；写失败后 UI 只读存储旧值。双轴 level1 坏数字也会遮住有效 dualAxisBest。
- 改动：输入先检查 deadline，计时结算截在本档时限内；readBest 只接受非负安全整数，结果/简介/大厅复用；safeSet 失败仅在会话中暂存、成功后删除对应暂存，显示“关页可能丢失”。修复双轴坏 level1 的只读降级，不写双轴键。SW v12→v13，新增 records-timing 回归，CI/README/验收同步。
- 保留：健康记录键和值、游戏目标/难度、原双轴运行文件不变；不做迁移或清空。
- 测试：旧代码先复现晚于截止 1ms 的点击仍命中；全套 19 项通过，覆盖两档命中/空白临界点、截止前 1ms、六种坏值与存储文本不变 HTML、三款纪录恢复、完全禁存储/仅读可用写失败下会话最佳、双轴原键保持。语法/diff 通过。
- Commit：`Guard scoring deadlines and recover local records safely`。
- CI / Pages：连线修复 5fb6425 在本轮核对；本提交 pending。
- 后续：评估休闲解谜难度、手机布局/可访问性，继续依据真实问题改；真机未验收。

### 2026-10-15 (Asia/Shanghai) — 一笔连线连续轨迹、稳定焦点与一步提示

- 目标：解决快滑漏节点和键盘操作后丢焦点，并降低无路可走时的挫败。
- 根因：旧 pointermove 只检查当前落点，越过节点但落点在外就漏判；每次 drawLine 重建按钮，浏览器焦点目标被销毁。
- 改动：segmentEntry 对相邻采样线段与 24px 节点范围做相交并按经过顺序处理，消费 coalesced samples；仍限制单 pointer ownership、合法边/不重复边。连线节点与边只在新关创建，过程更新 class/aria-current，保留键盘焦点。lineContinuation 在剩余边上搜索完整合法续路，提示只标记/聚焦一步，不替玩家走；死路明确建议撤销。提示有虚线轮廓与文字，暂停/完成时禁用。SW v11→v12，README 更新。
- 保留：关卡、难度、计分、旧成绩、双轴全部文件不变。
- 测试：先复现快滑轨迹 [0] 而非 [0,1] 的失败；修复后 18 套回归全通过，含跨节点快滑、coalesced 三段轨迹、全部关卡所有已知解前缀的提示可完成性、独立死路、稳定 DOM/焦点、提示不自动走、暂停与双指归属。语法/diff 通过。
- Commit：`Improve one-stroke tracking focus and solvable hints`。
- CI / Pages：离线修复 2d3f9b8 的回归/日志/Pages 均成功；本提交 pending。
- 后续：老游戏临界计时和坏/禁用存储下的成绩展示；真实手机快滑仍待验收。

### 2026-10-15 (Asia/Shanghai) — 离线导航隔离与缓存写入生命周期

- 目标：防止站内其他 HTML 或无末尾斜杠的双轴入口替换离线大厅。
- 根因：旧 SW 把所有非标准双轴导航都写入 ROOT_PAGE；访问成功的文档页会污染根离线壳，无斜杠双轴也被误归类。缓存写入未被事件生命周期持有。
- 改动：SW v10→v11，从实际 worker 路径识别本项目根入口、三种双轴路径及其他页面各自的缓存键；不接管项目范围外的同源页面。reply 在 fetch 事件回调内同步注册 waitUntil，返回响应后继续持有异步缓存写入；参考 MDN ExtendableEvent.waitUntil。404 仍不覆盖好缓存，存储失败不阻断网络响应。
- 保留：游戏脚本、全部成绩键、双轴输入/镜像/碰撞不变。
- 测试：新增用例先在旧代码复现“documentation page 覆盖 good page”失败，修复后全部 18 套回归通过；验证无斜杠入口、其他页面、项目外请求、写入故意延迟时响应已交付而 waitUntil 尚未完成、同步生命周期注册与 404/离线策略。diff/JS 语法通过。
- Commit：`Isolate offline navigation caches and retain pending writes`。
- CI / Pages：32e8729 的三项检查已确认成功；本提交 pending，以 Actions 为准。
- 后续：连线高速滑动与键盘焦点/卡关引导；真机 SW 升级仍未验收。

### 2026-10-15 (Asia/Shanghai) — M7 全站集成与生命周期收尾

- 目标：串联十款入口到结算、记录、返回和离线，修单游戏测试未覆盖的边界。
- 判断：旧反应 early/result 阶段未被后台条件覆盖，旧 pagehide 清空场景留下空弹窗，已完成翻牌也被当成进行中；双轴无返回大厅入口。应修这些问题，不再加玩法。
- 改动：index 统一 visibility/pagehide/blur 中断，取消所有未完反应阶段旧回调，旧游戏返回可用 intro，翻牌 finished 保留结果，返回恢复焦点；双轴只加四处菜单/竖屏返回链接与 CSS，inline 脚本与 M2 逐字一致。统一根图标/标题/manifest 主题，SW v9→v10。新增真实两脚本结构 DOM 集成测试，扩展 SW 更新/404/旧缓存隔离；README、设计进展、docs/ACCEPTANCE.md 同步。
- 保留：双轴双指/镜像/碰撞/音频/难度/存储及所有旧成绩键，不新增依赖、账号或追踪。
- 测试：18 套回归全通过；九款大厅游戏两档开始/切换/中断/返回/重进，实际节点完成旧三款与五款后续游戏，刷新成绩，pointer+click 去重/冒泡/旧 close 与焦点；2000 找不同、2000 分类、2000 迷宫及六关一笔可解性，原双轴全套；SW 10 项实际资源、独立导航/脚本离线、更新/404 不污染/仅本产品缓存清理；JS 语法/diff 通过。
- Commit：`Complete platform integration checks and lifecycle handoff`。
- CI / Pages：M3 7f527ff、M4 a43245f、M5a b4c01d2、M5b d2721f5、M6a 892d84a、M6b cdeb71d 的回归/日志/Pages 均成功；本提交 pending，结束前核对公开 11 个 URL。
- 遗留：环境无受支持浏览器预览；Android/iOS 布局、双指/滑动/音频、旧 PWA 升级、真人难度未验收，详见 ACCEPTANCE。开发与自动化发布不代表真机验收完成，下一步优先这些反馈，暂不扩新玩法。

### 2026-10-15 (Asia/Shanghai) — M6b 迷你迷宫独立交付

- 目标：补空间探索的休闲体验，与分类的逻辑整理形成区别。
- 判断：5×5/7×7 树形迷宫，所有格子连通且出口必达；两档都不限时。随机迷宫长度不同，因此以最短路/实际步数效率评分，不直接比较走了多少步。
- 改动：扩展脚本/样式提供 DFS 生成、可验证路线、角色/出口/走过位置、48px 方向按钮、键盘与 22px 阈值滑动、暂停/单指 ownership 和原题回入口；index 增加观察/逻辑/休闲入口；SW v8→v9，README/CI 同步。
- 保留：旧游戏玩法、记录键、双轴全部文件不变。
- 测试：17 套回归全部通过；2000 个迷宫独立验证全格连通、恰有 N−1 条通路、双向墙一致、四周不漏、实际解可走；两档满分流程、撞墙不计步、原题重置、暂停及第二指不抢控制。语法/diff 检查通过。
- Commit：`Add solvable mini mazes with swipe and directional controls`。
- CI / Pages：M6a 在本轮核对；本提交 pending。
- 后续：M7 全站入口、分类/记录、状态切换、离线资产、旧双轴完整回归和公开部署逐项核对；真实手机触摸和布局仍待验收。

### 2026-10-15 (Asia/Shanghai) — M6a 可解颜色分类

- 目标：增加没有时间压力的整理解谜，避免随机拼出死题。
- 判断：3/4 类、每类三块、两个备用盒的空余容量；从完成状态逆向打乱，仅允许源盒露出的颜色与移动块相同或为空，因此逆序恢复必定合法。每块同时显示形状和编号，不依赖色觉。
- 改动：扩展脚本/样式实现顶块移动、合法目标判断、选中、撤销、同题重置、3/4 关推进与本机记录；为一笔连线补同关重置。index 增加逻辑/休闲入口；SW v7→v8，README/CI 同步。
- 保留：所有旧游戏机制、记录键、双轴子目录不变。
- 测试：16 套回归全部通过；2000 局（含 RNG 边界）逐步执行逆向证明解、验证颜色数量/容量/非已解起局、非法目标、两档全流程/撤销/原题重置/暂停/禁存储。语法/diff 检查通过。
- Commit：`Add solvable color sorting with undo and same-puzzle reset`。
- CI / Pages：M5b 在本轮核对；本提交 pending。
- 后续：M6b 迷你迷宫，树结构生成确保出口可达，再做 M7 全站审查。真实手机布局和休闲难度仍待试玩。

### 2026-10-15 (Asia/Shanghai) — M5b 视觉节奏点击独立交付

- 目标：补节拍协调玩法，并避免浏览器音频延迟影响成绩。
- 判断：采用纯视觉节拍，轻松 12 拍/每秒一拍/±280ms，挑战 16 拍/800ms 一拍/±210ms；100px 以上按钮和宽容判定，不要求极端手速。
- 改动：扩展脚本/样式提供移动圆点、进框文字信号、逐拍命中/错过、误点扣分、完整结果和本机最佳；pointerdown/空格键输入并去重，不劫持其他按钮的空格操作。渲染间隔超过 400ms 即暂停，恢复下一拍前给 1 秒准备；减少动态隐藏移动标记，保留「现在点」与边框。index 入口，SW v6→v7，README/CI 同步。
- 保留：原游戏、记录键与双轴子目录不改；声音不参与计时或判定。
- 测试：15 套回归全部通过；两档所有判定边界/窗口外 1ms、完整满分、重复输入、误点、暂停/恢复准备、键盘重复、画面卡顿与换游戏后的旧回调；修正旧序列测试的 DOM mock，使其像浏览器一样保留多个 keydown 监听器。语法/diff 检查通过。
- Commit：`Add forgiving visual rhythm tapping game`。
- CI / Pages：M5a 在本轮核对；本提交 pending。
- 后续：M6a 颜色分类，先保证可解和撤销；节拍真人难度/设备延迟仍未验收。

### 2026-10-15 (Asia/Shanghai) — M5a 一笔连线独立交付

- 目标：加入空间路线规划，避免继续堆反应/记忆的相似玩法。
- 判断：采用固定有解的六个一笔画图，轻松四关/挑战六关，均不限时；明确起点、边不可重复但节点可重复，提供撤销降低卡关成本。
- 改动：扩展 JS/CSS 增加图形、已走边、当前节点、关卡记录与下一关；44px 节点支持键盘点按和单指 pointer capture 滑动，第二指不抢 ownership；暂停/退出释放捕获。index 增加逻辑/休闲卡片；SW v5→v6，README/CI 同步。
- 保留：原双轴与旧游戏机制、本机键均不改。
- 测试：14 套回归全部通过；六关实际解逐步验证、无重复边、模板不可变、不能倒走已用边、撤销/关卡推进、两档不限时、双 pointer ownership 与暂停释放捕获。JS 语法/diff 检查通过。
- Commit：`Add solvable one-stroke puzzles with touch and undo`。
- CI / Pages：M4 在本轮核对；本提交 pending。
- 后续：M5b 单独实现视觉节奏点击，宽容窗口与浏览器中断保护；真机滑动与焦点仍待验收。

### 2026-10-15 (Asia/Shanghai) — M4 首页分类、最近游玩与记录

- 目标：游戏增多后按兴趣寻找、快速返回，并能看到旧双轴成绩。
- 判断：多标签分类比独占分类更适合休闲/记忆交叉；暂时无游戏的分类隐藏，后续内容加入会自动出现。双轴不同起步等级不可混榜。
- 改动：index 增加五类筛选（自动隐藏空项）、最近四款入口、导航、旧三款结果卡；追加 recent 键，白名单去重且容错；双轴旧键只读，经典/自由/起步等级明确区分；原生 dialog 关闭事件检查当前 open 状态，避免旧 close 事件关闭刚打开的新游戏；坏 mode 不再接受原型属性。新增样式提升可读字号/触控面积；SW v4→v5。
- 保留：全部旧成绩、旧玩法、双轴文件不变，不迁移或清空数据。
- 测试：13 套回归全部通过；新增大厅回归覆盖坏历史、去重/四项上限、多分类、双轴旧键与起步等级；现有序列与完整旧游戏测试继续通过。JS 语法/diff 检查通过。
- Commit：`Upgrade lobby discovery recent games and local records`。
- CI / Pages：M3 的结果在本轮 Actions 核对；本提交 pending。
- 后续：M5a 一笔连线，固定可解关卡、撤销和触摸滑动；真机与浏览器视觉验收仍待完成。

### 2026-10-15 (Asia/Shanghai) — M3 找出不同与轻量扩展文件

- 目标：补观察力玩法，保证小屏及非色觉辨识可玩。
- 判断：每题唯一形状差异，颜色只作早期辅助；3×3 起步、最高 4×4，避免把难度做成难以辨认的颜色差值。新增独立静态脚本/样式承载后续游戏，不重写旧游戏。
- 改动：`arcade-games.js/css` 提供找出不同、轻松十关不限时/挑战 45 秒、错按反馈、分模式本机分数、暂停冻结时间、会话令牌清理；index 添加入口与薄适配层。SW v3→v4，预缓存新增资源，JS/CSS 网络优先并离线回退，避免新 HTML 配旧脚本。CI/日志守卫覆盖新文件；README 同步。
- 保留：旧成绩前缀与全部键、旧游戏规则和双轴子目录不改。
- 测试：全部 12 套回归通过；2000 次生成验证唯一形状/最多 16 格；运行真实新增脚本验证错按、连点隔离、十关计分、挑战超时/暂停、旧回调及禁止存储；SW 覆盖新增 JS/CSS 离线回退。语法及 diff 检查通过。
- Commit：`Add fair shape-based spot-the-difference game`。
- CI / Pages：上一版 79d19f6 三项检查及部署成功；本提交 pending，以 Actions 为准。
- 后续：M4 分类、最近游玩与完整记录。真机触屏、视觉布局与已有 SW 升级尚未验收。

### 2026-10-15 (Asia/Shanghai) — M2 节奏记忆首个可玩交付

- 目标：增加区别于翻牌位置记忆的顺序记忆玩法，手机上无需精确手速或声音即可游玩。
- 判断：沿用大厅内联脚本、dialog、MODES、会话令牌和定时器，不引入依赖或重写旧游戏。四块固定位置并带数字/形状，首轮 1 个，每完成一轮增加 1 个；按实际回调串接信号，避免延迟定时器同时亮起多个块。
- 改动：`index.html` 新增节奏记忆卡片/规则/状态机和结果区。轻松播放 650ms、间隔 300ms，可重看与错后重试；挑战播放 430ms、间隔 250ms，点错结束；两档均无作答倒计时。正确点按后 220ms 确认锁阻止双击消耗两个重复信号；完整轮才计分。声音默认关，支持 Safari 构造器降级、拒绝/延迟 resume，静音/退出停止音符。后台/pagehide/暂停取消旧回调，主动继续后整轮重播。新键 `playdot:v1:sequence:easy/challenge`，只增不迁移，存储被禁时保留会话最佳。`sw.js` v2→v3；README 与 CI 接入新测试。
- 行为约束：旧四款玩法、旧成绩键、原双轴全部文件、双指 ownership、镜像和碰撞保持不变。游戏无外部资源，随大厅预缓存；不引入账号、联网成绩或追踪。
- 测试：11 套回归全部通过，含 `arcade-regression.mjs`、全部旧双轴回归、新 `sequence-memory-regression.mjs`。新测试执行真实脚本与可控 DOM/时钟，覆盖 5000 次生成、连续相同块、完整/部分轮计分、重看、两档隔离、输入/播放/轮间/错误状态中断、重开/退出/换模式旧回调、键盘重复、坏/禁用存储、缺少/拒绝/延迟音频。扩展 SW 测试验证全部 8 项预缓存和子路径/带查询串导航独立离线回退；内联语法和 diff 检查通过。测试不是浏览器或真机验收。
- Commit：`Add accessible sequence memory game with lifecycle regression coverage`。
- CI / Pages：M1 `83177cb` 的 Input regression、Project log guard、Pages（run 38706345348）均成功；本提交 pending，以对应 Actions 为准。
- 风险与后续：缺少受支持浏览器预览，Android/iOS 的真实触屏、dialog 滚动/焦点、声音、SW 升级仍未验证。下一轮优先手机试玩反馈与 M3 找出不同：不限时轻松模式，形状优先，批量验证随机差异可辨认；本轮不实现 M3–M7。

### 2026-10-15 (Asia/Shanghai) — M1 产品审查与紧凑明亮首页

- 目标：游戏入口被高宣传区推后，首页深色竞技氛围与轻松定位有距离。
- 判断：当前仅四款，无需框架/引擎重构；先压缩宣传区，把品牌、基础色、触控与减少动态规范落实，再单独开发顺序记忆。
- 改动：`docs/PRODUCT_DESIGN.md` 记录官方参考研究、代码/存储/SW/CI 审查、颜色/字号/触控规范和 M1–M7 验收路线；`index.html` 改为奶油白/珊瑚色紧凑宣传区，窄屏隐藏纯装饰，卡片正文 14px，模式/关闭按钮至少 44px，减少动态关闭位移/动画，补 manifest 链接；`sw.js` v1→v2；README 增加设计入口。
- 行为约束：不改四款游戏逻辑、本机键、双轴子目录及离线回退策略。
- 测试：修改前大厅与 SW 回归通过；提交前执行全部 10 套既有回归、内联 JS 语法检查和 git diff 检查，结果见本轮提交验证。
- Commit：`Define PLAYDOT design system and compact mobile lobby`。
- CI / Pages：基线 efcf5d2 的三项检查成功；本提交 pending，以对应 Actions 为准。
- 后续：M2 四块顺序记忆，两档模式、无作答倒计时、符号/数字辅助辨认；本环境缺少受支持浏览器预览，手机首屏/颜色/缩放/横屏仍需真机验收。

### 2026-10-15 (Asia/Shanghai) — 原双轴仓库升级成 PLAYDOT 游戏合集

- 目标：复用原项目及 GitHub Pages，增加儿童也能玩的电竞能力与脑力益智小游戏。
- 判断：不覆盖或删掉旧游戏，而是将其完整迁入 games/dual-axis-dodge/；根页改成游戏大厅。
- 改动：大厅提供反应力、精准点击、记忆翻牌两档难度和本机记录；原双轴游戏 HTML/manifest/icon 原样复制到子目录（仅修正 SW 注册路径）；更新根 manifest/icon、统一 SW 缓存分别对大厅和双轴离线回退、原游戏测试读取路径、CI 工作流、README/AGENTS，新增大厅回归测试。
- 保留：原游戏双指、碰撞、完整镜像、难度、声音、成绩及 localStorage 键值；无后端、账号、在线聊天。
- 测试：旧合集规则单元测试 6/6；迁移验证分支全套 CI 通过后才更新 main。
- Commit：Convert Dodge repository into PLAYDOT arcade。
- CI / Pages：提交时 pending；以实际 Actions 记录为准。
- 后续：真实 Android/iOS 首次 SW 升级、横屏双指和 PWA 安装需要真机验证。

### 2026-10-15 (Asia/Shanghai) — 新增轻量长条闪避障碍

- 目标：在手机横屏、双手同时控制的有限空间里增加新障碍类型，不额外堆怪或制造突发高速难点。
- 判断：采用“窄身长条”，而非分裂/加速障碍：满 8 秒后每次已有刷怪有 14% 概率替换成它；沿闪避方向宽度为普通方块的 70%，沿行进方向长度为 145%，保持原速度、刷新频率和前缘进入位置。横向更窄且无需新增操作，手机上比较公平。
- 改动：`index.html` 的 `spawn(type)` 分横/纵运动方向计算长条尺寸，处理 normal/swapped 时正确的入口前缘；`drawObstacle(o)` 增加细长的内部亮纹，让新障碍一眼可辨。`tests/dart-obstacles-regression.mjs` 用真实 spawn 源码验证 568×320/844×390、正常/镜像布局、8 秒门槛、概率分支、边界与单区障碍上限，接入 Input regression workflow；同时更新旧尾迹回归测试的断言，使其允许绘制函数换行，但仍强制尾迹早于实体绘制；`sw.js` 缓存 v8 升到 v9。
- 行为约束：普通障碍仍为原正方形；刷怪间隔与上限、碰撞/擦边、速度、游戏状态机、两区双指操控、完整镜像、经典与自由模式、分数均不改变。新障碍沿用现有分段碰撞引擎。
- 测试：提交前编译整段内联游戏脚本检查语法，并模拟了 568×320 正常/镜像下的两种长条入口；验证分支首次 CI 因旧尾迹测试依赖单行代码格式而失败，修正该过严断言后重跑完整测试，通过才推进 main。未进行真实手机游玩测试。
- Commit：本条提交 — `Add rare narrow dart obstacles`。
- CI / Pages：提交时 pending；以本提交最终 GitHub Actions 与 GitHub Pages 为准。上一提交 `a198852e` 的 Input regression、Project log guard、Pages 已通过。
- 风险与后续：长条占据原行进轨道时间略长但侧向障碍更窄；优先根据真实横屏手感判断是否需要降低 14% 出现率，不同时加入复杂组合。

### 2026-10-15 (Asia/Shanghai) — 双轴障碍方向性运动尾迹

- 目标：当前青色、粉色障碍只是发光方块，手机横屏高速双手操作时难以从静态形状看出方向；加入短尾迹提升速度感和辨识度。
- 判断：只绘制跟随既有障碍的视觉尾迹，不增加真实的提前预警时间，避免影响游戏公平性；尾迹必须在来路方向且不跨中线误导另一半屏。
- 改动：`index.html` 新增 `drawObstacleTrail(o)`，并在 `drawObstacle(o)` 绘制碰撞方块前调用。青色下落障碍向上拖尾，粉色横穿障碍向来路拖尾，`swapped` 时自动反向。尾迹长度由既有速度计算且最高 46px，严格限制在对应物理半屏范围内，系统减少动态效果时禁用。新增 `tests/obstacle-trails-regression.mjs` 验证方向、镜像、中线边界、屏外、减弱动态效果和不修改碰撞数据，加入原有 Input regression 工作流；`sw.js` 缓存 v7 → v8。
- 行为约束：`spawn()`、障碍速度/位置/出界、`hitCircleRect()`、`nearCircleRect()`、双指独立控制、状态机、左右完整镜像、经典/自由模式、音频与成绩不变。尾迹不属于碰撞体。
- 测试：提交前编译 HTML 内联 JS 并模拟左右尾迹绘制；在验证分支运行完整 GitHub Actions 回归，全部通过才快进 main。手机真机视觉与 FPS 尚未完成。
- Commit：本条提交 — `Add mirrored obstacle motion trails`。
- CI / Pages：提交时 pending；最终状态以该功能提交的 Actions 记录为准。上一轮 `2c5f29f` 的测试、日志检查及 Pages 部署均已成功。
- 风险与后续：每个障碍最多增加两次透明矩形绘制，仍需在 Android/iOS 横屏实测可读性和中低端机帧率。

### 2026-10-15 (Asia/Shanghai) — 擦边闪避增加角色位置光环反馈

- 目标：原来 NEAR MISS 只在屏幕中间显示文字，无法直接看出是哪只手的角色完成擦边。
- 判断：保留擦边判定与得分，只把已有擦边事件以对应角色坐标和颜色可视化。使用轻量 Canvas 描边避免遮挡障碍。
- 改动：`index.html` 的 `showNearMiss(type)` 接收现有 `o.type`，为青色横向或粉色纵向角色记录坐标和 0.42 秒光环；`drawNearMissPulse()` 在对应角色周围绘制渐隐扩散描边，开启减少动态效果时不扩散。按真实 dt 衰减，新局、暂停、中断和结算清空残留光环。新增 `tests/near-miss-feedback-regression.mjs` 覆盖定位、过期、镜像及减少动态效果，并纳入 CI。`sw.js` 缓存 v6 升至 v7。
- 行为约束：碰撞 `hitCircleRect`、擦边 `nearCircleRect`、刷怪、难度、双指独立控制、左右完整镜像、经典/自由模式、音频和成绩规则保持不变，无外部依赖。
- 测试：提交前执行实际 JS 语法编译和两种角色光环模拟；验证分支运行完整 GitHub Actions 回归（含新测试），通过才合入 main。真机视觉测试尚未完成。
- Commit：本条提交 — `Add localized near-miss pulse feedback`。
- CI / Pages：提交时 pending；最终状态以对应 commit 的 GitHub Actions 为准。
- 风险与后续：光环为短时单描边；后续 Android/iOS 横屏验证视觉清晰度与障碍观察。

### 2026-10-14 (Asia/Shanghai) — 防止错误响应覆盖离线游戏首页

- 目标：避免访问不存在的站内地址返回 HTTP 404 时，离线首页缓存被错误页覆盖，导致后续断网无法打开游戏。
- 判断：原 `sw.js` 对导航请求只要网络 Promise 正常返回就把响应写入 `./index.html`，未判断 `response.ok`；404/500 也会污染离线 shell。需要保持在线错误的真实状态，同时保护最后一次成功缓存。
- 改动：`sw.js` 只缓存成功的导航响应，HTTP 错误原样返回；缓存键由 `dual-axis-dodge-v5` 升到 `v6`，安装后重新预缓存核心资源并清理旧版本缓存。新增 `tests/sw-cache-regression.mjs` 用 Node VM 执行真实 SW 代码，模拟 200 导航、404 导航和断网回退；`.github/workflows/input-regression.yml` 加入该测试，并让 SW 修改触发回归。
- 行为约束：不修改 `index.html`，经典/自由模式、双指控制、键盘、碰撞、左右镜像、难度、音频、成绩与 UI 均保持不变；成功导航继续更新离线缓存。
- 测试：先在旧版 v5 上执行新增回归，实际复现 404 将 `good page` 缓存替换为 `not found`；修复后本地 `node --check sw.js`、`node --check tests/sw-cache-regression.mjs` 和 `node tests/sw-cache-regression.mjs` 均通过。此前 main 的 Input regression、Project log guard 与 Pages 均为 success；本轮完整五套旧回归交给新提交触发的 GitHub Actions 运行。
- Commit：本条提交 — `Prevent HTTP errors from poisoning offline game cache`。
- CI / Pages：提交时 pending；以本提交的 GitHub Actions 与 Pages 最终结果为准。
- 遗留风险与下一步：Node VM 模拟验证的是 SW 行为，不等于真机离线/PWA 安装测试；之后可在 Android Chrome / iOS Safari 的离线场景确认缓存更新。

### 2026-09-06 (Asia/Shanghai) — 优化横屏首页、操作区与可读性

- 目标：回应用户对前端界面的明确要求，解决开始页设置纵向堆叠、小屏字号压到 7–10px，以及右下角四个按钮占用右手拖动区域的问题。
- 判断：保留现有青色/粉色电竞配色和轻量静态页面。通过 HTML/CSS 改善信息层次，不重写游戏。上一轮本地编辑在预览阶段中断且未提交；恢复时环境不可用，因此从 GitHub 已发布基线重新落实同一轮修改。
- 改动：`index.html` 首页采用左右分栏，左侧说明、右侧设置；原角色位置滑块放入原生 details，默认折叠，所有原控件 ID 和事件处理保留。开始操作区使用 sticky 底栏；开始/暂停/结算的主要按钮改为中文。模式、音乐/暂停/互换/全屏等按钮至少 44px，主按钮至少 48px；菜单常用文字 12–16px。工具栏移到右上角，最佳成绩在左上角、当前成绩居中，右下角恢复为操作空间；阶段/擦边提示缩小并上移。菜单保留滚动与 safe-area 边距，低高度屏幕采用紧凑间距。减少动态效果模式下保留可见倒计时，关闭碰撞抖动。SW 缓存 v4 升 v5。
- 行为约束：`index.html` 中整个 script 与基线逐字一致；双指、键盘、移动速度、碰撞、镜像、难度、音频和成绩不变。所有 45 个控件 ID 保留，无新增外部依赖。
- 验证：完成 HTML 标签嵌套、ID 唯一性/保留情况、CSS 花括号配对检查，并核对游戏脚本逐字未改。将在独立分支运行现有五套 GitHub Actions 回归后快进 main，确认 Pages 成功。本轮没有完成浏览器截图/交互或真机测试，不能把静态检查当成移动端视觉 QA。
- Commit：本条提交 — `Improve landscape menus and touch controls`。
- CI / Pages：提交时 pending；同轮检查对应功能提交的 Input regression、Project log guard 和 GitHub Pages，最终结果以 Actions 历史为准。
- 遗留风险与下一步：预览环境不可用；优先在 844×390、568×320 及有刘海安全区的手机横屏验证菜单滚动、展开滑块、主按钮和顶部工具栏位置，以及暂停/结算页的短屏布局。

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
