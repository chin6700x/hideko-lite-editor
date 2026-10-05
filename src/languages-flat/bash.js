export const language = {
    tokenizer: {
        root: [
            [/^#.*/, 'comment'],
            [/\b(npm|git|echo|ls|cd|pwd|mkdir|rm|cp|mv|sudo|apt|brew|yarn|pnpm|export|set|source)\b/, 'keyword'],
            [/\b(install|remove|update|add|init|run|start|build|test|commit|push|pull)\b/, 'identifier'],
            [/--[a-zA-Z0-9_-]+/, 'attribute.name'],
            [/-[a-zA-Z0-9]+/, 'attribute.name'],
            [/"([^"\\]|\\.)*"/, 'string'],
            [/'([^'\\]|\\.)*'/, 'string'],
        ]
    }
};

export const conf = {
    comments: {
        lineComment: '#'
    }
};
