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
            containerStyle={{ width: '100%', flex: style?.flex || 1, display: 'flex' }}
            containerClassName="ml-input-container"
            renderComponent={(props) => {
                    const mergedProps = {
                        ...props,
                        ref: (el) => {
                            if (typeof props.ref === 'function') props.ref(el);
                            else if (props.ref) props.ref.current = el;
                            
                            if (typeof inputRef === 'function') inputRef(el);
                            else if (inputRef) inputRef.current = el;
                            
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

const HeadingBlock = ({ block, onUpdate, onUpdateField, onKeyDown, mlEnabled }) => {
    const size = block.size || 'h3';
    return (
        <div className="nbe-heading-block" style={{
            fontSize: size === 'h1' ? '2.5em' : size === 'h2' ? '2em' : size === 'h3' ? '1.5em' : size === 'h4' ? '1.2em' : size === 'h5' ? '1em' : '0.8em',
        }}>
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
                className={`nbe-block-input heading-input-${size}`}
                style={{
                    fontWeight: 'bold',
                    marginTop: 0
                }}
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

const KVBlock = ({ block, onUpdate, onKeyDown, mlEnabled, toggleVoice, listeningBlockId, onDelete }) => {
    const content = block.content || { key: '', values: [] };
    let values = content.values || [];
    if (values.length === 0 && content.value) {
        values = content.value.split('\n').filter(l => l.trim() !== '').map(l => ({ text: l, image: '' }));
    }

    const [isEditing, setIsEditing] = useState(!content.key && values.length === 0);
    const [isHovered, setIsHovered] = useState(false);
    const valueRefs = useRef([]);

    const handleKeyChange = (val) => {
        onUpdate(block.id, { ...content, key: val });
    };

    const addValue = () => {
        onUpdate(block.id, { ...content, values: [...values, { text: '', image: '' }] });
    };

    const handleKeyEnter = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addValue();
            setTimeout(() => {
                const newIndex = values.length;
                if (valueRefs.current[newIndex]) {
                    valueRefs.current[newIndex].focus();
                }
            }, 50);
        }
    };

    const updateText = (index, val) => {
        const newValues = [...values];
        newValues[index] = { ...newValues[index], text: val };
        onUpdate(block.id, { ...content, values: newValues });
    };

    const updateImage = (index, e) => {
        const file = e.target.files[0];
        if (!file) return;
        const localUrl = URL.createObjectURL(file);
        const newValues = [...values];
        newValues[index] = { ...newValues[index], image: localUrl, rawFile: file };
        onUpdate(block.id, { ...content, values: newValues });
        e.target.value = '';
    };

    const removeImage = (index) => {
        const newValues = [...values];
        newValues[index] = { ...newValues[index], image: '', rawFile: null };
        onUpdate(block.id, { ...content, values: newValues });
    };

    const removeValue = (index) => {
        const newValues = values.filter((_, i) => i !== index);
        onUpdate(block.id, { ...content, values: newValues });
    };

    const updateKeyImage = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const localUrl = URL.createObjectURL(file);
        onUpdate(block.id, { ...content, image: localUrl, rawFile: file });
        e.target.value = '';
    };

    const removeKeyImage = () => {
        onUpdate(block.id, { ...content, image: '', rawFile: null });
    };

    if (!isEditing) {
        return (
            <div 
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{ position: 'relative', display: 'block', padding: '10px 16px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', width: '100%', marginBottom: '4px', overflow: 'hidden' }}
            >
                {content.image && (
                    <img 
                        src={content.image} 
                        alt="" 
                        style={{ 
                            maxWidth: '50%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            float: content.imageAlign === 'left' ? 'left' : (content.imageAlign === 'right' ? 'right' : 'none'),
                            margin: content.imageAlign === 'left' ? '0 12px 4px 0' : (content.imageAlign === 'right' ? '0 0 4px 12px' : '0 auto 12px auto'),
                            display: (!content.imageAlign || content.imageAlign === 'center') ? 'block' : 'inline-block'
                        }} 
                    />
                )}
                
                <div style={{ display: 'inline', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, marginRight: '8px', color: '#475569' }}>-&gt;</span>
                    <span className="notes-subheading-key" style={{ display: 'inline', fontWeight: 600, color: '#1e293b' }}>{content.key}</span>
                </div>

                <div style={{ display: 'block', marginTop: '4px' }}>
                    {values.length > 0 ? values.map((v, i) => (
                        <div key={i} style={{ marginBottom: '8px' }}>
                            {v.text && <div className="notes-subheading-value" style={{ color: '#475569', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: v.text || '' }} />}
                            {v.image && <img src={v.image} alt="" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', marginTop: '8px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />}
                        </div>
                    )) : null}
                </div>
                
                {isHovered && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px' }}>
                        <button onClick={() => setIsEditing(true)} style={{ padding: '6px 12px', background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                            Edit
                        </button>
                        <button onClick={onDelete} style={{ padding: '6px 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                            Delete
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="nbe-kv-block" style={{ display: 'block', padding: '10px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', width: '100%', marginBottom: '4px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Editing Block</span>
                <button onClick={() => setIsEditing(false)} style={{ padding: '4px 12px', background: '#ecfccb', color: '#4d7c0f', border: '1px solid #bef264', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                    Done
                </button>
            </div>
            
            <div style={{ 
                float: (content.image && content.imageAlign === 'left') ? 'left' : ((content.image && content.imageAlign === 'right') ? 'right' : 'none'),
                margin: (content.image && content.imageAlign === 'left') ? '0 12px 12px 0' : ((content.image && content.imageAlign === 'right') ? '0 0 12px 12px' : '0 auto 12px auto'),
                maxWidth: (!content.image || !content.imageAlign || content.imageAlign === 'center') ? '100%' : '40%',
                display: (!content.image || !content.imageAlign || content.imageAlign === 'center') ? 'block' : 'inline-block'
            }}>
                {content.image ? (
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <img src={content.image} alt="Key Image" style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                        <button onClick={removeKeyImage} style={{ position: 'absolute', top: '4px', right: '4px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                            <IonIcon icon={trashOutline} style={{ fontSize: '12px' }} />
                        </button>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                            <button onClick={() => onUpdate(block.id, { ...content, imageAlign: 'left' })} style={{ fontSize: '0.7rem', padding: '2px 6px', background: content.imageAlign === 'left' ? '#e2e8f0' : '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>Left</button>
                            <button onClick={() => onUpdate(block.id, { ...content, imageAlign: 'center' })} style={{ fontSize: '0.7rem', padding: '2px 6px', background: (!content.imageAlign || content.imageAlign === 'center') ? '#e2e8f0' : '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>Center</button>
                            <button onClick={() => onUpdate(block.id, { ...content, imageAlign: 'right' })} style={{ fontSize: '0.7rem', padding: '2px 6px', background: content.imageAlign === 'right' ? '#e2e8f0' : '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>Right</button>
                        </div>
                    </div>
                ) : (
                    <label style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                        <IonIcon icon={imageOutline} /> Attach Top Image
                        <input type="file" accept="image/*" onChange={updateKeyImage} style={{ display: 'none' }} />
                    </label>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', overflow: 'hidden' }}>
                <span style={{ fontWeight: 'bold', color: '#6366f1', marginTop: '6px', fontSize: '1.1rem' }}>-&gt;</span>
                <MlInput
                    value={content.key || ''}
                    onChange={handleKeyChange}
                    onKeyDown={handleKeyEnter}
                    mlEnabled={mlEnabled}
                    multiLine={true}
                    placeholder="Enter Key sentence..."
                    className="nbe-block-input"
                    style={{ flex: 1, padding: '4px 6px', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '24px', backgroundColor: '#f9fafb', fontSize: '0.95rem' }}
                />
            </div>
            
            <div style={{ display: 'block', marginTop: '4px' }}>
                {values.map((v, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', flexDirection: 'column', backgroundColor: '#ffffff', padding: '6px', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
                            <MlInput
                                value={v.text || ''}
                                onChange={(val) => updateText(index, val)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        addValue();
                                        setTimeout(() => {
                                            const newIndex = values.length;
                                            if (valueRefs.current[newIndex]) valueRefs.current[newIndex].focus();
                                        }, 50);
                                    }
                                }}
                                inputRef={(el) => (valueRefs.current[index] = el)}
                                mlEnabled={mlEnabled}
                                multiLine={true}
                                placeholder="Enter Text Value..."
                                className="nbe-block-input"
                                style={{ flex: 1, width: '100%', padding: '4px 6px', borderRadius: '6px', border: '1px solid #e5e7eb', minHeight: '24px', backgroundColor: '#ffffff', fontSize: '0.95rem' }}
                            />
                            <button onClick={() => removeValue(index)} style={{ padding: '6px', color: '#ef4444', background: '#fee2e2', border: 'none', cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IonIcon icon={trashOutline} />
                            </button>
                        </div>
                        {v.image ? (
                            <div style={{ position: 'relative', marginTop: '2px' }}>
                                <img src={v.image} alt="Value" style={{ maxWidth: '180px', maxHeight: '180px', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                                <button onClick={() => removeImage(index)} style={{ position: 'absolute', top: '4px', right: '4px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                                    <IonIcon icon={trashOutline} style={{ fontSize: '12px' }} />
                                </button>
                            </div>
                        ) : (
                            <label style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                <IonIcon icon={imageOutline} /> Attach Image
                                <input type="file" accept="image/*" onChange={(e) => updateImage(index, e)} style={{ display: 'none' }} />
                            </label>
                        )}
                    </div>
                ))}
                
                <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                    <button onClick={addValue} style={{ fontSize: '0.75rem', padding: '4px 10px', background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                        <IonIcon icon={documentTextOutline} /> Add Value Item
                    </button>
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
    const imgWidthRef = useRef(imgWidth);
    useEffect(() => { imgWidthRef.current = imgWidth; }, [imgWidth]);
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
            onUpdate(block.id, { ...content, width: imgWidthRef.current });
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
            <div className="nbe-image-wrapper" style={{ width: imgWidth || 'auto', maxWidth: (content.align === 'float-left' || content.align === 'float-right') ? '50%' : '100%' }}>
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
        if (note) {
            const initialBlocks = convertLegacyToBlocks(note);
            return initialBlocks.map(b => {
                if (b.type === 'key-value') {
                    const content = b.content || {};
                    if ((!content.values || content.values.length === 0) && content.value) {
                        const lines = content.value.split('\n');
                        const values = lines.filter(l => l.trim() !== '').map(l => ({ text: l, image: '' }));
                        if (values.length > 0) {
                            return { ...b, content: { ...content, values } };
                        }
                    }
                }
                return b;
            });
        }
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
            content: type === 'key-value' ? { key: '', values: [] } : type === 'image' ? {} : '',
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

    const updateBlockField = useCallback((id, field, value) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
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
                } else if (b.type === 'key-value') {
                    let updatedBlock = JSON.parse(JSON.stringify(b)); // deep clone
                    if (b.content?.rawFile) {
                        const uploadedUrl = await uploadImageToCloudinary(b.content.rawFile);
                        updatedBlock.content.image = uploadedUrl;
                        delete updatedBlock.content.rawFile;
                    }
                    if (b.content?.values) {
                        const updatedValues = await Promise.all(b.content.values.map(async (v) => {
                            if (v.rawFile) {
                                const uploadedUrl = await uploadImageToCloudinary(v.rawFile);
                                return { text: v.text, image: uploadedUrl };
                            }
                            return v;
                        }));
                        updatedBlock.content.values = updatedValues;
                    }
                    return updatedBlock;
                }
                return b;
            }));

            // Reconstruct legacy fields from finalBlocks for backward compatibility
            const heading = finalBlocks.find(b => b.type === 'heading')?.content || '';
            const description = finalBlocks.find(b => b.type === 'description')?.content || '';
            const subheading = finalBlocks.filter(b => b.type === 'key-value').map(b => {
                const key = b.content?.key || '';
                const image = b.content?.image || '';
                const imageAlign = b.content?.imageAlign || 'center';
                const values = b.content?.values || [];
                // Fallback for legacy structure where value was a string
                const valueText = values.map(v => v.text).join('\n');
                return { key, image, imageAlign, value: valueText || b.content?.value || '', values };
            });

            // No need to mutate finalBlocks for rawText since KVBlock was refactored

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
                    let values = block.content?.values || [];
                    let valueText = values.map(v => (v.text || '') + (v.image ? ' [Image]' : '')).join(', ') || block.content?.value || '';
                    el.content = valueText ? `${key} - ${valueText}` : `${key}`;
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
            case 'heading': return <HeadingBlock block={block} onUpdate={updateBlock} onUpdateField={updateBlockField} onKeyDown={handleEnterKey} mlEnabled={mlEnabled} />;
            case 'description': return <DescriptionBlock block={block} onUpdate={updateBlock} onKeyDown={handleEnterKey} mlEnabled={mlEnabled} />;
            case 'key-value': return <KVBlock block={block} onUpdate={updateBlock} onKeyDown={handleEnterKey} mlEnabled={mlEnabled} toggleVoice={toggleVoice} listeningBlockId={listeningBlockId} onDelete={() => removeBlock(block.id)} />;
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
                        <div className="nbe-block-actions" style={{ alignItems: 'center' }}>
                            {block.type === 'heading' && (
                                <select 
                                    value={block.size || 'h3'} 
                                    onChange={e => updateBlockField(block.id, 'size', e.target.value)} 
                                    style={{ padding: '2px 4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', background: '#f8fafc', color: '#475569', cursor: 'pointer', outline: 'none', marginRight: '4px' }}
                                >
                                    <option value="h1">H1</option>
                                    <option value="h2">H2</option>
                                    <option value="h3">H3</option>
                                    <option value="h4">H4</option>
                                    <option value="h5">H5</option>
                                    <option value="h6">H6</option>
                                </select>
                            )}
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
