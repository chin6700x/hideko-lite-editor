/**
 * Hideko V8 — Optimized Mini-Monarch Lexer Engine
 * Merged from hideko-solo.js + hideko-engine.js into a single optimized engine.
 *
 * Optimizations applied:
 * 1. Single MonarchLexer class with both tokenizeText() and tokenizeLine()
 * 2. ruleMap.find() → for-loop break (faster matched rule lookup)
 * 3. htmlChunks[] → string concatenation (less GC pressure)
 * 4. mapTokenTypeToClass → cached Map lookup
 * 5. formatTokenHtml → pre-built span prefix cache
 * 6. escapeHtml → single-pass (skip test, direct replace)
 * 7. @variable expansion → short-circuit when no @ present
 * 8. Fixed indentation in tokenize loop + removed dead code
 *
 * @author Wirot Chookeaw Chin6700x <Chin6700X@gmail.com>
 * @license MIT License
 */
// ============================================================
// HTML Escape — Manual char-scan (no regex, fast for short strings)
// ============================================================

function escapeHtml(str) {
    if (!str) return "";
    let out = "";
    let lastIdx = 0;
    for (let i = 0; i < str.length; i++) {
        let esc;
        switch (str.charCodeAt(i)) {
            case 38:
                esc = "&amp;";
                break; // &
            case 60:
                esc = "&lt;";
                break; // <
            case 62:
                esc = "&gt;";
                break; // >
            case 34:
                esc = "&quot;";
                break; // "
            case 39:
                esc = "&#039;";
                break; // '
            default:
                continue;
        }
        if (lastIdx < i) out += str.substring(lastIdx, i);
        out += esc;
        lastIdx = i + 1;
    }
    if (lastIdx === 0) return str; // no escaping needed — return original
    if (lastIdx < str.length) out += str.substring(lastIdx);
    return out;
}

// ============================================================
// Token Type → CSS Class mapping with cache
// ============================================================
const tokenClassCache = new Map();

function mapTokenTypeToClass(type) {
    if (!type || typeof type !== "string") return "";

    let cached = tokenClassCache.get(type);
    if (cached !== undefined) return cached;

    let result;
    if (type.includes("comment")) result = "mtk4";
    else if (type.includes("regexp") || type.includes("escape"))
        result = "mtk14";
    else if (type.includes("string")) result = "mtk7";
    else if (type.includes("constant") || type.includes("boolean"))
        result = "mtk13";
    else if (
        type.includes("directive") ||
        type.includes("metatag") ||
        type.includes("preprocessor") ||
        type.includes("macro")
    )
        result = "mtk15";
    else if (type.includes("keyword")) result = "mtk5";
    else if (type.includes("number")) result = "mtk6";
    else if (type.includes("operator")) result = "mtk12";
    else if (type.includes("tag")) result = "mtk8";
    else if (type.includes("delimiter") || type.includes("bracket"))
        result = "mtk8";
    else if (
        type.includes("type") ||
        type.includes("class") ||
        type.includes("attribute.name")
    )
        result = "mtk9";
    else if (type.includes("function") || type.includes("method"))
        result = "mtk10";
    else if (
        type.includes("variable") ||
        type.includes("identifier") ||
        type.includes("parameter") ||
        type.includes("attribute.value")
    )
        result = "mtk11";
    else result = "mtk1";

    tokenClassCache.set(type, result);
    return result;
}

// ============================================================
// Format Token HTML — Pre-built span prefix cache
// ============================================================
const spanPrefixCache = {};

function formatTokenHtml(type, text) {
    const safeText = escapeHtml(text);
    if (type) {
        let cssClass = mapTokenTypeToClass(type);
        if (cssClass) {
            let prefix = spanPrefixCache[cssClass];
            if (!prefix) {
                prefix = '<span class="' + cssClass + '">';
                spanPrefixCache[cssClass] = prefix;
            }
            return prefix + safeText + "</span>";
        }
    }
    return safeText;
}

