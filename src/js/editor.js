/**
 * hideko-lite-editor
 *
 * @author Wirot Chookeaw Chin6700x <Chin6700X@gmail.com>
 * @license MIT License
 */

import {
    highlight,
    highlightLines,
    highlightLineArray,
    tokenizeLinesToState,
    registerLanguage,
    getLexer
} from './hideko-v8.js';
import {
    createCopyButton
} from './utils.js';
import {
    VirtualBuffer
} from './virtual-buffer.js';
import {
    FloatingInputSink
} from './input-sink.js';

const COMPANION_LANGUAGES = {
    'html': ['css', 'javascript'],
    'htm': ['css', 'javascript'],
    'xhtml': ['css', 'javascript'],
    'php': ['html', 'css', 'javascript'],
    'vue': ['html', 'css', 'javascript', 'typescript'],
    'markdown': ['javascript', 'python', 'json', 'css', 'html', 'shell'],
    'md': ['javascript', 'python', 'json', 'css', 'html', 'shell']
};

export class HidekoEditor {
    constructor(containerId, options = {}) {
        if (typeof containerId === 'string') {
            this.container = document.getElementById(containerId);
        } else {
            this.container = containerId;
        }
        if (!this.container) throw new Error(`Container ${containerId} not found`);

        // Editor Options Configuration
        this.options = Object.assign({
            value: '',
            language: 'javascript',
            theme: 'dark',
            readOnly: false,
            fontSize: 14,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Fira Code", monospace',
            lineHeight: 21,
            tabSize: 4,
            insertSpaces: true,
            lineNumbers: true,
            autoClosingBrackets: true
        }, options);

        // Metrics & Typography
        this.fontSize = this.options.fontSize || 14;
        this.fontFamily = this.options.fontFamily;
        this.lineHeight = this.options.lineHeight || 21;
        this.tabSize = this.options.tabSize || 4;
        this.paddingTop = 10;
        this.paddingLeft = 10;
        this.charWidth = 8.42; // Dynamic default, measured below
        this._canvasCtx = null;
        this._maxKnownWidth = 0;

        // Apply styles to container
        this.container.style.fontSize = `${this.fontSize}px`;
        this.container.style.fontFamily = this.fontFamily;
        if (this.options.readOnly) {
            this.container.classList.add('hideko-readonly');
        }

        // Cursor & Navigation State (0-indexed internally)
        this.cursorLine = 0;
        this.cursorCol = 0;
        this.selectionAnchor = null; // { line, col }
        this.selectionFocus = null; // { line, col }
        this.isMouseDown = false;

        // Event Bus for External Listeners
        this.listeners = {};

        // Theme State
        this.theme = this.options.theme || this.container.getAttribute('data-theme') || 'dark';
        this.container.setAttribute('data-theme', this.theme);

        // Memory Buffer (Manages 40,000 to 1,000,000+ lines in RAM)
        this.buffer = new VirtualBuffer(this.options.value || '');

        // 1. Create Gutter for line numbers
        this.gutter = document.createElement('div');
        this.gutter.className = 'hideko-editor-gutter';
        if (!this.options.lineNumbers) {
            this.gutter.style.display = 'none';
        }

        // 2. Create Content Wrapper
        this.contentWrapper = document.createElement('div');
        this.contentWrapper.className = 'hideko-editor-content';

        // 3. Virtual Scroll Container (handles native scrollbars and scroll wheel)
        this.scrollContainer = document.createElement('div');
        this.scrollContainer.className = 'hideko-editor-scroll';
        this.scrollContainer.tabIndex = -1;

        // 4. Scroll Sizer (establishes total virtual document height and dynamic width)
        this.scrollSizer = document.createElement('div');
        this.scrollSizer.className = 'hideko-scroll-sizer';
        this.scrollContainer.appendChild(this.scrollSizer);

        // 5. Active Line Background Highlight
        this.activeLineBg = document.createElement('div');
        this.activeLineBg.className = 'hideko-active-line-bg';
        this.scrollContainer.appendChild(this.activeLineBg);

        // 6. Selection Layer (GPU-rendered selection rectangles)
        this.selectionLayer = document.createElement('div');
        this.selectionLayer.className = 'hideko-selection-layer';
        this.scrollContainer.appendChild(this.selectionLayer);

        // 7. Pre & Code elements (renders only the visible slice of lines)
        this.pre = document.createElement('pre');
        this.pre.className = 'hideko-editor-pre';
        this.pre.style.lineHeight = `${this.lineHeight}px`;
        this.pre.style.fontSize = `${this.fontSize}px`;
        this.code = document.createElement('code');
        this.code.style.lineHeight = `${this.lineHeight}px`;
        this.code.style.fontSize = `${this.fontSize}px`;
        this.pre.appendChild(this.code);
        this.scrollContainer.appendChild(this.pre);

        // 8. Blinking GPU-accelerated Cursor
        this.cursorEl = document.createElement('div');
        this.cursorEl.className = 'hideko-cursor';
        if (this.options.readOnly) {
            this.cursorEl.style.display = 'none';
        }
        this.scrollContainer.appendChild(this.cursorEl);

        // 9. Floating Input Sink (Micro 2px x 21px textarea bridge)
        this.inputSink = new FloatingInputSink(this.scrollContainer, {
            readOnly: this.options.readOnly,
            onInsert: (text) => this.handleInsert(text),
            onInsertLineBreak: () => this.handleEnter(),
            onDelete: (dir) => this.handleDelete(dir),
            onNavigate: (key, isShift, isAlt, isCmd) => this.handleNavigate(key, isShift, isAlt, isCmd),
            onTab: (isShift) => this.handleTab(isShift),
            onUndo: () => this.undo(),
            onRedo: () => this.redo(),
            onSelectAll: () => this.selectAll(),
            onCopy: () => this.getSelectedText(),
            onCut: () => this.cutSelectedText(),
            onToggleComment: () => this.toggleComment()
        });

        // Backward compatibility alias: `editor.textarea`
        this.textarea = this.inputSink.textarea;

        // Append components
        this.contentWrapper.appendChild(this.scrollContainer);
        this.container.appendChild(this.gutter);
        this.container.appendChild(this.contentWrapper);
        this.container.appendChild(createCopyButton(() => this.buffer.getText()));

        // Monarch State Caching
        this.langDef = {};
        this.langConf = {};
        this.lineStates = [
            ['root']
        ];
        this.lastTokenizedLine = 0;

        // History
        this.history = [];
        this.historyIndex = -1;
        this.isHistoryNavigation = false;
        this._historyTimer = null;

        // Render & Layout Caching
        this._renderRAF = null;
        this._lastGutterStart = -1;
        this._lastGutterEnd = -1;
        this._lastGutterCount = -1;
        this._lastActiveGutterLine = -1;
        this._lastActiveLineEl = null;

        this.measureCharWidth();
        this.bindEvents();
        this.updateCursor();

        if (this.options.language) {
            this.setLanguage(this.options.language);
        }
    }

