# 错题本 Chrome Extension

> Chrome Extension MV3 · React + TypeScript + Vite + pnpm

## 安装依赖与构建

### 前置要求

- Node.js ≥ 18
- pnpm ≥ 8（`npm i -g pnpm`）

### 安装依赖

```bash
pnpm install
```

### 本地构建

```bash
pnpm build
```

构建产物输出到 `dist/` 目录。

### 开发模式（可选）

```bash
pnpm dev
```

## 在 Chrome 中加载扩展

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择本项目的 `dist/` 目录

## 配置 Options（设置页）

扩展加载后：

1. 点击 Chrome 工具栏中的扩展图标，打开 Popup
2. 点击 **⚙️ 设置** 按钮，或在扩展管理页点击 **详细信息 → 扩展选项**
3. 填写以下字段并点击 **💾 保存**：
   - **API Key**：阿里云百炼平台的 API Key（`sk-xxxx`）
   - **App ID**：百炼应用 ID
   - **默认来源地区**：选择 上海 (SH) 或 深圳 (SZ)

## 目录结构

```
.
├── popup.html                     # Popup 入口 HTML
├── options.html                   # 设置页入口 HTML
├── library.html                   # 题库页入口 HTML
├── detail.html                    # 详情页入口 HTML
├── export.html                    # 导出页入口 HTML
├── public/
│   └── manifest.json              # Chrome Extension MV3 manifest
├── src/
│   ├── shared/
│   │   ├── types.ts               # 共享类型定义
│   │   └── storage.ts             # chrome.storage 封装
│   └── pages/
│       ├── popup/                 # Action popup
│       ├── options/               # 设置页（API Key / App ID / 来源地区）
│       ├── library/               # 题库页（占位）
│       ├── detail/                # 题目详情页（占位）
│       └── export/                # 导出 PDF 页（占位）
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 关键文件说明

| 文件 | 说明 |
|------|------|
| `public/manifest.json` | MV3 manifest，权限：`storage` + `https://dashscope.aliyuncs.com/*` |
| `src/shared/types.ts` | `Settings`、`MistakeItem`、`MistakesStore` 类型 |
| `src/shared/storage.ts` | `loadSettings/saveSettings/loadMistakes/saveMistakes` |
| `src/pages/options/App.tsx` | 设置页（API Key 密码框 + 显示/隐藏 + 地区 + 保存提示） |
| `src/pages/popup/App.tsx` | Popup 主页（含打开题库/导出/设置的导航按钮） |
