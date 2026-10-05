/**
 * hideko-lite-editor
 *
 * @author Wirot Chookeaw Chin6700x <Chin6700X@gmail.com>
 * @license MIT License
 */

export type HidekoTheme = 'dark' | 'light' | 'dracula' | 'one-dark' | 'nord' | 'monokai' | 'github-dark' | 'auto';

export interface HidekoConfig {
    debug?: boolean;
    engine?: 'hideko' | 'solo' | 'legacy';
    basePath?: string;
    defaultLang?: string;
    defaultMode?: 'view' | 'edit' | 'inline';
    theme?: HidekoTheme;
    loadMode?: 'lazy' | 'all';
}

export interface LanguageConfiguration {
    comments?: {
        lineComment?: string;
        blockComment?: [string, string];
    };
    brackets?: [string, string][];
    autoClosingPairs?: Array<{
        open: string;
        close: string;
        notIn?: string[];
    }>;
}

export interface LanguageDefinition {
    defaultToken?: string;
    tokenPostfix?: string;
    keywords?: string[];
    operators?: string[];
    symbols?: RegExp | string[];
    escapes?: RegExp;
    tokenizer: {
        root: any[];
        [state: string]: any[];
    };
    [key: string]: any;
}

export interface HighlightResult {
    html: string;
    endStateStack: string[];
    missingLanguages: string[];
}

export interface HidekoEditorOptions {
    value?: string;
    language?: string;
    theme?: HidekoTheme;
    readOnly?: boolean;
    fontSize?: number;
    fontFamily?: string;
    lineHeight?: number;
    tabSize?: number;
    insertSpaces?: boolean;
    lineNumbers?: boolean;
    autoClosingBrackets?: boolean;
}

export declare class HidekoEditor {
    container: HTMLElement;
    gutter: HTMLDivElement;
    contentWrapper: HTMLDivElement;
    textarea: HTMLTextAreaElement;
    pre: HTMLPreElement;
    code: HTMLElement;
    langDef: LanguageDefinition;
    langConf: LanguageConfiguration;
    lines: string[];
    history: any[];
    options: HidekoEditorOptions;

    constructor(containerId: string | HTMLElement, options?: HidekoEditorOptions);

    getText(): string;
    setText(text: string): void;
    getCurrentLine(): number;
    setLanguage(langName: string): Promise<void>;
    loadEmbeddedLanguage(langName: string): Promise<void>;
    handleTab(isShift: boolean): void;
    toggleComment(): void;
    updateActiveGutterLine(): void;
    saveState(): void;
    undo(): void;
    redo(): void;
    destroy(): void;
    estimateMemory(): string;

    // Selection & Position API
    getSelection(): { startLine: number; startCol: number; endLine: number; endCol: number; isCollapsed: boolean };
    setSelection(startLine: number, startCol: number, endLine: number, endCol: number): void;
    selectAll(): void;
    clearSelection(): void;
    selectLine(lineNumber: number): void;
    getSelectedText(): string;
    replaceSelection(newText: string): void;
    insertAtCursor(text: string): void;
    getCursorPosition(): { line: number; col: number };
    setCursorPosition(line: number, col: number): void;
    scrollToLine(lineNumber: number, position?: 'top' | 'center' | 'bottom'): void;
    getLineCount(): number;

    // Options & State API
    setReadOnly(readOnly: boolean): void;
    isReadOnly(): boolean;
    setTabSize(tabSize: number): void;
    getTabSize(): number;
    setLineNumbers(show: boolean): void;
    setFontSize(fontSize: number): void;
    setTheme(theme: string): void;
    getTheme(): string;
    updateOptions(newOptions: Partial<HidekoEditorOptions>): void;
    getOptions(): HidekoEditorOptions;
}

export declare function registerLanguage(langId: string, langDef: LanguageDefinition): void;

export declare function highlight(
    code: string,
    langDef: LanguageDefinition,
    conf?: LanguageConfiguration,
    startStateStack?: string[]
): HighlightResult;

export declare function highlightLines(
    code: string,
    langDef: LanguageDefinition,
    conf?: LanguageConfiguration,
    startStateStack?: string[]
): HighlightResult;

export declare function tokenizeLinesToState(
    lines: string[],
    langDef: LanguageDefinition,
    startStateStack?: string[]
): { endStateStack: string[]; missingLanguages: string[] };

export interface HidekoLibrary {
    config: HidekoConfig;
    loadedLanguages: Map<string, any>;
    languageAliases: Record<string, string>;

    Run(options?: Partial<HidekoConfig>): void;
    setTheme(theme: HidekoTheme): void;
    registerLanguage(langName: string, langDef: LanguageDefinition, conf?: LanguageConfiguration): void;
    loadLanguage(langName: string): Promise<any>;
    detectLanguage(filename: string): string;
    highlightFile(url: string, options?: { lang?: string }): Promise<{ html: string; rawCode: string; lang: string }>;
    loadFile(url: string, options?: { target?: string | HTMLElement; lang?: string; mode?: 'view' | 'edit' | 'inline' }): Promise<HTMLElement>;
    processElement(el: HTMLElement): Promise<void>;
    parseHighlightRanges(rangeStr: string): Set<number>;
}

export declare const Hideko: HidekoLibrary;

export declare const commonLanguages: Record<string, { conf: LanguageConfiguration; language: LanguageDefinition }>;