    measureCharWidth() {
        const testSpan = document.createElement('span');
        testSpan.style.fontFamily = this.fontFamily;
        testSpan.style.fontSize = `${this.fontSize}px`;
        testSpan.style.lineHeight = `${this.lineHeight}px`;
        testSpan.style.visibility = 'hidden';
        testSpan.style.position = 'absolute';
        testSpan.textContent = 'MMMMMMMMMM'; // 10 chars
        document.body.appendChild(testSpan);
        const width = testSpan.getBoundingClientRect().width;
        document.body.removeChild(testSpan);
        if (width > 0) {
            this.charWidth = width / 10;
        }
    }

    _hasComplexChars(str) {
        if (!str) return false;
        return /[^\x20-\x7E]/.test(str);
    }

    getTextWidth(str) {
        if (!str) return 0;
        if (!this._canvasCtx) {
            const canvas = document.createElement('canvas');
            this._canvasCtx = canvas.getContext('2d');
        }
        const font = `${this.fontSize}px ${this.fontFamily}`;
        if (this._canvasCtx.font !== font) {
            this._canvasCtx.font = font;
        }
        const tabSpace = ' '.repeat(this.tabSize);
        const expanded = str.replace(/\t/g, tabSpace);
        return this._canvasCtx.measureText(expanded).width;
    }

    colToX(col, lineIndex = this.cursorLine) {
        const lineText = this.buffer.getLine(lineIndex) || '';
        const safeCol = Math.max(0, Math.min(col, lineText.length));
        if (safeCol === 0) return this.paddingLeft;

        const slice = lineText.slice(0, safeCol);
        if (!this._hasComplexChars(slice)) {
            return this.paddingLeft + safeCol * this.charWidth;
        }
        return this.paddingLeft + this.getTextWidth(slice);
    }

    lineToY(line) {
        return this.paddingTop + line * this.lineHeight;
    }

