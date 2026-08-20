import React, { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { IonIcon } from '@ionic/react';
import { addOutline, saveOutline, imageOutline, arrowBackOutline, trashOutline, reorderThreeOutline, chevronDownOutline, chevronUpOutline, languageOutline, documentTextOutline } from 'ionicons/icons';
import { FaMicrophone, FaStop } from 'react-icons/fa';
import { ReactTransliterate } from 'react-transliterate';
import 'react-transliterate/dist/index.css';
import VoiceInputWrapper from '../../Components/VoiceInput/VoiceInputWrapper';
import '../../Components/VoiceInput/VoiceInput.css';
import './NoteBlockEditor.css';
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import { addNote, updateNotes } from '../../services/notes';
import { addStudyMaterial } from '../../services/studyMaterialService';
import { Loader } from '../../Components/Loader/Loader';

// ── Auto-convert old note format to blocks ───────────────────────────
const convertLegacyToBlocks = (note) => {
    if (note.blocks && note.blocks.length > 0) return note.blocks;
    const blocks = [];
    let order = 0;
    if (note.heading) {
        blocks.push({ id: uuidv4(), type: 'heading', content: note.heading, order: order++ });
    }
    if (note.description) {
        blocks.push({ id: uuidv4(), type: 'description', content: note.description, order: order++ });
    }
    if (note.subheading && note.subheading.length > 0) {
        note.subheading.forEach(sh => {
            blocks.push({ id: uuidv4(), type: 'key-value', content: { key: sh.key, value: sh.value }, order: order++ });
        });
    }
    if (note.points && note.points.length > 0) {
        note.points.forEach(p => {
            blocks.push({ id: uuidv4(), type: 'point', content: p, order: order++ });
        });
    }
    if (note.review) {
        blocks.push({ id: uuidv4(), type: 'review', content: note.review, order: order++ });
    }
    return blocks;
};

// ── Malayalam Transliterate Input ─────────────────────────────────
const MlInput = ({ value, onChange, placeholder, inputRef, className, style, onKeyDown, onBlur, mlEnabled, multiLine = false, autoFocus = false }) => {
    const internalRef = useRef(null);

    useEffect(() => {
        if (multiLine && internalRef.current) {
            internalRef.current.style.height = 'auto';
            internalRef.current.style.height = internalRef.current.scrollHeight + 'px';
        }
    }, [value, multiLine]);

    return (
        <ReactTransliterate
            value={value || ''}
            onChangeText={onChange}
                lang="ml"
                enabled={mlEnabled}
                renderComponent={(props) => {
                    const mergedProps = {
                        ...props,
                        ref: (el) => {
                            if (typeof props.ref === 'function') props.ref(el);
                            else if (props.ref) props.ref.current = el;
                            if (inputRef) inputRef.current = el;
                            internalRef.current = el;
                        },
                        className: className || '',
                        placeholder: placeholder,
                        onKeyDown: (e) => {
                            if (props.onKeyDown) props.onKeyDown(e);
                            if (onKeyDown && !e.defaultPrevented) onKeyDown(e);
                        },
                        onBlur: (e) => {
                            if (props.onBlur) props.onBlur(e);
                            if (onBlur) onBlur(e);
                        },
                        autoFocus: autoFocus
                    };

                    if (multiLine) {
                        return (
                            <textarea
                                {...mergedProps}
                                style={{ ...style, resize: 'none', overflow: 'hidden' }}
                                rows={1}
                                onInput={(e) => {
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                }}
                            />
                        );
                    }
                    return <input {...mergedProps} style={style} />;
                }}
            />
    );
};

// ── Block Components ─────────────────────────────────────────────

const HeadingBlock = ({ block, onUpdate, onKeyDown, mlEnabled }) => {
    return (
        <div className="nbe-heading-block">
            <MlInput
                value={block.content || ''}
                onChange={(val) => onUpdate(block.id, val)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        const val = e.currentTarget.value;
                        const cursor = e.currentTarget.selectionStart;
                        if (cursor > 0 && val[cursor - 1] === '\n') {
                            e.preventDefault();
                            onUpdate(block.id, val.slice(0, cursor - 1) + val.slice(cursor));
                            onKeyDown(block.id, 'heading');
                        }
                    }
                }}
                mlEnabled={mlEnabled}
                multiLine={true}
                placeholder="Heading..."
                className="nbe-block-input"
            />
        </div>
    );
};

