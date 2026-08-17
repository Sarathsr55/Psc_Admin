import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { v4 as uuidv4 } from 'uuid';
import { IonIcon } from '@ionic/react';
import { arrowBackOutline, addOutline, saveOutline, imageOutline } from 'ionicons/icons';
import { ReactTransliterate } from 'react-transliterate';
import 'react-transliterate/dist/index.css';
import './CanvasEditor.css';
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import { deleteCloudinaryImage } from '../../services/deleteImages';
import { addStudyMaterial, updateStudyMaterial } from '../../services/studyMaterialService';

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

// ── Manglish → Malayalam transliteration map ───────────────────────────────
// ── Malayalam floating panel ───────────────────────────────
const MalayalamPanel = ({ onInsert, onClose }) => {
    const [text, setText] = useState('');

    const handleInsert = (val) => {
        const toInsert = val ?? text;
        if (toInsert.trim()) {
            onInsert(toInsert);
            setText('');
        }
    };

    return (
        <div className="ce-ml-panel" onMouseDown={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
            <div className="ce-ml-panel-header">
                <span>🇮🇳 Malayalam — type Manglish, press Enter to insert into box</span>
                <button className="ce-ml-close" onMouseDown={e => { e.preventDefault(); onClose(); }}>✕</button>
            </div>
            <div className="ce-ml-panel-body">
                <ReactTransliterate
                    value={text}
                    onChangeText={setText}
                    lang="ml"
                    enabled={true}
                    renderComponent={(props) => (
                        <input
                            {...props}
                            className="ce-ml-input"
                            placeholder="Type in Manglish here (e.g. namaskaram, nanni)…"
                            autoFocus
                        />
                    )}
                />
                <div className="ce-ml-panel-actions">
                    <div className="ce-ml-preview">{text || <span style={{ color: '#adb5bd' }}>Transliterated text appears here…</span>}</div>
                    <button
                        className="ce-ml-insert-btn"
                        onMouseDown={e => { e.preventDefault(); handleInsert(); }}>
                        Insert ↵
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Stable TextEditor ────────────────────────────────────────────
const TextEditor = React.memo(({ element, updateElement, savedRangeRef }) => {
    const divRef = useRef(null);

    useEffect(() => {
        if (divRef.current && document.activeElement !== divRef.current) {
            if (divRef.current.innerHTML !== element.content) {
                divRef.current.innerHTML = element.content;
            }
        }
    }, [element.content]);

    const saveRange = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            savedRangeRef.current = sel.getRangeAt(0).cloneRange();
        }
    };

    return (
        <div
            id={`ce-text-${element.id}`}
            ref={divRef}
            contentEditable
            suppressContentEditableWarning
            onFocus={(e) => {
                if (element.content === 'Click to edit...') {
                    e.target.innerHTML = '';
                    updateElement(element.id, { content: '' });
                }
            }}
            onMouseUp={saveRange}
            onKeyUp={saveRange}
            onBlur={(e) => {
                updateElement(element.id, { content: e.target.innerHTML });
            }}
            style={{
                ...element.styles,
                width: '100%',
                height: '100%',
                outline: 'none',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                overflow: 'hidden',
                boxSizing: 'border-box',
                padding: '6px',
                cursor: 'text',
                lineHeight: element.styles?.lineHeight || '1.6',
            }}
        />
    );
});

// ── Helper: Focus and move caret to end ──────────────────────────────────
function focusEnd(el) {
    if (!el) return;
    el.focus();
    if (typeof window.getSelection !== 'undefined' && typeof document.createRange !== 'undefined') {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

// ── KeyValueRow ────────────────────────────────────────────────────────
const KeyValueRow = React.memo(({ elementId, pair, idx, pairsLength, updatePair, addPair, removePair, savedRangeRef }) => {
    const keyRef = useRef(null);
    const valRef = useRef(null);

    useEffect(() => {
        if (keyRef.current && document.activeElement !== keyRef.current) {
            if (keyRef.current.innerHTML !== pair.key) keyRef.current.innerHTML = pair.key;
        }
        if (valRef.current && document.activeElement !== valRef.current) {
            if (valRef.current.innerHTML !== pair.value) valRef.current.innerHTML = pair.value;
        }
    }, [pair.key, pair.value]);

    const saveRange = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    };

    const handleKeyDown = (e, field) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            if (field === 'key') {
                focusEnd(valRef.current);
            } else if (field === 'value') {
                if (idx < pairsLength - 1) {
                    focusEnd(document.getElementById(`ce-text-${elementId}-key-${idx + 1}`));
                } else {
                    addPair(idx);
                }
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            addPair(idx);
        } else if (e.key === 'Backspace') {
            const keyEmpty = !keyRef.current?.innerText.trim() || keyRef.current?.innerText === '\n';
            const valEmpty = !valRef.current?.innerText.trim() || valRef.current?.innerText === '\n';

            if (field === 'key' && keyEmpty) {
                if (valEmpty && pairsLength > 1) {
                    e.preventDefault();
                    removePair(pair.id, idx);
                }
            } else if (field === 'value' && valEmpty) {
                e.preventDefault();
                focusEnd(keyRef.current);
            }
        }
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '6px' }}>
            <div
                id={`ce-text-${elementId}-key-${idx}`}
                ref={keyRef}
                contentEditable
                suppressContentEditableWarning
                onMouseUp={saveRange}
                onKeyUp={saveRange}
                onFocus={(e) => {
                    if (pair.key === 'Key') {
                        e.target.innerHTML = '';
                        updatePair(pair.id, 'key', '');
                    }
                }}
                onBlur={(e) => updatePair(pair.id, 'key', e.target.innerHTML)}
                onKeyDown={(e) => handleKeyDown(e, 'key')}
                style={{ fontWeight: 'bold', outline: 'none', wordBreak: 'break-word', flexShrink: 0, marginRight: '8px', minWidth: '30px', maxWidth: '100%' }}
            />
            <div style={{ display: 'flex', flex: 1, minWidth: '100px', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 'bold', flexShrink: 0, marginRight: '8px', userSelect: 'none' }}>-</span>
                <div
                    id={`ce-text-${elementId}-val-${idx}`}
                    ref={valRef}
                    contentEditable
                    suppressContentEditableWarning
                    onMouseUp={saveRange}
                    onKeyUp={saveRange}
                    onFocus={(e) => {
                        if (pair.value === 'Value') {
                            e.target.innerHTML = '';
                            updatePair(pair.id, 'value', '');
                        }
                    }}
                    onBlur={(e) => updatePair(pair.id, 'value', e.target.innerHTML)}
                    onKeyDown={(e) => handleKeyDown(e, 'value')}
                    style={{ outline: 'none', wordBreak: 'break-word', flex: 1 }}
                />
            </div>
        </div>
    );
});