    xToCol(x, lineIndex = this.cursorLine) {
        const targetX = x - this.paddingLeft;
        if (targetX <= 0) return 0;
        const lineText = this.buffer.getLine(lineIndex) || '';
        if (!lineText) return 0;

        if (!this._hasComplexChars(lineText)) {
            return Math.max(0, Math.min(lineText.length, Math.round(targetX / this.charWidth)));
        }

        let low = 0;
        let high = lineText.length;
        let bestCol = 0;
        let bestDist = Infinity;

        while (low <= high) {
            const mid = (low + high) >> 1;
            const w = this.getTextWidth(lineText.slice(0, mid));
            const dist = Math.abs(w - targetX);
            if (dist < bestDist) {
                bestDist = dist;
                bestCol = mid;
            }
            if (w < targetX) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return bestCol;
    }

    yToLine(y) {
        return Math.max(0, Math.floor((y - this.paddingTop) / this.lineHeight));
    }

    // --- Selection State & Logic ---

    comparePos(a, b) {
        if (a.line !== b.line) return a.line - b.line;
        return a.col - b.col;
    }

    hasSelection() {
        if (!this.selectionAnchor || !this.selectionFocus) return false;
        return (this.selectionAnchor.line !== this.selectionFocus.line) ||
            (this.selectionAnchor.col !== this.selectionFocus.col);
    }

    getNormalizedSelection() {
        if (!this.hasSelection()) return null;
        const cmp = this.comparePos(this.selectionAnchor, this.selectionFocus);
        if (cmp <= 0) {
            return {
                startLine: this.selectionAnchor.line,
                startCol: this.selectionAnchor.col,
                endLine: this.selectionFocus.line,
                endCol: this.selectionFocus.col
            };
        } else {
            return {
                startLine: this.selectionFocus.line,
                startCol: this.selectionFocus.col,
                endLine: this.selectionAnchor.line,
                endCol: this.selectionAnchor.col
            };
        }
    }

    renderSelection(startLine, endLine) {
        this.selectionLayer.innerHTML = '';
        const sel = this.getNormalizedSelection();
        if (!sel) return;

        const renderStart = Math.max(startLine, sel.startLine);
        const renderEnd = Math.min(endLine, sel.endLine);
        if (renderStart > renderEnd) return;

        const fragment = document.createDocumentFragment();

        for (let L = renderStart; L <= renderEnd; L++) {
            const lineText = this.buffer.getLine(L) || '';
            let colStart = 0;
            let colEnd = lineText.length;

            if (L === sel.startLine && L === sel.endLine) {
                colStart = sel.startCol;
                colEnd = sel.endCol;
            } else if (L === sel.startLine) {
                colStart = sel.startCol;
                colEnd = Math.max(colStart, lineText.length) + 0.5;
            } else if (L === sel.endLine) {
                colStart = 0;
                colEnd = sel.endCol;
            } else {
                colStart = 0;
                colEnd = Math.max(0, lineText.length) + 0.5;
            }

            const leftX = this.colToX(colStart, L);
            const rightX = this.colToX(colEnd, L);
            const width = Math.max(6, rightX - leftX);
            const topY = this.lineToY(L);

            const rectEl = document.createElement('div');
            rectEl.className = 'hideko-selection-rect';
            rectEl.style.transform = `translate3d(${leftX}px, ${topY}px, 0)`;
            rectEl.style.width = `${width}px`;
            rectEl.style.height = `${this.lineHeight}px`;
            fragment.appendChild(rectEl);
        }

        this.selectionLayer.appendChild(fragment);
    }

    deleteSelectedRange() {
        const sel = this.getNormalizedSelection();
        if (!sel) return false;
        this.buffer.deleteRange(sel.startLine, sel.startCol, sel.endLine, sel.endCol);
        this.setCursor(sel.startLine, sel.startCol);
        this.selectionAnchor = null;
        this.selectionFocus = null;
        this.invalidateLexerState(sel.startLine);
        this.saveState();
        this.scheduleRender();
        this.emitSelectionChange();
        this.emit('change', {
            type: 'delete',
            range: sel
        });
        return true;
    }

    // --- Input & Editing Handlers ---

    handleInsert(text) {
        if (!text) return;

        // If selection exists, replace it
        if (this.hasSelection()) {
            const sel = this.getNormalizedSelection();
            this.buffer.deleteRange(sel.startLine, sel.startCol, sel.endLine, sel.endCol);
            this.setCursor(sel.startLine, sel.startCol);
            this.selectionAnchor = null;
            this.selectionFocus = null;
            this.invalidateLexerState(sel.startLine);
        }

        // Auto-closing pair handling
        const autoClose = this.options.autoClosingBrackets !== false;
        const closePairs = {
            '(': ')',
            '[': ']',
            '{': '}',
            '"': '"',
            "'": "'",
            '`': '`'
        };
        const openPairs = Object.values(closePairs);

        // If user types closing pair character and next char is identical, skip over it
        const currentLineText = this.buffer.getLine(this.cursorLine);
        if (autoClose && openPairs.includes(text) && currentLineText[this.cursorCol] === text) {
            this.setCursor(this.cursorLine, this.cursorCol + 1);
            this.scheduleRender();
            this.emitSelectionChange();
            return;
        }

        // Insert text or pair
        let textToInsert = text;
        let cursorAdvance = text.length;

        if (autoClose && closePairs[text]) {
            textToInsert = text + closePairs[text];
            cursorAdvance = 1;
        }

        const res = this.buffer.insertText(this.cursorLine, this.cursorCol, textToInsert);
        this.setCursor(res.endLine, res.endCol - (textToInsert.length - cursorAdvance));
        this.invalidateLexerState(this.cursorLine);
        this.saveState();
        this.scheduleRender();
        this.emitSelectionChange();
        this.emit('change', {
            type: 'insert',
            text: textToInsert,
            line: this.cursorLine
        });
    }

    handleEnter() {
        if (this.hasSelection()) {
            const sel = this.getNormalizedSelection();
            this.buffer.deleteRange(sel.startLine, sel.startCol, sel.endLine, sel.endCol);
            this.setCursor(sel.startLine, sel.startCol);
            this.selectionAnchor = null;
            this.selectionFocus = null;
            this.invalidateLexerState(sel.startLine);
        }

        const lineText = this.buffer.getLine(this.cursorLine);
        const beforeCursor = lineText.slice(0, this.cursorCol);
        const afterCursor = lineText.slice(this.cursorCol);

        // Auto-indent: inherit leading spaces/tabs
        const indentMatch = beforeCursor.match(/^[ \t]*/);
        let indent = indentMatch ? indentMatch[0] : '';

        const trimmedBefore = beforeCursor.trimEnd();
        const opensBlock = ['{', '[', '(', ':'].some(ch => trimmedBefore.endsWith(ch));
        const closesBlock = ['}', ']', ')'].some(ch => afterCursor.trimStart().startsWith(ch));

        const tabStr = this.options.insertSpaces !== false ? ' '.repeat(this.tabSize) : '\t';
        let insertText = '\n' + indent;

        if (opensBlock && closesBlock) {
            const extraIndent = indent + tabStr;
            insertText = '\n' + extraIndent + '\n' + indent;
        } else if (opensBlock) {
            indent += tabStr;
            insertText = '\n' + indent;
        }

        const res = this.buffer.insertText(this.cursorLine, this.cursorCol, insertText);
        this.setCursor(this.cursorLine + (opensBlock && closesBlock ? 1 : 1), indent.length);
        this.invalidateLexerState(this.cursorLine);
        this.saveState();
        this.scheduleRender();
        this.emitSelectionChange();
        this.emit('change', {
            type: 'lineBreak',
            line: this.cursorLine
        });
    }

    handleDelete(direction) {
        if (this.hasSelection()) {
            this.deleteSelectedRange();
            return;
        }

        // Handle matching pair deletion e.g. (|) -> Backspace -> empty
        if (direction === 'backward') {
            const lineText = this.buffer.getLine(this.cursorLine);
            if (this.cursorCol > 0 && this.cursorCol < lineText.length) {
                const charBefore = lineText[this.cursorCol - 1];
                const charAfter = lineText[this.cursorCol];
                const pairs = {
                    '(': ')',
                    '[': ']',
                    '{': '}',
                    '"': '"',
                    "'": "'",
                    '`': '`'
                };
                if (pairs[charBefore] === charAfter) {
                    this.buffer.deleteRange(this.cursorLine, this.cursorCol - 1, this.cursorLine, this.cursorCol + 1);
                    this.setCursor(this.cursorLine, this.cursorCol - 1);
                    this.invalidateLexerState(this.cursorLine);
                    this.saveState();
                    this.scheduleRender();
                    this.emitSelectionChange();
                    return;
                }
            }
        }

        const res = this.buffer.deleteChar(this.cursorLine, this.cursorCol, direction);
        this.setCursor(res.line, res.col);
        this.invalidateLexerState(res.line);
        this.saveState();
        this.scheduleRender();
        this.emitSelectionChange();
        this.emit('change', {
            type: 'deleteChar',
            line: res.line
        });
    }

    handleTab(isShift) {
        const tabStr = this.options.insertSpaces !== false ? ' '.repeat(this.tabSize) : '\t';
        const tabLen = tabStr.length;

        if (this.hasSelection()) {
            const sel = this.getNormalizedSelection();
            if (sel.startLine !== sel.endLine) {
                for (let l = sel.startLine; l <= sel.endLine; l++) {
                    const line = this.buffer.getLine(l);
                    if (!isShift) {
                        this.buffer.insertText(l, 0, tabStr);
                    } else {
                        if (line.startsWith(tabStr)) {
                            this.buffer.deleteRange(l, 0, l, tabLen);
                        } else if (line.startsWith('\t')) {
                            this.buffer.deleteRange(l, 0, l, 1);
                        } else if (line.startsWith(' ')) {
                            const spaces = line.match(/^ +/)[0].length;
                            const toRemove = Math.min(spaces, tabLen);
                            this.buffer.deleteRange(l, 0, l, toRemove);
                        }
                    }
                }
                this.invalidateLexerState(sel.startLine);
                this.saveState();
                this.scheduleRender();
                this.emitSelectionChange();
                return;
            } else if (!isShift) {
                this.deleteSelectedRange();
            }
        }

        if (!isShift) {
            this.handleInsert(tabStr);
        } else {
            const lineText = this.buffer.getLine(this.cursorLine);
            if (lineText.startsWith(tabStr)) {
                this.buffer.deleteRange(this.cursorLine, 0, this.cursorLine, tabLen);
                this.setCursor(this.cursorLine, Math.max(0, this.cursorCol - tabLen));
                this.scheduleRender();
                this.emitSelectionChange();
            } else if (lineText.startsWith('\t')) {
                this.buffer.deleteRange(this.cursorLine, 0, this.cursorLine, 1);
                this.setCursor(this.cursorLine, Math.max(0, this.cursorCol - 1));
                this.scheduleRender();
                this.emitSelectionChange();
            }
        }
    }

    handleNavigate(key, isShift, isAlt, isCmd) {
        if (isShift) {
            if (!this.selectionAnchor) {
                this.selectionAnchor = {
                    line: this.cursorLine,
                    col: this.cursorCol
                };
            }
        } else if (this.hasSelection()) {
            const sel = this.getNormalizedSelection();
            this.selectionAnchor = null;
            this.selectionFocus = null;

            if (key === 'ArrowLeft' || key === 'ArrowUp') {
                this.setCursor(sel.startLine, sel.startCol);
                this.scrollIntoView();
                this.scheduleRender();
                this.emitSelectionChange();
                return;
            } else if (key === 'ArrowRight' || key === 'ArrowDown') {
                this.setCursor(sel.endLine, sel.endCol);
                this.scrollIntoView();
                this.scheduleRender();
                this.emitSelectionChange();
                return;
            }
        }

        let line = this.cursorLine;
        let col = this.cursorCol;
        const lineCount = this.buffer.getLineCount();

        switch (key) {
            case 'ArrowUp':
                if (line > 0) {
                    line--;
                    col = Math.min(col, this.buffer.getLineLength(line));
                }
                break;
            case 'ArrowDown':
                if (line < lineCount - 1) {
                    line++;
                    col = Math.min(col, this.buffer.getLineLength(line));
                }
                break;
            case 'ArrowLeft':
                if (col > 0) {
                    col--;
                } else if (line > 0) {
                    line--;
                    col = this.buffer.getLineLength(line);
                }
                break;
            case 'ArrowRight':
                if (col < this.buffer.getLineLength(line)) {
                    col++;
                } else if (line < lineCount - 1) {
                    line++;
                    col = 0;
                }
                break;
            case 'Home':
                col = 0;
                break;
            case 'End':
                col = this.buffer.getLineLength(line);
                break;
            case 'PageUp':
                line = Math.max(0, line - 25);
                col = Math.min(col, this.buffer.getLineLength(line));
                break;
            case 'PageDown':
                line = Math.min(lineCount - 1, line + 25);
                col = Math.min(col, this.buffer.getLineLength(line));
                break;
        }

        this.setCursor(line, col);
        if (isShift) {
            this.selectionFocus = {
                line: this.cursorLine,
                col: this.cursorCol
            };
        } else {
            this.selectionAnchor = null;
            this.selectionFocus = null;
        }

        this.scrollIntoView();
        this.scheduleRender();
        this.emitSelectionChange();
    }

    setCursor(line, col) {
        const lineCount = this.buffer.getLineCount();
        this.cursorLine = Math.max(0, Math.min(line, lineCount - 1));
        const lineLen = this.buffer.getLineLength(this.cursorLine);
        this.cursorCol = Math.max(0, Math.min(col, lineLen));

        this.updateCursor();
    }

    updateCursor() {
        const x = this.colToX(this.cursorCol);
        const y = this.lineToY(this.cursorLine);

        this.cursorEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        this.activeLineBg.style.transform = `translate3d(0, ${y}px, 0)`;
        this.inputSink.updatePosition(x, y);

        // Reset cursor blink phase on interaction
        this.cursorEl.style.animation = 'none';
        void this.cursorEl.offsetWidth; // trigger reflow for animation restart
        this.cursorEl.style.animation = '';
    }

    scrollIntoView() {
        const cursorY = this.lineToY(this.cursorLine);
        const cursorX = this.colToX(this.cursorCol);
        const scrollTop = this.scrollContainer.scrollTop;
        const scrollLeft = this.scrollContainer.scrollLeft;
        const clientHeight = this.scrollContainer.clientHeight || 600;
        const clientWidth = this.scrollContainer.clientWidth || 800;

        // Vertical scroll into view
        if (cursorY < scrollTop + 30) {
            this.scrollContainer.scrollTop = Math.max(0, cursorY - 30);
        } else if (cursorY + this.lineHeight > scrollTop + clientHeight - 40) {
            this.scrollContainer.scrollTop = cursorY + this.lineHeight - clientHeight + 40;
        }

        // Horizontal scroll into view
        if (cursorX < scrollLeft + 30) {
            this.scrollContainer.scrollLeft = Math.max(0, cursorX - 30);
        } else if (cursorX + 30 > scrollLeft + clientWidth - 50) {
            this.scrollContainer.scrollLeft = cursorX + 30 - clientWidth + 50;
        }
    }

    bindEvents() {
        // Scroll event: smooth viewport rendering
        this.scrollContainer.addEventListener('scroll', () => {
            this.gutter.scrollTop = this.scrollContainer.scrollTop;
            this.scheduleRender();
            this.emit('scroll', {
                scrollTop: this.scrollContainer.scrollTop,
                scrollLeft: this.scrollContainer.scrollLeft
            });
        }, {
            passive: true
        });

        // Mouse down to position cursor or start selection
        this.scrollContainer.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only primary click
            this.isMouseDown = true;

            const rect = this.scrollContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left + this.scrollContainer.scrollLeft;
            const clickY = e.clientY - rect.top + this.scrollContainer.scrollTop;

            const targetLine = this.yToLine(clickY);
            const targetCol = this.xToCol(clickX, targetLine);

            if (e.shiftKey) {
                if (!this.selectionAnchor) {
                    this.selectionAnchor = {
                        line: this.cursorLine,
                        col: this.cursorCol
                    };
                }
                this.selectionFocus = {
                    line: targetLine,
                    col: targetCol
                };
            } else {
                this.selectionAnchor = {
                    line: targetLine,
                    col: targetCol
                };
                this.selectionFocus = {
                    line: targetLine,
                    col: targetCol
                };
            }

            this.setCursor(targetLine, targetCol);
            this.inputSink.focus();
            this.scheduleRender();
            this.emitSelectionChange();
        });