// ============================================================
// MonarchLexer — Unified engine (solo + line-by-line)
// ============================================================
class MonarchLexer {
    constructor(langDef) {
        this.langDef = langDef;
        this.tokenizer = langDef.tokenizer || {};
        this.keywords = new Set(
            Array.isArray(langDef.keywords) ? langDef.keywords : [],
        );
        this.types = new Set(Array.isArray(langDef.types) ? langDef.types : []);
        this.compiled = {};

        // Compile all states defined in the tokenizer
        for (let state in this.tokenizer) {
            let rules = this.compileState(state);
            let megaRegexStr = "";
            let ruleMap = [];
            let currentGroup = 1;
            let hasIgnoreCase =
                rules.some((r) => r.ignoreCase) ||
                !!(this.langDef && this.langDef.ignoreCase);
            let flags = "ym" + (hasIgnoreCase ? "i" : "");

            for (let rule of rules) {
                let regexStr = `(${rule.regexStr})`;
                let numGroups = new RegExp(regexStr + "|").exec("").length - 1;

                if (megaRegexStr) megaRegexStr += "|";
                megaRegexStr += regexStr;

                ruleMap.push({
                    groupIndex: currentGroup,
                    numGroups: numGroups,
                    rule: rule,
                });

                currentGroup += numGroups;
            }

            this.compiled[state] = {
                megaRegex: megaRegexStr
                    ? new RegExp(megaRegexStr, flags)
                    : null,
                ruleMap: ruleMap,
            };
        }
    }

    compileState(stateName, visited = new Set()) {
        if (visited.has(stateName)) return [];
        visited.add(stateName);

        const rules = this.tokenizer[stateName] || [];
        let compiledRules = [];

        for (let rule of rules) {
            if (rule.include) {
                const includeState = rule.include.replace(/^@/, "");
                compiledRules.push(...this.compileState(includeState, visited));
            } else if (Array.isArray(rule)) {
                let regex = rule[0];
                let action = rule[1];
                let next = rule[2];

                let actionObj = null;
                let switchTo = null;
                let nextEmbedded = null;
                let processedAction = action;

                if (Array.isArray(action)) {
                    processedAction = action.map((subAction) => {
                        let subGrpNext = null,
                            subGrpSwitch = null,
                            subGrpNextEmb = null,
                            subActToken = subAction;
                        if (
                            typeof subAction === "object" &&
                            subAction !== null
                        ) {
                            subGrpNext = subAction.next || null;
                            subGrpSwitch = subAction.switchTo || null;
                            subGrpNextEmb = subAction.nextEmbedded || null;
                            subActToken = subAction.token;
                        }
                        return {
                            token: subActToken,
                            next: subGrpNext,
                            switchTo: subGrpSwitch,
                            nextEmbedded: subGrpNextEmb,
                        };
                    });
                } else if (
                    typeof action === "object" &&
                    action !== null &&
                    !action.cases
                ) {
                    actionObj = action;
                    if (action.token) {
                        processedAction = action.token;
                    }
                    if (actionObj.next) next = actionObj.next;
                    if (actionObj.switchTo) switchTo = actionObj.switchTo;
                    if (actionObj.nextEmbedded)
                        nextEmbedded = actionObj.nextEmbedded;
                }

                let regexStr = "";
                let flags = "";

                if (typeof regex === "string") {
                    regexStr = regex;
                } else if (regex instanceof RegExp) {
                    regexStr = regex.source;
                    flags = regex.ignoreCase ? "i" : "";
                }

                // Expand @variables in regexStr — short-circuit if no @ present
                if (regexStr.indexOf("@") !== -1) {
                    let expanded = regexStr;
                    let lastExpanded;
                    do {
                        lastExpanded = expanded;
                        expanded = expanded.replace(
                            /@([a-zA-Z0-9_]+)/g,
                            (match, varName) => {
                                if (
                                    this.langDef &&
                                    this.langDef[varName] !== undefined
                                ) {
                                    let val = this.langDef[varName];
                                    if (val instanceof RegExp)
                                        return val.source;
                                    if (Array.isArray(val))
                                        return val.join("|");
                                    return val;
                                }
                                return match;
                            },
                        );
                    } while (expanded !== lastExpanded);
                    regexStr = expanded;
                }

                compiledRules.push({
                    regexStr: regexStr,
                    ignoreCase: flags.includes("i"),
                    action: processedAction,
                    switchTo: switchTo,
                    nextEmbedded: nextEmbedded,
                    next: next,
                });
            }
        }
        return compiledRules;
    }

