/**
 * VirtualBuffer — High-Performance In-Memory Line Buffer for Hideko
 * Manages millions of lines with O(1) row editing, zero DOM overhead
 */
export class VirtualBuffer {
    constructor(initialText = '') {
        this.lines = [''];
        this.setText(initialText);
    }

    setText(text) {
        if (!text) {
            this.lines = [''];
            return;
        }
        // Normalize CRLF to LF
        const normalized = text.includes('\r\n') ? text.replace(/\r\n/g, '\n') : text;
        this.lines = normalized.split('\n');
        if (this.lines.length === 0) {
            this.lines = [''];
        }
    }

    getText() {
        return this.lines.join('\n');
    }

    getLine(lineIndex) {
        if (lineIndex < 0 || lineIndex >= this.lines.length) {
            return '';
        }
        return this.lines[lineIndex];
    }

    getLineCount() {
        return this.lines.length;
    }

    getLineLength(lineIndex) {
        const line = this.getLine(lineIndex);
        return line.length;
    }

    /**
     * Insert text at a specific (line, col) position
     * Returns { endLine, endCol } for the new cursor location
     */
    insertText(line, col, str) {
        if (!str) return { endLine: line, endCol: col };

        // Ensure target line exists
        while (this.lines.length <= line) {
            this.lines.push('');
        }

        const currentLine = this.lines[line];
        const safeCol = Math.max(0, Math.min(col, currentLine.length));

        // Single line insertion (fast path)
        if (!str.includes('\n')) {
            this.lines[line] = currentLine.slice(0, safeCol) + str + currentLine.slice(safeCol);
            return {
                endLine: line,
                endCol: safeCol + str.length
            };
        }

        // Multi-line insertion
        const normalized = str.includes('\r\n') ? str.replace(/\r\n/g, '\n') : str;
        const insertLines = normalized.split('\n');
        const prefix = currentLine.slice(0, safeCol);
        const suffix = currentLine.slice(safeCol);

        const firstResultLine = prefix + insertLines[0];
        const lastResultLine = insertLines[insertLines.length - 1] + suffix;
        const middleLines = insertLines.slice(1, insertLines.length - 1);

        const replacement = [firstResultLine, ...middleLines, lastResultLine];
        this.lines.splice(line, 1, ...replacement);

        return {
            endLine: line + insertLines.length - 1,
            endCol: insertLines[insertLines.length - 1].length
        };
    }

    /**
     * Delete range between (startLine, startCol) and (endLine, endCol)
     */
    deleteRange(startLine, startCol, endLine, endCol) {
        if (startLine > endLine || (startLine === endLine && startCol >= endCol)) {
            return { line: startLine, col: startCol };
        }

        startLine = Math.max(0, Math.min(startLine, this.lines.length - 1));
        endLine = Math.max(0, Math.min(endLine, this.lines.length - 1));

        const startText = this.lines[startLine] || '';
        const endText = this.lines[endLine] || '';
        const safeStartCol = Math.max(0, Math.min(startCol, startText.length));
        const safeEndCol = Math.max(0, Math.min(endCol, endText.length));

        if (startLine === endLine) {
            this.lines[startLine] = startText.slice(0, safeStartCol) + startText.slice(safeEndCol);
            return { line: startLine, col: safeStartCol };
        }

        const mergedLine = startText.slice(0, safeStartCol) + endText.slice(safeEndCol);
        const deleteCount = endLine - startLine + 1;
        this.lines.splice(startLine, deleteCount, mergedLine);

        return { line: startLine, col: safeStartCol };
    }

    /**
     * Backspace or Delete single character
     */
    deleteChar(line, col, direction = 'backward') {
        line = Math.max(0, Math.min(line, this.lines.length - 1));
        const currentLine = this.lines[line] || '';

        if (direction === 'backward') {
            if (col > 0) {
                // Delete character before cursor on same line
                this.lines[line] = currentLine.slice(0, col - 1) + currentLine.slice(col);
                return { line, col: col - 1 };
            } else if (line > 0) {
                // Merge current line onto previous line
                const prevLine = this.lines[line - 1];
                const prevLength = prevLine.length;
                this.lines[line - 1] = prevLine + currentLine;
                this.lines.splice(line, 1);
                return { line: line - 1, col: prevLength };
            }
        } else {
            // Forward delete
            if (col < currentLine.length) {
                this.lines[line] = currentLine.slice(0, col) + currentLine.slice(col + 1);
                return { line, col };
            } else if (line < this.lines.length - 1) {
                // Merge next line into current
                const nextLine = this.lines[line + 1];
                this.lines[line] = currentLine + nextLine;
                this.lines.splice(line + 1, 1);
                return { line, col };
            }
        }
        return { line, col };
    }
}
