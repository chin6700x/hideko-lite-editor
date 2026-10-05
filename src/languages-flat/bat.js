export const conf = {
  comments: { lineComment: "REM" },
  brackets: [ ["{", "}"], ["[", "]"], ["(", ")"] ]
};
export const language = {
  defaultToken: "",
  tokenPostfix: ".bat",
  ignoreCase: true,
  keywords: [ "call", "defined", "echo", "errorlevel", "exist", "for", "goto", "if", "pause", "set", "shift", "start", "title", "not", "pushd", "popd", "rem", "setlocal", "endlocal", "mkdir", "rmdir", "cd", "exit" ],
  tokenizer: {
    root: [
      [/^\s*rem.*$/, "comment"],
      [/[a-zA-Z_]\w*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
      [/%[^%]+%/, "variable"],
      [/%%\w+/, "variable"],
      [/[:][a-zA-Z_]\w*/, "metatag"],
      [/[{}()\[\]]/, "@brackets"],
      [/[=><!~?&|+\-*/\^;\.,]+/, "delimiter"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/[ \t\r\n]+/, ""]
    ]
  }
};
