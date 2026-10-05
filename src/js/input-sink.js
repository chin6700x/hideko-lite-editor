/**
 * FloatingInputSink — Micro Input Bridge for Hideko Max-Line
 * Replaces monolithic 40,000-line textarea with a 1px floating input sink.
 * Zero glyph shaping overhead (< 0.1ms) on WebKit/Safari.
 * Full support for Thai language, IME composition, and keyboard shortcuts.

 * hideko-lite-editor
 *
 * @author Wirot Chookeaw Chin6700x <Chin6700X@gmail.com>
 * @license MIT License
 */


export class FloatingInputSink {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        this.isComposing = false;
        this.compositionText = '';

        this.textarea = document.createElement('textarea');
        this.textarea.className = 'hideko-virtual-input';
        this.textarea.setAttribute('wrap', 'off');
        this.textarea.setAttribute('autocorrect', 'off');
        this.textarea.setAttribute('autocapitalize', 'off');
        this.textarea.setAttribute('autocomplete', 'off');
        this.textarea.setAttribute('spellcheck', 'false');
        this.textarea.setAttribute('aria-label', 'Code Editor Input');
        this.textarea.setAttribute('data-gramm', 'false');

        // Style as micro floating sink
        Object.assign(this.textarea.style, {
            position: 'absolute',
            top: '0px',
            left: '0px',
            width: '2px',
            height: '21px',
            padding: '0',
            margin: '0',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'transparent',
            caretColor: 'transparent',
            resize: 'none',
            overflow: 'hidden',
            zIndex: '20',
            opacity: '0.01'
        });

