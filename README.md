# Dual Axis Dodge

双手同时操作的横屏反应网页游戏。项目以手机横屏、双指独立触控为第一优先级，同时支持电脑键盘。

## 新接手者从这里开始

先阅读 [`PROJECT_LOG.md`](./PROJECT_LOG.md)。其中记录了：

- 当前玩法与产品目标
- 不能破坏的核心约束
- 输入、碰撞、左右镜像、状态机、Web Audio、PWA 的关键设计原因
- 每轮开发/测试/部署流程
- 按时间倒序的开发日志与重要 commit

**规则：每次实际功能、修复、性能、兼容性、测试或部署流程更新，都要同步更新 `PROJECT_LOG.md`。**

## 当前核心玩法

经典模式中：

- 一个玩家双手同时操作两个角色。
- 横向角色只能左右移动，障碍从上往下。
- 纵向角色只能上下移动，障碍横向穿过对应半屏。
- 两个半屏可以完整镜像互换；角色、障碍入口、运动方向、出界判定和反应路径必须一起镜像。
- 任意一侧碰撞即结束。
- 分数以生存时间为主。

项目另有可选“自由移动”模式，但经典轴向锁定仍是默认设计基准，两个模式的成绩分开保存。

## 代码结构

- `index.html` — 游戏主体、Canvas、输入、状态机、碰撞、难度和音频
- `sw.js` — Service Worker / PWA 缓存
- `manifest.webmanifest` — PWA manifest
- `tests/input-regression.mjs` — 键盘输入与帧率无关性回归
- `tests/touch-ownership-regression.mjs` — 双指独立控制与 pointer ownership 回归
- `tests/spawn-fairness-regression.mjs` — 刷怪公平性回归
- `tests/lifecycle-audio-regression.mjs` — 后台、倒计时与音频兼容性回归
- `tests/resource-races-regression.mjs` — 执行实际音频、防熄屏代码，验证异步请求与按钮事件竞态
- `.github/workflows/input-regression.yml` — 自动运行上述回归测试
- `PROJECT_LOG.md` — 交接说明 + 持续开发日志

## 本地验证

项目不依赖构建工具，浏览器通过静态服务器打开即可。提交前至少运行：

```bash
node tests/input-regression.mjs
node tests/touch-ownership-regression.mjs
node tests/spawn-fairness-regression.mjs
node tests/lifecycle-audio-regression.mjs
node tests/resource-races-regression.mjs
```

如果改了 `index.html` 中的脚本，还应做 JavaScript 语法检查，并针对本次改动实际测试手机横屏双指、暂停/后台恢复、碰撞和左右互换等相关场景。

## 部署

`main` 为线上来源，GitHub Pages 自动构建部署。功能提交后必须确认对应 Pages workflow 成功；失败应在当前开发轮次内定位修复。
