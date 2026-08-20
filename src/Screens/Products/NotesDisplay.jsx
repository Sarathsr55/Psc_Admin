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
            case 'heading':
                return <h3 key={block.id || index} className="notes-display-heading">{block.content}</h3>;
            case 'description':
                return <p key={block.id || index} className="notes-display-description" style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: block.content || '' }} />;
            case 'key-value':
                return (
                    <div key={block.id || index} className="notes-display-subheading-item" style={{ marginBottom: '4px' }}>
                        <span style={{ color: '#3b82f6', marginRight: '8px' }}>➔</span>
                        <span className="notes-subheading-key" style={{ display: 'inline' }}>{block.content?.key}</span>
                        <span style={{ fontWeight: 700, margin: '0 8px' }}>-</span>
                        <span className="notes-subheading-value" style={{ display: 'inline', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: block.content?.value || '' }} />
                    </div>
                );
            case 'point':
                return (
                    <div key={block.id || index} style={{ marginBottom: '4px', display: 'flex', alignItems: 'baseline', gap: '0' }}>
                        <span style={{ color: '#3b82f6', marginRight: '8px', flexShrink: 0 }}>➔</span>
                        <span dangerouslySetInnerHTML={{ __html: block.content || '' }} />
                    </div>
                );
            case 'image':
                if (!block.content?.url) return null;
                return (
                    <div key={block.id || index} style={{ textAlign: block.content?.align || 'center', margin: '12px 0' }}>
                        <img
                            src={block.content.url}
                            alt=""
                            style={{
                                maxWidth: '100%',
                                width: block.content.width || 'auto',
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                        />
                    </div>
                );
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
                    {data.subheading.map((obj, index) => (
                        <div key={index} className="notes-display-subheading-item">
                            <div className="notes-subheading-key">{obj?.key}</div>
                            <div className="notes-subheading-value" style={{ whiteSpace: 'pre-wrap' }}>{obj?.value}</div>
                        </div>
                    ))}
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
