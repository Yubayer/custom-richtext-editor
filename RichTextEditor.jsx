import { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import "./RichTextEditor.css";

/**
 * @typedef {Object} FeatureFlags
 * @property {boolean} [headings=true]       - Block format dropdown (Paragraph / H1–H4 / Preformat)
 * @property {boolean} [fontFamily=true]     - Font family picker
 * @property {boolean} [fontSize=true]       - Font size picker (XS → 3X)
 * @property {boolean} [bold=true]           - Bold — Ctrl+B
 * @property {boolean} [italic=true]         - Italic — Ctrl+I
 * @property {boolean} [underline=true]      - Underline — Ctrl+U
 * @property {boolean} [strikethrough=true]  - Strikethrough
 * @property {boolean} [textColor=true]      - Foreground color picker
 * @property {boolean} [highlight=true]      - Background highlight picker
 * @property {boolean} [superscript=true]    - Superscript (x²); click again while inside to exit
 * @property {boolean} [subscript=true]      - Subscript (x₂); click again while inside to exit
 * @property {boolean} [unorderedList=true]  - Bullet list
 * @property {boolean} [orderedList=true]    - Numbered list
 * @property {boolean} [align=true]          - Left / Center / Right / Justify
 * @property {boolean} [indent=true]         - Indent & outdent
 * @property {boolean} [link=true]           - Insert link; click existing link → inline edit/remove popup
 * @property {boolean} [table=true]          - Insert table modal (max 20 rows × 12 cols)
 * @property {boolean} [image=true]          - Insert image (URL or upload); supports resize & drag-move
 * @property {boolean} [imageUpload=true]    - Upload tab inside image modal (requires image: true)
 * @property {boolean} [codeBlock=true]      - Insert a <pre><code> block
 * @property {boolean} [blockquote=true]     - Wrap paragraph in <blockquote>
 * @property {boolean} [hr=true]             - Insert horizontal rule
 * @property {boolean} [undo=true]           - Undo — Ctrl+Z
 * @property {boolean} [redo=true]           - Redo — Ctrl+Y
 * @property {boolean} [clearFormat=true]    - Strip all inline formatting from selection
 * @property {boolean} [wordCount=true]      - Live word count in footer
 * @property {boolean} [charCount=false]     - Live character count in footer (off by default)
 * @property {boolean} [codeView=true]       - Toggle raw HTML source textarea; other buttons disabled while active
 */

/**
 * @typedef {Object} EditorConfig
 * @property {string}      [placeholder="Start writing..."] - Empty-state placeholder text.                    e.g. "Write your article…"
 * @property {number}      [height=450]                     - Fixed content height in px (ignored when min/maxHeight set). e.g. 600
 * @property {number|null} [minHeight=null]                 - Min content height in px; editor grows with content. e.g. 200
 * @property {number|null} [maxHeight=null]                 - Max content height in px; scrolls beyond this.    e.g. 800
 * @property {string}      [width="100%"]                   - CSS width of the wrapper — any valid CSS value.   e.g. "860px"
 * @property {string}      [defaultValue=""]                - HTML set once on mount (static template/default). e.g. "<p>Hello</p>"
 * @property {FeatureFlags}[features]                       - Toggle individual toolbar features on/off.        e.g. { table: false, charCount: true }
 */

/**
 * Full default config — import and spread to build on top of it.
 * @type {EditorConfig}
 * @example
 * import { DEFAULT_CONFIG } from "./RichTextEditor";
 * const cfg = { ...DEFAULT_CONFIG, height: 600, features: { ...DEFAULT_CONFIG.features, charCount: true } };
 */
export const DEFAULT_CONFIG = {
    placeholder: "Start writing...",
    height: 450,
    minHeight: null,
    maxHeight: null,
    width: "100%",
    defaultValue: "",
    features: {
        headings: true,
        fontFamily: true,
        fontSize: true,
        bold: true,
        italic: true,
        underline: true,
        strikethrough: true,
        textColor: true,
        highlight: true,
        superscript: true,
        subscript: true,
        unorderedList: true,
        orderedList: true,
        align: true,
        indent: true,
        link: true,
        table: true,
        image: true,
        imageUpload: true,
        codeBlock: true,
        blockquote: true,
        hr: true,
        undo: true,
        redo: true,
        clearFormat: true,
        wordCount: true,
        charCount: false,
        codeView: true,
    },
};

// ─── Height style helper ───────────────────────────────────────────────────────
function contentHeightStyle(cfg) {
    if (cfg.minHeight || cfg.maxHeight) {
        return {
            minHeight: cfg.minHeight ? `${cfg.minHeight}px` : undefined,
            maxHeight: cfg.maxHeight ? `${cfg.maxHeight}px` : undefined,
            overflowY: cfg.maxHeight ? "auto" : "visible",
        };
    }
    return { height: `${cfg.height}px`, overflowY: "auto" };
}

// ─── Portal ────────────────────────────────────────────────────────────────────
function Portal({ children }) {
    if (typeof document === "undefined") return null;
    return createPortal(children, document.body);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODALS
// ═══════════════════════════════════════════════════════════════════════════════

function TableModal({ onInsert, onClose }) {
    const [rows, setRows] = useState(2);
    const [cols, setCols] = useState(2);
    return (
        <Portal>
            <div className="jhrte-overlay-v1" onClick={onClose}>
                <div className="jhrte-modal-v1" onClick={(e) => e.stopPropagation()}>
                    <div className="jhrte-modal-title-v1">Insert Table</div>
                    {[["Rows", rows, setRows, 20], ["Columns", cols, setCols, 12]].map(([label, val, set, max]) => (
                        <div key={label} className="jhrte-modal-row-v1">
                            <label className="jhrte-modal-label-v1">{label}</label>
                            <div className="jhrte-counter-v1">
                                <button className="jhrte-counter-btn-v1" onClick={() => set(Math.max(1, val - 1))}>−</button>
                                <span className="jhrte-counter-val-v1">{val}</span>
                                <button className="jhrte-counter-btn-v1" onClick={() => set(Math.min(max, val + 1))}>+</button>
                            </div>
                        </div>
                    ))}
                    <div className="jhrte-preview-grid-v1">
                        {Array.from({ length: Math.min(rows, 5) }).map((_, r) => (
                            <div key={r} className="jhrte-preview-row-v1">
                                {Array.from({ length: Math.min(cols, 7) }).map((_, c) => (
                                    <div key={c} className="jhrte-preview-cell-v1" />
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="jhrte-modal-actions-v1">
                        <button className="jhrte-modal-cancel-v1" onClick={onClose}>Cancel</button>
                        <button className="jhrte-modal-confirm-v1" onClick={() => { onInsert(rows, cols); onClose(); }}>
                            Insert {rows}×{cols}
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}

function ImageModal({ onInsert, onClose }) {
    const [tab, setTab] = useState("url");
    const [url, setUrl] = useState("");
    const [width, setWidth] = useState(300);
    const fileRef = useRef();

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => { setUrl(ev.target.result); setTab("url"); };
        reader.readAsDataURL(file);
    };

    return (
        <Portal>
            <div className="jhrte-overlay-v1" onClick={onClose}>
                <div className="jhrte-modal-v1" onClick={(e) => e.stopPropagation()}>
                    <div className="jhrte-modal-title-v1">Insert Image</div>
                    <div className="jhrte-tabs-v1">
                        {["url", "upload"].map((t) => (
                            <button key={t} className={`jhrte-tab-v1${tab === t ? " jhrte-tab-active-v1" : ""}`} onClick={() => setTab(t)}>
                                {t === "url" ? "URL" : "Upload"}
                            </button>
                        ))}
                    </div>
                    {tab === "url" ? (
                        <input className="jhrte-modal-input-v1" placeholder="https://example.com/image.jpg"
                            value={url} onChange={(e) => setUrl(e.target.value)} autoFocus />
                    ) : (
                        <div className="jhrte-upload-area-v1" onClick={() => fileRef.current.click()}>
                            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
                            Click to select image from device
                        </div>
                    )}
                    {url && <img src={url} alt="preview" className="jhrte-img-preview-v1" />}
                    <div className="jhrte-modal-row-v1">
                        <label className="jhrte-modal-label-v1">Initial width (px)</label>
                        <input className="jhrte-modal-input-v1 jhrte-modal-input-sm-v1" type="number"
                            value={width} min={40} onChange={(e) => setWidth(Number(e.target.value))} />
                    </div>
                    <div className="jhrte-modal-actions-v1">
                        <button className="jhrte-modal-cancel-v1" onClick={onClose}>Cancel</button>
                        <button className="jhrte-modal-confirm-v1" disabled={!url}
                            onClick={() => { if (url) { onInsert(url, width); onClose(); } }}>Insert</button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}

function LinkModal({ onInsert, onClose, mode = "insert", initialUrl = "https://", initialText = "" }) {
    const [url, setUrl] = useState(initialUrl);
    const [text, setText] = useState(initialText);
    return (
        <Portal>
            <div className="jhrte-overlay-v1" onClick={onClose}>
                <div className="jhrte-modal-v1" onClick={(e) => e.stopPropagation()}>
                    <div className="jhrte-modal-title-v1">{mode === "edit" ? "Edit Link" : "Insert Link"}</div>
                    <div>
                        <label className="jhrte-modal-label-v1" style={{ display: "block", marginBottom: 6 }}>Display text</label>
                        <input className="jhrte-modal-input-v1" placeholder="Link text (optional)"
                            value={text} onChange={(e) => setText(e.target.value)} />
                    </div>
                    <div>
                        <label className="jhrte-modal-label-v1" style={{ display: "block", marginBottom: 6 }}>URL</label>
                        <input className="jhrte-modal-input-v1" placeholder="https://"
                            value={url} onChange={(e) => setUrl(e.target.value)} autoFocus />
                    </div>
                    <div className="jhrte-modal-actions-v1">
                        <button className="jhrte-modal-cancel-v1" onClick={onClose}>Cancel</button>
                        <button className="jhrte-modal-confirm-v1" disabled={!url}
                            onClick={() => { if (url) { onInsert(url, text); onClose(); } }}>
                            {mode === "edit" ? "Update" : "Insert"}
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TOOLBAR PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════════

function ToolBtn({ title, onClick, active, disabled, children, "data-id": dataId }) {
    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            disabled={disabled}
            data-id={dataId}
            className={`jhrte-btn-v1${active ? " jhrte-btn-active-v1" : ""}${disabled ? " jhrte-btn-disabled-v1" : ""}`}
        >
            {children}
        </button>
    );
}

function ToolSelect({ onChange, children, title, className = "", disabled }) {
    const ref = useRef();
    return (
        <select
            ref={ref}
            title={title}
            disabled={disabled}
            className={`jhrte-select-v1 ${className}${disabled ? " jhrte-select-disabled-v1" : ""}`}
            onChange={(e) => { onChange(e.target.value); ref.current.selectedIndex = 0; }}
        >
            {children}
        </select>
    );
}

function Divider() { return <div className="jhrte-divider-v1" />; }

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN EDITOR
// ═══════════════════════════════════════════════════════════════════════════════

export default function RichTextEditor({ value, onChange, config = {} }) {
    const cfg = {
        ...DEFAULT_CONFIG,
        ...config,
        features: { ...DEFAULT_CONFIG.features, ...(config.features || {}) },
    };
    const f = cfg.features;

    const editorRef = useRef(null);
    const containerRef = useRef(null);
    const savedRangeRef = useRef(null);
    const hasFocusRef = useRef(false);
    const initDoneRef = useRef(false);
    const isResizingRef = useRef(false);

    const [modal, setModal] = useState(null);
    const [linkEditData, setLinkEditData] = useState(null);
    const [activeFormats, setActiveFormats] = useState({});
    const [wordCount, setWordCount] = useState(0);
    const [charCount, setCharCount] = useState(0);
    const [selectedImg, setSelectedImg] = useState(null);
    const [imgRect, setImgRect] = useState(null);
    const [linkPopup, setLinkPopup] = useState(null);
    const [isCodeView, setIsCodeView] = useState(false);
    const [codeSource, setCodeSource] = useState("");

    // ── Value sync (handles DB async data, won't clobber user input) ───────────
    useEffect(() => {
        if (!editorRef.current) return;

        // First mount: set from defaultValue or value prop
        if (!initDoneRef.current) {
            const initial = cfg.defaultValue || value || "";
            editorRef.current.innerHTML = initial;
            refreshCounts(editorRef.current);
            initDoneRef.current = true;
            return;
        }

        // Subsequent external updates (e.g. DB fetch arrives):
        // only apply when editor is not focused to avoid clobbering user input
        if (hasFocusRef.current) return;
        if (value === undefined || value === null) return;

        if (editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
            refreshCounts(editorRef.current);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    // Store raw viewport coords — handles rendered as position:fixed via portal,
    // so getBoundingClientRect() maps directly with no relative-offset math needed.
    const updateImgRect = useCallback(() => {
        if (!selectedImg) { setImgRect(null); return; }
        const r = selectedImg.getBoundingClientRect();
        setImgRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    }, [selectedImg]);

    useEffect(() => {
        if (!selectedImg) { setImgRect(null); return; }
        updateImgRect();

        const deselect = () => {
            selectedImg.classList.remove("jhrte-img-selected-v1");
            setSelectedImg(null);
        };

        // Only the editor's own scroll div — not window/page scroll
        const el = editorRef.current;
        el?.addEventListener("scroll", deselect);
        window.addEventListener("scroll", deselect, true);
        return () => {
            el?.removeEventListener("scroll", deselect);
            window.removeEventListener("scroll", deselect, true);
        };
    }, [selectedImg, updateImgRect]);

    // ── Click-outside: deselect image & close link popup ──────────────────────
    useEffect(() => {
        const onDoc = (e) => {
            const onHandle = e.target.closest(".jhrte-img-corner-v1") || e.target.closest(".jhrte-img-selection-v1");
            if (selectedImg && !onHandle && !editorRef.current?.contains(e.target)) {
                selectedImg.classList.remove("jhrte-img-selected-v1");
                setSelectedImg(null);
            }
            if (
                linkPopup &&
                !e.target.closest(".jhrte-link-popup-v1") &&
                !editorRef.current?.contains(e.target)
            ) {
                setLinkPopup(null);
            }
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [selectedImg, linkPopup]);

    // ── Helpers ────────────────────────────────────────────────────────────────
    const refreshCounts = (el) => {
        const text = el.innerText.trim();
        setWordCount(text ? text.split(/\s+/).length : 0);
        setCharCount(text.length);
    };

    const updateActiveFormats = useCallback(() => {
        setActiveFormats({
            bold: document.queryCommandState("bold"),
            italic: document.queryCommandState("italic"),
            underline: document.queryCommandState("underline"),
            strikethrough: document.queryCommandState("strikeThrough"),
            superscript: document.queryCommandState("superscript"),
            subscript: document.queryCommandState("subscript"),
            unorderedList: document.queryCommandState("insertUnorderedList"),
            orderedList: document.queryCommandState("insertOrderedList"),
            justifyLeft: document.queryCommandState("justifyLeft"),
            justifyCenter: document.queryCommandState("justifyCenter"),
            justifyRight: document.queryCommandState("justifyRight"),
            justifyFull: document.queryCommandState("justifyFull"),
        });
    }, []);

    // selectionchange fires on every cursor move / click inside editor,
    // ensuring sup/sub and other toggle buttons always reflect current state
    useEffect(() => {
        document.addEventListener("selectionchange", updateActiveFormats);
        return () => document.removeEventListener("selectionchange", updateActiveFormats);
    }, [updateActiveFormats]);

    const saveSelection = useCallback(() => {
        const sel = window.getSelection();
        if (sel?.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }, []);

    const restoreSelection = useCallback(() => {
        editorRef.current?.focus();
        if (savedRangeRef.current) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedRangeRef.current);
        }
    }, []);

    const emit = useCallback(() => {
        onChange?.(editorRef.current?.innerHTML || "");
    }, [onChange]);

    const exec = useCallback((cmd, arg = null) => {
        editorRef.current?.focus();
        document.execCommand(cmd, false, arg);
        emit();
        updateActiveFormats();
    }, [emit, updateActiveFormats]);

    // Find nearest <sup>/<sub> ancestor of the current cursor/selection
    const findSupSubWrapper = useCallback((tag) => {
        const sel = window.getSelection();
        if (!sel?.rangeCount) return null;
        let node = sel.getRangeAt(0).commonAncestorContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        while (node && node !== editorRef.current) {
            if (node.nodeName === tag.toUpperCase()) return node;
            node = node.parentNode;
        }
        return null;
    }, []);

    const execSupSub = useCallback((cmd, tag) => {
        editorRef.current?.focus();
        const sel = window.getSelection();
        const hasSelection = sel && sel.toString().length > 0;
        const wrapper = findSupSubWrapper(tag);

        if (wrapper && !hasSelection) {
            // Cursor is INSIDE sup/sub with nothing selected:
            // — clicking button exits the wrapper (cursor moves after it)
            // Insert a zero-width space AFTER the wrapper so browser doesn't re-inherit formatting
            const zws = document.createTextNode('\u200B');
            wrapper.after(zws);
            const range = document.createRange();
            range.setStart(zws, 1);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            emit();
            updateActiveFormats();
            return;
        }

        if (wrapper && hasSelection) {
            // Text selected AND it's inside sup/sub — remove formatting
            document.execCommand(cmd, false, null);
            emit();
            updateActiveFormats();
            return;
        }

        // Not in sup/sub: apply it, then auto-exit so next typing is normal
        document.execCommand(cmd, false, null);

        // Find the newly created wrapper and step cursor out of it
        const newWrapper = findSupSubWrapper(tag);
        if (newWrapper) {
            const zws = document.createTextNode('\u200B');
            newWrapper.after(zws);
            const range = document.createRange();
            range.setStart(zws, 1);
            range.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(range);
        }

        emit();
        updateActiveFormats();
    }, [findSupSubWrapper, emit, updateActiveFormats]);

    const insertHTML = useCallback((html) => {
        restoreSelection();
        document.execCommand("insertHTML", false, html);
        emit();
    }, [emit, restoreSelection]);

    // ── Code View toggle ───────────────────────────────────────────────────────
    const toggleCodeView = useCallback(() => {
        if (!isCodeView) {
            const html = editorRef.current?.innerHTML || "";
            setCodeSource(html);
            setIsCodeView(true);
            // Deselect image / close popup when entering code view
            if (selectedImg) { selectedImg.classList.remove("jhrte-img-selected-v1"); setSelectedImg(null); }
            setLinkPopup(null);
        } else {
            if (editorRef.current) {
                editorRef.current.innerHTML = codeSource;
                refreshCounts(editorRef.current);
                onChange?.(codeSource);
            }
            setIsCodeView(false);
        }
    }, [isCodeView, codeSource, onChange, selectedImg]);

    // ── Insert actions ─────────────────────────────────────────────────────────
    const handleInsertTable = useCallback((rows, cols) => {
        let t = `<table border="1" style="width:100%;border-collapse:collapse;margin:1rem 0;"><tbody>`;
        for (let i = 0; i < rows; i++) {
            t += "<tr>";
            for (let j = 0; j < cols; j++)
                t += `<td style="padding:8px;border:1px solid var(--jhrte-table-border-v1,#333);min-width:60px;">&nbsp;</td>`;
            t += "</tr>";
        }
        t += "</tbody></table><p><br></p>";
        insertHTML(t);
    }, [insertHTML]);

    const handleInsertImage = useCallback((src, width) => {
        insertHTML(`<img src="${src}" style="width:${width}px;max-width:100%;" />`);
    }, [insertHTML]);

    const handleInsertLink = useCallback((url, text) => {
        restoreSelection();
        const sel = window.getSelection();
        if (sel?.toString()) {
            exec("createLink", url);
        } else {
            insertHTML(`<a href="${url}" target="_blank" rel="noopener noreferrer">${text?.trim() || url}</a>`);
        }
    }, [restoreSelection, exec, insertHTML]);

    const handleUpdateLink = useCallback((url, text) => {
        if (!linkEditData?.el) return;
        linkEditData.el.href = url;
        if (text?.trim()) linkEditData.el.textContent = text.trim();
        emit();
        setLinkEditData(null);
        setModal(null);
    }, [linkEditData, emit]);

    // ── Editor events ──────────────────────────────────────────────────────────
    const onInput = (e) => {
        emit();
        updateActiveFormats();
        refreshCounts(e.currentTarget);
    };

    const onEditorClick = (e) => {
        const target = e.target;

        if (target.tagName === "IMG" && editorRef.current?.contains(target)) {
            if (selectedImg && selectedImg !== target) selectedImg.classList.remove("jhrte-img-selected-v1");
            setSelectedImg(target);
            target.classList.add("jhrte-img-selected-v1");
            setLinkPopup(null);
            updateActiveFormats();
            return;
        }

        const linkEl = target.closest("a");
        if (linkEl && editorRef.current?.contains(linkEl)) {
            e.preventDefault();
            const r = linkEl.getBoundingClientRect();
            setLinkPopup({ el: linkEl, x: r.left, y: r.bottom + 6 });
            if (selectedImg) { selectedImg.classList.remove("jhrte-img-selected-v1"); setSelectedImg(null); }
            updateActiveFormats();
            return;
        }

        if (selectedImg) { selectedImg.classList.remove("jhrte-img-selected-v1"); setSelectedImg(null); }
        if (linkPopup && !target.closest(".jhrte-link-popup-v1")) setLinkPopup(null);
        updateActiveFormats();
    };

    // ── Corner resize ──────────────────────────────────────────────────────────
    const onCornerMouseDown = useCallback((e, corner) => {
        if (!selectedImg) return;
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const initR = selectedImg.getBoundingClientRect();
        const startW = initR.width;
        const startH = initR.height;
        const ratio = startH / startW;

        isResizingRef.current = true;

        const onMove = (me) => {
            const dx = me.clientX - startX;
            const dy = me.clientY - startY;

            let delta;
            if (corner === "se") delta = (Math.abs(dx) >= Math.abs(dy)) ? dx : dy / ratio;
            if (corner === "sw") delta = (Math.abs(dx) >= Math.abs(dy)) ? -dx : dy / ratio;
            if (corner === "ne") delta = (Math.abs(dx) >= Math.abs(dy)) ? dx : -dy / ratio;
            if (corner === "nw") delta = (Math.abs(dx) >= Math.abs(dy)) ? -dx : -dy / ratio;

            const newW = Math.max(40, startW + delta);
            const newH = Math.round(newW * ratio);
            selectedImg.style.width = `${newW}px`;
            selectedImg.style.height = `${newH}px`;
            updateImgRect();
        };

        const onUp = () => {
            isResizingRef.current = false;
            emit();
            // Immediately clear selection after resize — prevents frozen handles
            selectedImg.classList.remove("jhrte-img-selected-v1");
            setSelectedImg(null);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [selectedImg, emit, updateImgRect]);

    // ── Image drag-to-move (via selection overlay) ─────────────────────────────
    const onSelectionMouseDown = useCallback((e) => {
        if (!selectedImg || !editorRef.current) return;
        // Don't hijack corner-handle events
        if (e.target.classList.contains("jhrte-img-corner-v1")) return;
        e.preventDefault();

        const startX = e.clientX;
        const startY = e.clientY;
        let hasMoved = false;
        let phantom = null;

        const imgW = selectedImg.getBoundingClientRect().width;
        const imgH = selectedImg.getBoundingClientRect().height;

        const onMove = (me) => {
            if (!hasMoved && (Math.abs(me.clientX - startX) > 5 || Math.abs(me.clientY - startY) > 5)) {
                hasMoved = true;
                phantom = selectedImg.cloneNode(true);
                phantom.classList.remove("jhrte-img-selected-v1");
                phantom.style.cssText = `
                    position:fixed; pointer-events:none; z-index:9999;
                    opacity:0.55; border-radius:6px;
                    width:${imgW}px; height:${imgH}px;
                    box-shadow:0 8px 32px rgba(0,0,0,0.5);
                `;
                document.body.appendChild(phantom);
            }
            if (phantom) {
                phantom.style.left = `${me.clientX - imgW / 2}px`;
                phantom.style.top = `${me.clientY - imgH / 2}px`;
            }
        };

        const onUp = (ue) => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            phantom?.remove();
            phantom = null;

            if (!hasMoved || !selectedImg || !editorRef.current) return;

            // Temporarily hide image to get element behind cursor
            selectedImg.style.visibility = "hidden";

            const range = (() => {
                if (document.caretRangeFromPoint) {
                    return document.caretRangeFromPoint(ue.clientX, ue.clientY);
                }
                const pos = document.caretPositionFromPoint?.(ue.clientX, ue.clientY);
                if (!pos) return null;
                const r = document.createRange();
                r.setStart(pos.offsetNode, pos.offset);
                r.collapse(true);
                return r;
            })();

            selectedImg.style.visibility = "";

            if (range && editorRef.current.contains(range.commonAncestorContainer)) {
                const clone = selectedImg.cloneNode(true);
                clone.classList.remove("jhrte-img-selected-v1");
                selectedImg.remove();
                range.insertNode(clone);
                emit();
            }

            // Deselect after move
            selectedImg.classList.remove("jhrte-img-selected-v1");
            setSelectedImg(null);
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [selectedImg, emit]);

    const openModal = (name) => { saveSelection(); setModal(name); };

    const HANDLE = 10; // half-size of corner handle

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <>
            {/* ── Modals ─────────────────────────────────────────────────────── */}
            {modal === "table" && <TableModal onInsert={handleInsertTable} onClose={() => setModal(null)} />}
            {modal === "image" && <ImageModal onInsert={handleInsertImage} onClose={() => setModal(null)} />}
            {modal === "link" && <LinkModal mode="insert" onInsert={handleInsertLink} onClose={() => setModal(null)} />}
            {modal === "link-edit" && linkEditData && (
                <LinkModal
                    mode="edit"
                    initialUrl={linkEditData.url}
                    initialText={linkEditData.text}
                    onInsert={handleUpdateLink}
                    onClose={() => { setModal(null); setLinkEditData(null); }}
                />
            )}

            {/* ── Link popup ─────────────────────────────────────────────────── */}
            {linkPopup && (
                <Portal>
                    <div
                        className="jhrte-link-popup-v1"
                        style={{ left: linkPopup.x, top: linkPopup.y }}
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <a className="jhrte-link-popup-href-v1" href={linkPopup.el.href}
                            target="_blank" rel="noopener noreferrer">{linkPopup.el.href}</a>
                        <div className="jhrte-link-popup-sep-v1" />
                        <button className="jhrte-link-popup-btn-v1" onClick={() => {
                            setLinkEditData({ el: linkPopup.el, url: linkPopup.el.href, text: linkPopup.el.textContent });
                            setLinkPopup(null);
                            setModal("link-edit");
                        }}>Edit</button>
                        <button className="jhrte-link-popup-btn-v1" onClick={() => {
                            if (linkPopup.el.parentNode) {
                                linkPopup.el.replaceWith(document.createTextNode(linkPopup.el.textContent));
                                emit();
                            }
                            setLinkPopup(null);
                        }}>Remove</button>
                    </div>
                </Portal>
            )}

            {/* ── Editor wrapper ─────────────────────────────────────────────── */}
            <div className={`jhrte-wrapper-v1${isCodeView ? " jhrte-code-view-mode-v1" : ""}`} style={{ width: cfg.width }}>

                {/* ── Toolbar ─────────────────────────────────────────────────── */}
                <div className="jhrte-toolbar-v1">

                    {(f.undo || f.redo) && (
                        <>
                            {f.undo && <ToolBtn title="Undo (Ctrl+Z)" disabled={isCodeView} onClick={() => exec("undo")}>↩</ToolBtn>}
                            {f.redo && <ToolBtn title="Redo (Ctrl+Y)" disabled={isCodeView} onClick={() => exec("redo")}>↪</ToolBtn>}
                            <Divider />
                        </>
                    )}

                    {f.headings && (
                        <>
                            <ToolSelect title="Block type" disabled={isCodeView} className="jhrte-select-heading-v1" onChange={(v) => exec("formatBlock", v)}>
                                <option value="P">Paragraph</option>
                                <option value="H1">Heading 1</option>
                                <option value="H2">Heading 2</option>
                                <option value="H3">Heading 3</option>
                                <option value="H4">Heading 4</option>
                                <option value="PRE">Preformat</option>
                            </ToolSelect>
                            <Divider />
                        </>
                    )}

                    {f.fontFamily && (
                        <ToolSelect title="Font family" disabled={isCodeView} className="jhrte-select-font-v1" onChange={(v) => exec("fontName", v)}>
                            <option value="">Font</option>
                            <option value="sans-serif">Sans</option>
                            <option value="serif">Serif</option>
                            <option value="monospace">Mono</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Oxanium">Oxanium</option>
                            <option value="Impact">Impact</option>
                        </ToolSelect>
                    )}

                    {f.fontSize && (
                        <>
                            <ToolSelect title="Font size" disabled={isCodeView} className="jhrte-select-size-v1" onChange={(v) => exec("fontSize", v)}>
                                <option value="">Size</option>
                                <option value="1">XS</option>
                                <option value="2">S</option>
                                <option value="3">M</option>
                                <option value="4">L</option>
                                <option value="5">XL</option>
                                <option value="6">2X</option>
                                <option value="7">3X</option>
                            </ToolSelect>
                            <Divider />
                        </>
                    )}

                    {f.bold && <ToolBtn title="Bold (Ctrl+B)" disabled={isCodeView} active={activeFormats.bold} onClick={() => exec("bold")}><b>B</b></ToolBtn>}
                    {f.italic && <ToolBtn title="Italic (Ctrl+I)" disabled={isCodeView} active={activeFormats.italic} onClick={() => exec("italic")}><i>I</i></ToolBtn>}
                    {f.underline && <ToolBtn title="Underline (Ctrl+U)" disabled={isCodeView} active={activeFormats.underline} onClick={() => exec("underline")}><u>U</u></ToolBtn>}
                    {f.strikethrough && <ToolBtn title="Strikethrough" disabled={isCodeView} active={activeFormats.strikethrough} onClick={() => exec("strikeThrough")}><s>S</s></ToolBtn>}
                    {f.superscript && <ToolBtn title="Superscript" disabled={isCodeView} active={activeFormats.superscript} onClick={() => execSupSub("superscript", "sup")}>x²</ToolBtn>}
                    {f.subscript && <ToolBtn title="Subscript" disabled={isCodeView} active={activeFormats.subscript} onClick={() => execSupSub("subscript", "sub")}>x₂</ToolBtn>}

                    {(f.textColor || f.highlight) && (
                        <>
                            <Divider />
                            {f.textColor && (
                                <label className={`jhrte-color-label-v1${isCodeView ? " jhrte-color-label-disabled-v1" : ""}`} title="Text color">
                                    <span className="jhrte-color-label-text-v1">A</span>
                                    <input type="color" defaultValue="#ffffff" className="jhrte-color-input-v1"
                                        disabled={isCodeView}
                                        onChange={(e) => exec("foreColor", e.target.value)} />
                                </label>
                            )}
                            {f.highlight && (
                                <label className={`jhrte-color-label-v1${isCodeView ? " jhrte-color-label-disabled-v1" : ""}`} title="Highlight color">
                                    <span className="jhrte-color-label-text-v1">H</span>
                                    <input type="color" defaultValue="#ffff00" className="jhrte-color-input-v1"
                                        disabled={isCodeView}
                                        onChange={(e) => exec("hiliteColor", e.target.value)} />
                                </label>
                            )}
                        </>
                    )}

                    <Divider />

                    {(f.unorderedList || f.orderedList || f.indent) && (
                        <>
                            {f.unorderedList && <ToolBtn title="Bullet list" disabled={isCodeView} active={activeFormats.unorderedList} onClick={() => exec("insertUnorderedList")}>• ≡</ToolBtn>}
                            {f.orderedList && <ToolBtn title="Numbered list" disabled={isCodeView} active={activeFormats.orderedList} onClick={() => exec("insertOrderedList")}>1. ≡</ToolBtn>}
                            {f.indent && <>
                                <ToolBtn title="Indent" disabled={isCodeView} onClick={() => exec("indent")}>⇥</ToolBtn>
                                <ToolBtn title="Outdent" disabled={isCodeView} onClick={() => exec("outdent")}>⇤</ToolBtn>
                            </>}
                            <Divider />
                        </>
                    )}

                    {f.align && (
                        <>
                            <ToolBtn title="Align left" disabled={isCodeView} active={activeFormats.justifyLeft} onClick={() => exec("justifyLeft")}>⬤≡</ToolBtn>
                            <ToolBtn title="Align center" disabled={isCodeView} active={activeFormats.justifyCenter} onClick={() => exec("justifyCenter")}>≡≡</ToolBtn>
                            <ToolBtn title="Align right" disabled={isCodeView} active={activeFormats.justifyRight} onClick={() => exec("justifyRight")}>≡⬤</ToolBtn>
                            <ToolBtn title="Justify" disabled={isCodeView} active={activeFormats.justifyFull} onClick={() => exec("justifyFull")}>☰</ToolBtn>
                            <Divider />
                        </>
                    )}

                    {f.link && <ToolBtn title="Insert link" disabled={isCodeView} onClick={() => openModal("link")}>🔗</ToolBtn>}
                    {f.table && <ToolBtn title="Insert table" disabled={isCodeView} onClick={() => openModal("table")}>⊞</ToolBtn>}
                    {f.image && <ToolBtn title="Insert image" disabled={isCodeView} onClick={() => openModal("image")}>🖼</ToolBtn>}
                    {f.codeBlock && <ToolBtn title="Code block" disabled={isCodeView} onClick={() => insertHTML(`<pre><code>// code here</code></pre><p><br></p>`)}>&lt;/&gt;</ToolBtn>}
                    {f.blockquote && <ToolBtn title="Blockquote" disabled={isCodeView} onClick={() => exec("formatBlock", "BLOCKQUOTE")}>" "</ToolBtn>}
                    {f.hr && <ToolBtn title="Horizontal rule" disabled={isCodeView} onClick={() => insertHTML(`<hr /><p><br></p>`)}>—</ToolBtn>}

                    {f.clearFormat && (
                        <>
                            <Divider />
                            <ToolBtn title="Clear formatting" disabled={isCodeView} onClick={() => exec("removeFormat")}>✕</ToolBtn>
                        </>
                    )}

                    {f.codeView && (
                        <>
                            <Divider />
                            <ToolBtn
                                title={isCodeView ? "Back to visual editor" : "View / edit HTML source"}
                                active={isCodeView}
                                data-id="code-view-btn"
                                onClick={toggleCodeView}
                            >
                                {"<html>"}
                            </ToolBtn>
                        </>
                    )}
                </div>

                {/* ── Content area ──────────────────────────────────────────────── */}
                <div style={{ flex: 1, overflow: "hidden" }}>

                    {/* Visual editor */}
                    <div
                        ref={editorRef}
                        className="jhrte-content-v1"
                        contentEditable={!isCodeView}
                        suppressContentEditableWarning
                        style={{
                            ...contentHeightStyle(cfg),
                            display: isCodeView ? "none" : undefined,
                        }}
                        onFocus={() => { hasFocusRef.current = true; }}
                        onBlur={() => { hasFocusRef.current = false; }}
                        onInput={onInput}
                        onKeyUp={updateActiveFormats}
                        onMouseUp={updateActiveFormats}
                        onClick={onEditorClick}
                        data-placeholder={cfg.placeholder}
                    />

                    {/* Code view textarea */}
                    {isCodeView && (
                        <textarea
                            className="jhrte-code-textarea-v1"
                            style={contentHeightStyle(cfg)}
                            value={codeSource}
                            spellCheck={false}
                            onChange={(e) => {
                                setCodeSource(e.target.value);
                                onChange?.(e.target.value);
                            }}
                        />
                    )}
                </div>

                {/* ── Footer ───────────────────────────────────────────────────── */}
                {(f.wordCount || f.charCount) && (
                    <div className="jhrte-footer-v1">
                        {isCodeView && <span className="jhrte-footer-mode-v1">HTML source</span>}
                        {!isCodeView && f.wordCount && <span>{wordCount} word{wordCount !== 1 ? "s" : ""}</span>}
                        {!isCodeView && f.wordCount && f.charCount && <span style={{ margin: "0 8px" }}>·</span>}
                        {!isCodeView && f.charCount && <span>{charCount} char{charCount !== 1 ? "s" : ""}</span>}
                    </div>
                )}
            </div>

            {/* ── Image handles — rendered in a Portal as position:fixed so viewport coords
                 from getBoundingClientRect() map directly with zero offset math ──────── */}
            {!isCodeView && imgRect && (
                <Portal>
                    {/* Selection border + drag-move surface */}
                    <div
                        className="jhrte-img-selection-v1"
                        style={{
                            left: imgRect.left,
                            top: imgRect.top,
                            width: imgRect.width,
                            height: imgRect.height,
                        }}
                        onMouseDown={onSelectionMouseDown}
                    />
                    {/* Corner resize handles */}
                    {["nw", "ne", "sw", "se"].map((corner) => {
                        const isLeft = corner.includes("w");
                        const isTop = corner.includes("n");
                        return (
                            <div
                                key={corner}
                                className="jhrte-img-corner-v1"
                                style={{
                                    left: isLeft ? imgRect.left - HANDLE : imgRect.left + imgRect.width - HANDLE,
                                    top: isTop ? imgRect.top - HANDLE : imgRect.top + imgRect.height - HANDLE,
                                    cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
                                }}
                                onMouseDown={(e) => onCornerMouseDown(e, corner)}
                            />
                        );
                    })}
                </Portal>
            )}
        </>
    );
}