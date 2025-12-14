import React, { useEffect, useRef } from "react";

const RichTextEditor = ({
    value = "",
    onChange,
    placeholder = "Start typing...",
}) => {
    const editorRef = useRef(null);
    const lastValueRef = useRef(undefined);
    const isFocusedRef = useRef(false);

    // Sync editor ONLY when NOT typing
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        if (!isFocusedRef.current && value !== lastValueRef.current) {
            editor.innerHTML = value || "";
            lastValueRef.current = value;
        }
    }, [value]);

    const exec = (command, arg = null) => {
        editorRef.current.focus();
        document.execCommand(command, false, arg);
        onChange?.(editorRef.current.innerHTML);
    };

    const handleInput = () => {
        const html = editorRef.current.innerHTML;
        lastValueRef.current = html; // prevent re-sync
        onChange?.(html);
    };

    const handleHeading = (tag) => {
        exec("formatBlock", tag);
    };

    const handleLink = () => {
        const url = prompt("Enter URL");
        if (url) exec("createLink", url);
    };

    // Clean pasted content: keep only tags, remove all attributes
    const handlePaste = (e) => {
        e.preventDefault();
        const clipboardData = e.clipboardData || window.clipboardData;
        const text = clipboardData.getData("text/html") || clipboardData.getData("text/plain");

        // Create a temporary container
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = text;

        // Recursive function to remove attributes
        const cleanNode = (node) => {
            if (node.nodeType === 1) {
                // Remove all attributes
                [...node.attributes].forEach(attr => node.removeAttribute(attr.name));
                // Process children
                node.childNodes.forEach(cleanNode);
            }
        };
        tempDiv.childNodes.forEach(cleanNode);

        // Insert sanitized HTML at cursor
        insertHtmlAtCursor(tempDiv.innerHTML);
    };

    const insertHtmlAtCursor = (html) => {
        let sel, range;
        if (window.getSelection) {
            sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                range = sel.getRangeAt(0);
                range.deleteContents();

                const el = document.createElement("div");
                el.innerHTML = html;
                const frag = document.createDocumentFragment();
                let node, lastNode;
                while ((node = el.firstChild)) {
                    lastNode = frag.appendChild(node);
                }
                range.insertNode(frag);

                // Move the selection to the end
                if (lastNode) {
                    range = range.cloneRange();
                    range.setStartAfter(lastNode);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        }
        handleInput(); // Update value
    };

    return (
        <div style={{ border: "1px solid #ccc", borderRadius: 8, overflow: 'hidden' }}>
            {/* Toolbar */}
            <div
                style={{
                    padding: 8,
                    background: "#f5f5f5",
                    borderBottom: "1px solid #ccc",
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                }}
            >
                <s-stack direction="inline" gap="small-400">
                    <s-box>
                        <s-select onChange={(e) => handleHeading(e.target.value)} labelAccessibilityVisibility="exclusive">
                            <s-option value="p">Paragraph</s-option>
                            <s-option value="h1">Heading 1</s-option>
                            <s-option value="h2">Heading 2</s-option>
                            <s-option value="h3">Heading 3</s-option>
                        </s-select>
                    </s-box>

                    <s-button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")}>
                        <b>B</b>
                    </s-button>

                    <s-button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")}>
                        <i>I</i>
                    </s-button>

                    <s-button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")}>
                        • UL
                    </s-button>

                    <s-button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertOrderedList")}>
                        1. OL
                    </s-button>

                    <s-button onMouseDown={(e) => e.preventDefault()} onClick={handleLink}>
                        Link
                    </s-button>

                    <s-button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("undo")}>
                        Undo
                    </s-button>

                    <s-button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("redo")}>
                        Redo
                    </s-button>
                </s-stack>
            </div>

            {/* Editor */}
            <div
                className="customEditorContent"
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onFocus={() => (isFocusedRef.current = true)}
                onBlur={() => (isFocusedRef.current = false)}
                onPaste={handlePaste}
                style={{
                    minHeight: 200,
                    padding: 16,
                    outline: "none",
                    whiteSpace: "pre-wrap",
                    maxHeight: "250px", overflow: "auto"
                }}
                data-placeholder={placeholder}
            />
        </div>
    );
};

export default RichTextEditor;
