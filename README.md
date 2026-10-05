# hideko-lite-editor ⚡

> **High-Performance In-Browser Code Editor & Syntax Highlighter powered by Monaco Architecture, Mini-Monarch Lexer, Virtual Buffer, and 1px Floating Input Sink.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Vite](https://img.shields.io/badge/bundler-Vite%205-646CFF.svg)](https://vitejs.dev/)
[![Dependencies](https://img.shields.io/badge/dependencies-0%20runtime-brightgreen.svg)]
[![Architecture](https://img.shields.io/badge/architecture-Monaco%20Virtual%20Input-purple.svg)]

**hideko-lite-editor** is a blazing-fast, zero-dependency code editor and syntax highlighting engine designed for modern web applications. Inspired by VS Code's Monaco architecture, it replaces heavy, sluggish DOM textareas with an ultra-lightweight **1px Floating Input Sink** and a **Virtual Buffer Engine**, allowing you to smoothly edit and highlight code files from 10 lines up to **100,000+ lines** with zero glyph-shaping overhead (< 0.1ms) and 60 FPS performance.

* **Author**: [Wirot Chookeaw Chin6700x](https://github.com/chin6700x) 
* **License**: MIT License

---

## 🚀 Key Features

* **⚡ 1px Floating Input Sink (Monaco Architecture)**: Replaces monolithic DOM textareas with a dynamic 1px input sink positioned directly under the cursor. Eliminates WebKit/Safari glyph-shaping lag (< 0.1ms), while fully preserving native IME composition, Thai language accents, Asian character input, and native browser keyboard navigation.
* **🖼️ Virtual Buffer & Adaptive Scrolling**: Renders only the lines visible in the viewport plus overscan buffers. Easily handles files with **10,000 to 100,000+ lines** with ultra-low memory usage and constant 60 FPS scrolling.
* **🎨 Mini-Monarch Syntax Lexer**: Finite-state machine tokenizer delivering 14 distinct semantic token classes (`.mtk1` – `.mtk15`), incremental per-line state caching, and companion embedded language support (e.g. HTML with embedded CSS and JavaScript).
* **🔍 Declarative DOM Scanner (`Hideko.Run()`)**: Automatically turns static DOM blocks into interactive code editors (`h-mode="edit"`), read-only highlighted viewers (`h-mode="view"`), or inline snippets (`h-mode="inline"`).
* **👁️ Viewport Lazy Loading**: Uses `IntersectionObserver` (`loadMode: 'lazy'`) to defer language loading and rendering until elements enter or approach the visible screen.
* **🎨 7 Built-in Themes + Auto Sync**: `dark`, `light`, `dracula`, `one-dark`, `nord`, `monokai`, `github-dark`, and `auto` (seamlessly adapts to the OS dark/light mode preference).
* **🌐 32+ Modular Languages**: On-demand dynamic loading for JavaScript, TypeScript, Python, HTML, CSS, SQL, JSON, Go, Rust, C, C++, C#, Java, PHP, Markdown, Dockerfile, YAML, Bash, and more.
* **⌨️ Rich Editor Ergonomics**:
  - Interactive line numbers gutter with active line highlighting.
  - Undo / Redo history stack.
  - Smart indentation and auto-closing bracket pairs: `()`, `[]`, `{}`, `""`, `''`, ````.
  - Fast line comment toggling (`Ctrl+/` or `Cmd+/`).
  - Selection Range API with normalized coordinates.
* **📦 Zero Dependencies**: Pure vanilla JavaScript and CSS. Delivered in both modern ES Module (ESM) and Browser UMD/IIFE formats.

---

## 💻 Quick Start & Development

```bash
# Clone and navigate to project
cd hideko-lite-editor

# Install dependencies
npm install

# Start Vite development server & open the Playground
npm run dev

# Build production bundles (ESM, UMD, modular languages, minified CSS)
npm run build

# Preview production build
npm run preview
```

---

## 📦 Installation & Distribution Files

The compiled bundle in `dist/` contains:

```
dist/
├── hidekomaxline.js          # ESM bundle (for Vite, Webpack, Rollup, Next.js)
├── hidekomaxline.umd.js      # UMD / IIFE bundle (for classic <script> tags)
├── style.css                 # Editor & theme stylesheet
└── languages/                # 32+ standalone modular language grammars
    ├── javascript.js
    ├── python.js
    ├── html.js
    └── ...
```

---

## 🌐 Usage Guide

### 1. Interactive Editor via JavaScript API (`HidekoEditor`)

Create an interactive code editor with custom options:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Hideko Editor Demo</title>
    <!-- 1. Include Editor Stylesheet -->
    <link rel="stylesheet" href="dist/style.css">
    <style>
        #my-editor {
            width: 100%;
            height: 450px;
            border: 1px solid #30363d;
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <div id="my-editor"></div>

    <!-- 2. Import Module -->
    <script type="module">
        import { HidekoEditor } from './dist/hidekomaxline.js';

        // 3. Initialize Editor
        const editor = new HidekoEditor('#my-editor', {
            value: `function greet(name) {\n    console.log(\`Hello, \${name}!\`);\n}\n\ngreet("World");`,
            language: 'javascript',
            theme: 'dark',
            lineNumbers: true,
            fontSize: 14,
            lineHeight: 21,
            autoClosingBrackets: true,
            tabSize: 4
        });

        // Listen for content changes
        editor.on('change', (ev) => {
            console.log('Text changed:', editor.getText());
        });
    </script>
</body>
</html>
```

---

### 2. Declarative DOM Scanner (`Hideko.Run()`)

Highlight and mount editors across your HTML pages without writing manual setup scripts:

```html
<link rel="stylesheet" href="dist/style.css">
<script src="dist/hidekomaxline.umd.js"></script>

<!-- Editable Editor Block -->
<div class="hideko" h-mode="edit" h-lang="python" style="height: 300px;">
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print([fibonacci(i) for i in range(10)])
</div>

<!-- Read-only View Block with Line Highlight -->
<div class="hideko" h-mode="view" h-lang="javascript" h-highlight="2-3">
function calculateTotal(items) {
    // Highlighted calculation
    return items.reduce((sum, item) => sum + item.price, 0);
}
</div>

<!-- Inline Code Snippet -->
<span class="hideko" h-mode="inline" h-lang="sql">SELECT * FROM users WHERE active = 1;</span>

<script>
    // Automatically scans and hydrates all .hideko blocks
    Hideko.Run({
        theme: 'dark',
        loadMode: 'lazy' // Viewport lazy-loading via IntersectionObserver
    });
</script>
```

---

### 3. Low-Level Syntax Highlighting API

If you only need raw HTML syntax highlighting without editor controls:

```javascript
import { highlight, highlightLines, detectLanguage } from './dist/hidekomaxline.js';

// Auto-detect language from filename or extension
const lang = detectLanguage('server.py'); // 'python'

// Highlight string to HTML tokens
const { html, missingLanguages } = highlight(
    'print("Hello Hideko")',
    pythonLangDef,
    pythonConf,
    ['root']
);

console.log(html);
// Output: <span class="mtk10">print</span><span class="mtk8">(</span><span class="mtk7">&quot;Hello Hideko&quot;</span><span class="mtk8">)</span>
```

---

## ⚙️ Configuration & Options

### `HidekoEditorOptions`

| Option | Type | Default | Description |
|---|:---:|:---:|---|
| `value` | `string` | `""` | Initial code string in the editor buffer. |
| `language` | `string` | `"javascript"` | Language grammar for syntax highlighting. |
| `theme` | `string` | `"dark"` | Active theme (`dark`, `light`, `dracula`, `one-dark`, `nord`, `monokai`, `github-dark`, `auto`). |
| `lineNumbers` | `boolean` | `true` | Show or hide the line numbers gutter. |
| `readOnly` | `boolean` | `false` | Enable or disable read-only mode. |
| `fontSize` | `number` | `14` | Editor font size in pixels. |
| `lineHeight` | `number` | `21` | Line height in pixels for vertical math. |
| `tabSize` | `number` | `4` | Number of spaces per tab indentation. |
| `insertSpaces` | `boolean` | `true` | Insert spaces when the Tab key is pressed. |
| `autoClosingBrackets` | `boolean` | `true` | Automatically insert matching bracket or quote pairs. |
| `basePath` | `string` | `"./languages/"` | Path to fetch language definition files dynamically. |

---

### `HidekoEditor` Methods

| Method | Parameters | Return | Description |
|---|---|:---:|---|
| `getText()` | - | `string` | Retrieves the entire editor buffer text. |
| `setText(text)` | `text: string` | `void` | Replaces the entire buffer and resets selection. |
| `setLanguage(lang)` | `langName: string` | `Promise<void>` | Dynamically loads and switches active language grammar. |
| `setTheme(theme)` | `themeName: string` | `void` | Changes theme attribute and updates tokens. |
| `getCurrentLine()` | - | `number` | Returns 1-based index of active cursor line. |
| `getSelection()` | - | `Object` | Returns `{ startLine, startCol, endLine, endCol, isCollapsed }`. |
| `setSelection(sL, sC, eL, eC)`| `numbers (1-based)` | `void` | Programmatically selects a range in the document. |
| `selectAll()` | - | `void` | Selects all text in the buffer. |
| `clearSelection()` | - | `void` | Collapses selection back to cursor position. |
| `replaceSelection(text)` | `newText: string` | `void` | Replaces the selected range with new text. |
| `toggleComment()` | - | `void` | Toggles single-line comment on current or selected lines. |
| `undo()` | - | `void` | Reverts last operation from history stack. |
| `redo()` | - | `void` | Re-applies undone operation from history stack. |
| `focus()` | - | `void` | Focuses the 1px input sink to receive keystrokes. |
| `destroy()` | - | `void` | Cleans up DOM event listeners and observers. |
| `estimateMemory()` | - | `string` | Returns estimated buffer memory footprint in MB. |

---

## ⌨️ Keyboard Shortcuts

| Shortcut (Mac / Win) | Action |
|---|---|
| `Ctrl+Z` / `⌘Z` | Undo |
| `Ctrl+Y` / `⌘Y` or `Ctrl+Shift+Z` / `⌘⇧Z` | Redo |
| `Ctrl+/` / `⌘/` | Toggle single-line comment |
| `Ctrl+A` / `⌘A` | Select All |
| `Tab` / `Shift+Tab` | Indent / Outdent line or selection |
| `Enter` | Smart newline with auto-indentation matching previous line |
| `Backspace` | Delete char / remove auto-closed bracket pair |
| `Shift + Arrow Keys` | Expand / shrink text selection |
| `Home` / `End` (`⌘←` / `⌘→`) | Jump to start / end of current line |

---

## 🎨 Themes Available

Switch themes at any time by setting `data-theme` on the container or calling `editor.setTheme(name)`:

* `dark` — Classic Modern VS Code Dark (Default)
* `light` — Clean High-Contrast Light
* `dracula` — Vibrant Dracula Purple Accent
* `one-dark` — Atom One Dark
* `nord` — Arctic Blue Nord Palette
* `monokai` — Monokai Classic Vibrant
* `github-dark` — GitHub Official Dark Palette
* `auto` — Syncs automatically with the operating system light/dark preference

---

## 📄 License & Attribution

* **Author**: [Wirot Chookeaw Chin6700x](https://github.com/chin6700x) (<Chin6700X@gmail.com>)
* **License**: MIT License — free for both personal and commercial use.
