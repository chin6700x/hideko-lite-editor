export const conf = {
  comments: { lineComment: "#", blockComment: ["<#", "#>"] },
  brackets: [ ["{", "}"], ["[", "]"], ["(", ")"] ]
};
export const language = {
  defaultToken: "",
  tokenPostfix: ".ps1",
  ignoreCase: true,
  keywords: [ "begin", "break", "catch", "class", "continue", "data", "define", "do", "dynamicparam", "else", "elseif", "end", "exit", "filter", "finally", "for", "foreach", "from", "function", "if", "in", "param", "process", "return", "switch", "throw", "trap", "try", "until", "using", "var", "while", "workflow", "parallel", "sequence", "inlinescript", "configuration" ],
  tokenizer: {
    root: [
      [/[a-zA-Z_\-][\w\-]*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
      [/\$[a-zA-Z_\-][\w\-]*/, "variable"],
      [/[{}()\[\]]/, "@brackets"],
      [/[=><!~?&|+\-*/\^;\.,]+/, "delimiter"],
      [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
      [/0[xX][0-9a-fA-F]+/, "number.hex"],
      [/\d+/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string"],
      [/#.*/, "comment"],
      [/<#/, "comment", "@comment"],
      [/[ \t\r\n]+/, ""]
    ],
    comment: [
      [/[^<#]+/, "comment"],
      [/#>/, "comment", "@pop"],
      [/[<#]/, "comment"]
    ]
  }
};