// ── KeyValueEditor ───────────────────────────────────────────────
const KeyValueEditor = React.memo(({ element, updateElement, savedRangeRef }) => {
    const pairs = Array.isArray(element.content) 
        ? element.content 
        : [{ id: uuidv4(), key: element.content?.key || 'Key', value: element.content?.value || 'Value' }];

    const updatePair = useCallback((id, field, valueHtml) => {
        const newPairs = pairs.map(p => p.id === id ? { ...p, [field]: valueHtml } : p);
        updateElement(element.id, { content: newPairs });
    }, [pairs, element.id, updateElement]);

    const addPair = useCallback((index) => {
        const newPairs = [...pairs];
        newPairs.splice(index + 1, 0, { id: uuidv4(), key: '', value: '' });
        updateElement(element.id, { content: newPairs });
        setTimeout(() => {
            focusEnd(document.getElementById(`ce-text-${element.id}-key-${index + 1}`));
        }, 50);
    }, [pairs, element.id, updateElement]);

    const removePair = useCallback((id, index) => {
        const newPairs = pairs.filter(p => p.id !== id);
        updateElement(element.id, { content: newPairs });
        setTimeout(() => {
            if (index > 0) {
                // Focus the value field of the previous pair
                focusEnd(document.getElementById(`ce-text-${element.id}-val-${index - 1}`));
            } else {
                // Focus the key field of the new first pair
                focusEnd(document.getElementById(`ce-text-${element.id}-key-0`));
            }
        }, 50);
    }, [pairs, element.id, updateElement]);

    return (
        <div id={`ce-text-${element.id}`} style={{ ...element.styles, width: '100%', height: '100%', padding: '6px', boxSizing: 'border-box', overflowY: 'auto' }}>
            {pairs.map((pair, idx) => (
                <KeyValueRow
                    key={pair.id}
                    elementId={element.id}
                    pair={pair}
                    idx={idx}
                    pairsLength={pairs.length}
                    updatePair={updatePair}
                    addPair={addPair}
                    removePair={removePair}
                    savedRangeRef={savedRangeRef}
                />
            ))}
        </div>
    );
});

// ── Apply inline style to selection (reliable px-level font control) ────────
function applyInlineStyle(savedRangeRef, property, value) {
    if (!savedRangeRef.current) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRangeRef.current.cloneRange());

    const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    if (!range || range.collapsed) return;

    const fragment = range.extractContents();
    const span = document.createElement('span');
    span.style[property] = value;
    span.appendChild(fragment);
    range.insertNode(span);

    // Reselect the span
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(newRange);
    savedRangeRef.current = newRange.cloneRange();

    const activeEditable = document.activeElement;
    if (activeEditable && activeEditable.hasAttribute('contenteditable')) {
        activeEditable.blur();
        activeEditable.focus();
        const finalSel = window.getSelection();
        finalSel.removeAllRanges();
        finalSel.addRange(savedRangeRef.current.cloneRange());
    }
}