    resolveAction(action, text) {
        if (typeof action === "string") {
            if (action[0] === "@") return "delimiter"; // fallback for @brackets etc
            return action.replace("$0", text);
        }
        if (action && action.cases) {
            let matchedCase = this.keywords.has(text)
                ? action.cases["@keywords"]
                : this.types.has(text)
                  ? action.cases["@types"] || action.cases["@default"]
                  : action.cases["@default"];
            if (!matchedCase) return "identifier";

            if (typeof matchedCase === "object" && matchedCase.token) {
                return matchedCase.token.replace("$0", text);
            }
            if (typeof matchedCase === "string") {
                return matchedCase.replace("$0", text);
            }
        }
        return "";
    }

    applyNext(
        stateStack,
        nextStr,
        switchToStr,
        nextEmbeddedStr,
        currentStateName,
    ) {
        let len = stateStack.length;
        if (switchToStr) {
            stateStack[len - 1] =
                switchToStr[0] === "@" ? switchToStr.substring(1) : switchToStr;
            currentStateName = stateStack[len - 1];
        }

        let newEmbedded = null;
        if (nextEmbeddedStr && nextEmbeddedStr !== "@pop") {
            newEmbedded = nextEmbeddedStr;
            if (newEmbedded[0] === "$" && newEmbedded[1] === "S") {
                let index = parseInt(newEmbedded.substring(2)) - 1;
                let parts = currentStateName.split(".");
                newEmbedded = parts[index] || newEmbedded;
            }
        }

        if (nextEmbeddedStr === "@pop") {
            let current = stateStack[stateStack.length - 1];
            if (current && current.includes("!emb:")) {
                stateStack[stateStack.length - 1] = current.split("!emb:")[0];
            }
        }

        if (nextStr === "@pop") {
            if (len > 1) stateStack.length = len - 1;
        } else if (nextStr === "@popall") {
            stateStack.length = 1;
        } else if (nextStr && nextStr[0] === "@") {
            let pushState = nextStr.substring(1);
            if (newEmbedded) {
                pushState += "!emb:" + newEmbedded + "|root";
            }
            stateStack[stateStack.length] = pushState;
        } else if (!nextStr && newEmbedded) {
            let current = stateStack[stateStack.length - 1];
            current =
                current.split("!emb:")[0] + "!emb:" + newEmbedded + "|root";
            stateStack[stateStack.length - 1] = current;
        }
    }

