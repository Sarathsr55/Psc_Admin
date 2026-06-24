import React, { useState, useEffect, useCallback, useMemo } from 'react'
import VoiceInputWrapper from '../../Components/VoiceInput/VoiceInputWrapper'
import { ReactTransliterate } from "react-transliterate";
import "react-transliterate/dist/index.css";
import { addQuestion, deleteQuestion, getAllQuestions, updateQuestion } from '../../services/products'
import './QuestionsAndAnswers.css'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import QuestionDisplay from './QuestionDisplay'
import Details from '../../constants/Details'
import { IonIcon } from '@ionic/react'
import { close, createOutline, trashOutline, addOutline, cloudUploadOutline, languageOutline } from 'ionicons/icons'
import animation from '../../constants/animation'
import QuestionsList from './QuestionsList'
import { Loader } from '../../Components/Loader/Loader'

const QuestionsDisplayList = ({ onEdit, onDelete }) => {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["questions"],
        queryFn: getAllQuestions,
        refetchInterval: 5000,
    })

    if (isLoading) return <div className="qa-loading"><Loader size={100} /></div>
    if (isError) return <div className="qa-error">Error: {error.message}</div>

    if (!data || data.length === 0) {
        return (
            <div className="qa-no-data">
                <p>No questions available</p>
            </div>
        )
    }

    return (
        <div className="qa-list-container">
            {data.toReversed().map((obj) => (
                <div key={obj._id} className='qa-item-card'>
                    <div className='qa-item-actions'>
                        <button className="qa-icon-btn edit-btn" title="Edit Question" onClick={() => onEdit(obj)}>
                            <IonIcon icon={createOutline} />
                        </button>
                        <button className="qa-icon-btn delete-btn" title="Delete Question" onClick={() => onDelete(obj)}>
                            <IonIcon icon={trashOutline} />
                        </button>
                    </div>
                    <QuestionDisplay data={obj} />
                </div>
            ))}
        </div>
    )
}

