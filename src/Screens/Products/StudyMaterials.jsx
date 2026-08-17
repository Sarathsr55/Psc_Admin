import React, { useState, useEffect } from 'react';
import './StudyMaterials.css';
import CanvasEditor from './CanvasEditor';
import { IonIcon } from '@ionic/react';
import { addOutline, documentTextOutline, trashOutline, createOutline } from 'ionicons/icons';
import { getAllStudyMaterials, deleteStudyMaterial } from '../../services/studyMaterialService';

const StudyMaterials = () => {
    const [view, setView] = useState('list'); // 'list' or 'editor'
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchMaterials = async () => {
        setLoading(true);
        try {
            const data = await getAllStudyMaterials();
            setMaterials(data);
        } catch (error) {
            console.error("Failed to fetch study materials:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (view === 'list') {
            fetchMaterials();
        }
    }, [view]);

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this study material?")) {
            try {
                await deleteStudyMaterial(id);
                fetchMaterials();
            } catch (error) {
                alert("Failed to delete.");
            }
        }
    };

    return (
        <div className="study-materials-container">
            {view === 'list' ? (
                <div className="sm-list-view">
                    <div className="sm-header">
                        <h2>Study Materials</h2>
                        <button className="sm-btn-primary" onClick={() => { setSelectedMaterial(null); setView('editor'); }}>
                            <IonIcon icon={addOutline} /> Create New
                        </button>
                    </div>
                    {loading ? (
                        <div className="sm-loading">Loading...</div>
                    ) : materials.length === 0 ? (
                        <div className="sm-content-placeholder">
                            <IonIcon icon={documentTextOutline} style={{ fontSize: '4rem', color: '#ccc' }} />
                            <p>No study materials yet. Create one!</p>
                        </div>
                    ) : (
                        <div className="sm-grid">
                            {materials.map(mat => (
                                <div key={mat._id} className="sm-card">
                                    <div className="sm-card-body">
                                        <h3>{mat.title}</h3>
                                        <p><strong>Subject:</strong> {mat.subject}</p>
                                        <p><strong>Category:</strong> {mat.category || 'N/A'}</p>
                                        <p className="sm-pages-count">{mat.pages?.length || 0} Pages</p>
                                    </div>
                                    <div className="sm-card-footer">
                                        <button className="sm-icon-btn sm-edit-btn" onClick={() => { setSelectedMaterial(mat); setView('editor'); }}>
                                            <IonIcon icon={createOutline} /> Edit
                                        </button>
                                        <button className="sm-icon-btn delete" onClick={() => handleDelete(mat._id)}>
                                            <IonIcon icon={trashOutline} /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <CanvasEditor 
                    material={selectedMaterial} 
                    onBack={() => setView('list')} 
                />
            )}
        </div>
    );
};

export default StudyMaterials;
