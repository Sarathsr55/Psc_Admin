import React from "react";
import "./NotesDisplay.css";
import { IonIcon } from "@ionic/react";
import { listOutline } from "ionicons/icons";

export default function NotesDisplay({ data }) {
    if (!data) return null;

    // Render blocks if available, otherwise fallback to legacy fields
    const hasBlocks = data.blocks && data.blocks.length > 0;

    const renderBlock = (block, index) => {
        switch (block.type) {
            case 'heading': {
                const HeadingTag = block.size || 'h3';
                return <HeadingTag key={block.id || index} className={`notes-display-heading heading-size-${block.size || 'h3'}`}>{block.content}</HeadingTag>;
            }
            case 'description':
                return <p key={block.id || index} className="notes-display-description" style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: block.content || '' }} />;
            case 'key-value': {
                let values = block.content?.values || [];
                if (values.length === 0 && block.content?.value) {
                    values = block.content.value.split('\n').filter(l => l.trim() !== '').map(l => ({ text: l, image: '' }));
                }
                return (
                    <div key={block.id || index} className="notes-display-subheading-item" style={{ position: 'relative', display: 'block', marginBottom: '8px', width: '100%', overflow: 'hidden' }}>
                        {block.content?.image && (
                            <img 
                                src={block.content.image} 
                                alt="" 
                                style={{ 
                                    maxWidth: '50%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    float: block.content.imageAlign === 'left' ? 'left' : (block.content.imageAlign === 'right' ? 'right' : 'none'),
                                    margin: block.content.imageAlign === 'left' ? '0 12px 4px 0' : (block.content.imageAlign === 'right' ? '0 0 4px 12px' : '0 auto 12px auto'),
                                    display: (!block.content.imageAlign || block.content.imageAlign === 'center') ? 'block' : 'inline-block'
                                }} 
                            />
                        )}
                        
                        <div style={{ display: 'inline', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 700, marginRight: '8px', color: '#475569' }}>-&gt;</span>
                            <span className="notes-subheading-key" style={{ display: 'inline' }}>{block.content?.key}</span>
                        </div>
                        
                        <div style={{ display: 'block', marginTop: '4px' }}>
                            {values.length > 0 ? values.map((v, i) => (
                                <div key={i} style={{ marginBottom: '8px' }}>
                                    {v.text && <div className="notes-subheading-value" dangerouslySetInnerHTML={{ __html: v.text || '' }} />}
                                    {v.image && <img src={v.image} alt="" style={{ maxWidth: '100%', marginTop: '4px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />}
                                </div>
                            )) : (
                                <span className="notes-subheading-value" dangerouslySetInnerHTML={{ __html: block.content?.value || '' }} />
                            )}
                        </div>
                    </div>
                );
            }
            case 'point':
                return (
                    <div key={block.id || index} style={{ marginBottom: '8px' }}>
                        <span style={{ color: '#3b82f6', marginRight: '8px' }}>➔</span>
                        <span dangerouslySetInnerHTML={{ __html: block.content || '' }} />
                    </div>
                );
            case 'image': {
                if (!block.content?.url) return null;
                const align = block.content?.align || 'center';
                let imgWrapperStyle = { margin: '12px 0', clear: 'both', textAlign: align };
                if (align === 'float-left') {
                    imgWrapperStyle = { float: 'left', margin: '0 12px 12px 0', width: block.content.width || 'max-content' };
                } else if (align === 'float-right') {
                    imgWrapperStyle = { float: 'right', margin: '0 0 12px 12px', width: block.content.width || 'max-content' };
                }
                return (
                    <div key={block.id || index} style={imgWrapperStyle}>
                        <img
                            src={block.content.url}
                            alt=""
                            style={{
                                maxWidth: '100%',
                                width: (align === 'float-left' || align === 'float-right') ? '100%' : (block.content.width || 'auto'),
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                        />
                    </div>
                );
            }
            case 'review':
                return (
                    <div key={block.id || index} style={{ marginTop: '12px', padding: '10px 14px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', marginBottom: '4px' }}>💡 Review</div>
                        <div style={{ fontSize: '0.85rem', color: '#b45309', fontStyle: 'italic' }} dangerouslySetInnerHTML={{ __html: block.content || '' }} />
                    </div>
                );
            default:
                return null;
        }
    };

    if (hasBlocks) {
        // Block-based rendering
        const sortedBlocks = [...data.blocks].sort((a, b) => (a.order || 0) - (b.order || 0));
        return (
            <div className="notes-display-card">
                {data.category && <div className="notes-topic-badge">{data.category}</div>}
                {data.topic && <h2 className="notes-display-title">{data.topic}</h2>}
                {data.subtopic && <div className="notes-display-subtopic">{data.subtopic}</div>}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    {data.subject && <span className="notes-tag" style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.75rem' }}>{data.subject}</span>}
                    {data.post && <span className="notes-tag" style={{ background: '#dcfce7', color: '#166534', fontSize: '0.75rem' }}>{data.post}</span>}
                </div>
                <div className="notes-blocks-display">
                    {sortedBlocks.map((block, i) => renderBlock(block, i))}
                </div>
            </div>
        );
    }

    // Legacy rendering (backward compatible)
    return (
        <div className="notes-display-card">
            <div className="notes-topic-badge">{data?.category}</div>
            <h2 className="notes-display-title">{data?.topic}</h2>
            <div className="notes-display-subtopic">{data?.subtopic}</div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className="notes-tag" style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.75rem' }}>{data?.subject}</span>
                <span className="notes-tag" style={{ background: '#dcfce7', color: '#166534', fontSize: '0.75rem' }}>{data?.post}</span>
            </div>
            <h4 className="notes-display-heading">{data?.heading}</h4>
            <p className="notes-display-description" style={{ whiteSpace: 'pre-wrap' }}>{data?.description}</p>

            {data?.subheading && data.subheading.length > 0 && (
                <div className="notes-subheadings-section">
                    {data.subheading.map((obj, index) => {
                        let legacyValues = obj.values || [];
                        if (legacyValues.length === 0 && obj.value) {
                             legacyValues = obj.value.split('\n').filter(l => l.trim() !== '').map(l => ({ text: l, image: '' }));
                        }
                        return (
                            <div key={index} className="notes-display-subheading-item" style={{ position: 'relative', display: 'block', marginBottom: '8px', width: '100%', overflow: 'hidden' }}>
                                {obj?.image && (
                                    <img 
                                        src={obj.image} 
                                        alt="" 
                                        style={{ 
                                            maxWidth: '50%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                            float: obj.imageAlign === 'left' ? 'left' : (obj.imageAlign === 'right' ? 'right' : 'none'),
                                            margin: obj.imageAlign === 'left' ? '0 12px 4px 0' : (obj.imageAlign === 'right' ? '0 0 4px 12px' : '0 auto 12px auto'),
                                            display: (!obj.imageAlign || obj.imageAlign === 'center') ? 'block' : 'inline-block'
                                        }} 
                                    />
                                )}
                                
                                <div style={{ display: 'inline', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 700, marginRight: '8px', color: '#475569' }}>-&gt;</span>
                                    <span className="notes-subheading-key" style={{ display: 'inline' }}>{obj?.key}</span>
                                </div>
                                
                                <div style={{ display: 'block', marginTop: '4px' }}>
                                    {legacyValues.length > 0 ? legacyValues.map((v, i) => (
                                        <div key={i} style={{ marginBottom: '8px' }}>
                                            {v.text && <div className="notes-subheading-value" style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: v.text || '' }} />}
                                            {v.image && <img src={v.image} alt="" style={{ maxWidth: '100%', marginTop: '4px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />}
                                        </div>
                                    )) : (
                                        <div className="notes-subheading-value" style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: obj?.value || '' }} />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {data?.points && data.points.length > 0 && (
                <div className="notes-points-section">
                    <div className="notes-points-title">
                        <IonIcon icon={listOutline} /> Key Points
                    </div>
                    <div className="notes-points-list">
                        {data.points.map((obj, index) => (
                            <div key={index} className="notes-point-tag">{obj}</div>
                        ))}
                    </div>
                </div>
            )}

            {data?.review && (
                <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Review</div>
                    <div style={{ fontSize: '0.85rem', color: '#b45309', fontStyle: 'italic' }}>"{data.review}"</div>
                </div>
            )}
        </div>
    );
}
