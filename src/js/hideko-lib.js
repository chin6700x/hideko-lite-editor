/**
 * hideko-lite-editor
 *
 * @author Wirot Chookeaw Chin6700x <Chin6700X@gmail.com>
 * @license MIT License
 */

import {
    highlight as v8Highlight,
    highlightLines as v8HighlightLines,
    registerLanguage as v8RegisterLanguage,
} from "./hideko-v8.js";
import { HidekoEditor } from "./editor.js";
import {
    languageAliases,
    detectLanguage as commonDetectLanguage,
} from "../languages-flat/language-aliases.js";
import { createCopyButton } from "./utils.js";

export const Hideko = {
    version: "v5",
    config: {
        debug: false,
        engine: "hideko", // 'hideko'
        basePath: null, // null = auto-detect URL from script tag + 'languages/'
        defaultLang: "javascript",
        defaultMode: "view",
        theme: "dark", // 'dark', 'light', 'dracula', 'one-dark', 'nord', 'monokai', 'github-dark', 'auto'
        loadMode: "lazy", // 'lazy' or 'all'
    },

    log(...args) {
        if (this.config.debug) {
            console.log(
                "%c[Hideko]",
                "color: #8b5cf6; font-weight: bold;",
                ...args,
            );
        }
    },

    // Cache for loaded language modules
    loadedLanguages: new Map(),
    pendingLoads: new Map(),

    // Alias map from languages-flat/language-aliases.js
    languageAliases,

    getBasePath() {
        if (this.config.basePath) {
            let p = this.config.basePath;
            return p.endsWith("/") ? p : p + "/";
        }
        if (typeof document !== "undefined") {
            const script =
                document.currentScript ||
                document.querySelector('script[src*="lib-hidekov8"]');
            if (script && script.src) {
                try {
                    const u = new URL(script.src, window.location.href);
                    return new URL("./languages/", u.href).href;
                } catch (e) {}
            }
        }
        return "./languages/";
    },

    stylesInjected: false,

    injectStyles() {
        if (this.stylesInjected) return;
        if (typeof document === "undefined") return;
        const style = document.createElement("style");
        style.textContent = `
            .hideko-theme-block {
                background-color: var(--hideko-bg, #1e1e1e) !important;
                color: var(--hideko-fg, #d4d4d4) !important;
            }
            .hideko-pre-block {
                position: relative;
                width: 100%;
                height: auto;
                overflow: auto;
                padding: 15px;
                margin: 0;
                border-radius: 6px;
                border: 1px solid var(--hideko-border, rgba(128,128,128,0.2));
                pointer-events: auto;
                font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
                font-size: 14px;
                line-height: 1.5;
            }
        `;
        document.head.appendChild(style);
        this.stylesInjected = true;
    },

    registerLanguage(langName, langDef, conf = {}) {
        if (!langName || !langDef) return;
        const actualLang = langName.toLowerCase();
        v8RegisterLanguage(actualLang, langDef);
        this.loadedLanguages.set(actualLang, {
            language: langDef,
            conf,
        });
        for (const [alias, canonical] of Object.entries(this.languageAliases)) {
            if (canonical === actualLang) {
                v8RegisterLanguage(alias, langDef);
            }
        }
    },

    use(plugin) {
        if (!plugin) return this;
        if (plugin.language) {
            const name =
                plugin.name ||
                (plugin.language.tokenPostfix
                    ? plugin.language.tokenPostfix.replace(/^\./, "")
                    : null);
            if (name) {
                this.registerLanguage(name, plugin.language, plugin.conf || {});
            }
        } else if (typeof plugin === "function") {
            plugin(this);
        }
        return this;
    },

    async loadLanguage(langName) {
        if (!langName) return null;
        const actualLang =
            this.languageAliases[langName.toLowerCase()] ||
            langName.toLowerCase();

        if (this.loadedLanguages.has(actualLang)) {
            this.log(`Language '${actualLang}' loaded from cache`);
            const mod = this.loadedLanguages.get(actualLang);
            if (mod && mod.language) {
                v8RegisterLanguage(langName.toLowerCase(), mod.language);
            }
            return mod;
        }

        if (this.pendingLoads.has(actualLang)) {
            return this.pendingLoads.get(actualLang);
        }

        const loadPromise = (async () => {
            this.log(`Loading language '${actualLang}'...`);
            const basePath = this.getBasePath();
            const base =
                typeof window !== "undefined"
                    ? window.location.href
                    : typeof process !== "undefined" && process.cwd
                      ? `file://${process.cwd()}/`
                      : "file:///";
            const scriptUrl = new URL(`${basePath}${actualLang}.js`, base).href;

            // Attempt dynamic import first (ESM)
            try {
                const mod = await import(/* @vite-ignore */ scriptUrl);
                const langDef =
                    mod.language || (mod.default && mod.default.language);
                const conf =
                    mod.conf || (mod.default && mod.default.conf) || {};

                if (langDef) {
                    this.registerLanguage(actualLang, langDef, conf);
                    v8RegisterLanguage(langName.toLowerCase(), langDef);
                    return {
                        language: langDef,
                        conf,
                    };
                }
            } catch (err) {
                // If dynamic import fails (e.g. file:// CORS), fallback to script tag injection in browser
                if (typeof document !== "undefined") {
                    try {
                        await new Promise((resolve, reject) => {
                            const script = document.createElement("script");
                            script.src = scriptUrl;
                            script.onload = () => resolve();
                            script.onerror = (e) =>
                                reject(
                                    new Error(`Failed to load ${scriptUrl}`),
                                );
                            document.head.appendChild(script);
                        });
                        if (this.loadedLanguages.has(actualLang)) {
                            const mod = this.loadedLanguages.get(actualLang);
                            v8RegisterLanguage(
                                langName.toLowerCase(),
                                mod.language,
                            );
                            return mod;
                        }
                    } catch (scriptErr) {
                        this.log(
                            "Hideko: Script injection fallback failed:",
                            scriptErr,
                        );
                    }
                }
                console.warn("Hideko: Error loading language:", langName, err);
            } finally {
                this.pendingLoads.delete(actualLang);
            }
            return null;
        })();

        this.pendingLoads.set(actualLang, loadPromise);
        return loadPromise;
    },

    setTheme(theme) {
        if (theme === "auto") {
            const prefersDark =
                typeof window !== "undefined" &&
                window.matchMedia &&
                window.matchMedia("(prefers-color-scheme: dark)").matches;
            this.currentTheme = prefersDark ? "dark" : "light";
        } else {
            this.currentTheme = theme;
        }

        if (typeof document !== "undefined") {
            document.documentElement.setAttribute(
                "data-theme",
                this.currentTheme,
            );
            if (document.body) {
                document.body.setAttribute("data-theme", this.currentTheme);
            }
            document
                .querySelectorAll(
                    ".hideko-theme-block, .hideko-editor-container",
                )
                .forEach((el) => {
                    el.setAttribute("data-theme", this.currentTheme);
                });
        }
    },

    parseHighlightRanges(rangeStr) {
        if (!rangeStr) return new Set();
        const lines = new Set();
        const parts = rangeStr.split(",");
        for (let part of parts) {
            part = part.trim();
            if (part.includes("-")) {
                const [start, end] = part
                    .split("-")
                    .map((n) => parseInt(n.trim(), 10));
                if (!isNaN(start) && !isNaN(end)) {
                    for (
                        let i = Math.min(start, end);
                        i <= Math.max(start, end);
                        i++
                    ) {
                        lines.add(i);
                    }
                }
            } else {
                const num = parseInt(part, 10);
                if (!isNaN(num)) lines.add(num);
            }
        }
        return lines;
    },

    Run(options = {}) {
        Object.assign(this.config, options);

        this.injectStyles();
        this.setTheme(this.config.theme);

        if (
            this.config.theme === "auto" &&
            typeof window !== "undefined" &&
            window.matchMedia
        ) {
            window
                .matchMedia("(prefers-color-scheme: dark)")
                .addEventListener("change", () => {
                    if (this.config.theme === "auto") {
                        this.setTheme("auto");
                    }
                });
        }

        if (typeof document === "undefined") return;

        const elements = document.querySelectorAll(
            '.hideko:not([data-hideko-processed="true"])',
        );
        this.log(
            `Initialized. Found ${elements.length} unprocessed block(s). Mode: ${this.config.loadMode}`,
        );

        if (elements.length === 0) return;

        if (this.config.loadMode === "all") {
            elements.forEach((el) => this.processElement(el));
        } else {
            const observer = new IntersectionObserver(
                (entries, obs) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            this.log(
                                "IntersectionObserver triggered for lazy block",
                            );
                            this.processElement(entry.target);
                            obs.unobserve(entry.target);
                        }
                    });
                },
                {
                    rootMargin: "200px",
                },
            );

            elements.forEach((el) => observer.observe(el));
        }
    },

    async processElement(el) {
        el.setAttribute("data-hideko-processed", "true");
        let mode = el.getAttribute("h-mode") || this.config.defaultMode;
        const lang = el.getAttribute("h-lang") || this.config.defaultLang;

        this.log(`Processing block: mode=${mode}, lang=${lang}`);
        const startProcessing = performance.now();

        if (mode === "edit" && this.config.engine === "solo") {
            console.warn(
                'Hideko: Editor mode is not supported when using engine="solo". Falling back to view mode.',
            );
            mode = "view";
        }

        if (mode === "edit") {
            const rawCode =
                el.tagName === "TEXTAREA" ? el.value : el.textContent;

            let container = el;
            if (el.tagName !== "DIV") {
                container = document.createElement("div");
                container.className = el.className;
                container.setAttribute("style", el.getAttribute("style") || "");
                Array.from(el.attributes).forEach((attr) => {
                    container.setAttribute(attr.name, attr.value);
                });
                el.parentNode.replaceChild(container, el);
            }

            container.classList.add("hideko-editor-container");
            container.classList.add("hideko-theme-block");
            container.setAttribute("data-theme", this.currentTheme);
            container.style.marginBottom = "1rem";
            if (getComputedStyle(container).position === "static") {
                container.style.position = "relative";
            }
            if (!container.style.height) {
                container.style.height = "300px";
            }

            container.textContent = "";

            const editor = new HidekoEditor(container);

            let code = rawCode.replace(/^\n/, "");
            editor.setText(code);
            await editor.setLanguage(lang);
            this.log(
                `Editor initialized in ${(performance.now() - startProcessing).toFixed(2)}ms`,
            );
            return;
        }

        // View or Inline Mode
        const mod = await this.loadLanguage(lang);
        const langDef = mod ? mod.language || {} : {};
        const conf = mod ? mod.conf || {} : {};

        let rawCode = el.textContent;
        if (rawCode.startsWith("\n")) {
            rawCode = rawCode.substring(1);
        }

        const hlStart = performance.now();
        const { html: formatted } = v8Highlight(rawCode, langDef, conf, [
            "root",
        ]);
        const hlTime = performance.now() - hlStart;
        this.log(`Highlighting engine took ${hlTime.toFixed(2)}ms`);

        if (mode === "inline") {
            el.innerHTML = formatted;
            el.style.fontFamily = "var(--font-mono, monospace)";
            el.style.backgroundColor = "var(--hideko-bg, rgba(0,0,0,0.05))";
            el.style.padding = "2px 4px";
            el.style.borderRadius = "3px";
            return;
        }

        // View Mode (Block) with optional Line Highlighting
        el.innerHTML = "";
        el.style.position = "relative";
        el.style.display = "block";
        el.style.marginBottom = "1rem";

        const pre = document.createElement("pre");
        pre.className = "hideko-editor-pre hideko-theme-block hideko-pre-block";
        if (el.style.height) pre.style.maxHeight = el.style.height;
        pre.setAttribute("data-theme", this.currentTheme);

        const codeEl = document.createElement("code");

        // Check for line highlighting attribute
        const highlightAttr =
            el.getAttribute("h-highlight") || el.getAttribute("data-highlight");
        const highlightedLines = this.parseHighlightRanges(highlightAttr);

        if (highlightedLines.size > 0) {
            const rawLines = formatted.split("\n");
            const linesWithHighlight = rawLines
                .map((lineContent, idx) => {
                    const lineNum = idx + 1;
                    const isHl = highlightedLines.has(lineNum);
                    return `<span class="hideko-line${isHl ? " hideko-line-highlighted" : ""}">${lineContent || " "}</span>`;
                })
                .join("\n");
            codeEl.innerHTML = linesWithHighlight;
        } else {
            codeEl.innerHTML = formatted;
        }

        pre.appendChild(codeEl);

        el.appendChild(pre);
        el.appendChild(createCopyButton(rawCode));
    },

    detectLanguage(filename) {
        return commonDetectLanguage(filename, this.languageAliases);
    },

    async highlightFile(url, options = {}) {
        this.injectStyles();

        const lang = options.lang || this.detectLanguage(url);
        this.log(`highlightFile: fetching "${url}" (lang=${lang})`);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(
                `Hideko: Failed to fetch "${url}" — ${response.status} ${response.statusText}`,
            );
        }
        const rawCode = await response.text();

        const mod = await this.loadLanguage(lang);
        const langDef = mod ? mod.language || {} : {};
        const conf = mod ? mod.conf || {} : {};

        const { html } = v8Highlight(rawCode, langDef, conf, ["root"]);
        return {
            html,
            rawCode,
            lang,
        };
    },

    async loadFile(url, options = {}) {
        this.injectStyles();
        if (!this.currentTheme) this.setTheme(this.config.theme);

        const lang = options.lang || this.detectLanguage(url);
        const mode = options.mode || this.config.defaultMode;

        this.log(`loadFile: fetching "${url}" (lang=${lang}, mode=${mode})`);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(
                `Hideko: Failed to fetch "${url}" — ${response.status} ${response.statusText}`,
            );
        }
        const rawCode = await response.text();

        let target;
        if (options.target) {
            target =
                typeof options.target === "string"
                    ? document.querySelector(options.target)
                    : options.target;
            if (!target) {
                throw new Error(
                    `Hideko: Target element "${options.target}" not found`,
                );
            }
        } else {
            target = document.createElement("div");
            document.body.appendChild(target);
        }

        target.classList.add("hideko");
        target.setAttribute("h-lang", lang);
        target.setAttribute("h-mode", mode);

        if (mode === "edit") {
            const textarea = document.createElement("textarea");
            textarea.classList.add("hideko");
            textarea.setAttribute("h-lang", lang);
            textarea.setAttribute("h-mode", mode);
            textarea.value = rawCode;
            target.parentNode.replaceChild(textarea, target);
            target = textarea;
        } else {
            target.textContent = rawCode;
        }

        await this.processElement(target);
        return target;
    },
};

if (typeof window !== "undefined") {
    window.Hideko = Hideko;
}
