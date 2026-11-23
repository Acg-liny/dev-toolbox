# dev-toolbox

开发者工具箱 —— 一个面向求职展示的纯前端项目，由多个小工具组成，适合作为多 agent 协作开发的任务拆分样本。

## 技术栈

- React 18 + TypeScript
- Vite 构建
- 纯 CSS（无第三方 UI 库），零运行时依赖（仅 react / react-dom）

## 本地运行

```bash
npm install
npm run dev      # 开发
npm run build    # 构建
npm run preview  # 预览构建产物
```

## 项目结构

```
src/
├── main.tsx          # 入口
├── App.tsx           # 布局：侧边栏工具导航 + 主内容区
├── index.css         # 全局样式（CSS 变量、明暗主题）
├── hooks/            # 通用 hooks（如 useCopy 剪贴板）
└── tools/            # 每个工具一个独立组件 + 注册表
    ├── registry.ts   # 工具清单（名称、描述、组件）
    └── *.tsx         # 各工具实现
```

## 功能规划（供任务拆分）

| # | 工具 | 说明 | 建议验收点 |
|---|------|------|-----------|
| 1 | JSON 格式化 | 校验、2 空格格式化、压缩、复制 | 错误提示含位置信息；输入实时校验 |
| 2 | 时间戳转换 | 当前时间戳（s/ms）、时间戳 ⇄ 日期、多格式输出 | 秒/毫秒自动识别；本地时区 + ISO + UTC |
| 3 | Base64 编解码 | 文本与 Base64 互转 | UTF-8 中文安全编解码；错误处理 |
| 4 | 正则测试 | 模式 + flags 实时匹配 | 非法正则提示；匹配列表含 index 与分组 |
| 5 | UUID 生成器 | 批量生成 UUID v4 | crypto.randomUUID；单条/批量复制 |

## 后续迭代方向

- 工具收藏 / 最近使用（localStorage）
- 明暗主题手动切换
- 快捷键（⌘K 快速搜索工具）
- URL hash 路由，每个工具可直接分享链接
