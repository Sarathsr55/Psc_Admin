import React from "react";
import "./NotesDisplay.css";
import Seperator from "../../Components/Seperator";
import { IonIcon } from "@ionic/react";
import { bookmarkOutline, listOutline } from "ionicons/icons";

export default function NotesDisplay({ data }) {

    if (!data) {
        return null;
    }

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
            <p className="notes-display-description">{data?.description}</p>

            {data?.subheading && data.subheading.length > 0 && (
                <div className="notes-subheadings-section">
                    {data.subheading.map((obj, index) => (
                        <div key={index} className="notes-display-subheading-item">
                            <div className="notes-subheading-key">{obj?.key}</div>
                            <div className="notes-subheading-value">{obj?.value}</div>
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
                            <div key={index} className="notes-point-tag">
                                {obj}
                            </div>
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