        this.container.appendChild(this.textarea);
        if (this.options.readOnly) {
            this.setReadOnly(true);
        }
        this.bindEvents();
    }

    setReadOnly(readOnly) {
        this.options.readOnly = !!readOnly;
        this.textarea.readOnly = !!readOnly;
    }

    isReadOnly() {
        return !!this.options.readOnly;
    }

    bindEvents() {
        // 1. Composition Events (Thai, Japanese, Chinese, Accents)
        this.textarea.addEventListener('compositionstart', () => {
            if (this.isReadOnly()) return;
            this.isComposing = true;
            this.compositionText = '';
            if (this.options.onCompositionStart) {
                this.options.onCompositionStart();
            }
        });

        this.textarea.addEventListener('compositionupdate', (e) => {
            if (this.isReadOnly()) return;
            this.compositionText = e.data || '';
            if (this.options.onCompositionUpdate) {
                this.options.onCompositionUpdate(this.compositionText);
            }
        });

        this.textarea.addEventListener('compositionend', (e) => {
            if (this.isReadOnly()) {
                this.textarea.value = '';
                return;
            }
            this.isComposing = false;
            const text = e.data || this.textarea.value;
            this.textarea.value = '';
            if (text && this.options.onInsert) {
                this.options.onInsert(text);
            }
            if (this.options.onCompositionEnd) {
                this.options.onCompositionEnd();
            }
        });

        // 2. Modern beforeinput / input handling
        this.textarea.addEventListener('beforeinput', (e) => {
            if (this.isReadOnly()) {
                e.preventDefault();
                return;
            }
            if (this.isComposing) return;

            if (e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph') {
                e.preventDefault();
                if (this.options.onInsertLineBreak) {
                    this.options.onInsertLineBreak();
                } else if (this.options.onInsert) {
                    this.options.onInsert('\n');
                }
                this.textarea.value = '';
                return;
            }

            if (e.inputType === 'deleteContentBackward') {
                e.preventDefault();
                if (this.options.onDelete) {
                    this.options.onDelete('backward');
                }
                this.textarea.value = '';
                return;
            }

            if (e.inputType === 'deleteContentForward') {
                e.preventDefault();
                if (this.options.onDelete) {
                    this.options.onDelete('forward');
                }
                this.textarea.value = '';
                return;
            }

            if (e.inputType === 'insertText' && e.data) {
                e.preventDefault();
                if (this.options.onInsert) {
                    this.options.onInsert(e.data);
                }
                this.textarea.value = '';
                return;
            }
        });

        this.textarea.addEventListener('input', () => {
            if (this.isComposing) return;
            const val = this.textarea.value;
            if (val.length > 0) {
                this.textarea.value = '';
                if (this.options.onInsert) {
                    this.options.onInsert(val);
                }
            }
        });

        // 3. Navigation & Shortcuts (keydown)
        this.textarea.addEventListener('keydown', (e) => {
            if (this.isComposing) return;

            const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
            const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

            // Undo / Redo
            if (cmdOrCtrl && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    this.options.onRedo && this.options.onRedo();
                } else {
                    this.options.onUndo && this.options.onUndo();
                }
                return;
            }
            if (cmdOrCtrl && e.key.toLowerCase() === 'y' && !isMac) {
                e.preventDefault();
                this.options.onRedo && this.options.onRedo();
                return;
            }

            // Select All (Cmd+A)
            if (cmdOrCtrl && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                this.options.onSelectAll && this.options.onSelectAll();
                return;
            }

            // Toggle Comment (Cmd+/ or Ctrl+/)
            if (cmdOrCtrl && e.key === '/') {
                e.preventDefault();
                if (!this.isReadOnly()) {
                    this.options.onToggleComment && this.options.onToggleComment();
                }
                return;
            }

            // Tab / Shift+Tab
            if (e.key === 'Tab') {
                e.preventDefault();
                if (!this.isReadOnly()) {
                    this.options.onTab && this.options.onTab(e.shiftKey);
                }
                return;
            }

            // Arrow navigation
            const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];
            if (navKeys.includes(e.key)) {
                e.preventDefault();
                this.options.onNavigate && this.options.onNavigate(e.key, e.shiftKey, e.altKey, cmdOrCtrl);
                return;
            }

            // Backspace / Delete fallback if beforeinput didn't catch
            if (e.key === 'Backspace' && !cmdOrCtrl && !e.altKey) {
                e.preventDefault();
                if (!this.isReadOnly()) {
                    this.options.onDelete && this.options.onDelete('backward');
                }
                return;
            }
            if (e.key === 'Delete') {
                e.preventDefault();
                if (!this.isReadOnly()) {
                    this.options.onDelete && this.options.onDelete('forward');
                }
                return;
            }

            // Enter key fallback
            if (e.key === 'Enter' && !cmdOrCtrl && !e.altKey) {
                e.preventDefault();
                if (!this.isReadOnly()) {
                    if (this.options.onInsertLineBreak) {
                        this.options.onInsertLineBreak();
                    } else if (this.options.onInsert) {
                        this.options.onInsert('\n');
                    }
                }
                return;
            }

            // If read-only, block any typing key
            if (this.isReadOnly() && !cmdOrCtrl && e.key.length === 1) {
                e.preventDefault();
                return;
            }
        });

        // 4. Paste handling
        this.textarea.addEventListener('paste', (e) => {
            e.preventDefault();
            if (this.isReadOnly()) return;
            const text = (e.clipboardData || window.clipboardData)?.getData('text');
            if (text && this.options.onInsert) {
                this.options.onInsert(text);
            }
        });

        // 5. Copy & Cut handling
        this.textarea.addEventListener('copy', (e) => {
            if (this.options.onCopy) {
                const text = this.options.onCopy();
                if (text && e.clipboardData) {
                    e.preventDefault();
                    e.clipboardData.setData('text/plain', text);
                }
            }
        });

        this.textarea.addEventListener('cut', (e) => {
            if (this.isReadOnly()) {
                e.preventDefault();
                return;
            }
            if (this.options.onCut) {
                const text = this.options.onCut();
                if (text && e.clipboardData) {
                    e.preventDefault();
                    e.clipboardData.setData('text/plain', text);
                }
            }
        });
    }

    updatePosition(x, y) {
        this.textarea.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    focus() {
        this.textarea.focus();
    }
}