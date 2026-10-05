export const conf = {
  comments: { blockComment: ["<!--", "-->"] },
  brackets: [["<", ">"]],
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: "<", close: ">" }
  ]
};

export const language = {
  defaultToken: "",
  tokenPostfix: ".html",
  ignoreCase: true,
  tokenizer: {
    root: [
      [/<!DOCTYPE.*?>/i, "metatag"],
      [/<!--/, "comment", "@comment"],
      // Embedded CSS via <style>
      [/(<)(style)/i, ["delimiter", { token: "tag", next: "@styleAfterTag" }]],
      // Embedded JavaScript via <script>
      [/(<)(script)/i, ["delimiter", { token: "tag", next: "@scriptAfterTag" }]],
      // Closing tag: </tag>
      [/(<\/)([\w\-]+)(\s*)(>)/i, ["delimiter", "tag", "", "delimiter"]],
      [/(<\/)([\w\-]+)/i, ["delimiter", { token: "tag", next: "@tag" }]],
      // Opening tag: <tag
      [/(<)([\w\-]+)/i, ["delimiter", { token: "tag", next: "@tag" }]],
      [/(<\?)/, "metatag"],
      [/&[a-zA-Z0-9#]+;/, "string.escape"],
      [/[^<>&]+/, ""]
    ],

    tag: [
      [/[ \t\r\n]+/, ""],
      [/([\w\-]+)(\s*=\s*)("[^"]*"|'[^']*')/i, ["attribute.name", "delimiter", "attribute.value"]],
      [/([\w\-]+)(\s*=\s*)/i, ["attribute.name", "delimiter"]],
      [/[\w\-]+/i, "attribute.name"],
      [/\/>/, "delimiter", "@pop"],
      [/>/, "delimiter", "@pop"]
    ],

    styleAfterTag: [
      [/[ \t\r\n]+/, ""],
      [/([\w\-]+)(\s*=\s*)("[^"]*"|'[^']*')/i, ["attribute.name", "delimiter", "attribute.value"]],
      [/[\w\-]+/i, "attribute.name"],
      [/\/>/, "delimiter", "@pop"],
      [/>/, { token: "delimiter", switchTo: "@embeddedStyle", nextEmbedded: "text/css" }]
    ],

    embeddedStyle: [
      [/[^<]+/, ""],
      [/<\/style\s*>/i, { token: "@rematch", next: "@pop", nextEmbedded: "@pop" }],
      [/</, ""]
    ],

    scriptAfterTag: [
      [/[ \t\r\n]+/, ""],
      [/(type)(\s*=\s*)(")([^"]+)(")/i, ["attribute.name", "delimiter", "attribute.value", { token: "attribute.value", switchTo: "@scriptWithCustomType.$4" }, "attribute.value"]],
      [/(type)(\s*=\s*)(')([^']+)(')/i, ["attribute.name", "delimiter", "attribute.value", { token: "attribute.value", switchTo: "@scriptWithCustomType.$4" }, "attribute.value"]],
      [/([\w\-]+)(\s*=\s*)("[^"]*"|'[^']*')/i, ["attribute.name", "delimiter", "attribute.value"]],
      [/[\w\-]+/i, "attribute.name"],
      [/\/>/, "delimiter", "@pop"],
      [/>/, { token: "delimiter", switchTo: "@embeddedScript", nextEmbedded: "text/javascript" }]
    ],

    scriptWithCustomType: [
      [/[ \t\r\n]+/, ""],
      [/([\w\-]+)(\s*=\s*)("[^"]*"|'[^']*')/i, ["attribute.name", "delimiter", "attribute.value"]],
      [/[\w\-]+/i, "attribute.name"],
      [/\/>/, "delimiter", "@pop"],
      [/>/, { token: "delimiter", switchTo: "@embeddedScript", nextEmbedded: "$S2" }]
    ],

    embeddedScript: [
      [/[^<]+/, ""],
      [/<\/script\s*>/i, { token: "@rematch", next: "@pop", nextEmbedded: "@pop" }],
      [/</, ""]
    ],

    comment: [
      [/-->/, "comment", "@pop"],
      [/[^<\-]+/, "comment"],
      [/./, "comment"]
    ]
  }
};

export default { conf, language };
