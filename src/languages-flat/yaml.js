export const conf = {
  comments: {
    lineComment: "#"
  },
  brackets: [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"]
  ],
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "'", close: "'" }
  ]
};

export const language = {
  tokenPostfix: ".yaml",
  keywords: ["true", "True", "TRUE", "false", "False", "FALSE", "null", "Null", "NULL", "~"],
  tokenizer: {
    root: [
      [/#.*$/, "comment"],
      [/^[ \\t]*[a-zA-Z0-9_\\-]+[ \\t]*(?=:)/, "type"],
      [/:/, "delimiter"],
      [/"/, { token: "string.quote", next: "@string_double" }],
      [/'/, { token: "string.quote", next: "@string_single" }],
      [/[a-z_$][\\w$]*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
      [/-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?/, "number"],
      [/[ \\t\\r\\n]+/, ""]
    ],
    string_double: [
      [/[^\\\\"]+/, "string"],
      [/\\\\./, "string.escape"],
      [/"/, { token: "string.quote", next: "@pop" }]
    ],
    string_single: [
      [/[^']+/, "string"],
      [/''/, "string.escape"],
      [/'/, { token: "string.quote", next: "@pop" }]
    ]
  }
};
