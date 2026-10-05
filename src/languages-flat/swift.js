export const conf = {
  comments: { lineComment: "//", blockComment: ["/*", "*/"] },
  brackets: [ ["{", "}"], ["[", "]"], ["(", ")"] ],
  autoClosingPairs: [ { open: "{", close: "}" }, { open: "[", close: "]" }, { open: "(", close: ")" }, { open: '"', close: '"' } ]
};
export const language = {
  defaultToken: "",
  tokenPostfix: ".swift",
  keywords: [
    "class", "deinit", "enum", "extension", "func", "import", "init", "internal", "let", "operator", "private", "protocol", "public", "static", "struct", "subscript", "typealias", "var",
    "break", "case", "continue", "default", "defer", "do", "else", "fallthrough", "for", "guard", "if", "in", "repeat", "return", "switch", "where", "while",
    "as", "catch", "dynamicType", "false", "is", "nil", "rethrows", "super", "self", "Self", "throw", "throws", "true", "try", "_", "print", "actor", "async", "await"
  ],
  tokenizer: {
    root: [
      [/[a-zA-Z_]\w*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
      [/[{}()\[\]]/, "@brackets"],
      [/[=><!~?:&|+\-*/\^%]+/, "delimiter"],
      [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
      [/0[xX][0-9a-fA-F]+/, "number.hex"],
      [/\d+/, "number"],
      [/[;,.]/, "delimiter"],
      [/"([^"\\]|\\.)*"/, "string"],
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
