import React, { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { IonIcon } from '@ionic/react';
import { addOutline, saveOutline, imageOutline, arrowBackOutline, trashOutline, reorderThreeOutline, chevronDownOutline, chevronUpOutline, languageOutline, documentTextOutline, cloudUploadOutline, chevronBackOutline, checkmarkCircleOutline, swapVerticalOutline, shuffleOutline, copyOutline, textOutline } from 'ionicons/icons';
import { FaMicrophone, FaStop } from 'react-icons/fa';
import { ReactTransliterate } from 'react-transliterate';
import 'react-transliterate/dist/index.css';
import VoiceInputWrapper from '../../Components/VoiceInput/VoiceInputWrapper';
import '../../Components/VoiceInput/VoiceInput.css';
import './NoteBlockEditor.css';
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import { addNote, updateNotes, deleteNote } from '../../services/notes';
import { addStudyMaterial } from '../../services/studyMaterialService';
import { Loader } from '../../Components/Loader/Loader';
import { useImageOCR } from '../../utils/useImageOCR';

const PdfPageCard = React.memo(({ idx, dataUrl, isSelected, onToggle }) => {
    return (
        <div
            onClick={() => onToggle(idx)}
            style={{
                cursor: 'pointer',
                border: isSelected ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                borderRadius: '8px',
                padding: '4px',
                position: 'relative',
                opacity: isSelected ? 1 : 0.5,
                transition: 'all 0.2s ease',
                background: '#ffffff'
            }}
        >
            <img src={dataUrl} alt={`Page ${idx + 1}`} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '4px' }} />
            <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'white', borderRadius: '50%', padding: '2px', display: 'flex' }}>
                <input
                    type="checkbox"
                    checked={isSelected || false}
                    onChange={() => onToggle(idx)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
            </div>
            <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Page {idx + 1}</div>
        </div>
    );
});

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
const MlInput = ({ value, onChange, placeholder, inputRef, className, style, onKeyDown, onBlur, mlEnabled, multiLine = false, autoFocus = false, ...rest }) => {
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
                        ...rest,
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
                            if (onKeyDown) onKeyDown(e);
                            if (props.onKeyDown && !e.defaultPrevented) props.onKeyDown(e);
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

const KVBlock = ({ block, onUpdate, onKeyDown, mlEnabled, toggleVoice, listeningBlockId, onDelete, onAddNext }) => {
    const content = block.content || { key: '', values: [] };
    let values = content.values || [];
    if (values.length === 0 && content.value) {
        values = content.value.split('\n').filter(l => l.trim() !== '').map(l => ({ text: l, image: '' }));
    }
    if (values.length === 0) {
        values = [{ text: '', image: '' }];
    }

    const [isEditing, setIsEditing] = useState(!content.key && (values.length === 0 || !values[0].text));
    const [isHovered, setIsHovered] = useState(false);
    const keyInputRef = useRef(null);
    const valueRefs = useRef([]);

    const handleAddNextKV = () => {
        if (content.key || values.some(v => v.text?.trim() || v.image)) {
            setIsEditing(false);
        }
        if (onAddNext) {
            onAddNext();
        }
    };

    const handleKeyChange = (val) => {
        onUpdate(block.id, { ...content, key: val, values });
    };

    const addValue = () => {
        onUpdate(block.id, { ...content, values: [...values, { text: '', image: '' }] });
    };

    const handleKeyEnter = (e) => {
        // Keyboard Shortcuts: Ctrl+Enter or Alt+K -> Create next Key-Value block
        if (((e.ctrlKey || e.metaKey) && e.key === 'Enter') || (e.altKey && (e.key === 'k' || e.key === 'K'))) {
            e.preventDefault();
            handleAddNextKV();
            return;
        }

        // Tab moves to first value input
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();

            const doFocusValue = () => {
                let el = valueRefs.current[0];
                if (!el && e.currentTarget) {
                    const blockContainer = e.currentTarget.closest('.nbe-kv-block') || e.currentTarget.closest('[data-block-id]');
                    if (blockContainer) {
                        el = blockContainer.querySelector('.nbe-kv-value-input') || blockContainer.querySelectorAll('textarea')[1];
                    }
                }
                if (!el) {
                    el = document.querySelector(`[data-block-id="${block.id}"] .nbe-kv-value-input, [data-block-id="${block.id}"] textarea:not(.nbe-kv-key-input)`);
                }
                if (el) {
                    el.focus();
                    const len = el.value ? el.value.length : 0;
                    if (el.setSelectionRange) el.setSelectionRange(len, len);
                    return true;
                }
                return false;
            };

            if (values.length === 0) {
                addValue();
                setTimeout(doFocusValue, 50);
            } else {
                doFocusValue();
                setTimeout(doFocusValue, 30);
            }
            return;
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            const val = e.currentTarget.value;
            const cursor = e.currentTarget.selectionStart;
            if (cursor > 0 && val[cursor - 1] === '\n') {
                e.preventDefault();
                onUpdate(block.id, { ...content, key: val.slice(0, cursor - 1) + val.slice(cursor), values });
                const doFocusValue = () => {
                    const el = valueRefs.current[0] || document.querySelector(`[data-block-id="${block.id}"] .nbe-kv-value-input, [data-block-id="${block.id}"] textarea:not(.nbe-kv-key-input)`);
                    if (el) el.focus();
                };
                if (values.length === 0) {
                    addValue();
                    setTimeout(doFocusValue, 50);
                } else {
                    doFocusValue();
                    setTimeout(doFocusValue, 30);
                }
            }
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
                        <button onClick={() => { setIsEditing(true); setTimeout(() => keyInputRef.current?.focus(), 50); }} style={{ padding: '6px 12px', background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
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
        <div className="nbe-kv-block" style={{ display: 'block', padding: '10px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', width: '100%', marginBottom: '4px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🔑 Key-Value Block</span>
                    <span style={{ fontSize: '0.74rem', color: '#4338ca', background: '#e0e7ff', padding: '3px 8px', borderRadius: '12px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>Next pair:</span>
                        <kbd style={{ fontWeight: 700, background: '#fff', padding: '1px 5px', borderRadius: '4px', border: '1px solid #c7d2fe' }}>Ctrl+Enter</kbd>
                        <span>or</span>
                        <kbd style={{ fontWeight: 700, background: '#fff', padding: '1px 5px', borderRadius: '4px', border: '1px solid #c7d2fe' }}>Alt+K</kbd>
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                        type="button"
                        onClick={handleAddNextKV} 
                        style={{ padding: '4px 10px', background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Add next Key-Value pair (Ctrl + Enter or Alt + K)"
                    >
                        <IonIcon icon={addOutline} /> Next Pair
                    </button>
                    <button 
                        type="button"
                        onClick={() => setIsEditing(false)} 
                        style={{ padding: '4px 12px', background: '#ecfccb', color: '#4d7c0f', border: '1px solid #bef264', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                        Done
                    </button>
                </div>
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

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', color: '#6366f1', marginTop: '6px', fontSize: '1.1rem' }}>-&gt;</span>
                <MlInput
                    value={content.key || ''}
                    onChange={handleKeyChange}
                    onKeyDown={handleKeyEnter}
                    inputRef={keyInputRef}
                    mlEnabled={mlEnabled}
                    multiLine={true}
                    placeholder="Enter Key sentence..."
                    className="nbe-block-input nbe-kv-key-input"
                    data-kv-key="true"
                    style={{ flex: 1, padding: '4px 6px', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '24px', backgroundColor: '#f9fafb', fontSize: '0.95rem' }}
                />
                <button
                    className="nbe-block-action-btn"
                    title="Voice input for Key"
                    onClick={() => toggleVoice(block.id, 'key')}
                    onMouseDown={(e) => e.preventDefault()}
                    style={{ color: listeningBlockId === `${block.id}-key` ? '#ef4444' : undefined, marginTop: '2px', padding: '6px' }}
                >
                    {listeningBlockId === `${block.id}-key` ? <FaStop size={12} /> : <FaMicrophone size={12} />}
                    {listeningBlockId === `${block.id}-key` && <span className="listening-pulse" style={{ width: 20, height: 20 }} />}
                </button>
            </div>
            
            <div style={{ display: 'block', marginTop: '4px' }}>
                {values.map((v, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', flexDirection: 'column', backgroundColor: '#ffffff', padding: '6px', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
                            <MlInput
                                value={v.text || ''}
                                onChange={(val) => updateText(index, val)}
                                onKeyDown={(e) => {
                                    // Keyboard Shortcuts: Ctrl+Enter or Alt+K -> Create next Key-Value block
                                    if (((e.ctrlKey || e.metaKey) && e.key === 'Enter') || (e.altKey && (e.key === 'k' || e.key === 'K'))) {
                                        e.preventDefault();
                                        handleAddNextKV();
                                        return;
                                    }

                                    // Shift + Tab moves back to Key field
                                    if (e.key === 'Tab' && e.shiftKey) {
                                        if (index === 0) {
                                            e.preventDefault();
                                            if (keyInputRef.current) {
                                                keyInputRef.current.focus();
                                            } else {
                                                const keyEl = document.querySelector(`[data-block-id="${block.id}"] .nbe-kv-key-input`);
                                                if (keyEl) keyEl.focus();
                                            }
                                            return;
                                        } else {
                                            e.preventDefault();
                                            const prevValEl = valueRefs.current[index - 1];
                                            if (prevValEl) prevValEl.focus();
                                            return;
                                        }
                                    }

                                    // Tab key navigation between value items
                                    if (e.key === 'Tab' && !e.shiftKey) {
                                        if (index < values.length - 1) {
                                            e.preventDefault();
                                            const nextValEl = valueRefs.current[index + 1];
                                            if (nextValEl) nextValEl.focus();
                                            return;
                                        }
                                    }

                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        const val = e.currentTarget.value;
                                        const cursor = e.currentTarget.selectionStart;
                                        if (cursor > 0 && val[cursor - 1] === '\n') {
                                            e.preventDefault();
                                            const cleanedVal = val.slice(0, cursor - 1) + val.slice(cursor);
                                            updateText(index, cleanedVal);
                                            if (index === values.length - 1) {
                                                // Double enter on the last value automatically adds next Key-Value block!
                                                handleAddNextKV();
                                            } else {
                                                addValue();
                                                setTimeout(() => {
                                                    const newIndex = values.length;
                                                    if (valueRefs.current[newIndex]) valueRefs.current[newIndex].focus();
                                                }, 50);
                                            }
                                        }
                                    }
                                }}
                                inputRef={(el) => (valueRefs.current[index] = el)}
                                mlEnabled={mlEnabled}
                                multiLine={true}
                                placeholder="Enter Text Value..."
                                className="nbe-block-input nbe-kv-value-input"
                                data-kv-value="true"
                                style={{ flex: 1, width: '100%', padding: '4px 6px', borderRadius: '6px', border: '1px solid #e5e7eb', minHeight: '24px', backgroundColor: '#ffffff', fontSize: '0.95rem' }}
                            />
                            <button
                                className="nbe-block-action-btn"
                                title="Voice input for Value"
                                onClick={() => toggleVoice(block.id, `value-${index}`)}
                                onMouseDown={(e) => e.preventDefault()}
                                style={{ color: listeningBlockId === `${block.id}-value-${index}` ? '#ef4444' : undefined, padding: '6px' }}
                            >
                                {listeningBlockId === `${block.id}-value-${index}` ? <FaStop size={12} /> : <FaMicrophone size={12} />}
                                {listeningBlockId === `${block.id}-value-${index}` && <span className="listening-pulse" style={{ width: 20, height: 20 }} />}
                            </button>
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

    // Malayalam panel (default ON)
    const [mlEnabled, setMlEnabled] = useState(true);
    const [mlText, setMlText] = useState('');
    const [mlTarget, setMlTarget] = useState(null); // { blockId, field? }
    const mlInputRef = useRef(null);

    // Voice
    const recognitionRef = useRef(null);
    const [listeningBlockId, setListeningBlockId] = useState(null);

    // Drag state
    const [dragId, setDragId] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);

    // ── OCR & File Drop state ────────────────────────────────────
    const { extractCanvasesFromPDF, runOCRKeyValues, extractKeyValuesFromFile, isExtracting, ocrProgress, ocrError } = useImageOCR();
    const [isFileDragOver, setIsFileDragOver] = useState(false);
    const [showOcrModal, setShowOcrModal] = useState(false);
    const [ocrStep, setOcrStep] = useState('pages'); // 'pages' | 'review'
    const [pdfPages, setPdfPages] = useState([]);
    const [selectedPdfPages, setSelectedPdfPages] = useState([]);
    const [extractedKeyValues, setExtractedKeyValues] = useState([]); // [{ key, value, selected }]
    const fileInputRef = useRef(null);

    const handleFileDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsFileDragOver(false);

        const file = e.dataTransfer?.files?.[0];
        if (!file) return;
        await processUploadedFile(file);
    };

    const processUploadedFile = async (file) => {
        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        if (!isImage && !isPDF) {
            alert('Please drop or select an image (PNG, JPEG, WEBP…) or a PDF file.');
            return;
        }

        if (isPDF) {
            const canvases = await extractCanvasesFromPDF(file);
            if (canvases.length > 0) {
                setPdfPages(canvases);
                setSelectedPdfPages(new Array(canvases.length).fill(true));
                setOcrStep('pages');
                setShowOcrModal(true);
            }
        } else {
            // Direct Image extraction
            const parsed = await extractKeyValuesFromFile(file);
            if (parsed && parsed.length > 0) {
                setExtractedKeyValues(parsed.map(p => ({ ...p, selected: true })));
                setOcrStep('review');
                setShowOcrModal(true);
            } else {
                alert('No key-value pairs could be detected in this image. Try a clearer image or check the file.');
            }
        }
    };

    const handleProceedPdfOcr = async () => {
        const selectedCanvases = pdfPages.filter((_, idx) => selectedPdfPages[idx]);
        if (selectedCanvases.length === 0) {
            alert('Please select at least one page to process.');
            return;
        }

        const results = await runOCRKeyValues(selectedCanvases);
        if (results && results.length > 0) {
            setExtractedKeyValues(results.map(p => ({ ...p, selected: true })));
            setOcrStep('review');
        } else {
            alert('No key-value pairs could be detected on the selected pages.');
        }
    };

    const togglePdfPageSelection = useCallback((idx) => {
        setSelectedPdfPages(prev => {
            const next = [...prev];
            next[idx] = !next[idx];
            return next;
        });
    }, []);

    const handleInsertKeyValues = () => {
        const toAdd = extractedKeyValues.filter(p => p.selected && (p.key.trim() || p.value.trim()));
        if (toAdd.length === 0) {
            alert('No items selected to insert.');
            return;
        }

        const newKvBlocks = toAdd.map(item => ({
            id: uuidv4(),
            type: 'key-value',
            content: {
                key: item.key.trim(),
                values: [{ text: item.value.trim(), image: '' }]
            },
            order: 0,
            autoFocus: false
        }));

        setBlocks(prev => {
            const combined = [...prev, ...newKvBlocks];
            return combined.map((b, idx) => ({ ...b, order: idx }));
        });

        setShowOcrModal(false);
        setExtractedKeyValues([]);
    };

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
            content: type === 'key-value' ? { key: '', values: [{ text: '', image: '' }] } : type === 'image' ? {} : '',
            order: 0,
            autoFocus: true,
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
        // Focus the new block's primary input/key after render
        setTimeout(() => {
            const el = document.querySelector(
                `[data-block-id="${newBlock.id}"] .nbe-kv-key-input, ` +
                `[data-block-id="${newBlock.id}"] textarea:not([style*="display: none"]), ` +
                `[data-block-id="${newBlock.id}"] input:not([type="file"]):not([type="hidden"])`
            );
            if (el) {
                el.focus();
                const len = el.value ? el.value.length : 0;
                if (el.setSelectionRange) {
                    el.setSelectionRange(len, len);
                }
            }
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

    // Global keyboard shortcuts for adding key-value blocks
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            // Alt + K or Ctrl + Shift + K: quick-add key-value block anywhere in the editor
            if ((e.altKey && (e.key === 'k' || e.key === 'K')) || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'k' || e.key === 'K'))) {
                e.preventDefault();
                const activeEl = document.activeElement;
                const closestBlock = activeEl ? activeEl.closest('[data-block-id]') : null;
                const activeBlockId = closestBlock ? closestBlock.getAttribute('data-block-id') : null;
                addBlock('key-value', activeBlockId);
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
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
                        if (targetField === 'key') {
                            return { ...b, content: { ...b.content, key: (b.content.key || '') + transcript } };
                        }
                        if (targetField && targetField.startsWith('value-')) {
                            const index = parseInt(targetField.split('-')[1], 10);
                            const newValues = [...(b.content.values || [])];
                            if (newValues[index]) {
                                newValues[index] = { ...newValues[index], text: (newValues[index].text || '') + transcript };
                            }
                            return { ...b, content: { ...b.content, values: newValues } };
                        }
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
                if (note._mergedIds && note._mergedIds.length > 1) {
                    const otherIds = note._mergedIds.filter(id => id !== note._id);
                    for (const otherId of otherIds) {
                        try {
                            await deleteNote(otherId);
                        } catch (cleanErr) {
                            console.warn("Cleaned up merged duplicate id error:", cleanErr);
                        }
                    }
                }
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
            case 'key-value': return (
                <KVBlock 
                    block={block} 
                    onUpdate={updateBlock} 
                    onKeyDown={handleEnterKey} 
                    mlEnabled={mlEnabled} 
                    toggleVoice={toggleVoice} 
                    listeningBlockId={listeningBlockId} 
                    onDelete={() => removeBlock(block.id)} 
                    onAddNext={() => addBlock('key-value', block.id)} 
                />
            );
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
                        title={mlEnabled ? 'Malayalam typing ON (Click to switch to English)' : 'Malayalam typing OFF (Click to switch to Malayalam)'}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: mlEnabled ? '#ecfdf5' : '#f8fafc',
                            border: `1px solid ${mlEnabled ? '#10b981' : '#cbd5e1'}`,
                            padding: '6px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            color: mlEnabled ? '#059669' : '#64748b',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <IonIcon icon={languageOutline} style={{ fontSize: '1.1rem' }} />
                        <span>{mlEnabled ? 'മലയാളം (ML)' : 'English (EN)'}</span>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) processUploadedFile(file);
                            e.target.value = '';
                        }}
                    />
                    <button
                        className="nbe-ocr-btn"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload an Image or PDF to auto-extract Key-Value pairs"
                    >
                        <IonIcon icon={cloudUploadOutline} style={{ fontSize: '1.1rem' }} />
                        <span>OCR Image / PDF</span>
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

            {/* Drop Banner */}
            <div
                className={`nbe-drop-banner ${isFileDragOver ? 'dragging' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsFileDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsFileDragOver(false); }}
                onDrop={handleFileDrop}
            >
                <IonIcon icon={cloudUploadOutline} />
                <div>
                    <strong>Drop Image / PDF here</strong> or click to browse (auto-extracts Key-Value pairs with Malayalam OCR)
                </div>
            </div>

            {/* Blocks area */}
            <div
                className={`nbe-blocks-area ${isFileDragOver ? 'dragging' : ''}`}
                onDragOver={(e) => {
                    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
                        e.preventDefault();
                        setIsFileDragOver(true);
                    }
                }}
                onDragLeave={(e) => {
                    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
                        e.preventDefault();
                        setIsFileDragOver(false);
                    }
                }}
                onDrop={(e) => {
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleFileDrop(e);
                    }
                }}
            >
                {blocks.length === 0 && (
                    <div className="nbe-blocks-empty">
                        <IonIcon icon={addOutline} />
                        <div>Start adding content blocks below or drop an Image/PDF to extract Key-Values</div>
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
                            {block.type !== 'image' && block.type !== 'key-value' && (
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
                    <button
                        className="nbe-add-block-btn"
                        onClick={() => addBlock('key-value')}
                        title="Add Key-Value Block (Alt + K or Ctrl + Shift + K)"
                        style={{
                            background: '#f5f3ff',
                            color: '#4f46e5',
                            borderColor: '#c7d2fe',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: '600'
                        }}
                    >
                        <span>🔑 + Key-Value</span>
                        <kbd style={{
                            fontSize: '0.72rem',
                            background: '#ffffff',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            border: '1px solid #c7d2fe',
                            color: '#4338ca'
                        }}>Alt+K</kbd>
                    </button>
                </div>
            </div>

            {/* ── 2-Step OCR Verification Modal ────────────────────── */}
            {showOcrModal && (
                <div className="nbe-ocr-modal-overlay" onClick={() => { if (!isExtracting) setShowOcrModal(false); }}>
                    <div className="nbe-ocr-modal" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="nbe-ocr-modal-header">
                            <h3>
                                {ocrStep === 'review' && pdfPages.length > 0 && (
                                    <IonIcon
                                        icon={chevronBackOutline}
                                        style={{ cursor: 'pointer', fontSize: '1.2rem', marginRight: '4px' }}
                                        onClick={() => setOcrStep('pages')}
                                        title="Back to page selection"
                                    />
                                )}
                                <IonIcon icon={cloudUploadOutline} style={{ color: '#4f46e5' }} />
                                {ocrStep === 'pages' ? 'Select PDF Pages for Extraction' : 'Review Extracted Key-Value Pairs'}
                            </h3>
                            <button
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#64748b' }}
                                onClick={() => { if (!isExtracting) setShowOcrModal(false); }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Step indicator */}
                        {pdfPages.length > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '10px 20px 0', background: '#f8fafc' }}>
                                <div style={{ width: '45%', height: '4px', borderRadius: '2px', background: '#3b82f6', opacity: ocrStep === 'pages' ? 1 : 0.3, transition: 'opacity 0.3s' }} />
                                <div style={{ width: '45%', height: '4px', borderRadius: '2px', background: '#3b82f6', opacity: ocrStep === 'review' ? 1 : 0.3, transition: 'opacity 0.3s' }} />
                            </div>
                        )}

                        {/* Modal Body */}
                        <div className="nbe-ocr-modal-body">
                            {isExtracting ? (
                                <div className="nbe-ocr-progress-box">
                                    <Loader size={36} />
                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>
                                        {ocrProgress > 0 ? `Recognizing text with OCR (${ocrProgress}%)…` : 'Processing document…'}
                                    </div>
                                    <div className="nbe-ocr-progress-bar-bg">
                                        <div className="nbe-ocr-progress-bar-fill" style={{ width: `${ocrProgress}%` }} />
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                        Extracting Malayalam and English key-value pairs…
                                    </div>
                                </div>
                            ) : ocrStep === 'pages' ? (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                                            Select pages to extract. Uncheck pages you don't need to speed up OCR.
                                        </p>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className="nbe-cancel-btn"
                                                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                                onClick={() => setSelectedPdfPages(new Array(pdfPages.length).fill(true))}
                                            >
                                                Select All
                                            </button>
                                            <button
                                                className="nbe-cancel-btn"
                                                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                                onClick={() => setSelectedPdfPages(prev => prev.map(v => !v))}
                                            >
                                                Invert
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px' }}>
                                        {pdfPages.map((dataUrl, idx) => (
                                            <PdfPageCard
                                                key={idx}
                                                idx={idx}
                                                dataUrl={dataUrl}
                                                isSelected={selectedPdfPages[idx]}
                                                onToggle={togglePdfPageSelection}
                                            />
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                                            {extractedKeyValues.length} pair{extractedKeyValues.length !== 1 ? 's' : ''} detected. Check items to import, edit text inline, or delete unwanted pairs.
                                        </p>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className="nbe-cancel-btn"
                                                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                                onClick={() => setExtractedKeyValues(prev => prev.map(p => ({ ...p, selected: true })))}
                                            >
                                                Select All
                                            </button>
                                            <button
                                                className="nbe-cancel-btn"
                                                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                                onClick={() => setExtractedKeyValues(prev => prev.map(p => ({ ...p, selected: false })))}
                                            >
                                                Deselect All
                                            </button>
                                            <button
                                                className="nbe-cancel-btn"
                                                style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#4f46e5', borderColor: '#c7d2fe' }}
                                                onClick={() => setExtractedKeyValues(prev => [...prev, { key: '', value: '', selected: true }])}
                                            >
                                                + Add Pair
                                            </button>
                                        </div>
                                    </div>

                                    {extractedKeyValues.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                                            No key-value pairs to display.
                                        </div>
                                    ) : (
                                        <div>
                                            {extractedKeyValues.map((pair, idx) => (
                                                <div key={idx} className={`nbe-ocr-pair-card ${pair.selected ? 'selected' : ''}`}>
                                                    <div style={{ paddingTop: '8px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={pair.selected}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                setExtractedKeyValues(prev => {
                                                                    const next = [...prev];
                                                                    next[idx] = { ...next[idx], selected: checked };
                                                                    return next;
                                                                });
                                                            }}
                                                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                                        />
                                                    </div>

                                                    <div className="nbe-ocr-pair-inputs">
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                                Key / Fact Prompt
                                                            </label>
                                                            <MlInput
                                                                value={pair.key}
                                                                onChange={(val) => {
                                                                    setExtractedKeyValues(prev => {
                                                                        const next = [...prev];
                                                                        next[idx] = { ...next[idx], key: val };
                                                                        return next;
                                                                    });
                                                                }}
                                                                placeholder="Enter key / question prompt..."
                                                                mlEnabled={mlEnabled}
                                                                multiLine={true}
                                                                className="nbe-ocr-input-field"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                                Value / Answer
                                                            </label>
                                                            <MlInput
                                                                value={pair.value}
                                                                onChange={(val) => {
                                                                    setExtractedKeyValues(prev => {
                                                                        const next = [...prev];
                                                                        next[idx] = { ...next[idx], value: val };
                                                                        return next;
                                                                    });
                                                                }}
                                                                placeholder="Enter value / answer..."
                                                                mlEnabled={mlEnabled}
                                                                multiLine={true}
                                                                className="nbe-ocr-input-field"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <button
                                                            className="nbe-block-action-btn"
                                                            title="Add key-value pair below"
                                                            onClick={() => {
                                                                setExtractedKeyValues(prev => {
                                                                    const next = [...prev];
                                                                    next.splice(idx + 1, 0, { key: '', value: '', selected: true });
                                                                    return next;
                                                                });
                                                            }}
                                                            style={{ color: '#4f46e5' }}
                                                        >
                                                            <IonIcon icon={addOutline} />
                                                        </button>
                                                        <button
                                                            className="nbe-block-action-btn"
                                                            title="Delete pair"
                                                            onClick={() => {
                                                                setExtractedKeyValues(prev => prev.filter((_, i) => i !== idx));
                                                            }}
                                                            style={{ color: '#ef4444' }}
                                                        >
                                                            <IonIcon icon={trashOutline} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="nbe-ocr-modal-footer">
                            {ocrStep === 'pages' ? (
                                <>
                                    <button className="nbe-cancel-btn" onClick={() => setShowOcrModal(false)}>
                                        Cancel
                                    </button>
                                    <button
                                        className="nbe-save-btn"
                                        onClick={handleProceedPdfOcr}
                                        disabled={isExtracting || !selectedPdfPages.some(Boolean)}
                                    >
                                        {isExtracting ? <><Loader size={16} /> Processing OCR…</> : 'Extract Selected Pages →'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        className="nbe-cancel-btn"
                                        onClick={() => {
                                            if (pdfPages.length > 0) setOcrStep('pages');
                                            else setShowOcrModal(false);
                                        }}
                                    >
                                        {pdfPages.length > 0 ? '← Back to Pages' : 'Cancel'}
                                    </button>
                                    <button
                                        className="nbe-save-btn"
                                        onClick={handleInsertKeyValues}
                                        disabled={extractedKeyValues.filter(p => p.selected && (p.key.trim() || p.value.trim())).length === 0}
                                    >
                                        Insert {extractedKeyValues.filter(p => p.selected && (p.key.trim() || p.value.trim())).length} Pairs into Note
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NoteBlockEditor;
