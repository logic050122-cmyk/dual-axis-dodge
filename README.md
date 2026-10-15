# PLAYDOT 玩点 — 电竞与脑力小游戏

沿用原双轴闪避 GitHub 仓库和 Pages 地址，不再建仓库。

游戏大厅位于根目录 index.html，包括反应力测试、精准点击、记忆翻牌，以及通往原双轴闪避的入口。
原双轴闪避完整位于 games/dual-axis-dodge/；其操控、镜像、音频和本机记录键值不改。
三款新增游戏各有轻松与挑战模式，适合儿童和成年人。个人纪录仅存浏览器 localStorage，没有登录、广告追踪或在线排行榜。游戏只供娱乐，非智商或医疗测评。

运行：在根目录执行 python3 -m http.server 8000 后访问 localhost:8000。
测试：node tests/arcade-regression.mjs；原双轴回归测试继续由 GitHub Actions 自动执行。
离线：根 sw.js 分别缓存大厅和双轴游戏；不可用 file:// 模式测试 PWA。
发布：现有 main 自动部署 GitHub Pages，主页变成 PLAYDOT，大厅的双轴卡片链接 games/dual-axis-dodge/。

产品设计与里程碑：[docs/PRODUCT_DESIGN.md](docs/PRODUCT_DESIGN.md)。所有改动先读 AGENTS.md 与 PROJECT_LOG.md。
