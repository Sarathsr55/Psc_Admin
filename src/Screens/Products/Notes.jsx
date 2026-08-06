import React from 'react'
import VoiceInputWrapper from '../../Components/VoiceInput/VoiceInputWrapper'
import { useState } from 'react'
import { ReactTransliterate } from "react-transliterate";
import "react-transliterate/dist/index.css";
import './Notes.css'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import QuestionDisplay from './QuestionDisplay'
import Details from '../../constants/Details'
import Seperator from '../../Components/Seperator'
import { IonIcon } from '@ionic/react'
import { addOutline, close, createOutline, trashOutline, languageOutline } from 'ionicons/icons'
import animation from '../../constants/animation'
import { addNote, deleteNote, getAllNotes, updateNotes } from '../../services/notes'
import NotesDisplay from './NotesDisplay'
import { Loader } from '../../Components/Loader/Loader'

const NoteList = ({ editProduct, onHandleDelete, data, isLoading, isError, error, searchQuery, setSearchQuery, voiceLang }) => {
    if (isLoading) return <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader size={80} text="Fetching notes..." /></div>
    if (isError) return <div className="notes-error">Error: {error.message}</div>

    let filteredData = data;
    if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        filteredData = data.filter(obj => {
            const t = (obj?.topic || '').toLowerCase();
            const s = (obj?.subtopic || '').toLowerCase();
            return t.includes(query) || s.includes(query);
        });
    }

    return (
        <div className="notes-list-section">
            <div className="notes-card-header" style={{ marginBottom: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '1rem' }}>
                <h3 className="notes-title" style={{ whiteSpace: 'nowrap' }}>Existing Notes</h3>
                <div style={{ flex: '0 1 300px', minWidth: '200px' }}>
                    <VoiceInputWrapper value={searchQuery} onTextUpdate={setSearchQuery} lang={voiceLang}>
                        <ReactTransliterate
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            lang="ml"
                            enabled={voiceLang === 'ml-IN'}
                            renderComponent={(props) => (
                                <input
                                    {...props}
                                    type="text"
                                    className="notes-input"
                                    placeholder="Search topic or subtopic..."
                                />
                            )}
                        />
                    </VoiceInputWrapper>
                </div>
            </div>
            <div className="notes-list-container">
                {
                    filteredData?.length > 0 ?
                        filteredData?.toReversed().map((obj) => {
                            return (
                                <div key={obj?._id} className='notesection'>
                                    <div className='edit'>
                                        <div className="edit-icon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); editProduct(obj); }}>
                                            <IonIcon icon={createOutline} />
                                        </div>
                                        <div className="edit-icon delete-icon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onHandleDelete(obj); }}>
                                            <IonIcon icon={trashOutline} />
                                        </div>
                                    </div>
                                    <NotesDisplay data={obj} />
                                </div>
                            )
                        })
                        :
                        filteredData?.length === 0 ?
                        <div className="notes-no-data">
                            <p>No matching notes found</p>
                        </div>
                        :
                        <div className="notes-no-data">
                            <p>No Notes available</p>
                        </div>
                }
            </div>
        </div>
    )
}

