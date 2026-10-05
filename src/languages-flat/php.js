export const conf = {
  comments: { lineComment: "//", blockComment: ["/*", "*/"] },
  brackets: [ ["{", "}"], ["[", "]"], ["(", ")"] ]
};
export const language = {
  defaultToken: "",
  tokenPostfix: ".php",
  ignoreCase: true,
  keywords: [ "abstract", "and", "array", "as", "break", "callable", "case", "catch", "class", "clone", "const", "continue", "declare", "default", "die", "do", "echo", "else", "elseif", "empty", "enddeclare", "endfor", "endforeach", "endif", "endswitch", "endwhile", "eval", "exit", "extends", "final", "finally", "fn", "for", "foreach", "function", "global", "goto", "if", "implements", "include", "include_once", "instanceof", "insteadof", "interface", "isset", "list", "match", "namespace", "new", "or", "print", "private", "protected", "public", "require", "require_once", "return", "static", "switch", "throw", "trait", "try", "unset", "use", "var", "while", "xor", "yield" ],
  tokenizer: {
    root: [
      [/<\?php/, "metatag"],
      [/<\?/, "metatag"],
      [/\?>/, "metatag"],
      [/[a-zA-Z_]\w*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
      [/\$[a-zA-Z_]\w*/, "variable"],
      [/[{}()\[\]]/, "@brackets"],
      [/[=><!~?&|+\-*/\^;\.,]+/, "delimiter"],
      [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
      [/0[xX][0-9a-fA-F]+/, "number.hex"],
      [/\d+/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string"],
      [/\/\/.*/, "comment"],
      [/\/\*/, "comment", "@comment"],
      [/[ \t\r\n]+/, ""]
    ],
    comment: [
      [/[^\/*]+/, "comment"],
      [/\*\//, "comment", "@pop"],
      [/[\/*]/, "comment"]
    ]
  }
};