    /**
     * Core tokenization loop — shared between tokenizeText() and tokenizeLine().
     * Uses string concatenation for HTML output instead of array + join.
     */
    _tokenizeCore(codeText, stateStack, emitHtml) {
        let index = 0;
        let tokens = [];
        let html = "";
        let missingLanguages = new Set();
        let lastIndexVal = -1;
        let noProgressCount = 0;

        while (index < codeText.length) {
            if (index === lastIndexVal) {
                noProgressCount++;
                if (noProgressCount > 50) {
                    console.error(
                        `Hideko V8: Infinite loop detected at index ${index}, state: ${stateStack[stateStack.length - 1]}. Bailing out.`,
                    );
                    if (emitHtml) html += escapeHtml(codeText.substring(index));
                    break;
                }
            } else {
                lastIndexVal = index;
                noProgressCount = 0;
            }

            let currentTop = stateStack[stateStack.length - 1];
            let currentStateName = currentTop.split("!emb:")[0];
            let rules = this.compiled[currentStateName];

            if (!rules) {
                let base = currentStateName.split(".")[0];
                rules = this.compiled[base] || this.compiled["root"];
            }

            let matched = false;

            if (rules && rules.megaRegex) {
                rules.megaRegex.lastIndex = index;
                let megaMatch = rules.megaRegex.exec(codeText);
                if (megaMatch) {
                    matched = true;
                    let text = megaMatch[0];

                    // Find which rule matched — for-loop with break instead of .find()
                    let matchedRuleDesc = null;
                    for (let i = 0; i < rules.ruleMap.length; i++) {
                        if (
                            megaMatch[rules.ruleMap[i].groupIndex] !== undefined
                        ) {
                            matchedRuleDesc = rules.ruleMap[i];
                            break;
                        }
                    }
                    let rule = matchedRuleDesc.rule;

                    // Reconstruct the match array for the specific rule
                    let match = [text];
                    for (let i = 1; i <= matchedRuleDesc.numGroups; i++) {
                        match.push(
                            megaMatch[matchedRuleDesc.groupIndex + i - 1],
                        );
                    }

                    let subNext = rule.next;
                    let switchTo = rule.switchTo;
                    let nextEmbedded = rule.nextEmbedded;

                    if (switchTo) {
                        switchTo = switchTo.replace(
                            /\$(\d+)/g,
                            (m, d) => match[parseInt(d) + 1] || "",
                        );
                    }
                    if (nextEmbedded) {
                        nextEmbedded = nextEmbedded.replace(
                            /\$(\d+)/g,
                            (m, d) => match[parseInt(d) + 1] || "",
                        );
                    }

                    if (Array.isArray(rule.action)) {
                        // Group action — each capture group has its own action
                        for (let i = 0; i < rule.action.length; i++) {
                            let groupText = match[i + 2];
                            if (
                                groupText !== undefined &&
                                groupText.length > 0
                            ) {
                                let subActionObj = rule.action[i];
                                let tokenType = this.resolveAction(
                                    subActionObj.token,
                                    groupText,
                                );
                                if (tokenType !== "@rematch") {
                                    if (emitHtml)
                                        html += formatTokenHtml(
                                            tokenType,
                                            groupText,
                                        );
                                    else
                                        tokens[tokens.length] = {
                                            type: tokenType,
                                            text: groupText,
                                        };
                                }
                                this.applyNext(
                                    stateStack,
                                    subActionObj.next,
                                    subActionObj.switchTo,
                                    subActionObj.nextEmbedded,
                                    currentStateName,
                                );
                            }
                        }
                    } else {
                        // Single action
                        let tokenType = this.resolveAction(rule.action, text);
                        if (tokenType === "@rematch") {
                            text = "";
                        } else {
                            if (currentTop.includes("!emb:")) {
                                let parts = currentTop.split("!emb:");
                                let baseState = parts[0];
                                let embParts = parts[1].split("|");
                                let mimeType = embParts[0];
                                let embStack = embParts.slice(1);

                                let langId = resolveMimeType(mimeType);
                                let embLexer = getLexer(langId);

                                if (embLexer) {
                                    let embResult = embLexer.tokenizeLine(
                                        text,
                                        embStack,
                                        emitHtml,
                                    );
                                    if (emitHtml) html += embResult.html;
                                    else tokens.push(...embResult.tokens);
                                    let newEmbStack = embResult.endStateStack;
                                    stateStack[stateStack.length - 1] =
                                        baseState +
                                        "!emb:" +
                                        mimeType +
                                        "|" +
                                        newEmbStack.join("|");
                                } else {
                                    if (emitHtml)
                                        html += formatTokenHtml(
                                            tokenType,
                                            text,
                                        );
                                    else
                                        tokens[tokens.length] = {
                                            type: tokenType,
                                            text: text,
                                        };
                                    missingLanguages.add(langId);
                                }
                            } else {
                                if (emitHtml)
                                    html += formatTokenHtml(tokenType, text);
                                else
                                    tokens[tokens.length] = {
                                        type: tokenType,
                                        text: text,
                                    };
                            }
                        }
                        this.applyNext(
                            stateStack,
                            subNext,
                            switchTo,
                            nextEmbedded,
                            currentStateName,
                        );
                    }

                    // Advance index
                    if (text.length === 0) {
                        let topAfter = stateStack[stateStack.length - 1];
                        if (topAfter === currentTop) {
                            index++;
                        }
                    } else {
                        index += text.length;
                    }
                }
            }

            if (!matched) {
                if (emitHtml) html += escapeHtml(codeText[index]);
                else
                    tokens[tokens.length] = {
                        type: "",
                        text: codeText[index],
                    };
                index++;
            }
        }

        if (emitHtml)
            return {
                html,
                endStateStack: stateStack,
                missingLanguages: Array.from(missingLanguages),
            };
        return {
            tokens,
            endStateStack: stateStack,
            missingLanguages: Array.from(missingLanguages),
        };
    }

