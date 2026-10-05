export const conf = {
  comments: { lineComment: ";" }
};
export const language = {
  defaultToken: "",
  tokenPostfix: ".ini",
  tokenizer: {
    root: [
      [/^[ \t]*[;#].*$/, "comment"],
      [/^\[[^\]]*\]/, "metatag"],
      [/^([\w\.\-]+)(\s*=\s*)(.*)$/, ["keyword", "", "string"]],
      [/[ \t\r\n]+/, ""]
    ]
  }
};
