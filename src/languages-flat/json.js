export const conf = {
  comments: {
    lineComment: "//",
    blockComment: ["/*", "*/"]
  },
  brackets: [
    ["{", "}"],
    ["[", "]"]
  ],
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: '"', close: '"', notIn: ["string"] }
  ]
};

export const language = {
  tokenPostfix: ".json",
  keywords: ["true", "false", "null"],
  tokenizer: {
    root: [
      [/"/, { token: "string.quote", next: "@string" }],
      [/[{}[\\]]/, "@brackets"],
      [/[a-z_$][\\w$]*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
      [/-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?/, "number"],
      [/[ \\t\\r\\n]+/, ""],
      [/\/\/.*/, "comment"],
      [/\/\*/, "comment", "@blockcomment"]
    ],
    string: [
      [/[^\\\\"]+/, "string"],
      [/\\\\./, "string.escape"],
      [/"/, { token: "string.quote", next: "@pop" }]
    ],
    blockcomment: [
      [/[^/*]+/, "comment"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"]
    ]
  }
};