        // Double click to select word
        this.scrollContainer.addEventListener('dblclick', (e) => {
            const rect = this.scrollContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left + this.scrollContainer.scrollLeft;
            const clickY = e.clientY - rect.top + this.scrollContainer.scrollTop;

            const line = this.yToLine(clickY);
            const col = this.xToCol(clickX, line);
            const lineText = this.buffer.getLine(line);
            if (!lineText) return;

            let start = col;
            let end = col;
            const isWordChar = (ch) => /[\w$]/.test(ch);

            if (col < lineText.length && isWordChar(lineText[col])) {
                while (start > 0 && isWordChar(lineText[start - 1])) start--;
                while (end < lineText.length && isWordChar(lineText[end])) end++;
            } else {
                while (start > 0 && lineText[start - 1] === ' ') start--;
                while (end < lineText.length && lineText[end] === ' ') end++;
            }

            this.selectionAnchor = {
                line,
                col: start
            };
            this.selectionFocus = {
                line,
                col: end
            };
            this.setCursor(line, end);
            this.scheduleRender();
            this.emitSelectionChange();
        });

        // Mouse drag selection
        window.addEventListener('mousemove', (e) => {
            if (!this.isMouseDown) return;

            const rect = this.scrollContainer.getBoundingClientRect();
            const mouseX = e.clientX - rect.left + this.scrollContainer.scrollLeft;
            const mouseY = e.clientY - rect.top + this.scrollContainer.scrollTop;

            const targetLine = this.yToLine(mouseY);
            const targetCol = this.xToCol(mouseX, targetLine);

            this.selectionFocus = {
                line: targetLine,
                col: targetCol
            };
            this.setCursor(targetLine, targetCol);

            // Auto-scroll when mouse dragged to container boundaries
            if (e.clientY < rect.top + 20) {
                this.scrollContainer.scrollTop -= 20;
            } else if (e.clientY > rect.bottom - 20) {
                this.scrollContainer.scrollTop += 20;
            }

            if (e.clientX < rect.left + 20) {
                this.scrollContainer.scrollLeft -= 20;
            } else if (e.clientX > rect.right - 20) {
                this.scrollContainer.scrollLeft += 20;
            }

            this.scheduleRender();
            this.emitSelectionChange();
        });