    /**
     * Tokenize an entire code block at once (used by solo highlight).
     * Uses multiline-capable mega regex.
     */
    tokenizeText(codeText, emitHtml = false) {
        let stateStack = ["root"];
        return this._tokenizeCore(codeText, stateStack, emitHtml);
    }

    /**
     * Tokenize a single line (used by editor for line-by-line state tracking).
     */
    tokenizeLine(line, startStateStack, emitHtml = false) {
        let stateStack = [...startStateStack];
        if (stateStack.length === 0) stateStack = ["root"];
        return this._tokenizeCore(line, stateStack, emitHtml);
    }
}

// ============================================================
// Global cache for compiled lexers
// ============================================================
const lexerCache = new Map();

function resolveMimeType(mime) {
    if (!mime) return "javascript";
    const m = mime.toLowerCase();
    if (
        m.includes("javascript") ||
        m.includes("ecmascript") ||
        m === "module" ||
        m === "js"
    )
        return "javascript";
    if (m.includes("typescript") || m === "ts") return "typescript";
    if (m.includes("css")) return "css";
    if (m.includes("json")) return "json";
    if (m.includes("html")) return "html";
    if (m.includes("python") || m === "py") return "python";
    if (m.includes("markdown") || m === "md") return "markdown";
    if (m.includes("sql")) return "sql";
    if (m.includes("shell") || m === "bash" || m === "sh") return "shell";
    if (m.includes("c++") || m === "cpp") return "cpp";
    if (m === "c" || m === "h") return "c";
    return m;
}

export function registerLanguage(langId, langDef) {
    if (!langDef) return;
    let lexer = new MonarchLexer(langDef);
    lexerCache.set(langId.toLowerCase(), lexer);
    if (langDef.tokenPostfix) {
        lexerCache.set(langDef.tokenPostfix.toLowerCase(), lexer);
    }
}

function getLexer(langDefOrId) {
    if (!langDefOrId) return null;
    if (typeof langDefOrId === "string") {
        let cleanId = langDefOrId.toLowerCase();
        let name = cleanId.startsWith(".") ? cleanId : "." + cleanId;
        return lexerCache.get(name) || lexerCache.get(cleanId) || null;
    }
    if (!langDefOrId.tokenizer) return null;
    let langName = (langDefOrId.tokenPostfix || "unknown").toLowerCase();
    let lexer = lexerCache.get(langName);
    if (!lexer) {
        lexer = new MonarchLexer(langDefOrId);
        lexerCache.set(langName, lexer);
    }
    return lexer;
}

// ============================================================
// Public API — highlight (solo / bulk mode)
// ============================================================

/**
 * Highlights a block of code using the solo tokenizer (whole-text at once).
 * This is the fastest path for static highlighting.
 */