// ── Main Canvas Editor ─────────────────────────────────────────────────────
const CanvasEditor = ({ material, onBack }) => {
    const [pages, setPages] = useState(material?.pages || [{ id: uuidv4(), elements: [] }]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [selectedElementId, setSelectedElementId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [uploading, setUploading] = useState(false);
    const [malayalamMode, setMalayalamMode] = useState(false);
    const [showMlPanel, setShowMlPanel] = useState(false);
    const [customFonts, setCustomFonts] = useState([]);
    const [fontSizeInput, setFontSizeInput] = useState('14');
    const [hoveredPageIdx, setHoveredPageIdx] = useState(null);
    
    // Metadata & Saving state
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [metadata, setMetadata] = useState({
        title: material?.title || '',
        subject: material?.subject || '',
        category: material?.category || '',
        topic: material?.topic || '',
        subtopic: material?.subtopic || '',
        post: material?.post || '',
        subheading: material?.subheading || [],
    });
    const [subHeadingKey, setSubHeadingKey] = useState('');
    const [subHeadingValue, setSubHeadingValue] = useState('');

    const AddSubHeading = () => {
        if (subHeadingKey) {
            setMetadata(prev => ({
                ...prev,
                subheading: [...(prev.subheading || []), { key: subHeadingKey, value: subHeadingValue }]
            }));
            setSubHeadingKey('');
            setSubHeadingValue('');
        }
    };

    const removeSubHeading = (index) => {
        setMetadata(prev => ({
            ...prev,
            subheading: (prev.subheading || []).filter((_, i) => i !== index)
        }));
    };
    const savedRangeRef = useRef(null);
    const fileInputRef = useRef(null);
    const fontInputRef = useRef(null);

    const systemFonts = [
        'Arial', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New',
        'Trebuchet MS', 'Palatino', 'Garamond', 'Comic Sans MS', 'Impact',
        'Tahoma', 'Helvetica',
    ];
    const allFonts = [...systemFonts, ...customFonts.map(f => f.name)];

    const pageRefs = useRef([]);

    let selectedElement = null;
    for (const p of pages) {
        selectedElement = p.elements.find(e => e.id === selectedElementId);
        if (selectedElement) break;
    }

    // ── Install Custom Font ────────────────────────────────────────────────
    const handleFontInstall = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fontName = file.name.replace(/\.[^.]+$/, '');
        const buffer = await file.arrayBuffer();
        const font = new FontFace(fontName, buffer);
        await font.load();
        document.fonts.add(font);
        setCustomFonts(prev => [...prev, { name: fontName }]);
        alert(`Font "${fontName}" installed! It will appear in the font list.`);
        e.target.value = '';
    };

    // ── Element CRUD ────────────────────────────────────────────────────────
    const addElement = useCallback((type, subType = '') => {
        const styles = {
            heading: { fontSize: '28px', fontWeight: 'bold', fontFamily: 'Arial', color: '#1e293b', lineHeight: '1.3' },
            subheading: { fontSize: '20px', fontWeight: '600', fontFamily: 'Arial', color: '#334155', lineHeight: '1.4' },
            paragraph: { fontSize: '14px', fontWeight: 'normal', fontFamily: 'Arial', color: '#1e293b', lineHeight: '1.6' },
            keyvalue: { fontSize: '14px', fontFamily: 'Arial', color: '#1e293b', lineHeight: '1.6' },
        };
        const el = {
            id: uuidv4(), type, subType,
            x: 60, y: 60,
            width: type === 'image' ? 250 : 350,
            height: type === 'image' ? 250 : 60,
            content: type === 'image' ? '' : (type === 'key-value' ? [{ id: uuidv4(), key: 'Key', value: 'Value' }] : 'Click to edit...'),
            styles: styles[subType] || (type === 'key-value' ? styles.keyvalue : styles.paragraph),
        };
        setPages(prev => {
            const np = [...prev];
            np[currentPageIndex] = { ...np[currentPageIndex], elements: [...np[currentPageIndex].elements, el] };
            return np;
        });
        setSelectedElementId(el.id);
    }, [currentPageIndex]);

    const updateElement = useCallback((id, newProps) => {
        setPages(prev => prev.map(page => {
            if (page.elements.some(e => e.id === id)) {
                return {
                    ...page,
                    elements: page.elements.map(e => e.id === id ? { ...e, ...newProps } : e)
                };
            }
            return page;
        }));
    }, []);

    const removeElement = useCallback(async (id) => {
        let elToDelete = null;
        for (const p of pages) {
            const found = p.elements.find(e => e.id === id);
            if (found) { elToDelete = found; break; }
        }
        if (elToDelete?.type === 'image' && elToDelete.content) {
            try {
                const parts = elToDelete.content.split('/');
                await deleteCloudinaryImage(parts[parts.length - 1].split('.')[0], material?._id || 'canvas');
            } catch (_) {}
        }
        setPages(prev => prev.map(p => ({
            ...p,
            elements: p.elements.filter(e => e.id !== id)
        })));
        setSelectedElementId(null);
    }, [pages, material]);

    const handleSaveInitiate = () => {
        if (!metadata.title || !metadata.subject) {
            setShowSaveModal(true);
        } else {
            executeSave(metadata);
        }
    };

    const executeSave = async (metaToSave) => {
        setIsSaving(true);
        try {
            // Sanitize payload: react-rnd sometimes sets width/height/x/y as strings (e.g. "350px")
            // Mongoose schema requires them to be Numbers
            const sanitizedPages = pages.map(page => ({
                ...page,
                elements: page.elements.map(el => ({
                    ...el,
                    x: typeof el.x === 'string' ? parseFloat(el.x) : el.x,
                    y: typeof el.y === 'string' ? parseFloat(el.y) : el.y,
                    width: typeof el.width === 'string' ? parseFloat(el.width) : el.width,
                    height: typeof el.height === 'string' && el.height !== 'auto' ? parseFloat(el.height) : el.height,
                }))
            }));

            const payload = {
                ...metaToSave,
                pages: sanitizedPages
            };

            if (material?._id) {
                await updateStudyMaterial(material._id, payload);
                alert('Study material updated successfully!');
            } else {
                await addStudyMaterial(payload);
                alert('Study material saved successfully!');
            }
            setShowSaveModal(false);
            if (onBack) onBack();
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save study material.');
        } finally {
            setIsSaving(false);
        }
    };

    const addPage = () => {
        setPages(prev => [...prev, { id: uuidv4(), elements: [] }]);
        setCurrentPageIndex(pages.length);
        setTimeout(() => {
            pageRefs.current[pages.length]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const deletePage = (idx) => {
        if (pages.length <= 1) {
            alert('Cannot delete the only page in the document.');
            return;
        }
        const page = pages[idx];
        if (page.elements.length > 0) {
            const confirm = window.confirm(`Page ${idx + 1} contains elements. Are you sure you want to delete it?`);
            if (!confirm) return;
        }
        setPages(prev => {
            const np = prev.filter((_, i) => i !== idx);
            return np;
        });
        setCurrentPageIndex(prev => {
            const nextIdx = prev >= pages.length - 1 ? Math.max(0, pages.length - 2) : prev;
            setTimeout(() => {
                pageRefs.current[nextIdx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
            return nextIdx;
        });
    };

    // ── Image Upload ────────────────────────────────────────────────────────
    const handleImageUpload = async (file, x = 60, y = 60, pageIdx = currentPageIndex) => {
        setUploading(true);
        try {
            const url = await uploadImageToCloudinary(file);
            const newEl = { id: uuidv4(), type: 'image', x, y, width: 300, height: 300, content: url, styles: {} };
            setPages(prev => {
                const np = [...prev];
                if (!np[pageIdx]) return np;
                np[pageIdx] = { ...np[pageIdx], elements: [...np[pageIdx].elements, newEl] };
                return np;
            });
        } catch { alert('Image upload failed.'); }
        finally { setUploading(false); }
    };

    // ── Generic execCommand (for bold/italic/etc) ───────────────────────────
    const handleFormat = useCallback((e, command, value = null) => {
        if (e?.type === 'mousedown') e.preventDefault();
        
        if (savedRangeRef.current) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedRangeRef.current.cloneRange());
        }
        
        document.execCommand(command, false, value);
        
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();

        const activeEditable = document.activeElement;
        if (activeEditable && activeEditable.hasAttribute('contenteditable')) {
            activeEditable.blur();
            activeEditable.focus();
            const finalSel = window.getSelection();
            finalSel.removeAllRanges();
            finalSel.addRange(savedRangeRef.current.cloneRange());
        }
    }, []);

    // ── Font size (real px via span wrapping) ───────────────────────────────
    const handleFontSize = useCallback((sizePx) => {
        applyInlineStyle(savedRangeRef, 'fontSize', sizePx);
    }, []);

    // ── Font family (real font via span wrapping) ───────────────────────────
    const handleFontFamily = useCallback((family) => {
        applyInlineStyle(savedRangeRef, 'fontFamily', family);
    }, []);

    // ── Insert Malayalam text at cursor position ─────────────────────────────
    const handleMlInsert = useCallback((mlText) => {
        if (!savedRangeRef.current) return;
        
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current.cloneRange());
        
        document.execCommand('insertText', false, mlText);
        
        if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();

        const activeEditable = document.activeElement;
        if (activeEditable && activeEditable.hasAttribute('contenteditable')) {
            activeEditable.blur();
            activeEditable.focus();
            const finalSel = window.getSelection();
            finalSel.removeAllRanges();
            finalSel.addRange(savedRangeRef.current.cloneRange());
        }
    }, []);

    // ── Keyboard shortcuts ──────────────────────────────────────────────────
    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
            if (e.key === 'b') { e.preventDefault(); handleFormat(null, 'bold'); }
            else if (e.key === 'i') { e.preventDefault(); handleFormat(null, 'italic'); }
            else if (e.key === 'u') { e.preventDefault(); handleFormat(null, 'underline'); }
            else if (e.key === 'z') { e.preventDefault(); document.execCommand('undo'); }
            else if (e.key === 'y') { e.preventDefault(); document.execCommand('redo'); }
        }
    };

    // ── Formatting Toolbar ──────────────────────────────────────────────────
    const renderFormatToolbar = () => {
        if (!selectedElement || (selectedElement.type !== 'text' && selectedElement.type !== 'key-value')) return null;

        return (
            <div className="ce-format-toolbar">
                {/* Font Family */}
                <select className="ce-select ce-font-family"
                    defaultValue="Arial"
                    onMouseDown={e => e.preventDefault()}
                    onChange={e => handleFontFamily(e.target.value)}>
                    <optgroup label="System Fonts">
                        {systemFonts.map(f => <option key={f} value={f}>{f}</option>)}
                    </optgroup>
                    {customFonts.length > 0 && (
                        <optgroup label="Installed Fonts">
                            {customFonts.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                        </optgroup>
                    )}
                </select>

                {/* Font Size */}
                <input
                    className="ce-size-input"
                    type="number"
                    min="6" max="200"
                    value={fontSizeInput}
                    onMouseDown={e => e.stopPropagation()}
                    onChange={e => setFontSizeInput(e.target.value)}
                    onBlur={e => handleFontSize(`${e.target.value}px`)}
                    onKeyDown={e => {
                        e.stopPropagation();
                        if (e.key === 'Enter') handleFontSize(`${fontSizeInput}px`);
                    }}
                    title="Font size in px — press Enter to apply"
                />

                {/* Size presets */}
                <select className="ce-select ce-font-size-preset"
                    value=""
                    onMouseDown={e => e.preventDefault()}
                    onChange={e => { setFontSizeInput(e.target.value); handleFontSize(`${e.target.value}px`); }}>
                    <option value="" disabled>px</option>
                    {[8,9,10,11,12,14,16,18,20,24,28,32,36,48,64,72].map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>

                <div className="ce-tb-sep" />

                {/* B I U S */}
                <button className="ce-tb-btn" title="Bold (Ctrl+B)" onMouseDown={e => handleFormat(e, 'bold')}><b>B</b></button>
                <button className="ce-tb-btn" title="Italic (Ctrl+I)" onMouseDown={e => handleFormat(e, 'italic')}><em>I</em></button>
                <button className="ce-tb-btn" title="Underline (Ctrl+U)" onMouseDown={e => handleFormat(e, 'underline')}><u>U</u></button>
                <button className="ce-tb-btn" title="Strikethrough" onMouseDown={e => handleFormat(e, 'strikeThrough')}><s>S</s></button>
                <button className="ce-tb-btn" title="Superscript" onMouseDown={e => handleFormat(e, 'superscript')}>x²</button>
                <button className="ce-tb-btn" title="Subscript" onMouseDown={e => handleFormat(e, 'subscript')}>x₂</button>

                <div className="ce-tb-sep" />

                {/* Alignment */}
                <button className="ce-tb-btn" title="Align Left" onMouseDown={e => handleFormat(e, 'justifyLeft')}>⬛=</button>
                <button className="ce-tb-btn" title="Align Center" onMouseDown={e => handleFormat(e, 'justifyCenter')}>=□=</button>
                <button className="ce-tb-btn" title="Align Right" onMouseDown={e => handleFormat(e, 'justifyRight')}>=⬛</button>
                <button className="ce-tb-btn" title="Justify" onMouseDown={e => handleFormat(e, 'justifyFull')}>≡</button>

                <div className="ce-tb-sep" />

                {/* Lists */}
                <button className="ce-tb-btn" title="Bullet List" onMouseDown={e => handleFormat(e, 'insertUnorderedList')}>• ≡</button>
                <button className="ce-tb-btn" title="Numbered List" onMouseDown={e => handleFormat(e, 'insertOrderedList')}>1≡</button>
                <button className="ce-tb-btn" title="Indent" onMouseDown={e => handleFormat(e, 'indent')}>⇥</button>
                <button className="ce-tb-btn" title="Outdent" onMouseDown={e => handleFormat(e, 'outdent')}>⇤</button>

                <div className="ce-tb-sep" />

                {/* Colors */}
                <label className="ce-tb-color" title="Text Color">
                    <span className="ce-color-a">A</span>
                    <input type="color" className="ce-color-hidden"
                        onMouseDown={e => e.preventDefault()}
                        onChange={e => handleFormat(e, 'foreColor', e.target.value)} />
                </label>
                <label className="ce-tb-color" title="Highlight">
                    <span className="ce-color-h">H</span>
                    <input type="color" className="ce-color-hidden"
                        onMouseDown={e => e.preventDefault()}
                        onChange={e => handleFormat(e, 'hiliteColor', e.target.value)} />
                </label>

                <div className="ce-tb-sep" />

                {/* Clear formatting */}
                <button className="ce-tb-btn" title="Clear Formatting" onMouseDown={e => handleFormat(e, 'removeFormat')}>Tx</button>

                {/* Undo / Redo */}
                <div className="ce-tb-sep" />
                <button className="ce-tb-btn" title="Undo (Ctrl+Z)" onMouseDown={e => { e.preventDefault(); document.execCommand('undo'); }}>↩</button>
                <button className="ce-tb-btn" title="Redo (Ctrl+Y)" onMouseDown={e => { e.preventDefault(); document.execCommand('redo'); }}>↪</button>

                {/* Line Height */}
                <div className="ce-tb-sep" />
                <select className="ce-select" title="Line Height"
                    defaultValue=""
                    onMouseDown={e => e.preventDefault()}
                    onChange={e => {
                        const activeEditable = document.activeElement;
                        if (activeEditable && activeEditable.hasAttribute('contenteditable')) {
                            activeEditable.style.lineHeight = e.target.value;
                            activeEditable.blur();
                            activeEditable.focus();
                        }
                    }}>
                    <option value="" disabled>↕ LH</option>
                    {['1', '1.2', '1.5', '1.6', '1.8', '2', '2.5', '3'].map(v => (
                        <option key={v} value={v}>{v}</option>
                    ))}
                </select>
            </div>
        );
    };

    return (
        <div className="canvas-editor-container" onKeyDown={handleKeyDown}>
            {/* ── Main Toolbar ── */}
            <div className="canvas-toolbar">
                <button onClick={onBack} className="ce-btn ce-btn-back">← Back</button>
                <div className="ce-sep" />

                <span className="ce-tb-label">Insert:</span>
                <button onClick={() => addElement('text', 'heading')} className="ce-btn">H1</button>
                <button onClick={() => addElement('text', 'subheading')} className="ce-btn">H2</button>
                <button onClick={() => addElement('text', 'paragraph')} className="ce-btn">¶ Text</button>
                <label className="ce-btn" style={{ cursor: 'pointer' }}>
                    🖼 {uploading ? 'Uploading…' : 'Image'}
                    <input ref={fileInputRef} type="file" hidden accept="image/*"
                        onChange={e => e.target.files[0] && handleImageUpload(e.target.files[0])} />
                </label>
                <button onClick={() => addElement('key-value')} className="ce-btn">KV Pair</button>

                <div className="ce-sep" />
                <button onClick={addPage} className="ce-btn">+ Page</button>

                <div className="ce-sep" />
                {/* Malayalam toggle */}
                <button
                    className={`ce-btn ce-ml-toggle ${showMlPanel ? 'active' : ''}`}
                    onClick={() => {
                        if (!selectedElementId) { alert('Please select a text box first.'); return; }
                        setShowMlPanel(p => !p);
                    }}
                    title="Open Malayalam (Manglish) input panel">
                    {showMlPanel ? '🇮🇳 ML ✕' : '🇮🇳 ML'}
                </button>

                {/* Install Font */}
                <label className="ce-btn" style={{ cursor: 'pointer' }} title="Install a custom font (.ttf/.otf/.woff)">
                    🔡 Font+
                    <input ref={fontInputRef} type="file" hidden accept=".ttf,.otf,.woff,.woff2"
                        onChange={handleFontInstall} />
                </label>

                {/* Zoom */}
                <div className="ce-sep" />
                <button className="ce-btn" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(1)))}>−</button>
                <span className="ce-zoom-val">{Math.round(zoom * 100)}%</span>
                <button className="ce-btn" onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(1)))}>+</button>
                <button className="ce-btn" onClick={() => setZoom(1)}>Reset</button>

                <div style={{ flex: 1 }} />
                <button className="ce-btn ce-btn-save" disabled={isSaving} onClick={handleSaveInitiate}>
                    💾 {isSaving ? 'Saving…' : 'Save'}
                </button>
            </div>

            {/* ── Context Format Toolbar ── */}
            {renderFormatToolbar()}

            {/* ── Malayalam Panel (shown above workspace when active) ── */}
            {showMlPanel && (
                <MalayalamPanel
                    onInsert={handleMlInsert}
                    onClose={() => setShowMlPanel(false)}
                />
            )}

            {/* ── Workspace ── */}
            <div className="canvas-workspace">
                {/* Pages Sidebar */}
                <div className="canvas-sidebar">
                    <div className="ce-sidebar-header">Pages</div>
                    {pages.map((p, idx) => (
                        <div key={p.id}
                            className={`ce-page-thumb ${currentPageIndex === idx ? 'active' : ''}`}
                            style={{ position: 'relative' }}
                            onMouseEnter={() => setHoveredPageIdx(idx)}
                            onMouseLeave={() => setHoveredPageIdx(null)}
                            onClick={() => {
                                setCurrentPageIndex(idx);
                                pageRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}>
                            <div className="ce-thumb-preview" style={{ position: 'relative', overflow: 'hidden' }}>
                                <div style={{ transform: `scale(0.153)`, transformOrigin: 'top left', width: `${A4_WIDTH}px`, height: `${A4_HEIGHT}px`, position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                                    {p.elements.map(el => (
                                        <div key={el.id} style={{ position: 'absolute', left: el.x, top: el.y, width: el.width, height: el.height, ...el.styles, overflow: 'hidden' }}>
                                            {el.type === 'image' && el.content ? <img src={el.content} alt="" style={{width: '100%', height: '100%', objectFit: 'contain'}} /> : null}
                                            {el.type === 'text' && <div dangerouslySetInnerHTML={{ __html: el.content }} />}
                                            {el.type === 'key-value' && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                                    {(Array.isArray(el.content) ? el.content : []).map(pair => (
                                                        <div key={pair.id} style={{ display: 'flex', width: '100%', marginBottom: '6px' }}>
                                                            <div style={{ fontWeight: 'bold', marginRight: '8px' }} dangerouslySetInnerHTML={{ __html: pair.key }} />
                                                            <span style={{ fontWeight: 'bold', marginRight: '8px' }}>-</span>
                                                            <div dangerouslySetInnerHTML={{ __html: pair.value }} />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <span>Page {idx + 1}</span>
                            {pages.length > 1 && hoveredPageIdx === idx && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); deletePage(idx); }}
                                    title="Delete Page"
                                    style={{
                                        position: 'absolute', top: '4px', right: '4px',
                                        background: '#ef4444', color: 'white', border: 'none',
                                        borderRadius: '4px', width: '22px', height: '22px',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '12px', fontWeight: 'bold'
                                    }}
                                >✕</button>
                            )}
                        </div>
                    ))}
                    <button className="ce-add-page-btn" onClick={addPage}>+ Add Page</button>
                </div>

                {/* Paper */}
                <div className="canvas-paper-wrapper" onMouseDown={(e) => {
                    // Only deselect if clicking the wrapper background itself
                    if (e.target === e.currentTarget) setSelectedElementId(null);
                }} style={{ overflowY: 'auto' }}>
                    <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', marginBottom: `${(zoom - 1) * (A4_HEIGHT * pages.length + (pages.length * 20))}px`, display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
                        {pages.map((page, idx) => (
                            <div
                                key={page.id}
                                ref={el => pageRefs.current[idx] = el}
                                className={`canvas-paper ${currentPageIndex === idx ? 'ce-page-active' : ''}`}
                                style={{ width: A4_WIDTH, height: A4_HEIGHT, boxShadow: currentPageIndex === idx ? '0 0 0 2px #3b82f6' : '0 1px 3px rgba(0,0,0,0.1)' }}
                                onMouseDown={() => setCurrentPageIndex(idx)}
                                onDragOver={e => { e.preventDefault(); setCurrentPageIndex(idx); }}
                                onDrop={async (e) => {
                                    e.preventDefault();
                                    setCurrentPageIndex(idx);
                                    const file = e.dataTransfer.files?.[0];
                                    if (file?.type.startsWith('image/')) {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        await handleImageUpload(file,
                                            (e.clientX - rect.left) / zoom,
                                            (e.clientY - rect.top) / zoom,
                                            idx
                                        );
                                    }
                                }}
                            >
                                {page.elements.map(el => (
                                    <Rnd
                                        key={el.id}
                                        className={`ce-element ${selectedElementId === el.id ? 'selected' : ''}`}
                                        size={{ width: el.width, height: el.height }}
                                        position={{ x: el.x, y: el.y }}
                                        lockAspectRatio={el.type === 'image'}
                                        enableResizing={{ top: true, right: true, bottom: true, left: true, topRight: true, bottomRight: true, bottomLeft: true, topLeft: true }}
                                        dragHandleClassName="ce-drag-handle"
                                        onDragStop={(e, d) => updateElement(el.id, { x: d.x, y: d.y })}
                                        onResizeStop={(e, dir, ref, delta, pos) => updateElement(el.id, { width: ref.style.width, height: ref.style.height, ...pos })}
                                        onMouseDown={e => { e.stopPropagation(); setCurrentPageIndex(idx); setSelectedElementId(el.id); }}
                                        bounds="parent"
                                        scale={zoom}
                                    >
                                        <div className="ce-drag-handle" title="Drag">⠿</div>
                                        {selectedElementId === el.id && (
                                            <button className="ce-delete-btn" onClick={e => { e.stopPropagation(); removeElement(el.id); }}>✕</button>
                                        )}
                                        {el.type === 'text' && (
                                            <TextEditor
                                                element={el}
                                                updateElement={updateElement}
                                                savedRangeRef={savedRangeRef}
                                            />
                                        )}
                                        {el.type === 'key-value' && (
                                            <KeyValueEditor
                                                element={el}
                                                updateElement={updateElement}
                                                savedRangeRef={savedRangeRef}
                                            />
                                        )}
                                        {el.type === 'image' && (
                                            el.content
                                                ? <img src={el.content} draggable={false} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', display: 'block' }} />
                                                : <div className="ce-upload-placeholder">⏳ Uploading…</div>
                                        )}
                                    </Rnd>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Save Modal ── */}
            {showSaveModal && (
                <div className="ce-modal-overlay">
                    <div className="ce-modal">
                        <h3>Save Study Material</h3>
                        <p>Please provide the required metadata before saving.</p>
                        
                        <div className="ce-modal-field">
                            <label>Title <span style={{color: 'red'}}>*</span></label>
                            <input 
                                value={metadata.title} 
                                onChange={e => setMetadata({...metadata, title: e.target.value})} 
                                placeholder="E.g. Indian History Notes" 
                            />
                        </div>
                        <div className="ce-modal-field">
                            <label>Subject <span style={{color: 'red'}}>*</span></label>
                            <input 
                                value={metadata.subject} 
                                onChange={e => setMetadata({...metadata, subject: e.target.value})} 
                                placeholder="E.g. History" 
                            />
                        </div>
                        <div className="ce-modal-field">
                            <label>Category</label>
                            <input 
                                value={metadata.category} 
                                onChange={e => setMetadata({...metadata, category: e.target.value})} 
                                placeholder="Optional" 
                            />
                        </div>
                        <div className="ce-modal-field">
                            <label>Topic</label>
                            <input 
                                value={metadata.topic} 
                                onChange={e => setMetadata({...metadata, topic: e.target.value})} 
                                placeholder="Optional" 
                            />
                        </div>
                        
                        <div className="ce-modal-field" style={{ marginTop: '16px' }}>
                            <label>Sub Headings / Key-Value Pairs</label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <input 
                                    value={subHeadingKey} 
                                    onChange={e => setSubHeadingKey(e.target.value)} 
                                    placeholder="Key" 
                                    style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                                <button className="ce-btn" onClick={AddSubHeading} type="button" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <IonIcon icon={addOutline} /> Add
                                </button>
                            </div>
                            <textarea 
                                value={subHeadingValue} 
                                onChange={e => setSubHeadingValue(e.target.value)} 
                                placeholder="Value" 
                                style={{ width: '100%', minHeight: '60px', marginBottom: '8px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
                            />
                            <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                                {metadata.subheading && metadata.subheading.map((obj, index) => (
                                    <div key={index} style={{ background: '#f8fafc', padding: '8px', borderRadius: '4px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', border: '1px solid #e2e8f0' }}>
                                        <div style={{ flex: 1, marginRight: '8px', fontSize: '14px' }}>
                                            <strong>{obj.key}:</strong> <span style={{ whiteSpace: 'pre-wrap' }}>{obj.value}</span>
                                        </div>
                                        <button onClick={() => removeSubHeading(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '16px', padding: '4px' }}>✕</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="ce-modal-actions" style={{ marginTop: '20px' }}>
                            <button className="ce-btn" onClick={() => setShowSaveModal(false)}>Cancel</button>
                            <button 
                                className="ce-btn ce-btn-save" 
                                onClick={() => executeSave(metadata)}
                                disabled={!metadata.title || !metadata.subject || isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Confirm Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CanvasEditor;
