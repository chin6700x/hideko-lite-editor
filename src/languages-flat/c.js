export const conf = {
  comments: { lineComment: "//", blockComment: ["/*", "*/"] },
  brackets: [ ["{", "}"], ["[", "]"], ["(", ")"] ]
};

export const language = {
  defaultToken: "",
  tokenPostfix: ".cpp",
  keywords: [
    "alignas", "alignof", "and", "and_eq", "asm", "atomic_cancel", "atomic_commit",
    "atomic_noexcept", "auto", "bitand", "bitor", "bool", "break", "case", "catch",
    "char", "char8_t", "char16_t", "char32_t", "class", "compl", "concept", "const",
    "consteval", "constexpr", "constinit", "const_cast", "continue", "co_await",
    "co_return", "co_yield", "decltype", "default", "delete", "do", "double",
    "dynamic_cast", "else", "enum", "explicit", "export", "extern", "false",
    "float", "for", "friend", "goto", "if", "inline", "int", "long", "mutable",
    "namespace", "new", "noexcept", "not", "not_eq", "nullptr", "operator", "or",
    "or_eq", "private", "protected", "public", "reflexpr", "register", "reinterpret_cast",
    "requires", "return", "short", "signed", "sizeof", "static", "static_assert",
    "static_cast", "struct", "switch", "synchronized", "template", "this", "thread_local",
    "throw", "true", "try", "typedef", "typeid", "typename", "union", "unsigned",
    "using", "virtual", "void", "volatile", "wchar_t", "while", "xor", "xor_eq",
    "cin", "cout", "endl"
  ],
  types: [
    "int8_t", "int16_t", "int32_t", "int64_t",
    "uint8_t", "uint16_t", "uint32_t", "uint64_t", "uintptr_t", "intptr_t",
    "size_t", "ssize_t", "ptrdiff_t", "time_t", "clock_t", "pid_t",
    "FILE", "DIR", "va_list", "string", "vector", "map", "unordered_map",
    "set", "unordered_set", "queue", "stack", "deque", "pair", "tuple", "std"
  ],
  tokenizer: {
    root: [
      // Comments
      [/\/\/.*/, "comment"],
      [/\/\*/, "comment", "@comment"],

      // Preprocessors & Directives (#include, #define, #ifdef, #pragma)
      [/#[ \t]*include/, "keyword.directive", "@include"],
      [/#[ \t]*[a-zA-Z_]\w*/, "keyword.directive"],
      
      // Lookahead for functions (identifier followed by parenthesis)
      [/[a-zA-Z_]\w*(?=[ \t]*\()/, { cases: { "@keywords": "keyword", "@types": "type", "@default": "function" } }], 

      // ALL_CAPS constants / macros (e.g. WIDTH, HEIGHT, MAX_BUFFER, NULL, EOF)
      [/[A-Z_][A-Z0-9_]{1,}(?!\w)/, "constant"],

      // PascalCase types / structs (e.g. Position, Node, GameState) or types ending in _t
      [/[A-Z][a-zA-Z0-9_]*/, { cases: { "@keywords": "keyword", "@types": "type", "@default": "type" } }],
      [/\b[a-zA-Z_]\w*_t\b/, "type"],
      
      [/[a-zA-Z_]\w*/, { cases: { "@keywords": "keyword", "@types": "type", "@default": "identifier" } }],
      [/[{}()\[\]]/, "@brackets"],
      [/[=><!~?&|+\-*/\^%]+/, "operator"],
      [/[;,.:]+/, "delimiter"],
      [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
      [/0[xX][0-9a-fA-F]+/, "number.hex"],
      [/\d+/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string"],
      [/[ \t\r\n]+/, ""]
    ],
    include: [
      [/[ \t]+/, ""],
      [/<[^>]+>/, "string", "@pop"],
      [/"[^"]+"/, "string", "@pop"],
      [/(?=.)/, "", "@pop"]
    ],
    comment: [
      [/[^\/*]+/, "comment"],
      [/\*\//, "comment", "@pop"],
      [/[\/*]/, "comment"]
    ]
  }
};
