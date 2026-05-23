import React from 'react'
import VoiceInputWrapper from '../../Components/VoiceInput/VoiceInputWrapper'
import { useState } from 'react'
import './Notes.css'
import { useQuery } from '@tanstack/react-query'
import QuestionDisplay from './QuestionDisplay'
import Details from '../../constants/Details'
import Seperator from '../../Components/Seperator'
import { IonIcon } from '@ionic/react'
import { addOutline, close, createOutline, trashOutline, languageOutline } from 'ionicons/icons'
import animation from '../../constants/animation'
import { addNote, deleteNote, getAllNotes, updateNotes } from '../../services/notes'
import NotesDisplay from './NotesDisplay'
import { Loader } from '../../Components/Loader/Loader'

const NoteList = ({ editProduct, onHandleDelete }) => {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["notes"],
        queryFn: getAllNotes,
        refetchInterval: 5000,
    })

    if (isLoading) return <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader size={80} text="Fetching notes..." /></div>
    if (isError) return <div className="notes-error">Error: {error.message}</div>

    return (
        <div className="notes-list-section">
            <div className="notes-card-header" style={{ marginBottom: '1rem', borderRadius: '12px' }}>
                <h3 className="notes-title">Existing Notes</h3>
            </div>
            <div className="notes-list-container">
                {
                    data?.length > 0 ?
                        data?.toReversed().map((obj) => {
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
    const token = localStorage.getItem('token')

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
        const result = await addNote(token, noteObject)
        if (result?.status === 200) {
            resetForm()
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
        const result = await updateNotes(noteObject)

        if (result?.status === 200) {
            resetForm()
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

            {/* Header Filters */}
            <div className="notes-header-filters">
                <div className="notes-form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
                    <select className="notes-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                        {Details.CATEGORY.map((obj, index) => (
                            <option key={index} value={obj}>{obj}</option>
                        ))}
                    </select>
                </div>
                <div className="notes-form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
                    <select className="notes-select" value={subject} onChange={(e) => setSubject(e.target.value)}>
                        {Details.SUBJECT.map((obj, index) => (
                            <option key={index} value={obj}>{obj}</option>
                        ))}
                    </select>
                </div>
                <input
                    type="text"
                    value={post}
                    onChange={(e) => setPost(e.target.value)}
                    className="notes-input"
                    style={{ flex: 1 }}
                    placeholder="Post details"
                />
                <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="notes-input"
                    style={{ flex: 1 }}
                    placeholder="Topic"
                />
            </div>

            <div className="notes-main-layout">
                {/* Form Section */}
                <div className="notes-card">
                    <div className="notes-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className="notes-title">{editId ? 'Update Note' : 'Add New Note'}</h2>
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
                    </div>
                    <div className="notes-form">
                        <div className="notes-form-group">
                            <label className="notes-label">Sub Topic</label>
                            <VoiceInputWrapper value={subtopic} onTextUpdate={setSubTopic} lang={voiceLang}>
                                <input
                                    type="text"
                                    value={subtopic}
                                    onChange={(e) => setSubTopic(e.target.value)}
                                    className="notes-input"
                                    placeholder="Enter Sub Topic"
                                />
                            </VoiceInputWrapper>
                        </div>

                        <div className="notes-form-group">
                            <label className="notes-label">Heading</label>
                            <VoiceInputWrapper value={heading} onTextUpdate={setHeading} lang={voiceLang}>
                                <input
                                    type="text"
                                    value={heading}
                                    onChange={(e) => setHeading(e.target.value)}
                                    className="notes-input"
                                    placeholder="Enter Heading"
                                />
                            </VoiceInputWrapper>
                        </div>

                        <div className="notes-form-group">
                            <label className="notes-label">Description</label>
                            <VoiceInputWrapper value={description} onTextUpdate={setDescription} lang={voiceLang}>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="notes-textarea"
                                    placeholder="Enter Detailed Description"
                                />
                            </VoiceInputWrapper>
                        </div>

                        <div style={{ borderTop: '1px solid #e2e8f0', margin: '1rem 0', paddingTop: '1rem' }}>
                            <label className="notes-label">Sub Headings & Descriptions</label>
                            <div className="notes-dynamic-field">
                                <VoiceInputWrapper value={subHeadingKey} onTextUpdate={setSubHeadingKey} className="notes-dynamic-voice" lang={voiceLang}>
                                    <input
                                        type="text"
                                        value={subHeadingKey}
                                        onChange={(e) => setSubHeadingKey(e.target.value)}
                                        className="notes-input"
                                        style={{ flex: 1 }}
                                        placeholder="Key"
                                    />
                                </VoiceInputWrapper>
                                <button className="notes-btn notes-btn-icon" onClick={AddSubHeading}>
                                    <IonIcon icon={addOutline} />
                                </button>
                            </div>
                            <VoiceInputWrapper value={subHeadingValue} onTextUpdate={setSubHeadingValue} lang={voiceLang}>
                                <textarea
                                    value={subHeadingValue}
                                    onChange={(e) => setSubHeadingValue(e.target.value)}
                                    className="notes-textarea"
                                    style={{ marginTop: '0.5rem', width: '100%', boxSizing: 'border-box' }}
                                    placeholder="Value"
                                />
                            </VoiceInputWrapper>
                            <div className="notes-dynamic-list">
                                {subHeading.map((obj, index) => (
                                    <div key={index} className="notes-tag" style={{ borderRadius: '8px', paddingRight: '2rem' }}>
                                        <strong>{obj?.key}:</strong> {obj?.value.substring(0, 20)}...
                                        <div className="notes-tag-remove" onClick={() => removeSubHeading(index)}>
                                            <IonIcon icon={close} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid #e2e8f0', margin: '1rem 0', paddingTop: '1rem' }}>
                            <label className="notes-label">Key Points</label>
                            <div className="notes-dynamic-field">
                                <VoiceInputWrapper value={keyPoints} onTextUpdate={setKeyPoints} className="notes-dynamic-voice" lang={voiceLang}>
                                    <input
                                        type="text"
                                        value={keyPoints}
                                        onChange={(e) => setKeyPoints(e.target.value)}
                                        className="notes-input"
                                        style={{ flex: 1 }}
                                        placeholder="Enter a point"
                                    />
                                </VoiceInputWrapper>
                                <button className="notes-btn notes-btn-icon" onClick={AddPoints}>
                                    <IonIcon icon={addOutline} />
                                </button>
                            </div>
                            <div className="notes-dynamic-list">
                                {points.map((obj, index) => (
                                    <div key={index} className="notes-tag">
                                        {obj}
                                        <div className="notes-tag-remove" onClick={() => removePoints(index)}>
                                            <IonIcon icon={close} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="notes-form-group">
                            <label className="notes-label">Review / Additional Notes</label>
                            <VoiceInputWrapper value={review} onTextUpdate={setReview} lang={voiceLang}>
                                <input
                                    type="text"
                                    value={review}
                                    onChange={(e) => setReview(e.target.value)}
                                    className="notes-input"
                                    placeholder="Enter any review"
                                />
                            </VoiceInputWrapper>
                        </div>

                        <button onClick={handleSave} className="notes-btn notes-btn-primary" style={{ marginTop: '1rem' }}>
                            {editId ? 'Update Note' : 'Save Note'}
                        </button>
                    </div>
                </div>

                {/* List Section */}
                <NoteList editProduct={editProduct} onHandleDelete={onHandleDelete} />
            </div>
        </div>
    )
}

export default Notes