export const conf = {
  comments: { lineComment: "//", blockComment: ["/*", "*/"] },
  brackets: [ ["{", "}"], ["[", "]"], ["(", ")"] ]
};
export const language = {
  defaultToken: "",
  tokenPostfix: ".kt",
  keywords: [ "abstract", "actual", "annotation", "as", "break", "by", "catch", "class", "companion", "const", "constructor", "continue", "crossinline", "data", "delegate", "do", "dynamic", "else", "enum", "expect", "external", "false", "final", "finally", "for", "fun", "get", "if", "import", "in", "infix", "init", "inline", "inner", "interface", "internal", "is", "lateinit", "noinline", "null", "object", "open", "operator", "out", "override", "package", "private", "protected", "public", "reified", "return", "sealed", "set", "super", "suspend", "tailrec", "this", "throw", "true", "try", "typealias", "typeof", "val", "var", "vararg", "when", "where", "while" ],
  tokenizer: {
    root: [
      [/[a-zA-Z_]\w*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
      [/@[a-zA-Z_]\w*/, "metatag"],
      [/[{}()\[\]]/, "@brackets"],
      [/[=><!~?&|+\-*/\^;\.,:]+/, "delimiter"],
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
