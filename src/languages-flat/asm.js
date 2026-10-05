export const conf = {
  comments: {
    lineComment: ";"
  },
  brackets: [
    ["[", "]"],
    ["(", ")"]
  ],
  autoClosingPairs: [
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"', notIn: ["string"] },
    { open: "'", close: "'", notIn: ["string"] }
  ]
};

export const language = {
  tokenPostfix: ".asm",
  ignoreCase: true,
  keywords: [
    "mov", "add", "sub", "cmp", "jmp", "je", "jne", "jg", "jl", "jge", "jle",
    "call", "ret", "push", "pop", "inc", "dec", "mul", "div", "and", "or", "xor", "not",
    "shl", "shr", "lea", "nop", "int", "syscall"
  ],
  registers: [
    "eax", "ebx", "ecx", "edx", "esi", "edi", "ebp", "esp",
    "rax", "rbx", "rcx", "rdx", "rsi", "rdi", "rbp", "rsp",
    "r8", "r9", "r10", "r11", "r12", "r13", "r14", "r15",
    "al", "ah", "bl", "bh", "cl", "ch", "dl", "dh"
  ],
  tokenizer: {
    root: [
      [/;.*$/, "comment"],
      [/[a-zA-Z_][\\w]*:/, "type.identifier"], // Labels
      [/\\.[a-zA-Z_][\\w]*/, "keyword.directive"], // Directives like .data, .text
      [/[a-zA-Z_][\\w]*/, {
        cases: {
          "@keywords": "keyword",
          "@registers": "type",
          "@default": "identifier"
        }
      }],
      [/"/, { token: "string.quote", next: "@string" }],
      [/'/, { token: "string.quote", next: "@string_single" }],
      [/0[xX][0-9a-fA-F]+/, "number.hex"],
      [/0[bB][01]+/, "number.binary"],
      [/[0-9]+/, "number"],
      [/[ \\t\\r\\n]+/, ""]
    ],
    string: [
      [/[^\\\\"]+/, "string"],
      [/\\\\./, "string.escape"],
      [/"/, { token: "string.quote", next: "@pop" }]
    ],
    string_single: [
      [/[^\\\\']+/, "string"],
      [/\\\\./, "string.escape"],
      [/'/, { token: "string.quote", next: "@pop" }]
    ]
  }
};
