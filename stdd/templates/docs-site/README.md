# STDD 文档站点生成器

从 STDD 的 Markdown 文档自动生成静态文档站点（Astro/Starlight 风格）。

## 功能

- 将 `docs/` 下的 Markdown 文件转换为静态文档站点
- 支持中英文双语切换（读取 `config.yaml` 的 `i18n` 配置）
- 自动生成导航侧边栏
- 搜索功能（基于 flexsearch）
- 代码高亮
- 移动端响应式

## 使用方式

```bash
# 生成文档站点
/stdd:docs generate

# 本地预览
/stdd:docs preview

# 构建静态文件
/stdd:docs build
```

## 目录结构

```
stdd/templates/docs-site/
├── README.md               # 本文件
├── astro.config.mjs        # Astro + Starlight 配置模板
├── package.json            # 依赖模板
├── src/
│   ├── content/
│   │   ├── zh/             # 中文文档（自动从 docs/ 收集）
│   │   └── en/             # 英文文档（自动从 docs/en/ 收集）
│   └── styles/
│       └── custom.css      # STDD 品牌样式
└── public/
    └── stdd-logo.svg       # STDD Logo
```

## 配置

在 `stdd/config.yaml` 中增加：

```yaml
docs_site:
  enabled: true
  framework: "astro"         # astro (默认) / vitepress / docusaurus
  theme: "starlight"         # Astro Starlight 主题
  title: "Chaos Code"
  description: "Specification & Test-Driven Development Framework"
  output_dir: "docs-dist"    # 构建输出目录
  auto_sidebar: true         # 自动生成侧边栏
  search: true               # 启用搜索
```

## 生成流程

```
docs/**/*.md ──► [收集器] ──► [Markdown 处理] ──► [Astro 构建] ──► 静态站点
docs/en/**/*.md ──► ↑
stdd/config.yaml ──► ↑ (i18n 配置)

1. 收集器：扫描 docs/ 和 docs/en/ 下所有 .md 文件
2. Markdown 处理：调整链接、添加 frontmatter、生成导航元数据
3. Astro 构建：使用 Starlight 主题渲染为静态 HTML
4. 输出：dist/ 目录可直接部署到 GitHub Pages / Vercel / Netlify
```

## 生成的站点示例

```
https://<username>.github.io/stdd-copilot/
├── zh/                     # 中文文档
│   ├── getting-started/
│   ├── cli-guide/
│   ├── concepts/
│   ├── workflows/
│   └── commands/
├── en/                     # English docs
│   ├── getting-started/
│   ├── cli-guide/
│   └── ...
└── api/                    # API reference (from stdd-api-spec)
```

## 依赖

- Node.js >= 18
- astro >= 4.0
- @astrojs/starlight >= 0.20

## 部署

```bash
# GitHub Pages
/stdd:docs deploy --target=github-pages

# Vercel
/stdd:docs deploy --target=vercel

# Netlify
/stdd:docs deploy --target=netlify
```