const Notes = () => {
    const [heading, setHeading] = useState('')
    const [description, setDescription] = useState('')
    const [subHeading, setSubHeading] = useState([])
    const [subHeadingKey, setSubHeadingKey] = useState('')
    const [subHeadingValue, setSubHeadingValue] = useState('')
    const [keyPoints, setKeyPoints] = useState('')
    const [points, setPoints] = useState([])
    const [topic, setTopic] = useState('')
    const [subtopic, setSubTopic] = useState('')
    const [category, setCategory] = useState(Details.CATEGORY[0])
    const [review, setReview] = useState('')
    const [subject, setSubject] = useState(Details.SUBJECT[0])
    const [post, setPost] = useState('')
    const [isDeletePopup, setIsDeletePopup] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [editId, setEditId] = useState('')
    const [voiceLang, setVoiceLang] = useState('ml-IN')
    const [searchQuery, setSearchQuery] = useState('')
    const token = localStorage.getItem('token')

    const queryClient = useQueryClient();
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["notes"],
        queryFn: getAllNotes,
        refetchInterval: 5000,
    });

    const uniqueTopics = React.useMemo(() => {
        if (!data) return [];
        return Array.from(new Set(data.map(q => q.topic).filter(Boolean)));
    }, [data]);

    const uniqueSubTopics = React.useMemo(() => {
        if (!data) return [];
        return Array.from(new Set(data.map(q => q.subtopic).filter(Boolean)));
    }, [data]);

    const uniqueHeadings = React.useMemo(() => {
        if (!data) return [];
        return Array.from(new Set(data.map(q => q.heading).filter(Boolean)));
    }, [data]);

    const uniquePosts = React.useMemo(() => {
        if (!data) return [];
        return Array.from(new Set(data.map(q => q.post).filter(Boolean)));
    }, [data]);

    const AddSubHeading = () => {
        if (subHeadingKey) {
            setSubHeading([...subHeading, { key: subHeadingKey, value: subHeadingValue }])
            setSubHeadingKey('')
            setSubHeadingValue('')
        }
    }

    const AddPoints = () => {
        if (keyPoints) {
            setPoints([...points, keyPoints])
            setKeyPoints('')
        }
    }

    const removeSubHeading = (i) => {
        const newSubHeading = subHeading.filter((obj, index) => index !== i)
        setSubHeading(newSubHeading)
    }

    const removePoints = (i) => {
        const newPoints = points.filter((obj, index) => index !== i)
        setPoints(newPoints)
    }

    const editSubHeading = (i) => {
        const item = subHeading[i];
        setSubHeadingKey(item.key);
        setSubHeadingValue(item.value);
        removeSubHeading(i);
    }

    const editPoint = (i) => {
        const item = points[i];
        setKeyPoints(item);
        removePoints(i);
    }

    const uploadNotes = async () => {
        const noteObject = {
            heading,
            description,
            subheading: subHeading,
            points,
            review,
            subject,
            post,
            category,
            topic,
            subtopic
        }
        try {
            const result = await addNote(token, noteObject)
            if (result?.status === 200) {
                resetForm()
                queryClient.invalidateQueries(['notes'])
            }
        } catch (err) {
            console.error("Save Note Error:", err);
            alert(`Error saving note:\n${err.response?.data?.error || err.message || "Unknown error"}`);
        }
    }

    const updateNote = async () => {
        const noteObject = {
            _id: editId,
            heading,
            description,
            subheading: subHeading,
            points,
            review,
            subject,
            post,
            category,
            topic,
            subtopic
        }
        try {
            const result = await updateNotes(noteObject)

            if (result?.status === 200) {
                resetForm()
                queryClient.invalidateQueries(['notes'])
            }
        } catch (err) {
            console.error("Update Note Error:", err);
            alert(`Error updating note:\n${err.response?.data?.error || err.message || "Unknown error"}`);
        }
    }

    const resetForm = () => {
        setHeading('')
        setDescription('')
        setReview('')
        setSubHeading([])
        setPoints([])
        setEditId('')
        setSubTopic('')
        setTopic('')
        setPost('')
    }

    const handleSave = () => {
        if (editId) {
            updateNote()
        } else {
            uploadNotes()
        }
    }

    const onHandleDelete = async (obj) => {
        setIsDeletePopup(obj)
    }

    const confirmDelete = async (_id) => {
        setIsDeleting(true)
        const result = await deleteNote(_id)
        if (result) {
            setIsDeleting(false)
            setIsDeletePopup('')
            resetForm()
        }
    }

    const editProduct = (obj) => {
        setEditId(obj?._id)
        if (obj) {
            setHeading(obj?.heading)
            setDescription(obj?.description)
            setSubHeading(obj?.subheading || [])
            setPoints(obj?.points || [])
            setReview(obj?.review || '')
            setTopic(obj?.topic || '')
            setCategory(obj?.category || Details.CATEGORY[0])
            setSubject(obj?.subject || Details.SUBJECT[0])
            setPost(obj?.post || '')
            setSubTopic(obj?.subtopic || '')
        }
    }

    return (
        <div className="notes-page-container">
            {/* Delete Modal */}
            {isDeletePopup && (
                <div className="notes-modal-overlay">
                    <div className="notes-modal">
                        <div className="notes-modal-header">
                            <h4 style={{ margin: 0 }}>Confirm Deletion</h4>
                            <IonIcon icon={close} style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setIsDeletePopup('')} />
                        </div>
                        <div className="notes-modal-body">
                            Are you sure you want to delete this note?
                        </div>
                        <div className="notes-modal-footer">
                            <button className="notes-btn" style={{ width: 'auto', background: 'transparent', border: '1px solid #e2e8f0' }} onClick={() => setIsDeletePopup('')}>Cancel</button>
                            <button className="notes-btn notes-btn-primary" style={{ width: 'auto', background: '#dc3545' }} onClick={() => confirmDelete(isDeletePopup._id)}>
                                {isDeleting ? <Loader size={20} /> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            <div className="notes-main-layout">
                {/* Form Section */}
                <div className="notes-card">
                    <div className="notes-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className="notes-title">{editId ? 'Update Note' : 'Add New Note'}</h2>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <button 
                                type="button"
                                onClick={() => setVoiceLang(voiceLang === 'ml-IN' ? 'en-IN' : 'ml-IN')}
                                className="notes-icon-btn"
                                title={`Voice Language: ${voiceLang === 'ml-IN' ? 'Malayalam' : 'English'}`}
                                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', color: voiceLang === 'ml-IN' ? '#10b981' : '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                <IonIcon icon={languageOutline} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', marginLeft: '4px' }}>{voiceLang === 'ml-IN' ? 'ML' : 'EN'}</span>
                            </button>
                            
                            <details className="notes-metadata-details">
                                <summary className="notes-metadata-summary">
                                    <div className="notes-metadata-summary-content">
                                        <IonIcon icon={createOutline} />
                                        <span>Metadata</span>
                                    </div>
                                </summary>
                                <div className="notes-metadata-body">
                                    <div className="notes-form-group" style={{ marginBottom: 0 }}>
                                        <label className="notes-label" style={{ fontSize: '0.8rem', color: 'var(--notes-text-muted)' }}>Category</label>
                                        <select className="notes-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                                            {Details.CATEGORY.map((obj, index) => (
                                                <option key={index} value={obj}>{obj}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="notes-form-group" style={{ marginBottom: 0 }}>
                                        <label className="notes-label" style={{ fontSize: '0.8rem', color: 'var(--notes-text-muted)' }}>Subject</label>
                                        <select className="notes-select" value={subject} onChange={(e) => setSubject(e.target.value)}>
                                            {Details.SUBJECT.map((obj, index) => (
                                                <option key={index} value={obj}>{obj}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="notes-form-group" style={{ marginBottom: 0 }}>
                                        <label className="notes-label" style={{ fontSize: '0.8rem', color: 'var(--notes-text-muted)' }}>Post Details</label>
                                        <VoiceInputWrapper value={post} onTextUpdate={setPost} lang={voiceLang}>
                                            <ReactTransliterate
                                                value={post}
                                                onChangeText={setPost}
                                                lang="ml"
                                                enabled={voiceLang === 'ml-IN'}
                                                renderComponent={(props) => (
                                                    <input
                                                        {...props}
                                                        className="notes-input"
                                                        style={{ width: '100%' }}
                                                        placeholder="Enter post details"
                                                        list="notes-posts-list"
                                                    />
                                                )}
                                            />
                                        </VoiceInputWrapper>
                                    </div>
                                    <div className="notes-form-group" style={{ marginBottom: 0 }}>
                                        <label className="notes-label" style={{ fontSize: '0.8rem', color: 'var(--notes-text-muted)' }}>Topic</label>
                                        <VoiceInputWrapper value={topic} onTextUpdate={setTopic} lang={voiceLang}>
                                            <ReactTransliterate
                                                value={topic}
                                                onChangeText={setTopic}
                                                lang="ml"
                                                enabled={voiceLang === 'ml-IN'}
                                                renderComponent={(props) => (
                                                    <input
                                                        {...props}
                                                        className="notes-input"
                                                        style={{ width: '100%' }}
                                                        placeholder="Enter topic"
                                                        list="notes-topics-list"
                                                    />
                                                )}
                                            />
                                        </VoiceInputWrapper>
                                    </div>
                                </div>
                            </details>
                        </div>
                    </div>
                    <div className="notes-form">
                        <div className="notes-form-group">
                            <label className="notes-label">Sub Topic</label>
                            <VoiceInputWrapper value={subtopic} onTextUpdate={setSubTopic} lang={voiceLang}>
                                <ReactTransliterate
                                    value={subtopic}
                                    onChangeText={setSubTopic}
                                    lang="ml"
                                    enabled={voiceLang === 'ml-IN'}
                                    renderComponent={(props) => (
                                        <input
                                            {...props}
                                            className="notes-input"
                                            placeholder="Enter Sub Topic"
                                            list="notes-subtopics-list"
                                        />
                                    )}
                                />
                            </VoiceInputWrapper>
                        </div>

                        <div className="notes-form-group">
                            <label className="notes-label">Heading</label>
                            <VoiceInputWrapper value={heading} onTextUpdate={setHeading} lang={voiceLang}>
                                <ReactTransliterate
                                    value={heading}
                                    onChangeText={setHeading}
                                    lang="ml"
                                    enabled={voiceLang === 'ml-IN'}
                                    renderComponent={(props) => (
                                        <input
                                            {...props}
                                            className="notes-input"
                                            placeholder="Enter Heading"
                                            list="notes-headings-list"
                                        />
                                    )}
                                />
                            </VoiceInputWrapper>
                        </div>

                        <div className="notes-form-group">
                            <label className="notes-label">Description</label>
                            <VoiceInputWrapper value={description} onTextUpdate={setDescription} lang={voiceLang}>
                                <ReactTransliterate
                                    value={description}
                                    onChangeText={setDescription}
                                    lang="ml"
                                    enabled={voiceLang === 'ml-IN'}
                                    renderComponent={(props) => (
                                        <textarea
                                            {...props}
                                            className="notes-textarea"
                                            placeholder="Enter Detailed Description"
                                        />
                                    )}
                                />
                            </VoiceInputWrapper>
                        </div>

                        <div className="notes-section-divider">
                            <label className="notes-label">Sub Headings & Descriptions</label>
                            <div className="notes-dynamic-field">
                                <VoiceInputWrapper value={subHeadingKey} onTextUpdate={setSubHeadingKey} className="notes-dynamic-voice" lang={voiceLang}>
                                    <ReactTransliterate
                                        value={subHeadingKey}
                                        onChangeText={setSubHeadingKey}
                                        lang="ml"
                                        enabled={voiceLang === 'ml-IN'}
                                        renderComponent={(props) => (
                                            <input
                                                {...props}
                                                className="notes-input"
                                                style={{ flex: 1 }}
                                                placeholder="Key"
                                            />
                                        )}
                                    />
                                </VoiceInputWrapper>
                                <button className="notes-btn notes-btn-icon" onClick={AddSubHeading}>
                                    <IonIcon icon={addOutline} />
                                </button>
                            </div>
                            <VoiceInputWrapper value={subHeadingValue} onTextUpdate={setSubHeadingValue} lang={voiceLang}>
                                <ReactTransliterate
                                    value={subHeadingValue}
                                    onChangeText={setSubHeadingValue}
                                    lang="ml"
                                    enabled={voiceLang === 'ml-IN'}
                                    renderComponent={(props) => (
                                        <textarea
                                            {...props}
                                            className="notes-textarea"
                                            style={{ marginTop: '0.5rem', width: '100%', boxSizing: 'border-box' }}
                                            placeholder="Value"
                                        />
                                    )}
                                />
                            </VoiceInputWrapper>
                            <div className="notes-dynamic-list">
                                {subHeading.map((obj, index) => (
                                    <div key={index} className="notes-subheading-card">
                                        <div className="notes-subheading-card-content">
                                            <strong>{obj?.key}:</strong> {obj?.value.substring(0, 40)}{obj?.value.length > 40 ? '...' : ''}
                                        </div>
                                        <div className="notes-tag-actions">
                                            <div className="notes-tag-action notes-tag-edit" onClick={() => editSubHeading(index)} title="Edit">
                                                <IonIcon icon={createOutline} />
                                            </div>
                                            <div className="notes-tag-action delete" onClick={() => removeSubHeading(index)} title="Delete">
                                                <IonIcon icon={close} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="notes-section-divider">
                            <label className="notes-label">Key Points</label>
                            <div className="notes-dynamic-field">
                                <VoiceInputWrapper value={keyPoints} onTextUpdate={setKeyPoints} className="notes-dynamic-voice" lang={voiceLang}>
                                    <ReactTransliterate
                                        value={keyPoints}
                                        onChangeText={setKeyPoints}
                                        lang="ml"
                                        enabled={voiceLang === 'ml-IN'}
                                        renderComponent={(props) => (
                                            <input
                                                {...props}
                                                className="notes-input"
                                                style={{ flex: 1 }}
                                                placeholder="Enter a point"
                                            />
                                        )}
                                    />
                                </VoiceInputWrapper>
                                <button className="notes-btn notes-btn-icon" onClick={AddPoints}>
                                    <IonIcon icon={addOutline} />
                                </button>
                            </div>
                            <div className="notes-dynamic-list">
                                {points.map((obj, index) => (
                                    <div key={index} className="notes-tag">
                                        <span>{obj}</span>
                                        <div className="notes-tag-actions">
                                            <div className="notes-tag-action notes-tag-edit" onClick={() => editPoint(index)} title="Edit">
                                                <IonIcon icon={createOutline} />
                                            </div>
                                            <div className="notes-tag-action delete" onClick={() => removePoints(index)} title="Delete">
                                                <IonIcon icon={close} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="notes-form-group">
                            <label className="notes-label">Review / Additional Notes</label>
                            <VoiceInputWrapper value={review} onTextUpdate={setReview} lang={voiceLang}>
                                <ReactTransliterate
                                    value={review}
                                    onChangeText={setReview}
                                    lang="ml"
                                    enabled={voiceLang === 'ml-IN'}
                                    renderComponent={(props) => (
                                        <input
                                            {...props}
                                            className="notes-input"
                                            placeholder="Enter any review"
                                        />
                                    )}
                                />
                            </VoiceInputWrapper>
                        </div>

                        <button onClick={handleSave} className="notes-btn notes-btn-primary" style={{ marginTop: '1rem' }}>
                            {editId ? 'Update Note' : 'Save Note'}
                        </button>

                        {/* Datalists for Auto-suggestions */}
                        <datalist id="notes-topics-list">
                            {uniqueTopics.map((t, idx) => <option key={`t-${idx}`} value={t} />)}
                        </datalist>
                        <datalist id="notes-subtopics-list">
                            {uniqueSubTopics.map((st, idx) => <option key={`st-${idx}`} value={st} />)}
                        </datalist>
                        <datalist id="notes-headings-list">
                            {uniqueHeadings.map((h, idx) => <option key={`h-${idx}`} value={h} />)}
                        </datalist>
                        <datalist id="notes-posts-list">
                            {uniquePosts.map((p, idx) => <option key={`p-${idx}`} value={p} />)}
                        </datalist>
                    </div>
                </div>

                {/* List Section */}
                <NoteList editProduct={editProduct} onHandleDelete={onHandleDelete} data={data} isLoading={isLoading} isError={isError} error={error} searchQuery={searchQuery} setSearchQuery={setSearchQuery} voiceLang={voiceLang} />
            </div>
        </div>
    )
}

export default Notes