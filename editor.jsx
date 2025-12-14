import React, { useEffect, useRef } from "react";

const RichTextEditor = ({
  value = "",
  onChange,
  placeholder = "Start typing...",
}) => {
  const editorRef = useRef(null);
  const lastValueRef = useRef(undefined);
  const isFocusedRef = useRef(false);

  // 🔒 Sync editor ONLY when NOT typing
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (
      !isFocusedRef.current &&
      value !== lastValueRef.current
    ) {
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

  return (
    <div style={{ border: "1px solid #ccc", borderRadius: 8 }}>
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
        <select onChange={(e) => handleHeading(e.target.value)}>
          <option value="p">Paragraph</option>
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
        </select>

        <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")}>
          <b>B</b>
        </button>

        <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")}>
          <i>I</i>
        </button>

        <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")}>
          • UL
        </button>

        <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertOrderedList")}>
          1. OL
        </button>

        <button onMouseDown={(e) => e.preventDefault()} onClick={handleLink}>
          Link
        </button>

        <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("undo")}>
          Undo
        </button>

        <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("redo")}>
          Redo
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onFocus={() => (isFocusedRef.current = true)}
        onBlur={() => (isFocusedRef.current = false)}
        style={{
          minHeight: 200,
          padding: 16,
          outline: "none",
          whiteSpace: "pre-wrap",
        }}
        data-placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;