        window.addEventListener('mouseup', () => {
            if (this.isMouseDown) {
                this.isMouseDown = false;
                if (this.selectionAnchor && this.selectionFocus &&
                    this.selectionAnchor.line === this.selectionFocus.line &&
                    this.selectionAnchor.col === this.selectionFocus.col) {
                    this.selectionAnchor = null;
                    this.selectionFocus = null;
                }
                this.scheduleRender();
                this.emitSelectionChange();
            }
        });

        this.container.addEventListener('click', () => {
            this.inputSink.focus();
        });
    }

    invalidateLexerState(fromLine) {
        if (this.lastTokenizedLine > fromLine) {
            this.lastTokenizedLine = fromLine;
            if (this.lineStates.length > fromLine + 1) {
                this.lineStates.length = fromLine + 1;
            }
        }
    }

    scheduleRender() {
        if (this._renderRAF) return;
        this._renderRAF = requestAnimationFrame(() => {
            this.render();
            this._renderRAF = null;
        });
    }

    ensureLexerStateUpTo(targetLine) {
        if (targetLine <= 0) return;
        if (this.lineStates[targetLine]) return; // Already cached!

        // Find nearest known line index
        let knownLine = targetLine;
        while (knownLine > 0 && !this.lineStates[knownLine]) {
            knownLine--;
        }

        let currentState = this.lineStates[knownLine] || ['root'];
        const lexer = getLexer(this.langDef);
        if (!lexer) return;

        for (let L = knownLine; L < targetLine; L++) {
            const lineText = this.buffer.getLine(L) || '';
            const res = lexer.tokenizeLine(lineText, currentState, false);
            currentState = res.endStateStack;
            this.lineStates[L + 1] = currentState;
            if (res.missingLanguages && res.missingLanguages.length > 0) {
                res.missingLanguages.forEach(lang => this.loadEmbeddedLanguage(lang));
            }
        }
    }

    render() {
        const totalLines = this.buffer.getLineCount();
        const scrollTop = this.scrollContainer.scrollTop;
        const clientHeight = this.scrollContainer.clientHeight || 800;

        // 1. Calculate Viewport slice with generous buffer of 40 lines top/bottom to prevent edge clipping
        const overscan = 40;
        const startLine = Math.max(0, Math.floor((scrollTop - this.paddingTop) / this.lineHeight) - overscan);
        const endLine = Math.min(totalLines, Math.ceil((scrollTop - this.paddingTop + clientHeight) / this.lineHeight) + overscan);

        // 2. Continuous Lexer State: compute & cache state for every line up to startLine
        this.ensureLexerStateUpTo(startLine);
        const startState = this.lineStates[startLine] || ['root'];

        // 3. Highlight visible slice using highlightLineArray (prevents <pre> empty line collapse and caches each line's state)
        const sliceLines = this.buffer.lines.slice(startLine, endLine);
        const {
            html,
            lineStates: sliceStates,
            missingLanguages
        } = highlightLineArray(sliceLines, this.langDef, this.langConf, startState);

        if (missingLanguages && missingLanguages.length > 0) {
            missingLanguages.forEach(lang => this.loadEmbeddedLanguage(lang));
        }

        // Cache exact state of every line in rendered slice
        for (let i = 0; i < sliceStates.length; i++) {
            this.lineStates[startLine + i + 1] = sliceStates[i];
        }

        // 4. Update Pre Position & Content
        this.code.innerHTML = html;
        const preY = this.lineToY(startLine);
        this.pre.style.transform = `translate3d(0, ${preY}px, 0)`;

        // 5. Render Selection for visible lines
        this.renderSelection(startLine, endLine);

        // 6. Update Virtual Sizer Height & Width (virtual scroll layout)
        const totalHeight = this.paddingTop * 2 + totalLines * this.lineHeight;
        this.scrollSizer.style.height = `${totalHeight}px`;

        let maxLineWidth = this.scrollContainer.clientWidth || 800;
        for (let L = startLine; L < endLine; L++) {
            const lineLen = this.buffer.getLineLength(L);
            if (lineLen > 0) {
                const w = this.colToX(lineLen, L) + 50;
                if (w > maxLineWidth) {
                    maxLineWidth = w;
                }
            }
        }
        this._maxKnownWidth = Math.max(this._maxKnownWidth || 1000, maxLineWidth);
        this.scrollSizer.style.width = `${this._maxKnownWidth}px`;

        // 7. Update Line Numbers in Gutter
        if (this.options.lineNumbers === false) {
            this.gutter.style.display = 'none';
        } else {
            this.gutter.style.display = 'block';
            this.updateLineNumbers(totalLines, startLine, endLine);
            this.updateActiveGutterLine();
        }

        // 8. Dispatch editorUpdate Event with Lazy text getter
        const self = this;
        const ev = new CustomEvent('editorUpdate', {
            detail: {
                get text() {
                    return self.buffer.getText();
                },
                editor: this,
                currentLine: this.getCurrentLine()
            }
        });
        this.container.dispatchEvent(ev);
    }

    updateLineNumbers(linesCount, startLine, endLine) {
        if (this._lastGutterStart === startLine &&
            this._lastGutterEnd === endLine &&
            this._lastGutterCount === linesCount) {
            return;
        }

        this._lastGutterStart = startLine;
        this._lastGutterEnd = endLine;
        this._lastGutterCount = linesCount;

        const activeLine = this.getCurrentLine();
        const topHeight = this.paddingTop + startLine * this.lineHeight;
        const bottomHeight = Math.max(0, linesCount - endLine) * this.lineHeight + this.paddingTop;

        let numbersHtml = `<div style="height: ${topHeight}px;"></div>`;
        for (let i = startLine + 1; i <= endLine; i++) {
            const isActive = (i === activeLine) ? ' active' : '';
            numbersHtml += `<div class="hideko-editor-gutter-line${isActive}" data-line="${i}">${i}</div>`;
        }
        numbersHtml += `<div style="height: ${bottomHeight}px;"></div>`;
        this.gutter.innerHTML = numbersHtml;
        this._lastActiveLineEl = this.gutter.querySelector(`.hideko-editor-gutter-line[data-line="${activeLine}"]`);
    }

    updateActiveGutterLine() {
        const activeLine = this.getCurrentLine();
        if (this._lastActiveGutterLine === activeLine) return;
        this._lastActiveGutterLine = activeLine;

        if (this._lastActiveLineEl) {
            this._lastActiveLineEl.classList.remove('active');
            this._lastActiveLineEl = null;
        }
        const lineEl = this.gutter.querySelector(`.hideko-editor-gutter-line[data-line="${activeLine}"]`);
        if (lineEl) {
            lineEl.classList.add('active');
            this._lastActiveLineEl = lineEl;
        }
    }

    getCurrentLine() {
        return this.cursorLine + 1;
    }

    get lines() {
        return this.buffer.lines;
    }

    getText() {
        return this.buffer.getText();
    }

    setText(text) {
        this.buffer.setText(text);
        this.cursorLine = 0;
        this.cursorCol = 0;
        this.selectionAnchor = null;
        this.selectionFocus = null;
        this.lineStates = [
            ['root']
        ];
        this.lastTokenizedLine = 0;
        this._lastGutterStart = -1;
        this._maxKnownWidth = 0;
        this.updateCursor();
        this.scheduleRender();
        this.emitSelectionChange();
        this.emit('change', {
            type: 'set',
            text
        });
    }

    async setLanguage(langName) {
        try {
            const hideko = typeof window !== 'undefined' ? (window.Hideko || (window.HidekoV8 && window.HidekoV8.Hideko)) : null;
            let mod = null;
            if (hideko && typeof hideko.loadLanguage === 'function') {
                mod = await hideko.loadLanguage(langName);
            }
            if (mod) {
                this.langDef = mod.language || {};
                this.langConf = mod.conf || {};
                registerLanguage(langName, this.langDef);
                this.lineStates = [
                    ['root']
                ];
                this.lastTokenizedLine = 0;
                this.scheduleRender();

                // Preload companion languages for embedded highlighting
                const companions = COMPANION_LANGUAGES[langName.toLowerCase()];
                if (companions && companions.length > 0) {
                    companions.forEach(c => this.loadEmbeddedLanguage(c));
                }
            }
        } catch (err) {
            console.error('HidekoEditor: Error loading language:', langName, err);
        }
    }

    async loadEmbeddedLanguage(langName) {
        if (!langName) return;
        if (!this.pendingLanguages) this.pendingLanguages = new Set();
        if (this.pendingLanguages.has(langName)) return;
        this.pendingLanguages.add(langName);

        try {
            const hideko = typeof window !== 'undefined' ? (window.Hideko || (window.HidekoV8 && window.HidekoV8.Hideko)) : null;
            let mod = null;
            if (hideko && typeof hideko.loadLanguage === 'function') {
                mod = await hideko.loadLanguage(langName);
            }
            if (mod && mod.language) {
                registerLanguage(langName, mod.language);
                this.lineStates = [
                    ['root']
                ];
                this.lastTokenizedLine = 0;
                this.scheduleRender();
            }
        } catch (e) {
            console.warn('HidekoEditor: Could not load embedded language:', langName, e);
        }
    }

    saveState() {
        if (this.isHistoryNavigation) return;
        if (this._historyTimer) {
            clearTimeout(this._historyTimer);
            this._historyTimer = null;
        }
        this._historyTimer = setTimeout(() => {
            const state = {
                text: this.buffer.getText(),
                line: this.cursorLine,
                col: this.cursorCol
            };
            this.history = this.history.slice(0, this.historyIndex + 1);
            this.history.push(state);
            if (this.history.length > 50) this.history.shift();
            else this.historyIndex++;
        }, 300);
    }

    undo() {
        if (this.historyIndex > 0) {
            this.isHistoryNavigation = true;
            this.historyIndex--;
            const state = this.history[this.historyIndex];
            this.buffer.setText(state.text);
            this.setCursor(state.line, state.col);
            this.clearSelection();
            this.scheduleRender();
            setTimeout(() => {
                this.isHistoryNavigation = false;
            }, 10);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.isHistoryNavigation = true;
            this.historyIndex++;
            const state = this.history[this.historyIndex];
            this.buffer.setText(state.text);
            this.setCursor(state.line, state.col);
            this.clearSelection();
            this.scheduleRender();
            setTimeout(() => {
                this.isHistoryNavigation = false;
            }, 10);
        }
    }

    // ============================================================
    // Public WebApp JavaScript APIs
    // ============================================================

    /**
     * ดึงพิกัดของข้อความที่ถูกเลือก (1-indexed สำหรับผู้ใช้ภายนอก)
     * @returns {{ startLine: number, startCol: number, endLine: number, endCol: number, isCollapsed: boolean, raw: object }}
     */
    getSelection() {
        const sel = this.getNormalizedSelection();
        if (!sel) {
            return {
                startLine: this.cursorLine + 1,
                startCol: this.cursorCol + 1,
                endLine: this.cursorLine + 1,
                endCol: this.cursorCol + 1,
                isCollapsed: true,
                raw: {
                    startLine: this.cursorLine,
                    startCol: this.cursorCol,
                    endLine: this.cursorLine,
                    endCol: this.cursorCol
                }
            };
        }
        return {
            startLine: sel.startLine + 1,
            startCol: sel.startCol + 1,
            endLine: sel.endLine + 1,
            endCol: sel.endCol + 1,
            isCollapsed: false,
            raw: {
                ...sel
            }
        };
    }

    /**
     * ดึงข้อความจริงที่ถูกไฮไลต์เลือกอยู่
     * @returns {string}
     */
    getSelectedText() {
        const sel = this.getNormalizedSelection();
        if (!sel) return '';
        if (sel.startLine === sel.endLine) {
            const line = this.buffer.getLine(sel.startLine);
            return line.slice(sel.startCol, sel.endCol);
        }
        const first = this.buffer.getLine(sel.startLine).slice(sel.startCol);
        const middle = this.buffer.lines.slice(sel.startLine + 1, sel.endLine);
        const last = this.buffer.getLine(sel.endLine).slice(0, sel.endCol);
        return [first, ...middle, last].join('\n');
    }

    /**
     * ตัดข้อความที่เลือก (Cut) แล้วคืนค่าข้อความนั้น
     * @returns {string}
     */
    cutSelectedText() {
        const text = this.getSelectedText();
        if (this.hasSelection()) {
            this.deleteSelectedRange();
        }
        return text;
    }

    /**
     * สั่งคลุมดำเลือกข้อความตามช่วงบรรทัดและคอลัมน์ (1-indexed)
     * @param {number} startLine 
     * @param {number} startCol 
     * @param {number} endLine 
     * @param {number} endCol 
     */
    setSelection(startLine, startCol, endLine, endCol) {
        const totalLines = this.buffer.getLineCount();
        const sLine = Math.max(0, Math.min(startLine - 1, totalLines - 1));
        const sCol = Math.max(0, Math.min(startCol - 1, this.buffer.getLineLength(sLine)));
        const eLine = Math.max(0, Math.min(endLine - 1, totalLines - 1));
        const eCol = Math.max(0, Math.min(endCol - 1, this.buffer.getLineLength(eLine)));

        this.selectionAnchor = {
            line: sLine,
            col: sCol
        };
        this.selectionFocus = {
            line: eLine,
            col: eCol
        };
        this.setCursor(eLine, eCol);
        this.scrollIntoView();
        this.scheduleRender();
        this.emitSelectionChange();
    }

    /**
     * เลือกข้อความทั้งหมดในเอกสาร (Cmd + A)
     */
    selectAll() {
        const totalLines = this.buffer.getLineCount();
        const lastLineLen = this.buffer.getLineLength(totalLines - 1);
        this.selectionAnchor = {
            line: 0,
            col: 0
        };
        this.selectionFocus = {
            line: totalLines - 1,
            col: lastLineLen
        };
        this.setCursor(totalLines - 1, lastLineLen);
        this.scheduleRender();
        this.emitSelectionChange();
    }

    /**
     * ยกเลิกการคลุมดำข้อความ
     */
    clearSelection() {
        if (this.selectionAnchor || this.selectionFocus) {
            this.selectionAnchor = null;
            this.selectionFocus = null;
            this.scheduleRender();
            this.emitSelectionChange();
        }
    }

    /**
     * สั่งคลุมดำเลือกทั้งบรรทัดที่ระบุ (1-indexed)
     * @param {number} lineNumber 
     */
    selectLine(lineNumber) {
        const totalLines = this.buffer.getLineCount();
        const line = Math.max(0, Math.min(lineNumber - 1, totalLines - 1));
        const lineLen = this.buffer.getLineLength(line);
        this.selectionAnchor = {
            line,
            col: 0
        };
        this.selectionFocus = {
            line,
            col: lineLen
        };
        this.setCursor(line, lineLen);
        this.scheduleRender();
        this.emitSelectionChange();
    }

    /**
     * แทนที่ข้อความที่ถูกเลือกด้วย newText (ถ้าไม่มีการเลือก จะเป็นการแทรกตรงเคอร์เซอร์)
     * @param {string} newText 
     */
    replaceSelection(newText) {
        if (this.hasSelection()) {
            const sel = this.getNormalizedSelection();
            this.buffer.deleteRange(sel.startLine, sel.startCol, sel.endLine, sel.endCol);
            this.cursorLine = sel.startLine;
            this.cursorCol = sel.startCol;
            this.selectionAnchor = null;
            this.selectionFocus = null;
        }
        if (newText) {
            const res = this.buffer.insertText(this.cursorLine, this.cursorCol, newText);
            this.setCursor(res.endLine, res.endCol);
        }
        this.invalidateLexerState(this.cursorLine);
        this.saveState();
        this.scheduleRender();
        this.emitSelectionChange();
        this.emit('change', {
            type: 'replace',
            text: newText
        });
    }

    /**
     * แทรกข้อความ ณ ตำแหน่งเคอร์เซอร์ปัจจุบัน
     * @param {string} text 
     */
    insertAtCursor(text) {
        this.handleInsert(text);
    }

    /**
     * อ่านตำแหน่งเคอร์เซอร์ปัจจุบัน (1-indexed)
     * @returns {{ line: number, col: number }}
     */
    getCursorPosition() {
        return {
            line: this.cursorLine + 1,
            col: this.cursorCol + 1
        };
    }

    /**
     * ย้ายเคอร์เซอร์ไปยังบรรทัด/คอลัมน์ที่กำหนด (1-indexed)
     * @param {number} line 
     * @param {number} col 
     */
    setCursorPosition(line, col) {
        const totalLines = this.buffer.getLineCount();
        const targetLine = Math.max(0, Math.min(line - 1, totalLines - 1));
        const targetCol = Math.max(0, Math.min(col - 1, this.buffer.getLineLength(targetLine)));
        this.selectionAnchor = null;
        this.selectionFocus = null;
        this.setCursor(targetLine, targetCol);
        this.scrollIntoView();
        this.scheduleRender();
        this.emitSelectionChange();
    }

    /**
     * เลื่อน Scroll ไปยังบรรทัดที่ต้องการ
     * @param {number} lineNumber 1-indexed
     * @param {'top'|'center'|'bottom'} position 
     */
    scrollToLine(lineNumber, position = 'center') {
        const totalLines = this.buffer.getLineCount();
        const line = Math.max(0, Math.min(lineNumber - 1, totalLines - 1));
        const targetY = this.lineToY(line);
        const clientHeight = this.scrollContainer.clientHeight || 600;

        let scrollTop = targetY;
        if (position === 'center') {
            scrollTop = Math.max(0, targetY - clientHeight / 2);
        } else if (position === 'bottom') {
            scrollTop = Math.max(0, targetY - clientHeight + this.lineHeight);
        }

        this.scrollContainer.scrollTop = scrollTop;
        this.scheduleRender();
    }

    /**
     * ดึงข้อความทั้งหมดในเอกสาร
     * @returns {string}
     */
    getValue() {
        return this.buffer.getText();
    }

    /**
     * กำหนดข้อความทั้งหมดในเอกสาร
     * @param {string} text 
     */
    setValue(text) {
        this.setText(text);
    }

    /**
     * อ่านข้อความของบรรทัดที่ระบุ (1-indexed)
     * @param {number} lineNumber 
     * @returns {string}
     */
    getLine(lineNumber) {
        const totalLines = this.buffer.getLineCount();
        if (lineNumber < 1 || lineNumber > totalLines) return '';
        return this.buffer.getLine(lineNumber - 1);
    }

    /**
     * อ่านจำนวนบรรทัดทั้งหมดในเอกสาร
     * @returns {number}
     */
    getLineCount() {
        return this.buffer.getLineCount();
    }

    /**
     * อ่านชุดบรรทัดตามช่วงที่กำหนด (1-indexed)
     * @param {number} startLine 
     * @param {number} endLine 
     * @returns {string[]}
     */
    getLineRange(startLine, endLine) {
        const totalLines = this.buffer.getLineCount();
        const s = Math.max(0, Math.min(startLine - 1, totalLines - 1));
        const e = Math.max(0, Math.min(endLine, totalLines));
        return this.buffer.lines.slice(s, e);
    }

    /**
     * โฟกัสไปที่ตัว Editor พร้อมพิมพ์ต่อได้ทันที
     */
    focus() {
        this.inputSink.focus();
    }

    // ============================================================
    // Event System (Pub/Sub & DOM Event Hook)
    // ============================================================

    /**
     * ดักฟังเหตุการณ์ เช่น 'selectionChange', 'cursorChange', 'change', 'scroll'
     * @param {string} eventName 
     * @param {Function} callback 
     * @returns {Function} unsubscribe function
     */
    on(eventName, callback) {
        if (!this.listeners[eventName]) this.listeners[eventName] = [];
        this.listeners[eventName].push(callback);
        return () => this.off(eventName, callback);
    }

    /**
     * ยกเลิกการดักฟังเหตุการณ์
     * @param {string} eventName 
     * @param {Function} callback 
     */
    off(eventName, callback) {
        if (!this.listeners[eventName]) return;
        this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
    }

    /**
     * ยิงเหตุการณ์ไปยัง Listener ภายนอกและ Container DOM
     * @param {string} eventName 
     * @param {*} data 
     */
    emit(eventName, data) {
        if (this.listeners[eventName]) {
            this.listeners[eventName].forEach(cb => {
                try {
                    cb(data);
                } catch (err) {
                    console.error(`Error in editor listener for '${eventName}':`, err);
                }
            });
        }
        const customEv = new CustomEvent(eventName, {
            detail: data,
            bubbles: true
        });
        this.container.dispatchEvent(customEv);
    }

    emitSelectionChange() {
        const sel = this.getSelection();
        const data = {
            selection: sel,
            selectedText: this.getSelectedText(),
            cursor: this.getCursorPosition()
        };
        this.emit('selectionChange', data);
        this.emit('cursorChange', data.cursor);
    }

    toggleComment() {
        let commentPrefix = '//';
        if (this.langConf?.comments?.lineComment) {
            commentPrefix = this.langConf.comments.lineComment;
        } else if (this.langDef?.tokenPostfix) {
            const p = this.langDef.tokenPostfix.toLowerCase();
            if (['.py', '.sh', '.bash', '.rb', '.yaml', '.yml', '.r'].includes(p)) {
                commentPrefix = '#';
            } else if (['.sql', '.lua'].includes(p)) {
                commentPrefix = '--';
            }
        }

        const sel = this.getNormalizedSelection();
        let startLineIdx = this.cursorLine;
        let endLineIdx = this.cursorLine;

        if (sel) {
            startLineIdx = sel.startLine;
            endLineIdx = sel.endLine;
        }

        let allCommented = true;
        for (let i = startLineIdx; i <= endLineIdx; i++) {
            const trimmed = (this.buffer.getLine(i) || '').trim();
            if (trimmed.length > 0 && !trimmed.startsWith(commentPrefix)) {
                allCommented = false;
                break;
            }
        }

        for (let i = startLineIdx; i <= endLineIdx; i++) {
            const line = this.buffer.getLine(i) || '';
            if (allCommented) {
                const idx = line.indexOf(commentPrefix);
                if (idx !== -1) {
                    const before = line.substring(0, idx);
                    let after = line.substring(idx + commentPrefix.length);
                    if (after.startsWith(' ')) after = after.substring(1);
                    this.buffer.lines[i] = before + after;
                }
            } else {
                if (line.trim().length > 0) {
                    this.buffer.lines[i] = commentPrefix + ' ' + line;
                }
            }
        }

        this.invalidateLexerState(startLineIdx);
        this.saveState();
        this.scheduleRender();
        this.emitSelectionChange();
        this.emit('change', {
            type: 'toggleComment',
            startLine: startLineIdx,
            endLine: endLineIdx
        });
    }

    destroy() {
        if (this._historyTimer) {
            clearTimeout(this._historyTimer);
            this._historyTimer = null;
        }
        if (this._renderRAF) {
            cancelAnimationFrame(this._renderRAF);
            this._renderRAF = null;
        }
        this.container.innerHTML = '';
    }

    /**
     * เปลี่ยน Theme ของ Editor
     * @param {string} theme ('dark', 'light', 'dracula', 'one-dark', 'nord', 'monokai', 'github-dark')
     */
    setTheme(theme) {
        if (!theme) return;
        this.theme = theme;
        if (this.container) {
            this.container.setAttribute('data-theme', theme);
        }
        this.scheduleRender();
    }

    /**
     * ดึงชื่อ Theme ปัจจุบัน
     * @returns {string}
     */
    getTheme() {
        return this.theme || this.container?.getAttribute('data-theme') || 'dark';
    }

    /**
     * สลับโหมดอ่านอย่างเดียว (Read-only)
     * @param {boolean} readOnly 
     */
    setReadOnly(readOnly) {
        this.options.readOnly = !!readOnly;
        if (this.inputSink) {
            this.inputSink.setReadOnly(this.options.readOnly);
        }
        if (this.cursorEl) {
            this.cursorEl.style.display = this.options.readOnly ? 'none' : 'block';
        }
        if (this.container) {
            if (this.options.readOnly) {
                this.container.classList.add('hideko-readonly');
            } else {
                this.container.classList.remove('hideko-readonly');
            }
        }
    }

    /**
     * ตรวจสอบว่าอยู่ในโหมดอ่านอย่างเดียวหรือไม่
     * @returns {boolean}
     */
    isReadOnly() {
        return !!this.options.readOnly;
    }

    /**
     * กำหนดขนาด Tab
     * @param {number} tabSize 
     */
    setTabSize(tabSize) {
        const val = parseInt(tabSize, 10);
        if (!isNaN(val) && val > 0) {
            this.tabSize = val;
            this.options.tabSize = val;
            this._maxKnownWidth = 0;
            this.scheduleRender();
        }
    }

    /**
     * ดึงขนาด Tab ปัจจุบัน
     * @returns {number}
     */
    getTabSize() {
        return this.tabSize;
    }

    /**
     * ซ่อนหรือแสดง Gutter Line Numbers
     * @param {boolean} show 
     */
    setLineNumbers(show) {
        this.options.lineNumbers = !!show;
        this.scheduleRender();
    }

    /**
     * เปลี่ยนขนาด Font
     * @param {number} fontSize (px)
     */
    setFontSize(fontSize) {
        const val = parseInt(fontSize, 10);
        if (!isNaN(val) && val > 0) {
            this.fontSize = val;
            this.options.fontSize = val;
            this.code.style.fontSize = `${val}px`;
            this.gutter.style.fontSize = `${val}px`;
            this.measureCharWidth();
            this._maxKnownWidth = 0;
            this.updateCursor();
            this.scheduleRender();
        }
    }

    /**
     * อัปเดต Options แบบกลุ่ม
     * @param {Object} newOptions 
     */
    updateOptions(newOptions = {}) {
        if (typeof newOptions.readOnly !== 'undefined') {
            this.setReadOnly(newOptions.readOnly);
        }
        if (typeof newOptions.theme !== 'undefined') {
            this.setTheme(newOptions.theme);
        }
        if (typeof newOptions.fontSize !== 'undefined') {
            this.setFontSize(newOptions.fontSize);
        }
        if (typeof newOptions.tabSize !== 'undefined') {
            this.setTabSize(newOptions.tabSize);
        }
        if (typeof newOptions.lineNumbers !== 'undefined') {
            this.setLineNumbers(newOptions.lineNumbers);
        }
        if (typeof newOptions.language !== 'undefined') {
            this.setLanguage(newOptions.language);
        }
        if (typeof newOptions.autoClosingBrackets !== 'undefined') {
            this.options.autoClosingBrackets = !!newOptions.autoClosingBrackets;
        }
        if (typeof newOptions.insertSpaces !== 'undefined') {
            this.options.insertSpaces = !!newOptions.insertSpaces;
        }
    }

    /**
     * ดึง options ปัจจุบันของ editor
     * @returns {Object}
     */
    getOptions() {
        return {
            ...this.options
        };
    }

    estimateMemory() {
        const totalChars = this.buffer.lines.reduce((acc, line) => acc + line.length, 0);
        const memMB = (totalChars * 2) / (1024 * 1024);
        return memMB.toFixed(2);
    }
}