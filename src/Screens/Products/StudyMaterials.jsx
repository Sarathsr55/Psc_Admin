import React, { useState, useEffect } from 'react';
import './StudyMaterials.css';
import CanvasEditor from './CanvasEditor';
import { IonIcon } from '@ionic/react';
import { addOutline, documentTextOutline, trashOutline, createOutline, folderOutline, folderOpenOutline, arrowBackOutline } from 'ionicons/icons';
import { getAllStudyMaterials, deleteStudyMaterial } from '../../services/studyMaterialService';
import { getAllSubjects, addSubject, addSubfolder, deleteSubject, deleteSubfolder } from '../../services/subjectService';

const StudyMaterials = () => {
    const [view, setView] = useState('subjects'); // 'subjects', 'subfolders', 'materials', 'editor'
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedSubfolder, setSelectedSubfolder] = useState(null);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    
    const [subjects, setSubjects] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showSubjectModal, setShowSubjectModal] = useState(false);
    const [showSubfolderModal, setShowSubfolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [subjectsData, materialsData] = await Promise.all([
                getAllSubjects(),
                getAllStudyMaterials()
            ]);
            setSubjects(subjectsData);
            setMaterials(materialsData);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (view !== 'editor') {
            fetchData();
        }
    }, [view]);

    const handleAddSubject = async () => {
        if (!newFolderName.trim()) return;
        try {
            await addSubject({ name: newFolderName });
            setNewFolderName('');
            setShowSubjectModal(false);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || "Failed to add subject");
        }
    };

    const handleAddSubfolder = async () => {
        if (!newFolderName.trim() || !selectedSubject) return;
        try {
            await addSubfolder({ subjectId: selectedSubject._id, name: newFolderName });
            setNewFolderName('');
            setShowSubfolderModal(false);
            
            // Refresh subject to show new subfolder
            const subjectsData = await getAllSubjects();
            setSubjects(subjectsData);
            setSelectedSubject(subjectsData.find(s => s._id === selectedSubject._id));

        } catch (error) {
            alert(error.response?.data?.error || "Failed to add subfolder");
        }
    };

    const handleDeleteSubject = async (e, id) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this subject?")) {
            try {
                await deleteSubject(id);
                fetchData();
            } catch (error) {
                alert("Failed to delete.");
            }
        }
    };

    const handleDeleteSubfolder = async (e, subfolderId) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this subfolder?")) {
            try {
                await deleteSubfolder(selectedSubject._id, subfolderId);
                const subjectsData = await getAllSubjects();
                setSubjects(subjectsData);
                setSelectedSubject(subjectsData.find(s => s._id === selectedSubject._id));
            } catch (error) {
                alert("Failed to delete.");
            }
        }
    };

    const handleDeleteMaterial = async (id) => {
        if (window.confirm("Are you sure you want to delete this study material?")) {
            try {
                await deleteStudyMaterial(id);
                fetchData();
            } catch (error) {
                alert("Failed to delete.");
            }
        }
    };

    const getFilteredMaterials = () => {
        if (!selectedSubject || !selectedSubfolder) return [];
        return materials.filter(m => m.subject === selectedSubject.name && m.category === selectedSubfolder.name);
    };

    return (
        <div className="study-materials-container">
            {/* Subject Modal */}
            {showSubjectModal && (
                <div className="sm-modal-overlay">
                    <div className="sm-modal">
                        <h3>Add New Subject</h3>
                        <input 
                            type="text" 
                            placeholder="Subject Name" 
                            value={newFolderName} 
                            onChange={(e) => setNewFolderName(e.target.value)} 
                        />
                        <div className="sm-modal-actions">
                            <button onClick={() => setShowSubjectModal(false)} className="sm-btn-secondary">Cancel</button>
                            <button onClick={handleAddSubject} className="sm-btn-primary">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Subfolder Modal */}
            {showSubfolderModal && (
                <div className="sm-modal-overlay">
                    <div className="sm-modal">
                        <h3>Add New Subfolder</h3>
                        <input 
                            type="text" 
                            placeholder="Subfolder Name" 
                            value={newFolderName} 
                            onChange={(e) => setNewFolderName(e.target.value)} 
                        />
                        <div className="sm-modal-actions">
                            <button onClick={() => setShowSubfolderModal(false)} className="sm-btn-secondary">Cancel</button>
                            <button onClick={handleAddSubfolder} className="sm-btn-primary">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {view === 'subjects' && (
                <div className="sm-list-view">
                    <div className="sm-header">
                        <h2>Subjects</h2>
                        <button className="sm-btn-primary" onClick={() => setShowSubjectModal(true)}>
                            <IonIcon icon={addOutline} /> Add Subject
                        </button>
                    </div>
                    {loading ? (
                        <div className="sm-loading">Loading...</div>
                    ) : subjects.length === 0 ? (
                        <div className="sm-content-placeholder">
                            <IonIcon icon={folderOutline} style={{ fontSize: '4rem', color: '#ccc' }} />
                            <p>No subjects yet. Create one!</p>
                        </div>
                    ) : (
                        <div className="sm-grid">
                            {subjects.map(sub => (
                                <div key={sub._id} className="sm-folder-card" onClick={() => { setSelectedSubject(sub); setView('subfolders'); }}>
                                    <div className="sm-folder-icon">
                                        <IonIcon icon={folderOpenOutline} />
                                    </div>
                                    <div className="sm-folder-info">
                                        <h3>{sub.name}</h3>
                                        <p>{sub.subfolders?.length || 0} Subfolders</p>
                                    </div>
                                    <button className="sm-icon-btn delete sm-folder-delete" onClick={(e) => handleDeleteSubject(e, sub._id)}>
                                        <IonIcon icon={trashOutline} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === 'subfolders' && selectedSubject && (
                <div className="sm-list-view">
                    <div className="sm-header">
                        <div className="sm-breadcrumb">
                            <button className="sm-back-btn" onClick={() => setView('subjects')}>
                                <IonIcon icon={arrowBackOutline} /> Back
                            </button>
                            <h2>{selectedSubject.name} / Subfolders</h2>
                        </div>
                        <button className="sm-btn-primary" onClick={() => setShowSubfolderModal(true)}>
                            <IonIcon icon={addOutline} /> Add Subfolder
                        </button>
                    </div>
                    <div className="sm-grid">
                        {selectedSubject.subfolders?.map(sf => (
                            <div key={sf._id} className="sm-folder-card" onClick={() => { setSelectedSubfolder(sf); setView('materials'); }}>
                                <div className="sm-folder-icon">
                                    <IonIcon icon={folderOpenOutline} />
                                </div>
                                <div className="sm-folder-info">
                                    <h3>{sf.name}</h3>
                                </div>
                                <button className="sm-icon-btn delete sm-folder-delete" onClick={(e) => handleDeleteSubfolder(e, sf._id)}>
                                    <IonIcon icon={trashOutline} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view === 'materials' && selectedSubject && selectedSubfolder && (
                <div className="sm-list-view">
                    <div className="sm-header">
                        <div className="sm-breadcrumb">
                            <button className="sm-back-btn" onClick={() => setView('subfolders')}>
                                <IonIcon icon={arrowBackOutline} /> Back
                            </button>
                            <h2>{selectedSubject.name} / {selectedSubfolder.name} / Materials</h2>
                        </div>
                        <button className="sm-btn-primary" onClick={() => { 
                            setSelectedMaterial({ subject: selectedSubject.name, category: selectedSubfolder.name }); 
                            setView('editor'); 
                        }}>
                            <IonIcon icon={addOutline} /> Create Material
                        </button>
                    </div>
                    
                    {loading ? (
                        <div className="sm-loading">Loading...</div>
                    ) : getFilteredMaterials().length === 0 ? (
                        <div className="sm-content-placeholder">
                            <IonIcon icon={documentTextOutline} style={{ fontSize: '4rem', color: '#ccc' }} />
                            <p>No study materials in this subfolder yet.</p>
                        </div>
                    ) : (
                        <div className="sm-grid">
                            {getFilteredMaterials().map(mat => (
                                <div key={mat._id} className="sm-card">
                                    <div className="sm-card-body">
                                        <h3>{mat.title}</h3>
                                        <p className="sm-pages-count">{mat.pages?.length || 0} Pages</p>
                                    </div>
                                    <div className="sm-card-footer">
                                        <button className="sm-icon-btn sm-edit-btn" onClick={() => { setSelectedMaterial(mat); setView('editor'); }}>
                                            <IonIcon icon={createOutline} /> Edit
                                        </button>
                                        <button className="sm-icon-btn delete" onClick={() => handleDeleteMaterial(mat._id)}>
                                            <IonIcon icon={trashOutline} /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === 'editor' && (
                <CanvasEditor 
                    material={selectedMaterial} 
                    onBack={() => setView(selectedSubfolder ? 'materials' : 'subjects')} 
                />
            )}
        </div>
    );
};

export default StudyMaterials;