export function highlight(code, langDef, conf, startStateStack) {
    let lexer = getLexer(langDef);
    if (!lexer) {
        return {
            html: escapeHtml(code),
            endStateStack: startStateStack || ["root"],
            missingLanguages: [],
        };
    }

    let result = lexer.tokenizeText(code, true);
    return {
        html: result.html,
        endStateStack: result.endStateStack,
        missingLanguages: result.missingLanguages,
    };
}

// ============================================================
// Public API — tokenizeLinesToState (editor state caching)
// ============================================================

/**
 * Fast path to calculate the state stack at the end of a block of lines.
 * Used by the editor for State Caching without HTML string allocation.
 */
export function tokenizeLinesToState(
    lines,
    langDef,
    startStateStack = ["root"],
) {
    let lexer = getLexer(langDef);
    if (!lexer)
        return {
            endStateStack: startStateStack,
            missingLanguages: [],
        };

    let currentStateStack = [...startStateStack];
    let allMissingLanguages = new Set();
    for (let i = 0; i < lines.length; i++) {
        let result = lexer.tokenizeLine(lines[i], currentStateStack);
        currentStateStack = result.endStateStack;
        if (result.missingLanguages) {
            result.missingLanguages.forEach((l) => allMissingLanguages.add(l));
        }
    }
    return {
        endStateStack: currentStateStack,
        missingLanguages: Array.from(allMissingLanguages),
    };
}

// ============================================================
// Public API — highlightLines (editor line-by-line with state)
// ============================================================

/**
 * Highlights code line-by-line, maintaining state across lines.
 * Used by the editor for viewport rendering.
 */
export function highlightLines(
    code,
    langDef,
    conf,
    startStateStack = ["root"],
) {
    let lexer = getLexer(langDef);
    if (!lexer) {
        return {
            html: escapeHtml(code),
            endStateStack: startStateStack,
            missingLanguages: [],
        };
    }

    let htmlParts = [];
    let currentStateStack = [...startStateStack];
    let allMissingLanguages = new Set();

    let lastIndex = 0;
    while (lastIndex <= code.length) {
        let nextIndex = code.indexOf("\n", lastIndex);
        let line =
            nextIndex === -1
                ? code.substring(lastIndex)
                : code.substring(lastIndex, nextIndex);

        let result = lexer.tokenizeLine(line, currentStateStack, true);
        currentStateStack = result.endStateStack;

        if (result.missingLanguages) {
            for (let lang of result.missingLanguages) {
                allMissingLanguages.add(lang);
            }
        }

        htmlParts[htmlParts.length] = result.html || "&#8203;";

        if (nextIndex === -1) break;
        lastIndex = nextIndex + 1;
    }

    return {
        html: htmlParts.join("\n"),
        endStateStack: currentStateStack,
        missingLanguages: Array.from(allMissingLanguages),
    };
}

/**
 * Highlights an array of line strings directly, returning both HTML and line-by-line states.
 * Guarantees zero-width space on empty lines to prevent browser <pre> newline collapse.
 */
export function highlightLineArray(
    lines,
    langDef,
    conf,
    startStateStack = ["root"],
) {
    let lexer = getLexer(langDef);
    let htmlParts = [];
    let lineStates = [];
    let currentStateStack = [...startStateStack];
    if (currentStateStack.length === 0) currentStateStack = ["root"];
    let allMissingLanguages = new Set();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!lexer) {
            htmlParts.push(escapeHtml(line) || "&#8203;");
            lineStates.push(currentStateStack);
            continue;
        }

        let result = lexer.tokenizeLine(line, currentStateStack, true);
        currentStateStack = result.endStateStack;

        if (result.missingLanguages) {
            for (let lang of result.missingLanguages) {
                allMissingLanguages.add(lang);
            }
        }

        htmlParts[htmlParts.length] = result.html || "&#8203;";
        lineStates[lineStates.length] = currentStateStack;
    }

    return {
        html: htmlParts.join("\n"),
        endStateStack: currentStateStack,
        lineStates,
        missingLanguages: Array.from(allMissingLanguages),
    };
}

export { getLexer };
