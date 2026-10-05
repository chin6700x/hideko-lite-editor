export const conf = {
  comments: { lineComment: "--", blockComment: ["--[[", "]]"] },
  brackets: [ ["{", "}"], ["[", "]"], ["(", ")"] ]
};
export const language = {
  defaultToken: "",
  tokenPostfix: ".lua",
  keywords: [ "and", "break", "do", "else", "elseif", "end", "false", "for", "function", "goto", "if", "in", "local", "nil", "not", "or", "repeat", "return", "then", "true", "until", "while" ],
  tokenizer: {
    root: [
      [/[a-zA-Z_]\w*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
      [/[{}()\[\]]/, "@brackets"],
      [/[=><!~?&|+\-*/\^;\.,:]+/, "delimiter"],
      [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
      [/0[xX][0-9a-fA-F]+/, "number.hex"],
      [/\d+/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string"],
      [/--\[\[/, "comment", "@comment"],
      [/--.*/, "comment"],
      [/[ \t\r\n]+/, ""]
    ],
    comment: [
      [/[^\]]+/, "comment"],
      [/\]\]/, "comment", "@pop"],
      [/\]/, "comment"]
    ]
  }
};
