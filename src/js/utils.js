/**
 * hideko-lite-editor
 *
 * @author Wirot Chookeaw Chin6700x <Chin6700X@gmail.com>
 * @license MIT License
 */
export const COPY_ICON_SVG =
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
export const CHECK_ICON_SVG =
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

/**
 * Creates a reusable Copy button element with SVG icons and clipboard handler
 * @param {Function|string} getText - callback returning text to copy, or string
 * @returns {HTMLButtonElement}
 */
export function createCopyButton(getText) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hideko-copy-btn";
    btn.setAttribute("aria-label", "Copy code to clipboard");
    btn.innerHTML = `${COPY_ICON_SVG} <span>Copy</span>`;

    btn.onclick = () => {
        const text = typeof getText === "function" ? getText() : getText || "";
        if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard
                .writeText(text)
                .then(() => {
                    btn.innerHTML = `${CHECK_ICON_SVG} <span>Copied!</span>`;
                    btn.classList.add("copied");
                    setTimeout(() => {
                        btn.innerHTML = `${COPY_ICON_SVG} <span>Copy</span>`;
                        btn.classList.remove("copied");
                    }, 2000);
                })
                .catch(() => {});
        }
    };
    return btn;
}