const DescriptionBlock = ({ block, onUpdate, onKeyDown, mlEnabled }) => {
    return (
        <div className="nbe-desc-block">
            <MlInput
                value={block.content || ''}
                onChange={(val) => onUpdate(block.id, val)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        const val = e.currentTarget.value;
                        const cursor = e.currentTarget.selectionStart;
                        if (cursor > 0 && val[cursor - 1] === '\n') {
                            e.preventDefault();
                            onUpdate(block.id, val.slice(0, cursor - 1) + val.slice(cursor));
                            onKeyDown(block.id, 'description');
                        }
                    }
                }}
                mlEnabled={mlEnabled}
                multiLine={true}
                placeholder="Description..."
                className="nbe-block-input"
            />
        </div>
    );
};

const KVBlock = ({ block, onUpdate, onKeyDown, mlEnabled, toggleVoice, listeningBlockId }) => {
    const content = block.content || {};
    const combinedText = content.rawText !== undefined 
        ? content.rawText 
        : ((content.key || '') + (content.value ? ' - ' + content.value : ''));

    const handleChange = (val) => {
        onUpdate(block.id, { ...content, rawText: val });
    };

    const renderFormattedText = (text) => {
        if (!text) return <span style={{ color: '#cbd5e1' }}>Key - Value</span>;
        const idx = text.indexOf('-');
        if (idx !== -1) {
            return (
                <>
                    <span style={{ color: 'inherit' }}>{text.substring(0, idx + 1)}</span>
                    <span style={{ color: '#16a34a', fontWeight: 500 }}>{text.substring(idx + 1)}</span>
                </>
            );
        }
        return <span style={{ color: 'inherit' }}>{text}</span>;
    };

    return (
        <div className="nbe-kv-block" style={{ position: 'relative' }}>
            <div className="nbe-kv-key-group" style={{ flex: '1 1 auto', width: '100%' }}>
                <span className="nbe-kv-arrow">➔</span>
                <div className="nbe-kv-key" style={{ position: 'relative', width: '100%' }}>
                    {/* Background div rendering colored text to overlay behind the transparent textarea */}
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: '1.6em', padding: 0, font: 'inherit', pointerEvents: 'none' }}>
                        {renderFormattedText(combinedText)}
                    </div>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} className="nbe-ml-input-wrapper-full">
                        <MlInput
                            value={combinedText}
                            onChange={handleChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Tab') {
                                    e.preventDefault();
                                    const val = e.currentTarget.value;
                                    const cursor = e.currentTarget.selectionStart;
                                    const hyphenIdx = val.indexOf('-');
                                    
                                    if (hyphenIdx === -1) {
                                        const newVal = val.slice(0, cursor) + ' - ' + val.slice(cursor);
                                        onUpdate(block.id, { ...content, rawText: newVal });
                                        setTimeout(() => {
                                            if (e.target) {
                                                e.target.selectionStart = cursor + 3;
                                                e.target.selectionEnd = cursor + 3;
                                            }
                                        }, 0);
                                    } else if (cursor <= hyphenIdx) {
                                        setTimeout(() => {
                                            if (e.target) {
                                                e.target.selectionStart = hyphenIdx + 2;
                                                e.target.selectionEnd = hyphenIdx + 2;
                                            }
                                        }, 0);
                                    }
                                }
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    const val = e.currentTarget.value;
                                    const cursor = e.currentTarget.selectionStart;
                                    if (cursor > 0 && val[cursor - 1] === '\n') {
                                        e.preventDefault();
                                        onUpdate(block.id, { ...content, rawText: val.slice(0, cursor - 1) + val.slice(cursor) });
                                        onKeyDown(block.id, 'key-value');
                                    }
                                }
                            }}
                            mlEnabled={mlEnabled}
                            multiLine={true}
                            placeholder=""
                            className="nbe-block-input nbe-transparent-input"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const PointBlock = ({ block, onUpdate, onKeyDown, mlEnabled }) => {
    return (
        <div className="nbe-point-block">
            <span className="nbe-point-arrow">➔</span>
            <div className="nbe-point-text">
                <MlInput
                    value={block.content || ''}
                    onChange={(val) => onUpdate(block.id, val)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            const val = e.currentTarget.value;
                            const cursor = e.currentTarget.selectionStart;
                            if (cursor > 0 && val[cursor - 1] === '\n') {
                                e.preventDefault();
                                onUpdate(block.id, val.slice(0, cursor - 1) + val.slice(cursor));
                                onKeyDown(block.id, 'point');
                            }
                        }
                    }}
                    mlEnabled={mlEnabled}
                    multiLine={true}
                    placeholder="Point..."
                    className="nbe-block-input"
                />
            </div>
        </div>
    );
};

