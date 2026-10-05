export const conf = {
  comments: { lineComment: "#" },
  brackets: [ ["{", "}"], ["[", "]"], ["(", ")"] ]
};
export const language = {
  defaultToken: "",
  tokenPostfix: ".r",
  keywords: [ "if", "else", "repeat", "while", "function", "for", "in", "next", "break", "TRUE", "FALSE", "NULL", "Inf", "NaN", "NA", "NA_integer_", "NA_real_", "NA_complex_", "NA_character_" ],
  tokenizer: {
    root: [
      [/[a-zA-Z_]\w*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
      [/[{}()\[\]]/, "@brackets"],
      [/[=><!~?&|+\-*/\^;\.,:]+/, "delimiter"],
      [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
      [/\d+/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string"],
      [/#.*/, "comment"],
      [/[ \t\r\n]+/, ""]
    ]
  }
};
