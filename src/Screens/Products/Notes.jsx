import React, { useState, useEffect } from 'react';
import './Notes.css';
import NoteBlockEditor from './NoteBlockEditor';
import NotesDisplay from './NotesDisplay';
import { IonIcon } from '@ionic/react';
import { addOutline, trashOutline, createOutline, folderOpenOutline, arrowBackOutline, folderOutline, close, documentTextOutline, micOutline, pin, pinOutline } from 'ionicons/icons';
import VoiceInputWrapper from '../../Components/VoiceInput/VoiceInputWrapper';
import { ReactTransliterate } from "react-transliterate";
import "react-transliterate/dist/index.css";
import { getAllNotes, deleteNote, updateNotes } from '../../services/notes';
import { getAllSubjects, addSubject, addSubfolder, deleteSubject, deleteSubfolder } from '../../services/subjectService';
import { getAllFolders, addFolder, deleteFolder, updateFolder } from '../../services/folders';
import { Loader } from '../../Components/Loader/Loader';

const Notes = () => {
    const [view, setView] = useState('subjects'); // 'subjects', 'subfolders', 'folder_contents', 'editor'
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedSubfolder, setSelectedSubfolder] = useState(null);
    
    // File system states
    const [folders, setFolders] = useState([]);
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [folderPath, setFolderPath] = useState([]); // Array of folder objects for breadcrumbs
    
    const [selectedNote, setSelectedNote] = useState(null);

    const [subjects, setSubjects] = useState([]);
    const [allNotes, setAllNotes] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showSubjectModal, setShowSubjectModal] = useState(false);
    const [showSubfolderModal, setShowSubfolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [deletePopup, setDeletePopup] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const [movePopup, setMovePopup] = useState(null);
    const [moveDestSubject, setMoveDestSubject] = useState('');
    const [moveDestTopic, setMoveDestTopic] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [showFolderModal, setShowFolderModal] = useState(false);
    const [showEditFolderModal, setShowEditFolderModal] = useState(false);
    const [editingFolder, setEditingFolder] = useState(null);
    const [voiceLang, setVoiceLang] = useState('ml-IN');

    const fetchData = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const [subjectsData, notesData] = await Promise.all([
                getAllSubjects(),
                getAllNotes()
            ]);
            let foldersData = [];
            try {
                foldersData = await getAllFolders();
            } catch (err) {
                console.warn("Could not fetch folders (maybe backend needs restart?):", err);
            }
            
            const allNotesList = Array.isArray(notesData) ? notesData : [];
            
            // Clean up and deduplicate the subjects from DB
            const deduplicatedSubjects = [];
            const validSubjectsData = Array.isArray(subjectsData) ? subjectsData : [];
            validSubjectsData.forEach(s => {
                const sName = (s.name || '').trim();
                let existingSubject = deduplicatedSubjects.find(ms => ms.name.toLowerCase() === sName.toLowerCase());
                if (!existingSubject) {
                    existingSubject = { ...s, name: sName, subfolders: [] };
                    deduplicatedSubjects.push(existingSubject);
                }
                (s.subfolders || []).forEach(sf => {
                    const sfName = (sf.name || '').trim();
                    if (!existingSubject.subfolders.find(esf => esf.name.toLowerCase() === sfName.toLowerCase())) {
                        existingSubject.subfolders.push({ ...sf, name: sfName });
                    }
                });
            });
            const mergedSubjects = [...deduplicatedSubjects];
            
            allNotesList.forEach(note => {
                const nSubject = (note.subject || '').trim();
                const nTopic = (note.topic || '').trim();
                
                if (nSubject) {
                    let subjectObj = mergedSubjects.find(s => s.name.toLowerCase() === nSubject.toLowerCase());
                    if (!subjectObj) {
                        subjectObj = { _id: 'temp_' + nSubject, name: nSubject, subfolders: [] };
                        mergedSubjects.push(subjectObj);
                    }
                    const topicName = nTopic || 'Uncategorized';
                    let topicObj = subjectObj.subfolders.find(sf => sf.name.toLowerCase() === topicName.toLowerCase());
                    if (!topicObj) {
                        topicObj = { _id: 'temp_' + nSubject + '_' + topicName, name: topicName };
                        subjectObj.subfolders.push(topicObj);
                    }
                }
            });
            
            // Collect orphaned notes
            const orphanedNotes = allNotesList.filter(n => !(n.subject || '').trim());
            if (orphanedNotes.length > 0) {
                 mergedSubjects.push({
                     _id: 'temp_uncategorized',
                     name: 'Uncategorized',
                     subfolders: [{ _id: 'temp_uncategorized_all', name: 'All Notes' }]
                 });
            }
            
            setSubjects(mergedSubjects);
            setAllNotes(allNotesList);
            setFolders(foldersData || []);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddSubject = async () => {
        if (!newFolderName.trim()) return;
        try {
            await addSubject({ name: newFolderName });
            setNewFolderName('');
            setShowSubjectModal(false);
            fetchData(false);
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
            const subjectsData = await getAllSubjects();
            setSubjects(subjectsData);
            setSelectedSubject(subjectsData.find(s => s._id === selectedSubject._id));
        } catch (error) {
            alert(error.response?.data?.error || "Failed to add subfolder");
        }
    };

    const handleDeleteSubject = async (e, id) => {
        e.stopPropagation();
        if (window.confirm("Delete this subject and all its subfolders?")) {
            try {
                await deleteSubject(id);
                fetchData(false);
            } catch (error) {
                alert("Failed to delete.");
            }
        }
    };

    const handleDeleteSubfolder = async (e, subfolderId) => {
        e.stopPropagation();
        if (window.confirm("Delete this subfolder?")) {
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

    const handleTogglePin = async (e, note) => {
        e.stopPropagation();
        try {
            await updateNotes({ ...note, isPinned: !note.isPinned });
            fetchData(false);
        } catch (error) {
            alert("Failed to pin note");
        }
    };

    const handleDeleteNote = async (noteId) => {
        setIsDeleting(true);
        try {
            await deleteNote(noteId);
            setDeletePopup(null);
            fetchData(false);
        } catch (err) {
            alert("Failed to delete note");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleMoveSubmit = async () => {
        if (!movePopup || !moveDestSubject || !moveDestTopic) { alert("Please provide both a Subject and a Topic"); return; }
        setIsSaving(true);
        try {
            await updateNotes({ ...movePopup, subject: moveDestSubject, topic: moveDestTopic, parentFolderId: null });
            setMovePopup(null);
            fetchData(false);
        } catch (error) {
            alert("Failed to move note");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddFolder = async () => {
        if (!newFolderName.trim() || !selectedSubject || !selectedSubfolder) return;
        try {
            await addFolder({
                name: newFolderName,
                subject: selectedSubject.name,
                topic: selectedSubfolder.name,
                parentFolderId: currentFolderId
            });
            setNewFolderName('');
            setShowFolderModal(false);
            fetchData(false);
        } catch (error) {
            alert("Failed to add folder. If you are connected to the live Render backend, you must deploy the updated backend code first for custom folders to work!");
        }
    };

    const handleSaveEditFolder = async () => {
        if (!newFolderName.trim() || !editingFolder) return;
        try {
            await updateFolder({ ...editingFolder, name: newFolderName });
            setNewFolderName('');
            setEditingFolder(null);
            setShowEditFolderModal(false);
            fetchData(false);
        } catch (error) {
            alert("Failed to update folder");
        }
    };

    const handleDeleteFolderAction = async (e, id) => {
        e.stopPropagation();
        if (window.confirm("Delete this folder? Notes inside will not be deleted, they will just lose this folder reference.")) {
            try {
                await deleteFolder({ _id: id });
                fetchData(false);
            } catch (error) {
                alert("Failed to delete folder");
            }
        }
    };

    const handleDropNote = async (noteId, targetFolderId) => {
        const noteToMove = allNotes.find(n => n._id === noteId);
        if (!noteToMove) return;
        if (noteToMove.parentFolderId === targetFolderId) return; // already there
        
        try {
            await updateNotes({ ...noteToMove, parentFolderId: targetFolderId });
            fetchData(false);
        } catch (error) {
            alert("Failed to move note");
        }
    };

    const handleDropFolder = async (folderId, targetFolderId) => {
        if (folderId === targetFolderId) return;
        const folderToMove = folders.find(f => f._id === folderId);
        if (!folderToMove) return;
        
        try {
            await updateFolder({ ...folderToMove, parentFolderId: targetFolderId });
            fetchData(false);
        } catch (error) {
            alert("Failed to move folder");
        }
    };

    const getFilteredFolders = () => {
        if (!selectedSubject || !selectedSubfolder) return [];
        return folders.filter(f => 
            f.subject === selectedSubject.name && 
            f.topic === selectedSubfolder.name && 
            f.parentFolderId === currentFolderId
        );
    };

    const getFilteredNotes = () => {
        if (!selectedSubject || !selectedSubfolder) return [];
        if (selectedSubject.name === 'Uncategorized') {
            return allNotes.filter(n => !(n.subject || '').trim());
        }
        return allNotes.filter(n => {
            if (!n.subject) return false;
            const matchesSubject = n.subject.trim().toLowerCase() === selectedSubject.name.trim().toLowerCase();
            const noteTopic = (n.topic || '').trim();
            const selectedTopicName = (selectedSubfolder.name || '').trim();
            const matchesTopic = noteTopic.toLowerCase() === selectedTopicName.toLowerCase();
            const matchesFolder = (n.parentFolderId || null) === currentFolderId;
            
            return matchesSubject && matchesTopic && matchesFolder;
        });
    };

    // ── Render: Subjects ─────────────────────────────────────────
    if (view === 'subjects') {
        return (
            <div className="notes-page-container">
                {/* Subject Modal */}
                {showSubjectModal && (
                    <div className="notes-modal-overlay">
                        <div className="notes-modal">
                            <div className="notes-modal-header">
                                <h4 style={{ margin: 0 }}>Add New Subject</h4>
                                <IonIcon icon={close} style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setShowSubjectModal(false)} />
                            </div>
                            <div className="notes-modal-body">
                                <VoiceInputWrapper value={newFolderName} onTextUpdate={setNewFolderName} lang={voiceLang}>
                                    <ReactTransliterate
                                        value={newFolderName}
                                        onChangeText={setNewFolderName}
                                        lang="ml"
                                        enabled={voiceLang === 'ml-IN'}
                                        renderComponent={(props) => (
                                            <input
                                                {...props}
                                                className="notes-input"
                                                placeholder="Subject Name"
                                                autoFocus
                                            />
                                        )}
                                    />
                                </VoiceInputWrapper>
                            </div>
                            <div className="notes-modal-footer">
                                <button className="notes-btn" style={{ width: 'auto', background: '#000', color: '#fff', border: 'none' }} onClick={() => setShowSubjectModal(false)}>Cancel</button>
                                <button className="notes-btn notes-btn-primary" style={{ width: 'auto' }} onClick={handleAddSubject}>Save</button>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.5rem' }}>📚 Notes — Subjects</h2>
                    <button className="notes-btn notes-btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setShowSubjectModal(true)}>
                        <IonIcon icon={addOutline} /> Add Subject
                    </button>
                </div>

                {loading ? (
                    <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader size={80} text="Loading..." /></div>
                ) : subjects.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
                        <IonIcon icon={folderOutline} style={{ fontSize: '4rem' }} />
                        <p>No subjects yet. Create one!</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                        {subjects.map(sub => (
                            <div key={sub._id} className="notesection" style={{ cursor: 'pointer', padding: '20px', position: 'relative' }}
                                onClick={() => { setSelectedSubject(sub); setView('subfolders'); }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <IonIcon icon={folderOpenOutline} style={{ fontSize: '2.5rem', color: '#3b82f6' }} />
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>{sub.name}</h3>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>{sub.subfolders?.length || 0} topics</p>
                                    </div>
                                </div>
                                <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'row', gap: '4px', opacity: 0 }} className="folder-actions-hover">
                                    <button className="icon-action-btn" title="Delete Subject" onClick={(e) => handleDeleteSubject(e, sub._id)}>
                                        <IonIcon icon={trashOutline} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ── Render: Subfolders ────────────────────────────────────────
    if (view === 'subfolders' && selectedSubject) {
        return (
            <div className="notes-page-container">
                {showSubfolderModal && (
                    <div className="notes-modal-overlay">
                        <div className="notes-modal">
                            <div className="notes-modal-header">
                                <h4 style={{ margin: 0 }}>Add New Topic</h4>
                                <IonIcon icon={close} style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setShowSubfolderModal(false)} />
                            </div>
                            <div className="notes-modal-body">
                                <VoiceInputWrapper value={newFolderName} onTextUpdate={setNewFolderName} lang={voiceLang}>
                                    <ReactTransliterate
                                        value={newFolderName}
                                        onChangeText={setNewFolderName}
                                        lang="ml"
                                        enabled={voiceLang === 'ml-IN'}
                                        renderComponent={(props) => (
                                            <input
                                                {...props}
                                                className="notes-input"
                                                placeholder="Topic Name"
                                                autoFocus
                                            />
                                        )}
                                    />
                                </VoiceInputWrapper>
                            </div>
                            <div className="notes-modal-footer">
                                <button className="notes-btn" style={{ width: 'auto', background: '#000', color: '#fff', border: 'none' }} onClick={() => setShowSubfolderModal(false)}>Cancel</button>
                                <button className="notes-btn notes-btn-primary" style={{ width: 'auto' }} onClick={handleAddSubfolder}>Save</button>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button className="notes-btn" style={{ width: 'auto', background: 'transparent', border: 'none', padding: '8px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#000' }} onClick={() => setView('subjects')}>
                            <IonIcon icon={arrowBackOutline} style={{ fontSize: '1.2rem' }} /> Back
                        </button>
                        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.3rem' }}>{selectedSubject.name} / Topics</h2>
                    </div>
                    <button className="notes-btn notes-btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setShowSubfolderModal(true)}>
                        <IonIcon icon={addOutline} /> Add Topic
                    </button>
                </div>

                {(selectedSubject.subfolders?.length || 0) === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                        <IonIcon icon={folderOutline} style={{ fontSize: '3rem' }} />
                        <p>No topics yet. Create one!</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                        {selectedSubject.subfolders.map(sf => (
                            <div key={sf._id} className="notesection" style={{ cursor: 'pointer', padding: '20px', position: 'relative' }}
                                onClick={() => { 
                                    setSelectedSubfolder(sf); 
                                    setView('folder_contents'); 
                                }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <IonIcon icon={folderOpenOutline} style={{ fontSize: '2rem', color: '#10b981' }} />
                                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>{sf.name}</h3>
                                </div>
                                <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'row', gap: '4px', opacity: 0 }} className="folder-actions-hover">
                                    <button className="icon-action-btn" title="Delete Topic" onClick={(e) => handleDeleteSubfolder(e, sf._id)}>
                                        <IonIcon icon={trashOutline} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Notes without a topic in this subject */}
                {(() => {
                    const notesWithoutTopic = allNotes.filter(n => (n.subject || '').trim().toLowerCase() === selectedSubject.name.trim().toLowerCase() && (!(n.topic || '').trim()));
                    if (notesWithoutTopic.length === 0) return null;
                    
                    const sortedNotesWithoutTopic = [...notesWithoutTopic].reverse().sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
                    
                    return (
                        <div>
                            <h3 style={{ fontSize: '1rem', color: '#64748b', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Notes in this Subject</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                {sortedNotesWithoutTopic.map((obj) => {
                                    let previewImage = null;
                                    let previewText = obj.description || '';
                                    if (obj.blocks && obj.blocks.length > 0) {
                                        const imgBlock = obj.blocks.find(b => b.type === 'image');
                                        if (imgBlock && imgBlock.content && imgBlock.content.url) previewImage = imgBlock.content.url;
                                        if (!previewText) {
                                            previewText = obj.blocks.filter(b => b.type !== 'image').map(b => (b.type === 'key-value' ? `${b.content?.key || ''}: ${b.content?.value || ''}` : b.content)).join(' ');
                                        }
                                    }
                                    return (
                                        <div key={obj._id} className="admin-note-card" style={{ position: 'relative' }} onClick={() => { setSelectedNote(obj); setView('editor'); }}>
                                            {previewImage && (
                                                <div style={{ width: 'calc(100% + 40px)', margin: '-20px -20px 16px -20px', height: '140px', overflow: 'hidden', borderRadius: '12px 12px 0 0' }}>
                                                    <img src={previewImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Note preview" />
                                                </div>
                                            )}
                                            {obj.isPinned && (
                                                <div style={{ position: 'absolute', top: '12px', left: '12px', color: '#10b981', zIndex: 5, background: 'rgba(255,255,255,0.8)', borderRadius: '50%', padding: '4px', display: 'flex' }}>
                                                    <IonIcon icon={pin} />
                                                </div>
                                            )}
                                            <div className="folder-actions-hover" style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10, opacity: 0, display: 'flex', gap: '4px' }}>
                                                <button className="icon-action-btn" onClick={(e) => handleTogglePin(e, obj)} title={obj.isPinned ? "Unpin Note" : "Pin Note"}><IonIcon icon={obj.isPinned ? pin : pinOutline} /></button>
                                                <button className="icon-action-btn" onClick={(e) => { e.stopPropagation(); setMovePopup(obj); setMoveDestSubject(obj.subject || ''); setMoveDestTopic(obj.topic || ''); }} title="Move Note"><IonIcon icon={folderOpenOutline} /></button>
                                                <button className="icon-action-btn" onClick={(e) => { e.stopPropagation(); setDeletePopup(obj._id); }} title="Delete Note"><IonIcon icon={trashOutline} /></button>
                                            </div>
                                            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', color: '#1e293b' }}>{obj.heading || 'Untitled'}</h3>
                                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{previewText || 'Click to view / edit this note...'}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}
            </div>
        );
    }

    // ── Render: Folder Contents (Mixed View) ─────────────────────────────────────────
    if (view === 'folder_contents' && selectedSubject && selectedSubfolder) {
        const filteredFolders = getFilteredFolders();
        const filteredNotes = getFilteredNotes();
        
        const handleBack = () => {
            if (folderPath.length === 0) {
                setView('subfolders');
            } else {
                const newPath = [...folderPath];
                newPath.pop();
                setFolderPath(newPath);
                setCurrentFolderId(newPath.length > 0 ? newPath[newPath.length - 1]._id : null);
            }
        };

        return (
            <div className="notes-page-container">
                {showFolderModal && (
                    <div className="notes-modal-overlay">
                        <div className="notes-modal">
                            <div className="notes-modal-header">
                                <h4 style={{ margin: 0 }}>Add New Folder</h4>
                                <IonIcon icon={close} style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setShowFolderModal(false)} />
                            </div>
                            <div className="notes-modal-body">
                                <VoiceInputWrapper value={newFolderName} onTextUpdate={setNewFolderName} lang={voiceLang}>
                                    <ReactTransliterate
                                        value={newFolderName}
                                        onChangeText={setNewFolderName}
                                        lang="ml"
                                        enabled={voiceLang === 'ml-IN'}
                                        renderComponent={(props) => (
                                            <input
                                                {...props}
                                                className="notes-input"
                                                placeholder="Folder Name"
                                                autoFocus
                                            />
                                        )}
                                    />
                                </VoiceInputWrapper>
                            </div>
                            <div className="notes-modal-footer">
                                <button className="notes-btn" style={{ width: 'auto', background: '#000', color: '#fff', border: 'none' }} onClick={() => setShowFolderModal(false)}>Cancel</button>
                                <button className="notes-btn notes-btn-primary" style={{ width: 'auto' }} onClick={handleAddFolder}>Save</button>
                            </div>
                        </div>
                    </div>
                )}
                
                {showEditFolderModal && (
                    <div className="notes-modal-overlay">
                        <div className="notes-modal">
                            <div className="notes-modal-header">
                                <h4 style={{ margin: 0 }}>Edit Folder Name</h4>
                                <IonIcon icon={close} style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setShowEditFolderModal(false)} />
                            </div>
                            <div className="notes-modal-body">
                                <VoiceInputWrapper value={newFolderName} onTextUpdate={setNewFolderName} lang={voiceLang}>
                                    <ReactTransliterate
                                        value={newFolderName}
                                        onChangeText={setNewFolderName}
                                        lang="ml"
                                        enabled={voiceLang === 'ml-IN'}
                                        renderComponent={(props) => (
                                            <input
                                                {...props}
                                                className="notes-input"
                                                placeholder="Folder Name"
                                                autoFocus
                                            />
                                        )}
                                    />
                                </VoiceInputWrapper>
                            </div>
                            <div className="notes-modal-footer">
                                <button className="notes-btn" style={{ width: 'auto', background: '#000', color: '#fff', border: 'none' }} onClick={() => setShowEditFolderModal(false)}>Cancel</button>
                                <button className="notes-btn notes-btn-primary" style={{ width: 'auto' }} onClick={handleSaveEditFolder}>Save</button>
                            </div>
                        </div>
                    </div>
                )}
                
                {deletePopup && (
                    <div className="notes-modal-overlay">
                        <div className="notes-modal">
                            <div className="notes-modal-header">
                                <h4 style={{ margin: 0 }}>Confirm Deletion</h4>
                                <IonIcon icon={close} style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setDeletePopup(null)} />
                            </div>
                            <div className="notes-modal-body">Delete this note?</div>
                            <div className="notes-modal-footer">
                                <button className="notes-btn" style={{ width: 'auto', background: 'transparent', border: '1px solid #e2e8f0' }} onClick={() => setDeletePopup(null)}>Cancel</button>
                                <button className="notes-btn notes-btn-primary" style={{ width: 'auto', background: '#dc3545' }} onClick={() => handleDeleteNote(deletePopup)}>
                                    {isDeleting ? <Loader size={20} /> : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {movePopup && (
                    <div className="notes-modal-overlay">
                        <div className="notes-modal">
                            <div className="notes-modal-header">
                                <h4 style={{ margin: 0 }}>Move Note</h4>
                                <IonIcon icon={close} style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setMovePopup(null)} />
                            </div>
                            <div className="notes-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div className="notes-input-group">
                                    <label>Destination Subject</label>
                                    <input type="text" className="notes-input" value={moveDestSubject} onChange={(e) => setMoveDestSubject(e.target.value)} placeholder="Subject Name" list="subjectsList" />
                                    <datalist id="subjectsList">
                                        {subjects.filter(s => s._id !== 'temp_uncategorized').map(s => <option key={s._id} value={s.name} />)}
                                    </datalist>
                                </div>
                                <div className="notes-input-group">
                                    <label>Destination Topic</label>
                                    <input type="text" className="notes-input" value={moveDestTopic} onChange={(e) => setMoveDestTopic(e.target.value)} placeholder="Topic Name" list="topicsList" />
                                    <datalist id="topicsList">
                                        {subjects.find(s => s.name === moveDestSubject)?.subfolders.filter(sf => sf._id !== 'temp_uncategorized_all').map(sf => <option key={sf._id} value={sf.name} />)}
                                    </datalist>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>If you type a new subject or topic, it will be created automatically.</p>
                            </div>
                            <div className="notes-modal-footer">
                                <button className="notes-btn" style={{ width: 'auto', background: 'transparent', border: '1px solid #e2e8f0' }} onClick={() => setMovePopup(null)}>Cancel</button>
                                <button className="notes-btn notes-btn-primary" style={{ width: 'auto' }} onClick={handleMoveSubmit}>
                                    {isSaving ? <Loader size={20} /> : 'Move'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <button className="notes-btn" style={{ width: 'auto', background: 'transparent', border: 'none', padding: '8px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#000' }} onClick={handleBack}>
                            <IonIcon icon={arrowBackOutline} style={{ fontSize: '1.2rem' }} /> Back
                        </button>
                        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => setView('subjects')}>
                                <IonIcon icon={folderOutline} /> {selectedSubject.name}
                            </span>
                            <span style={{ margin: '0 8px', color: '#cbd5e1' }}>/</span>
                            <span style={{ cursor: 'pointer', color: folderPath.length === 0 ? '#1e293b' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => { setCurrentFolderId(null); setFolderPath([]); }}>
                                <IonIcon icon={folderOpenOutline} /> {selectedSubfolder.name}
                            </span>
                            {folderPath.map((fp, index) => (
                                <React.Fragment key={fp._id}>
                                    <span style={{ margin: '0 8px', color: '#cbd5e1' }}>/</span>
                                    <span 
                                        style={{ cursor: 'pointer', color: index === folderPath.length - 1 ? '#1e293b' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        onClick={() => {
                                            const newPath = folderPath.slice(0, index + 1);
                                            setFolderPath(newPath);
                                            setCurrentFolderId(fp._id);
                                        }}
                                    >
                                        <IonIcon icon={folderOpenOutline} /> {fp.name}
                                    </span>
                                </React.Fragment>
                            ))}
                        </h2>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="notes-btn" style={{ width: 'auto', background: 'transparent', border: '1px solid #e2e8f0', color: voiceLang === 'ml-IN' ? '#10b981' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => setVoiceLang(voiceLang === 'ml-IN' ? 'en-IN' : 'ml-IN')} title={`Typing Language: ${voiceLang === 'ml-IN' ? 'Malayalam' : 'English'}`}>
                            <IonIcon icon={micOutline} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{voiceLang === 'ml-IN' ? 'ML' : 'EN'}</span>
                        </button>
                        <button className="notes-btn" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', color: '#334155' }} onClick={() => setShowFolderModal(true)}>
                            <IonIcon icon={folderOutline} /> New Folder
                        </button>
                        <button className="notes-btn notes-btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => {
                            setSelectedNote(null);
                            setView('editor');
                        }}>
                            <IonIcon icon={addOutline} /> Create Note
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader size={80} text="Fetching contents..." /></div>
                ) : (
                    <>
                        {/* FOLDERS GRID */}
                        {filteredFolders.length > 0 && (
                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ fontSize: '1rem', color: '#64748b', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    <IonIcon icon={folderOutline} style={{ verticalAlign: 'text-bottom', marginRight: '6px' }} />
                                    Folders
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                                    {filteredFolders.map(f => (
                                        <div 
                                            key={f._id} 
                                            className="notesection" 
                                            style={{ cursor: 'pointer', padding: '16px', position: 'relative' }}
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('application/json', JSON.stringify({ type: 'folder', id: f._id }));
                                            }}
                                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.border = '2px dashed #3b82f6'; }}
                                            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.border = 'none'; }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                e.currentTarget.style.border = 'none';
                                                try {
                                                    const data = JSON.parse(e.dataTransfer.getData('application/json'));
                                                    if (data.type === 'note') handleDropNote(data.id, f._id);
                                                    if (data.type === 'folder') handleDropFolder(data.id, f._id);
                                                } catch (err) {}
                                            }}
                                            onClick={() => { 
                                                setCurrentFolderId(f._id);
                                                setFolderPath([...folderPath, f]);
                                            }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <IonIcon icon={folderOpenOutline} style={{ fontSize: '1.8rem', color: '#6366f1' }} />
                                                <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b' }}>{f.name}</h3>
                                            </div>
                                            <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'row', gap: '4px', opacity: 0 }} className="folder-actions-hover">
                                                <button className="icon-action-btn" style={{ position: 'relative', top: 0, right: 0 }} title="Edit Folder" onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingFolder(f);
                                                    setNewFolderName(f.name);
                                                    setShowEditFolderModal(true);
                                                }}>
                                                    <IonIcon icon={createOutline} />
                                                </button>
                                                <button className="icon-action-btn" style={{ position: 'relative', top: 0, right: 0 }} title="Delete Folder" onClick={(e) => handleDeleteFolderAction(e, f._id)}>
                                                    <IonIcon icon={trashOutline} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div>
                            <h3 style={{ fontSize: '1rem', color: '#64748b', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                <IonIcon icon={documentTextOutline} style={{ verticalAlign: 'text-bottom', marginRight: '6px' }} />
                                Notes
                            </h3>
                            {filteredNotes.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                                    <p>No notes here. Create one or drop one in!</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                    {[...filteredNotes].reverse().sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)).map((obj) => {
                                        let previewImage = null;
                                        let previewText = obj.description || '';
                                        if (obj.blocks && obj.blocks.length > 0) {
                                            const imgBlock = obj.blocks.find(b => b.type === 'image');
                                            if (imgBlock && imgBlock.content && imgBlock.content.url) previewImage = imgBlock.content.url;
                                            
                                            if (!previewText) {
                                                previewText = obj.blocks
                                                    .filter(b => b.type !== 'image')
                                                    .map(b => (b.type === 'key-value' ? `${b.content?.key || ''}: ${b.content?.value || ''}` : b.content))
                                                    .join(' ');
                                            }
                                        }
                                        return (
                                            <div 
                                                key={obj._id} 
                                                className="admin-note-card" 
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'note', id: obj._id }));
                                                }}
                                                style={{ position: 'relative' }}
                                                onClick={() => { setSelectedNote(obj); setView('editor'); }}>
                                                {previewImage && (
                                                    <div style={{ width: 'calc(100% + 40px)', margin: '-20px -20px 16px -20px', height: '140px', overflow: 'hidden', borderRadius: '12px 12px 0 0' }}>
                                                        <img src={previewImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Note preview" />
                                                    </div>
                                                )}
                                                {obj.isPinned && (
                                                    <div style={{ position: 'absolute', top: '12px', left: '12px', color: '#10b981', zIndex: 5, background: 'rgba(255,255,255,0.8)', borderRadius: '50%', padding: '4px', display: 'flex' }}>
                                                        <IonIcon icon={pin} />
                                                    </div>
                                                )}
                                                <div className="folder-actions-hover" style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10, opacity: 0, display: 'flex', gap: '4px' }}>
                                                    <button className="icon-action-btn" onClick={(e) => handleTogglePin(e, obj)} title={obj.isPinned ? "Unpin Note" : "Pin Note"}><IonIcon icon={obj.isPinned ? pin : pinOutline} /></button>
                                                    <button className="icon-action-btn" onClick={(e) => { e.stopPropagation(); setMovePopup(obj); setMoveDestSubject(obj.subject || ''); setMoveDestTopic(obj.topic || ''); }} title="Move Note"><IonIcon icon={folderOpenOutline} /></button>
                                                    <button className="icon-action-btn" onClick={(e) => { e.stopPropagation(); setDeletePopup(obj._id); }} title="Delete Note">
                                                        <IonIcon icon={trashOutline} />
                                                    </button>
                                                </div>
                                                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', color: '#1e293b' }}>{obj.heading || 'Untitled'}</h3>
                                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {previewText || 'Click to view / edit this note...'}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    }

    // ── Render: Block Editor ─────────────────────────────────────
    if (view === 'editor') {
        return (
            <NoteBlockEditor
                note={selectedNote}
                subject={selectedSubject?.name || ''}
                subfolder={selectedSubfolder?.name || ''}
                parentFolderId={currentFolderId}
                onBack={() => setView('folder_contents')}
                onSaved={() => fetchData(false)}
            />
        );
    }

    return null;
};

export default Notes;