const ImageBlock = ({ block, onUpdate }) => {
    const content = typeof block.content === 'object' && block.content !== null ? block.content : {};
    const fileRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [imgWidth, setImgWidth] = useState(content.width);
    const resizeRef = useRef(null);

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const localUrl = URL.createObjectURL(file);
        onUpdate(block.id, { ...content, url: localUrl, align: content.align || 'center', rawFile: file });
    };

    const setAlign = (align) => onUpdate(block.id, { ...content, align });

    const handleResizeStart = (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = imgWidth || e.target.closest('.nbe-image-wrapper')?.querySelector('img')?.offsetWidth || 300;
        const onMove = (ev) => {
            const newWidth = Math.max(100, startWidth + (ev.clientX - startX));
            setImgWidth(newWidth);
        };
        const onUp = () => {
            onUpdate(block.id, { ...content, width: imgWidth });
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    if (!content.url) {
        return (
            <div className="nbe-image-block">
                <div className="nbe-image-upload-area" onClick={() => fileRef.current?.click()}>
                    {uploading ? <Loader size={30} /> : (
                        <>
                            <IonIcon icon={imageOutline} />
                            <div>Click to upload image</div>
                        </>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
                </div>
            </div>
        );
    }

    return (
        <div className={`nbe-image-block align-${content.align || 'center'}`}>
            <div className="nbe-image-wrapper" style={{ width: imgWidth || 'auto', maxWidth: '100%' }}>
                <img src={content.url} alt="" style={{ width: '100%' }} />
                <div className="nbe-image-toolbar">
                    <button className={content.align === 'left' ? 'active' : ''} onClick={() => setAlign('left')}>Left</button>
                    <button className={content.align === 'center' || !content.align ? 'active' : ''} onClick={() => setAlign('center')}>Center</button>
                    <button className={content.align === 'right' ? 'active' : ''} onClick={() => setAlign('right')}>Right</button>
                    <button className={content.align === 'float-left' ? 'active' : ''} onClick={() => setAlign('float-left')}>Float L</button>
                    <button className={content.align === 'float-right' ? 'active' : ''} onClick={() => setAlign('float-right')}>Float R</button>
                    <button onClick={() => fileRef.current?.click()}>Replace</button>
                </div>
                <div className="nbe-image-resize" ref={resizeRef} onMouseDown={handleResizeStart} />
                <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
            </div>
        </div>
    );
};

const ReviewBlock = ({ block, onUpdate, mlEnabled }) => {
    return (
        <div className="nbe-review-block">
            <div className="nbe-review-label">💡 Review / Tip</div>
            <MlInput
                value={block.content || ''}
                onChange={(val) => onUpdate(block.id, val)}
                mlEnabled={mlEnabled}
                multiLine={true}
                placeholder="Review notes..."
                className="nbe-block-input"
            />
        </div>
    );
};
// ── Block type menu items ─────────────────────────────────────────
const BLOCK_TYPES = [
    { type: 'heading', icon: '📌', label: 'Heading' },
    { type: 'description', icon: '📝', label: 'Description' },
    { type: 'key-value', icon: '🔑', label: 'Key-Value' },
    { type: 'point', icon: '➔', label: 'Point' },
    { type: 'image', icon: '🖼️', label: 'Image' },
    { type: 'review', icon: '💡', label: 'Review / Tip' },
];

// ══════════════════════════════════════════════════════════════════
// ── Main NoteBlockEditor Component ──────────────────────────────
// ══════════════════════════════════════════════════════════════════
const NoteBlockEditor = ({ note, subject, subfolder, subtopic: subtopicProp, parentFolderId, onBack, onSaved }) => {
    const isEdit = !!note?._id;
    const token = localStorage.getItem('token');

    // Metadata
    const [topic, setTopic] = useState(note?.topic || subfolder || '');
    const [subtopic, setSubtopic] = useState(note?.subtopic || subtopicProp || '');
    const [post, setPost] = useState(note?.post || '');
    const [category, setCategory] = useState(note?.category || '');
    const [noteSubject, setNoteSubject] = useState(note?.subject || subject || '');
    const [metaOpen, setMetaOpen] = useState(false);

    // Blocks
    const [blocks, setBlocks] = useState(() => {
        if (note) return convertLegacyToBlocks(note);
        return [];
    });

    const [showMenu, setShowMenu] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Malayalam panel
    const [mlEnabled, setMlEnabled] = useState(false);
    const [mlText, setMlText] = useState('');
    const [mlTarget, setMlTarget] = useState(null); // { blockId, field? }
    const mlInputRef = useRef(null);

    // Voice
    const recognitionRef = useRef(null);
    const [listeningBlockId, setListeningBlockId] = useState(null);

    // Drag state
    const [dragId, setDragId] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);

    // ── Block CRUD ───────────────────────────────────────────────
    const addBlock = useCallback((type, afterId = null) => {
        setListeningBlockId(prev => {
            if (prev && recognitionRef.current) {
                recognitionRef.current.stop();
            }
            return null;
        });
        const newBlock = {
            id: uuidv4(),
            type,
            content: type === 'key-value' ? { key: '', value: '' } : type === 'image' ? {} : '',
            order: 0,
        };
        setBlocks(prev => {
            let newBlocks;
            if (afterId) {
                const idx = prev.findIndex(b => b.id === afterId);
                newBlocks = [...prev];
                newBlocks.splice(idx + 1, 0, newBlock);
            } else {
                newBlocks = [...prev, newBlock];
            }
            return newBlocks.map((b, i) => ({ ...b, order: i }));
        });
        setShowMenu(false);
        // Focus the new block after render
        setTimeout(() => {
            const el = document.querySelector(`[data-block-id="${newBlock.id}"] textarea, [data-block-id="${newBlock.id}"] input`);
            if (el) el.focus();
        }, 50);
    }, []);

    const updateBlock = useCallback((id, content) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
    }, []);

    const removeBlock = useCallback((id) => {
        setBlocks(prev => prev.filter(b => b.id !== id).map((b, i) => ({ ...b, order: i })));
    }, []);

    const handleEnterKey = useCallback((blockId, blockType) => {
        addBlock(blockType, blockId);
    }, [addBlock]);

    // ── Drag & Drop ──────────────────────────────────────────────
    const handleDragStart = (e, id) => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; };
    const handleDragOver = (e, id) => { e.preventDefault(); setDragOverId(id); };
    const handleDragLeave = () => setDragOverId(null);
    const handleDrop = (e, dropId) => {
        e.preventDefault();
        if (!dragId || dragId === dropId) { setDragId(null); setDragOverId(null); return; }
        setBlocks(prev => {
            const newBlocks = [...prev];
            const dragIdx = newBlocks.findIndex(b => b.id === dragId);
            const dropIdx = newBlocks.findIndex(b => b.id === dropId);
            const [dragged] = newBlocks.splice(dragIdx, 1);
            newBlocks.splice(dropIdx, 0, dragged);
            return newBlocks.map((b, i) => ({ ...b, order: i }));
        });
        setDragId(null);
        setDragOverId(null);
    };

    // ── Voice input ──────────────────────────────────────────────
    const toggleVoice = (blockId, targetField) => {
        const listenId = targetField ? `${blockId}-${targetField}` : blockId;
        if (listeningBlockId === listenId) {
            recognitionRef.current?.stop();
            setListeningBlockId(null);
            return;
        }
        if (recognitionRef.current) recognitionRef.current.stop();
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { alert('Speech recognition not supported'); return; }
        const recog = new SR();
        recog.lang = 'ml-IN';
        recog.continuous = true;
        recog.interimResults = false;
        recog.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) transcript += event.results[i][0].transcript + ' ';
            }
            if (transcript) {
                setBlocks(prev => prev.map(b => {
                    if (b.id !== blockId) return b;
                    if (b.type === 'key-value') {
                        const existingText = b.content?.rawText !== undefined 
                            ? b.content.rawText 
                            : ((b.content?.key || '') + (b.content?.value ? ' - ' + b.content.value : ''));
                        return { ...b, content: { ...b.content, rawText: existingText + transcript } };
                    }
                    return { ...b, content: (b.content || '') + transcript };
                }));
            }
        };
        recog.onerror = () => setListeningBlockId(null);
        recog.onend = () => setListeningBlockId(null);
        recog.start();
        recognitionRef.current = recog;
        setListeningBlockId(listenId);
    };

    useEffect(() => { return () => { if (recognitionRef.current) recognitionRef.current.stop(); }; }, []);

    // ── Save ─────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!noteSubject) { alert('Please set a subject'); return; }
        setIsSaving(true);
        
        try {
            // Upload pending images first
            const finalBlocks = await Promise.all(blocks.map(async (b) => {
                if (b.type === 'image' && b.content?.rawFile) {
                    const uploadedUrl = await uploadImageToCloudinary(b.content.rawFile);
                    const { rawFile, ...rest } = b.content;
                    return { ...b, content: { ...rest, url: uploadedUrl } };
                }
                return b;
            }));

            // Reconstruct legacy fields from finalBlocks for backward compatibility
            const heading = finalBlocks.find(b => b.type === 'heading')?.content || '';
            const description = finalBlocks.find(b => b.type === 'description')?.content || '';
            const subheading = finalBlocks.filter(b => b.type === 'key-value').map(b => {
                if (b.content?.rawText !== undefined) {
                    const text = b.content.rawText;
                    const idx = text.indexOf('-');
                    if (idx !== -1) {
                        return { key: text.substring(0, idx).trimEnd(), value: text.substring(idx + 1).trimStart() };
                    }
                    return { key: text, value: '' };
                }
                return { key: b.content?.key || '', value: b.content?.value || '' };
            });

            // Mutate finalBlocks so backend gets the correct format
            finalBlocks.forEach(b => {
                if (b.type === 'key-value' && b.content?.rawText !== undefined) {
                    const text = b.content.rawText;
                    const idx = text.indexOf('-');
                    if (idx !== -1) {
                        b.content.key = text.substring(0, idx).trimEnd();
                        b.content.value = text.substring(idx + 1).trimStart();
                    } else {
                        b.content.key = text;
                        b.content.value = '';
                    }
                    delete b.content.rawText;
                }
            });

            const points = finalBlocks.filter(b => b.type === 'point').map(b => b.content || '');
            const review = finalBlocks.find(b => b.type === 'review')?.content || '';

            const noteObj = {
                heading, description, subheading, points, review,
                subject: noteSubject, category, topic, subtopic, post,
                blocks: finalBlocks.map((b, i) => ({ ...b, order: i })),
                parentFolderId: parentFolderId || null
            };

            if (isEdit) {
                noteObj._id = note._id;
                await updateNotes(noteObj);
            } else {
                await addNote(token, noteObj);
            }
            if (onSaved) onSaved();
            if (onBack) onBack();
        } catch (err) {
            console.error('Save error:', err);
            alert(`Error saving note: ${err.response?.data?.error || err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Generate Study Material ────────────────────────────────────
    const handleGenerateStudyMaterial = async () => {
        if (!noteSubject) { alert('Please set a subject before generating'); return; }
        setIsGenerating(true);
        try {
            const elements = [];
            let currentY = 50;
            const PADDING = 20;
            
            blocks.forEach((block) => {
                let el = {
                    id: uuidv4(),
                    x: 50,
                    y: currentY,
                    width: block.type === 'image' ? 300 : 700,
                    height: 'auto',
                };
                
                if (block.type === 'heading') {
                    el.type = 'text';
                    el.subType = 'heading';
                    el.content = block.content;
                    el.styles = { fontSize: '24px', fontWeight: 'bold' };
                    currentY += 40;
                } else if (block.type === 'description') {
                    el.type = 'text';
                    el.subType = 'paragraph';
                    el.content = block.content;
                    currentY += 60;
                } else if (block.type === 'key-value') {
                    el.type = 'text';
                    el.subType = 'paragraph';
                    let key = block.content?.key || '';
                    let value = block.content?.value || '';
                    if (block.content?.rawText !== undefined) {
                        const idx = block.content.rawText.indexOf('-');
                        if (idx !== -1) {
                            key = block.content.rawText.substring(0, idx).trimEnd();
                            value = block.content.rawText.substring(idx + 1).trimStart();
                        } else {
                            key = block.content.rawText;
                            value = '';
                        }
                    }
                    el.content = value ? `➔ ${key} - ${value}` : `➔ ${key}`;
                    currentY += 40;
                } else if (block.type === 'point') {
                    el.type = 'text';
                    el.subType = 'paragraph';
                    el.content = `➔ ${block.content}`;
                    currentY += 40;
                } else if (block.type === 'review') {
                    el.type = 'text';
                    el.subType = 'paragraph';
                    el.content = `💡 Review: ${block.content}`;
                    el.styles = { backgroundColor: '#fffbeb' };
                    currentY += 60;
                } else if (block.type === 'image') {
                    el.type = 'image';
                    el.content = block.content?.url;
                    el.width = block.content?.width || 300;
                    if (block.content?.align === 'center') el.x = (800 - el.width) / 2;
                    else if (block.content?.align === 'right') el.x = 800 - el.width - 50;
                    currentY += 220; // estimate
                }
                elements.push(el);
            });

            const studyMaterialObj = {
                title: topic || 'Generated Material',
                subject: noteSubject,
                category, topic, subtopic, post,
                pages: [{
                    id: uuidv4(),
                    elements
                }]
            };

            await addStudyMaterial(studyMaterialObj);
            alert('Study Material generated successfully!');
        } catch (err) {
            console.error('Generate error:', err);
            alert(`Error generating material: ${err.response?.data?.error || err.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // ── Render a single block ────────────────────────────────────
    const renderBlock = (block) => {
        switch (block.type) {
            case 'heading': return <HeadingBlock block={block} onUpdate={updateBlock} onKeyDown={handleEnterKey} mlEnabled={mlEnabled} />;
            case 'description': return <DescriptionBlock block={block} onUpdate={updateBlock} onKeyDown={handleEnterKey} mlEnabled={mlEnabled} />;
            case 'key-value': return <KVBlock block={block} onUpdate={updateBlock} onKeyDown={handleEnterKey} mlEnabled={mlEnabled} toggleVoice={toggleVoice} listeningBlockId={listeningBlockId} />;
            case 'point': return <PointBlock block={block} onUpdate={updateBlock} onKeyDown={handleEnterKey} mlEnabled={mlEnabled} />;
            case 'image': return <ImageBlock block={block} onUpdate={updateBlock} />;
            case 'review': return <ReviewBlock block={block} onUpdate={updateBlock} mlEnabled={mlEnabled} />;
            default: return null;
        }
    };

    return (
        <div className="nbe-container">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <button className="nbe-cancel-btn" onClick={onBack}>
                    <IonIcon icon={arrowBackOutline} /> Back
                </button>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>{isEdit ? 'Edit Note' : 'New Note'}</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        className={`nbe-ml-toggle ${mlEnabled ? 'active' : ''}`}
                        onClick={() => setMlEnabled(!mlEnabled)}
                        title={mlEnabled ? 'Malayalam ON' : 'Malayalam OFF'}
                    >
                        <IonIcon icon={languageOutline} />
                    </button>
                    <button className="nbe-cancel-btn" onClick={handleGenerateStudyMaterial} disabled={isGenerating} style={{ color: '#059669', borderColor: '#34d399', background: '#ecfdf5' }}>
                        {isGenerating ? <Loader size={18} /> : <><IonIcon icon={documentTextOutline} /> Generate Material</>}
                    </button>
                    <button className="nbe-save-btn" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader size={18} /> : <><IonIcon icon={saveOutline} /> Save</>}
                    </button>
                </div>
            </div>

            {/* Metadata bar */}
            <div className="nbe-meta-bar">
                <button className="nbe-meta-toggle" onClick={() => setMetaOpen(!metaOpen)}>
                    <span>📋 Metadata — {noteSubject || 'Set subject'} {topic ? `/ ${topic}` : ''}</span>
                    <IonIcon icon={metaOpen ? chevronUpOutline : chevronDownOutline} />
                </button>
                {metaOpen && (
                    <div className="nbe-meta-fields">
                        <div className="nbe-meta-group">
                            <label>Subject</label>
                            <MlInput value={noteSubject} onChange={setNoteSubject} placeholder="Subject" mlEnabled={mlEnabled} className="nbe-meta-input" />
                        </div>
                        <div className="nbe-meta-group">
                            <label>Topic</label>
                            <MlInput value={topic} onChange={setTopic} placeholder="Topic (Folder Name)" mlEnabled={mlEnabled} className="nbe-meta-input" />
                        </div>
                        <div className="nbe-meta-group">
                            <label>Sub Topic</label>
                            <MlInput value={subtopic} onChange={setSubtopic} placeholder="Sub Topic" mlEnabled={mlEnabled} className="nbe-meta-input" />
                        </div>
                        <div className="nbe-meta-group">
                            <label>Category (Optional)</label>
                            <MlInput value={category} onChange={setCategory} placeholder="Category" mlEnabled={mlEnabled} className="nbe-meta-input" />
                        </div>
                        <div className="nbe-meta-group">
                            <label>Post</label>
                            <MlInput value={post} onChange={setPost} placeholder="Post details" mlEnabled={mlEnabled} className="nbe-meta-input" />
                        </div>
                    </div>
                )}
            </div>

            {/* Blocks area */}
            <div className="nbe-blocks-area">
                {blocks.length === 0 && (
                    <div className="nbe-blocks-empty">
                        <IonIcon icon={addOutline} />
                        <div>Start adding content blocks below</div>
                    </div>
                )}

                {blocks.map((block) => {
                    let floatClass = '';
                    if (block.type === 'image' && block.content?.align) {
                        if (block.content.align === 'float-left') floatClass = 'nbe-block-float-left';
                        if (block.content.align === 'float-right') floatClass = 'nbe-block-float-right';
                    }
                    return (
                        <div
                            key={block.id}
                            data-block-id={block.id}
                            className={`nbe-block ${block.type === 'image' ? 'nbe-block-type-image' : ''} ${dragId === block.id ? 'nbe-dragging' : ''} ${dragOverId === block.id ? 'nbe-drag-over' : ''} ${floatClass}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, block.id)}
                            onDragOver={(e) => handleDragOver(e, block.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, block.id)}
                        >
                            <div className="nbe-drag-handle" title="Drag to reorder">
                                <IonIcon icon={reorderThreeOutline} />
                            </div>
                        <div className="nbe-block-content">
                            {renderBlock(block)}
                        </div>
                        <div className="nbe-block-actions">
                            {block.type !== 'image' && (
                                <button
                                    className="nbe-block-action-btn"
                                    title="Voice input"
                                    onClick={() => toggleVoice(block.id)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    style={{ color: listeningBlockId === block.id ? '#ef4444' : undefined }}
                                >
                                    {listeningBlockId === block.id ? <FaStop size={12} /> : <FaMicrophone size={12} />}
                                    {listeningBlockId === block.id && <span className="listening-pulse" style={{ width: 20, height: 20 }} />}
                                </button>
                            )}
                            <button className="nbe-block-action-btn" title="Delete block" onClick={() => removeBlock(block.id)}>
                                <IonIcon icon={trashOutline} />
                            </button>
                        </div>
                    </div>
                    );
                })}

                {/* Add block */}
                <div className="nbe-add-block-row">
                    {showMenu && (
                        <div className="nbe-block-menu">
                            {BLOCK_TYPES.map(bt => (
                                <button key={bt.type} className="nbe-block-menu-item" onClick={() => addBlock(bt.type)}>
                                    <span className="nbe-menu-icon">{bt.icon}</span> {bt.label}
                                </button>
                            ))}
                        </div>
                    )}
                    <button className="nbe-add-block-btn" onClick={() => setShowMenu(!showMenu)}>
                        <IonIcon icon={addOutline} /> Add Block
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NoteBlockEditor;