const QuestionsAndAnswers = () => {
    const queryClient = useQueryClient()
    const [question, setQuestion] = useState('')
    const [answer, setAnswer] = useState('')
    const [category, setCategory] = useState(Details.CATEGORY[0])
    const [options, setOptions] = useState(["", "", ""]);
    const [review, setReview] = useState('')
    const [subject, setSubject] = useState(Details.SUBJECT[0])
    const [post, setPost] = useState(Details.LEVEL[0])
    const [isDeletePopup, setIsDeletePopup] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [editId, setEditId] = useState('')
    const [topic, setTopic] = useState('')
    const [subTopic, setSubTopic] = useState('')
    const [isPreviousYear, setIsPreviousYear] = useState(false)
    const [tags, setTags] = useState([])
    const [customTags, setCustomTags] = useState([])
    const [hiddenOriginalTags, setHiddenOriginalTags] = useState([])
    const [voiceLang, setVoiceLang] = useState('ml-IN')
    const token = localStorage.getItem('token')

    const handleOptionChange = (index, value) => {
        const updated = [...options];
        updated[index] = value;
        setOptions(updated);
    };

    const questionWords = useMemo(() => {
        const combinedText = `${question || ''} ${answer || ''}`.trim();
        if (!combinedText) return [];
        // Split by spaces and basic punctuation, supporting multi-language
        const words = combinedText.split(/[\s,?.!'"()\-]+/).filter(w => w.trim() !== '');
        return Array.from(new Set(words));
    }, [question, answer]);

    const toggleTag = (word) => {
        if (tags.includes(word)) {
            setTags(tags.filter(t => t !== word));
        } else {
            setTags([...tags, word]);
        }
    };

    const displayTags = useMemo(() => {
        const base = questionWords.filter(w => !hiddenOriginalTags.includes(w));
        return Array.from(new Set([...base, ...customTags]));
    }, [questionWords, hiddenOriginalTags, customTags]);

    const handleDragStart = (e, word) => {
        e.dataTransfer.setData('text/plain', word);
    };

    const handleDrop = (e, targetWord) => {
        e.preventDefault();
        const draggedWord = e.dataTransfer.getData('text/plain');
        if (draggedWord && draggedWord !== targetWord) {
            const combined = `${targetWord} ${draggedWord}`;
            setHiddenOriginalTags(prev => [...prev, draggedWord, targetWord]);
            setCustomTags(prev => [...prev, combined]);
            
            setTags(prev => {
                const filtered = prev.filter(t => t !== draggedWord && t !== targetWord);
                return [...filtered, combined];
            });
        }
    };

    const uploadQusetionsAndAnswer = async () => {
        const qaObject = {
            question,
            answer,
            category,
            options,
            review,
            subject,
            post,
            topic,
            subTopic,
            isPreviousYear,
            tags
        }
        const result = await addQuestion(token, qaObject)
        if (result?.status === 200) {
            setQuestion('')
            setAnswer('')
            setCategory(Details.CATEGORY[0])
            setOptions(["", "", ""])
            setTags([])
            setCustomTags([])
            setHiddenOriginalTags([])
            queryClient.invalidateQueries(['questions'])
        }
    }

    const updateQuestionsAndAnswer = async () => {
        const qaObject = {
            _id: editId,
            question,
            answer,
            category,
            options,
            review,
            subject,
            post,
            topic,
            subTopic,
            isPreviousYear,
            tags
        }
        const result = await updateQuestion(qaObject)

        if (result?.status === 200) {
            setQuestion('')
            setAnswer('')
            setCategory(Details.CATEGORY[0])
            setOptions(["", "", ""])
            setReview('')
            setTags([])
            setCustomTags([])
            setHiddenOriginalTags([])
            setEditId('')
            queryClient.invalidateQueries(['questions'])
        }
    }

    const handleSave = () => {
        if (editId) {
            updateQuestionsAndAnswer()
        } else {
            uploadQusetionsAndAnswer()
        }
    }

    const onHandleDelete = async (obj) => {
        setIsDeletePopup(obj)
    }

    const confirmDelete = async (_id) => {
        setIsDeleting(true)

        const result = await deleteQuestion({ _id })

        if (result) {
            setIsDeleting(false)
            setIsDeletePopup('')
            queryClient.invalidateQueries(['questions'])
        }
    }

    const editProduct = (obj) => {
        setEditId(obj?._id)
        if (obj) {
            setQuestion(obj?.question || '')
            setAnswer(obj?.answer || '')
            setOptions(obj?.options || ["", "", ""])
            setCategory(obj?.category || Details.CATEGORY[0])
            setSubject(obj?.subject || Details.SUBJECT[0])
            setPost(obj?.post || Details.LEVEL[0])
            setTopic(obj?.topic || '')
            setSubTopic(obj?.subTopic || '')
            setReview(obj?.review || '')
            setIsPreviousYear(obj?.isPreviousYear || false)
            setTags(obj?.tags || [])
            setCustomTags([])
            setHiddenOriginalTags([])
        }
    }

    return (
        <div className="qa-page-container">
            {/* Delete Popup Modal */}
            {isDeletePopup && (
                <div className="qa-modal-overlay">
                    <div className="qa-modal">
                        <div className="qa-modal-header">
                            <h4>Confirm Deletion</h4>
                            <div className="qa-modal-close" onClick={() => setIsDeletePopup('')}>
                                <IonIcon icon={close} />
                            </div>
                        </div>
                        <div className="qa-modal-body">
                            <p>Are you sure you want to delete this question? This action cannot be undone.</p>
                        </div>
                        <div className="qa-modal-footer">
                            <button className='qa-btn qa-btn-secondary' onClick={() => setIsDeletePopup('')}>Cancel</button>
                            <button className='qa-btn qa-btn-danger' onClick={() => confirmDelete(isDeletePopup._id)}>
                                {isDeleting ? <Loader size={20} /> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="qa-main-layout">
                {/* Left Side: Form */}
                <div className="qa-form-section">
                    <div className="qa-card">
                        <div className="qa-card-header">
                            <h2 className="qa-title">{editId ? 'Update Question' : 'Add New Question'}</h2>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <button 
                                    type="button"
                                    onClick={() => setVoiceLang(voiceLang === 'ml-IN' ? 'en-IN' : 'ml-IN')}
                                    className="qa-icon-btn"
                                    title={`Voice Language: ${voiceLang === 'ml-IN' ? 'Malayalam' : 'English'}`}
                                    style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', color: voiceLang === 'ml-IN' ? '#10b981' : '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                >
                                    <IonIcon icon={languageOutline} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', marginLeft: '4px' }}>{voiceLang === 'ml-IN' ? 'ML' : 'EN'}</span>
                                </button>
                                <div className="qa-auto-fetch-toggle">
                                    <label className="qa-toggle-label">
                                        <input 
                                            type="checkbox" 
                                            checked={isPreviousYear} 
                                            onChange={(e) => setIsPreviousYear(e.target.checked)} 
                                        />
                                        <span className="qa-toggle-text">Previous Year Question</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="qa-form">
                            {/* Filter/Select Bar */}
                            <div className="qa-form-row col-2">
                                <div className="qa-form-group">
                                    <label className="qa-label">Category</label>
                                    <select className="qa-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                                        {Details.CATEGORY.map((obj, index) => <option key={index} value={obj}>{obj}</option>)}
                                    </select>
                                </div>
                                <div className="qa-form-group">
                                    <label className="qa-label">Subject</label>
                                    <select className="qa-select" value={subject} onChange={(e) => setSubject(e.target.value)}>
                                        {Details.SUBJECT.map((obj, index) => <option key={index} value={obj}>{obj}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="qa-form-row col-2">
                                <div className="qa-form-group">
                                    <label className="qa-label">Level</label>
                                    <select className="qa-select" value={post} onChange={(e) => setPost(e.target.value)}>
                                        {Details.LEVEL.map((obj, index) => <option key={index} value={obj}>{obj}</option>)}
                                    </select>
                                </div>
                                <div className="qa-form-group">
                                    <label className="qa-label">Topic</label>
                                    <VoiceInputWrapper value={topic} onTextUpdate={setTopic} lang={voiceLang}>
                                        <ReactTransliterate
                                            value={topic}
                                            onChangeText={setTopic}
                                            lang="ml"
                                            enabled={voiceLang === 'ml-IN'}
                                            renderComponent={(props) => <input {...props} className="qa-input" placeholder="Enter topic" required />}
                                        />
                                    </VoiceInputWrapper>
                                </div>
                            </div>

                            <div className="qa-form-row col-2">
                                <div className="qa-form-group">
                                    <label className="qa-label">Sub Topic</label>
                                    <VoiceInputWrapper value={subTopic} onTextUpdate={setSubTopic} lang={voiceLang}>
                                        <ReactTransliterate
                                            value={subTopic}
                                            onChangeText={setSubTopic}
                                            lang="ml"
                                            enabled={voiceLang === 'ml-IN'}
                                            renderComponent={(props) => <input {...props} className="qa-input" placeholder="Enter sub topic" />}
                                        />
                                    </VoiceInputWrapper>
                                </div>
                            </div>

                            <div className="qa-form-group">
                                <label className="qa-label">Question</label>
                                <VoiceInputWrapper value={question} onTextUpdate={setQuestion} lang={voiceLang} className="voice-input-wrapper-textarea">
                                    <ReactTransliterate
                                        value={question}
                                        onChangeText={setQuestion}
                                        lang="ml"
                                        enabled={voiceLang === 'ml-IN'}
                                        renderComponent={(props) => <textarea {...props} className="qa-input qa-textarea" placeholder="Type your question here..." rows="3" required />}
                                    />
                                </VoiceInputWrapper>
                            </div>

                            <div className="qa-form-group">
                                <label className="qa-label">Select Tags from Question & Answer</label>
                                <div className="qa-tags-container">
                                    {displayTags.length > 0 ? (
                                        displayTags.map((word, idx) => (
                                            <span 
                                                key={idx} 
                                                className={`qa-tag-pill ${tags.includes(word) ? 'active' : ''}`}
                                                onClick={() => toggleTag(word)}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, word)}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={(e) => handleDrop(e, word)}
                                                title="Drag and drop onto another tag to combine"
                                            >
                                                {word}
                                            </span>
                                        ))
                                    ) : (
                                        <span style={{ color: 'var(--qa-text-muted)', fontSize: '0.85rem' }}>
                                            Type a question or answer above to see selectable words here...
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="qa-form-group">
                                <label className="qa-label">Correct Answer</label>
                                <VoiceInputWrapper value={answer} onTextUpdate={setAnswer} lang={voiceLang}>
                                    <ReactTransliterate
                                        value={answer}
                                        onChangeText={setAnswer}
                                        lang="ml"
                                        enabled={voiceLang === 'ml-IN'}
                                        renderComponent={(props) => <input {...props} className="qa-input" placeholder="Enter the correct answer" required />}
                                    />
                                </VoiceInputWrapper>
                            </div>

                            <div className="qa-form-group">
                                <label className="qa-label">Options</label>
                                <div className="qa-options-grid">
                                    {options.map((opt, idx) => (
                                        <VoiceInputWrapper key={idx} value={opt} onTextUpdate={(val) => handleOptionChange(idx, val)} lang={voiceLang}>
                                            <ReactTransliterate
                                                value={opt}
                                                onChangeText={(val) => handleOptionChange(idx, val)}
                                                lang="ml"
                                                enabled={voiceLang === 'ml-IN'}
                                                renderComponent={(props) => <input {...props} className="qa-input" placeholder={`Option ${idx + 1}`} required />}
                                            />
                                        </VoiceInputWrapper>
                                    ))}
                                </div>
                            </div>

                            <div className="qa-form-group">
                                <label className="qa-label">Review / Notes</label>
                                <VoiceInputWrapper value={review} onTextUpdate={setReview} lang={voiceLang}>
                                    <ReactTransliterate
                                        value={review}
                                        onChangeText={setReview}
                                        lang="ml"
                                        enabled={voiceLang === 'ml-IN'}
                                        renderComponent={(props) => <input {...props} className="qa-input" placeholder="Additional notes" />}
                                    />
                                </VoiceInputWrapper>
                            </div>

                            <div className="qa-form-actions">
                                {editId && (
                                    <button className="qa-btn qa-btn-secondary" onClick={() => {
                                        setEditId('');
                                        setQuestion('');
                                        setAnswer('');
                                        setOptions(["", "", ""]);
                                        setTags([]);
                                        setCustomTags([]);
                                        setHiddenOriginalTags([]);
                                        setReview('');
                                    }}>Cancel</button>
                                )}
                                <button onClick={handleSave} className="qa-btn qa-btn-primary">
                                    <IonIcon icon={editId ? cloudUploadOutline : addOutline} style={{ marginRight: 8 }} />
                                    {editId ? 'Update Question' : 'Add Question'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: List */}
                <div className="qa-list-section">
                    <div className="qa-list-header">
                        <h3>All Questions</h3>
                    </div>
                    <QuestionsDisplayList onEdit={editProduct} onDelete={onHandleDelete} />
                    {/* Fallback to old list if needed, or keeping it for reference, but replacing with inner component for better layout control */}
                    {/* <QuestionsList onEdit={editProduct} onDelete={onHandleDelete} /> */}
                </div>
            </div>
        </div>
    )
}

export default QuestionsAndAnswers