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
import { close, createOutline, trashOutline, addOutline, cloudUploadOutline, languageOutline, alertCircleOutline } from 'ionicons/icons'
import animation from '../../constants/animation'
import QuestionsList from './QuestionsList'
import { Loader } from '../../Components/Loader/Loader'

const QuestionsDisplayList = ({ data, isLoading, isError, error, searchQuery, filterSubject, onEdit, onDelete }) => {
    if (isLoading) return <div className="qa-loading"><Loader size={100} /></div>
    if (isError) return <div className="qa-error">Error: {error.message}</div>

    let filteredData = data;
    if (searchQuery) {
        const sanitize = (str) => {
            if (!str) return '';
            return str.toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
        };
        const query = sanitize(searchQuery);
        filteredData = data.filter(obj => {
            const q = sanitize(obj?.question);
            const a = sanitize(obj?.answer);
            const t = sanitize(obj?.topic);
            const s = sanitize(obj?.subTopic);
            return q.includes(query) || a.includes(query) || t.includes(query) || s.includes(query);
        });
    }

    if (filterSubject) {
        filteredData = filteredData.filter(obj => obj?.subject === filterSubject);
    }

    if (!filteredData || filteredData.length === 0) {
        return (
            <div className="qa-no-data">
                <p>No questions found</p>
            </div>
        )
    }

    return (
        <div className="qa-list-container">
            {filteredData.toReversed().map((obj) => (
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
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["questions"],
        queryFn: getAllQuestions,
        refetchInterval: 5000,
    })
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
    const [searchQuery, setSearchQuery] = useState('')
    const [filterSubject, setFilterSubject] = useState('')
    const [showRelatedNotes, setShowRelatedNotes] = useState(true)
    const token = localStorage.getItem('token')

    const isDuplicateQuestion = useMemo(() => {
        if (!question || !question.trim() || !data) return false;
        const sanitize = (str) => {
            if (!str) return '';
            // Remove zero-width characters and all whitespace for strict comparison
            return str.toLowerCase().replace(/[\u200B-\u200D\uFEFF\s]/g, '');
        };
        const currentSanitized = sanitize(question);
        
        // Exclude the currently editing question from the duplicate check
        return data.some(obj => obj._id !== editId && sanitize(obj.question) === currentSanitized);
    }, [question, data, editId]);

    const relatedNotes = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        
        // Use user-selected tags as keywords
        if (!tags || tags.length === 0) return [];

        return data.reduce((acc, item) => {
            // Don't match the currently edited question with itself
            if (editId && item._id === editId) return acc;
            
            // Only include items that actually have a review/note
            if (!item.review || !item.review.trim()) return acc;

            const reviewText = (item.review || '').toLowerCase();
            
            // Check if at least one selected keyword appears in the other question's tags or review
            let matchedKeywords = [];
            for (const tag of tags) {
                const keyword = tag.toLowerCase().trim();
                if (!keyword) continue;

                // Check if the other question has this tag, OR if the keyword is in its review
                const hasTag = item.tags && item.tags.some(t => t.toLowerCase().trim() === keyword);
                const inReview = reviewText.includes(keyword);

                if (hasTag || inReview) {
                    matchedKeywords.push(tag); // keep original casing if possible, or just the word
                }
            }
            
            // Show note if it includes the keyword
            if (matchedKeywords.length >= 1) {
                acc.push({ ...item, matchedKeywords });
            }
            
            return acc;
        }, []);
    }, [data, tags, editId]);

    useEffect(() => {
        if (relatedNotes.length > 0) {
            setShowRelatedNotes(true);
        }
    }, [relatedNotes.length]);

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

    const uniqueTopics = useMemo(() => {
        if (!data) return [];
        return Array.from(new Set(data.map(q => q.topic).filter(Boolean)));
    }, [data]);

    const uniqueSubTopics = useMemo(() => {
        if (!data) return [];
        return Array.from(new Set(data.map(q => q.subTopic).filter(Boolean)));
    }, [data]);

    const uniqueAnswers = useMemo(() => {
        if (!data) return [];
        return Array.from(new Set(data.map(q => q.answer).filter(Boolean)));
    }, [data]);

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

    const getHighlightedText = (text, highlightTags) => {
        if (!highlightTags || highlightTags.length === 0 || !text) {
            return <span>{text}</span>;
        }

        const validTags = highlightTags.filter(t => t.trim().length > 0);
        if (validTags.length === 0) return <span>{text}</span>;

        const escapedTags = validTags.map(tag => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const regex = new RegExp(`(${escapedTags.join('|')})`, 'gi');
        
        const parts = text.split(regex);
        
        return (
            <span>
                {parts.map((part, i) => {
                    const isMatch = validTags.some(tag => tag.toLowerCase() === part.toLowerCase());
                    return isMatch ? (
                        <span key={i} style={{ backgroundColor: '#fde047', color: '#854d0e', fontWeight: 'bold', padding: '0 2px', borderRadius: '2px' }}>
                            {part}
                        </span>
                    ) : (
                        <span key={i}>{part}</span>
                    );
                })}
            </span>
        );
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
            setReview('')
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
                                            renderComponent={(props) => <input {...props} className="qa-input" placeholder="Enter topic" list="topics-list" required />}
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
                                            renderComponent={(props) => <input {...props} className="qa-input" placeholder="Enter sub topic" list="subtopics-list" />}
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
                                        renderComponent={(props) => <textarea {...props} className={`qa-input qa-textarea ${isDuplicateQuestion ? 'qa-duplicate-input' : ''}`} placeholder="Type your question here..." rows="3" required />}
                                    />
                                </VoiceInputWrapper>
                                {isDuplicateQuestion && (
                                    <div className="qa-duplicate-warning">
                                        <IonIcon icon={alertCircleOutline} style={{ fontSize: '1.2rem' }} />
                                        <span>This exact question already exists in the database!</span>
                                    </div>
                                )}
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
                                <VoiceInputWrapper value={review} onTextUpdate={setReview} lang={voiceLang} className="voice-input-wrapper-textarea">
                                    <ReactTransliterate
                                        value={review}
                                        onChangeText={setReview}
                                        lang="ml"
                                        enabled={voiceLang === 'ml-IN'}
                                        renderComponent={(props) => <textarea {...props} className="qa-input qa-textarea" placeholder="Additional notes" rows="3" />}
                                    />
                                </VoiceInputWrapper>
                            </div>

                            {relatedNotes.length > 0 && (
                                <div className="qa-form-group">
                                    <label 
                                        className="qa-label" 
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0ea5e9', cursor: 'pointer', userSelect: 'none', background: '#f0f9ff', padding: '0.5rem', borderRadius: '6px' }}
                                        onClick={() => setShowRelatedNotes(!showRelatedNotes)}
                                        title="Click to toggle related notes"
                                    >
                                        <IonIcon icon={alertCircleOutline} style={{ fontSize: '1.2rem' }} /> 
                                        Related Notes ({relatedNotes.length})
                                        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                            {showRelatedNotes ? '▼ Hide' : '▶ Show'}
                                        </span>
                                    </label>
                                    
                                    {showRelatedNotes && (
                                        <div className="qa-related-notes-container">
                                            {relatedNotes.map((item, idx) => (
                                            <div key={idx} className="qa-related-note-item">
                                                <details>
                                                    <summary className="qa-related-note-summary">
                                                        <span style={{ fontWeight: '600', color: '#0f172a' }}>Keyword Match:</span> <span style={{ color: '#0ea5e9', marginLeft: '4px' }}>{item.matchedKeywords.join(', ')}</span>
                                                    </summary>
                                                    <div className="qa-related-note-content">
                                                        <div className="qa-related-note-review-box">
                                                            <div className="qa-related-note-text">
                                                                {getHighlightedText(item.review, tags)}
                                                            </div>
                                                            <button 
                                                                type="button" 
                                                                className="qa-related-note-add-btn"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setReview(prev => prev ? prev + '\n' + item.review : item.review);
                                                                    setShowRelatedNotes(false);
                                                                }}
                                                                title="Add to Review / Notes"
                                                            >
                                                                <IonIcon icon={addOutline} style={{ fontSize: '1.2rem', marginRight: '4px' }} />
                                                                Add
                                                            </button>
                                                        </div>
                                                    </div>
                                                </details>
                                            </div>
                                        ))}
                                        </div>
                                    )}
                                </div>
                            )}

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

                            {/* Datalists for Auto-suggestions */}
                            <datalist id="topics-list">
                                {uniqueTopics.map((t, idx) => <option key={`t-${idx}`} value={t} />)}
                            </datalist>
                            <datalist id="subtopics-list">
                                {uniqueSubTopics.map((st, idx) => <option key={`st-${idx}`} value={st} />)}
                            </datalist>
                            <datalist id="answers-list">
                                {uniqueAnswers.map((a, idx) => <option key={`a-${idx}`} value={a} />)}
                            </datalist>
                        </div>
                    </div>
                </div>

                {/* Right Side: List */}
                <div className="qa-list-section">
                    <div className="qa-list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h3>All Questions</h3>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <select 
                                className="qa-select" 
                                value={filterSubject} 
                                onChange={(e) => setFilterSubject(e.target.value)}
                                style={{ padding: '0.5rem', fontSize: '0.85rem', width: '150px' }}
                            >
                                <option value="">All Subjects</option>
                                {Details.SUBJECT.map((obj, index) => <option key={index} value={obj}>{obj}</option>)}
                            </select>
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
                                            className="qa-input" 
                                            placeholder="Search questions..." 
                                            style={{ width: '200px', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                        />
                                    )}
                                />
                            </VoiceInputWrapper>
                        </div>
                    </div>
                    <QuestionsDisplayList data={data} isLoading={isLoading} isError={isError} error={error} searchQuery={searchQuery} filterSubject={filterSubject} onEdit={editProduct} onDelete={onHandleDelete} />
                    {/* Fallback to old list if needed, or keeping it for reference, but replacing with inner component for better layout control */}
                    {/* <QuestionsList onEdit={editProduct} onDelete={onHandleDelete} /> */}
                </div>
            </div>
        </div>
    )
}

export default QuestionsAndAnswers