import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import VoiceInputWrapper from '../../Components/VoiceInput/VoiceInputWrapper'
import { ReactTransliterate } from "react-transliterate";
import "react-transliterate/dist/index.css";
import { addQuestion, deleteQuestion, getAllQuestions, updateQuestion } from '../../services/products'
import './QuestionsAndAnswers.css'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import QuestionDisplay from './QuestionDisplay'
import Details from '../../constants/Details'
import { IonIcon } from '@ionic/react'
import { close, createOutline, trashOutline, addOutline, cloudUploadOutline, languageOutline, alertCircleOutline, imageOutline, checkmarkCircleOutline, happyOutline, arrowUpOutline, arrowDownOutline, swapVerticalOutline, shuffleOutline, textOutline, chevronBackOutline, copyOutline, linkOutline } from 'ionicons/icons'
import animation from '../../constants/animation'
import QuestionsList from './QuestionsList'
import { Loader } from '../../Components/Loader/Loader'
import { useImageOCR } from '../../utils/useImageOCR'
import EmojiPicker from 'emoji-picker-react'

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
    const [showRelatedNotes, setShowRelatedNotes] = useState(false)
    const token = localStorage.getItem('token')

    // ── Image OCR state ───────────────────────────────────────────────────────
    const { extractFromFile, extractCanvasesFromPDF, runOCR, isExtracting, ocrProgress, ocrError } = useImageOCR()
    const [isDragOver, setIsDragOver] = useState(false)
    const [extractedQuestions, setExtractedQuestions] = useState([]) // [{question, options[]}]
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [showPdfVerification, setShowPdfVerification] = useState(false)
    const [pdfPages, setPdfPages] = useState([])
    const [selectedPdfPages, setSelectedPdfPages] = useState([])
    const [showAnswerPicker, setShowAnswerPicker] = useState(false)
    const [pickerOptions, setPickerOptions] = useState([])
    const [activeOcrQuestionText, setActiveOcrQuestionText] = useState(null)
    const dropZoneRef = useRef(null)

    // ── PDF Question List Review state ────────────────────────────────────────
    const [pdfReviewStep, setPdfReviewStep] = useState('pages') // 'pages' | 'list'
    const [ocrResults, setOcrResults] = useState([]) // [{question, options}]
    const [dragIdx, setDragIdx] = useState(null)
    const [inlineEditIdx, setInlineEditIdx] = useState(null)
    const [inlineEditData, setInlineEditData] = useState(null)
    
    const [rightPanelMode, setRightPanelMode] = useState('list') // 'list' or 'pdf'
    const [sidePdfUrl, setSidePdfUrl] = useState('')
    const [showSecondViewer, setShowSecondViewer] = useState(false)
    const [bottomPdfUrl, setBottomPdfUrl] = useState('')

    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [activeEmojiField, setActiveEmojiField] = useState(null)
    
    // ── Resizable Split-Pane State ─────────────────────────────────────────────
    const [leftWidth, setLeftWidth] = useState(() => {
        const saved = localStorage.getItem('qaSplitWidth');
        return saved ? parseFloat(saved) : 50; // default to 50%
    });
    const [isDragging, setIsDragging] = useState(false);
    const layoutRef = useRef(null);

    const [topHeight, setTopHeight] = useState(() => {
        const saved = localStorage.getItem('qaVerticalSplit');
        return saved ? parseFloat(saved) : 50;
    });
    const [isVerticalDragging, setIsVerticalDragging] = useState(false);
    const rightPanelRef = useRef(null);

    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleVerticalMouseDown = useCallback((e) => {
        e.preventDefault();
        setIsVerticalDragging(true);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging && layoutRef.current) {
                const containerRect = layoutRef.current.getBoundingClientRect();
                let newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
                if (newWidth < 30) newWidth = 30;
                if (newWidth > 90) newWidth = 90;
                setLeftWidth(newWidth);
            }
            if (isVerticalDragging && rightPanelRef.current) {
                const containerRect = rightPanelRef.current.getBoundingClientRect();
                let newHeight = ((e.clientY - containerRect.top) / containerRect.height) * 100;
                if (newHeight < 10) newHeight = 10;
                if (newHeight > 90) newHeight = 90;
                setTopHeight(newHeight);
            }
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                localStorage.setItem('qaSplitWidth', leftWidth);
            }
            if (isVerticalDragging) {
                setIsVerticalDragging(false);
                localStorage.setItem('qaVerticalSplit', topHeight);
            }
        };

        if (isDragging || isVerticalDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, leftWidth, isVerticalDragging, topHeight]);

    // ── Auto-Save Drafts ──────────────────────────────────────────────────────
    useEffect(() => {
        const draftOcr = localStorage.getItem('qa_draft_ocr');
        const draftExtracted = localStorage.getItem('qa_draft_extracted');
        
        if (draftOcr || draftExtracted) {
            if (window.confirm("You have unsaved extracted questions from a previous session. Do you want to restore them?")) {
                let restored = false;
                if (draftOcr) {
                    try {
                        const parsed = JSON.parse(draftOcr);
                        if (parsed.length > 0) {
                            setOcrResults(parsed);
                            setPdfReviewStep('list');
                            setShowPdfVerification(true);
                            restored = true;
                        }
                    } catch(e) {}
                }
                if (draftExtracted && !restored) {
                    try {
                        const parsed = JSON.parse(draftExtracted);
                        if (parsed.length > 0) {
                            setExtractedQuestions(parsed);
                            setShowSuggestions(true);
                        }
                    } catch(e) {}
                }
            } else {
                localStorage.removeItem('qa_draft_ocr');
                localStorage.removeItem('qa_draft_extracted');
            }
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (ocrResults && ocrResults.length > 0) {
            localStorage.setItem('qa_draft_ocr', JSON.stringify(ocrResults));
        } else {
            localStorage.removeItem('qa_draft_ocr');
        }
    }, [ocrResults]);

    useEffect(() => {
        if (extractedQuestions && extractedQuestions.length > 0) {
            localStorage.setItem('qa_draft_extracted', JSON.stringify(extractedQuestions));
        } else {
            localStorage.removeItem('qa_draft_extracted');
        }
    }, [extractedQuestions]);

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

    // ── Auto-scrub saved questions from OCR drafts ─────────────────────────────
    useEffect(() => {
        if (!data || data.length === 0) return;
        
        const sanitize = (str) => {
            if (!str) return '';
            return str.toLowerCase().replace(/[\u200B-\u200D\uFEFF\s]/g, '');
        };
        
        const dataSet = new Set(data.map(d => sanitize(d.question)));
        
        setOcrResults(prev => {
            if (!prev || prev.length === 0) return prev;
            const filtered = prev.filter(q => !dataSet.has(sanitize(q.question)));
            return filtered.length !== prev.length ? filtered : prev;
        });
        
        setExtractedQuestions(prev => {
            if (!prev || prev.length === 0) return prev;
            const filtered = prev.filter(q => !dataSet.has(sanitize(q.question)));
            return filtered.length !== prev.length ? filtered : prev;
        });
    }, [data]);

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

    const handleOptionChange = (index, value) => {
        const updated = [...options];
        updated[index] = value;
        setOptions(updated);
    };

    // ── Image OCR drag-drop handlers ──────────────────────────────────────────
    const handleDropZoneDragOver = (e) => {
        // Only highlight if dropping a file (not tag-pill dragging)
        if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            setIsDragOver(true);
        }
    };

    const handleDropZoneDragLeave = (e) => {
        // Only clear if leaving the entire drop zone (not a child element)
        if (!dropZoneRef.current?.contains(e.relatedTarget)) {
            setIsDragOver(false);
        }
    };

    const handleDropZoneDrop = async (e) => {
        e.preventDefault();
        setIsDragOver(false);

        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        if (!isImage && !isPDF) {
            alert('Please drop an image (PNG, JPEG, WEBP…) or a PDF file.');
            return;
        }

        setShowSuggestions(false);
        setExtractedQuestions([]);
        setOcrResults([]); // Clear previous extraction and draft

        if (isPDF) {
            const canvases = await extractCanvasesFromPDF(file);
            setPdfPages(canvases);
            setSelectedPdfPages(new Array(canvases.length).fill(true));
            setPdfReviewStep('pages');
            setShowPdfVerification(true);
        } else {
            const parsed = await extractFromFile(file);
            setExtractedQuestions(parsed);
            setShowSuggestions(parsed.length > 0);

            if (parsed.length === 0) {
                alert('No questions could be detected in this image. Try a clearer image or check the file.');
            }
        }
    };

    const handleProceedPdf = async () => {
        const selectedCanvases = pdfPages.filter((_, idx) => selectedPdfPages[idx]);
        if (selectedCanvases.length === 0) return;
        
        const parsed = await runOCR(selectedCanvases);
        setOcrResults(prev => [...prev, ...parsed]);
        
        if (parsed.length === 0) {
            alert('No questions could be detected in the selected pages.');
        } else {
            // Auto-uncheck processed pages to prevent duplicate extraction on resume
            setSelectedPdfPages(new Array(pdfPages.length).fill(false));
            setPdfReviewStep('list');
        }
    };

    const handleConfirmQuestions = () => {
        setExtractedQuestions(ocrResults);
        setShowSuggestions(ocrResults.length > 0);
        setShowPdfVerification(false);
        setPdfReviewStep('pages');
    };

    const togglePdfPageSelection = (idx) => {
        const updated = [...selectedPdfPages];
        updated[idx] = !updated[idx];
        setSelectedPdfPages(updated);
    };

    // ── Question List Sorting & Reordering helpers ────────────────────────────
    const moveQuestion = (fromIdx, toIdx) => {
        if (toIdx < 0 || toIdx >= ocrResults.length) return;
        const updated = [...ocrResults];
        const [moved] = updated.splice(fromIdx, 1);
        updated.splice(toIdx, 0, moved);
        setOcrResults(updated);
    };

    const sortQuestionsAlpha = () => {
        setOcrResults(prev => [...prev].sort((a, b) => a.question.localeCompare(b.question)));
    };

    const sortQuestionsByLength = () => {
        setOcrResults(prev => [...prev].sort((a, b) => a.question.length - b.question.length));
    };

    const shuffleQuestions = () => {
        setOcrResults(prev => {
            const arr = [...prev];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        });
    };

    const deleteOcrQuestion = (idx) => {
        setOcrResults(prev => prev.filter((_, i) => i !== idx));
    };

    const mergeWithPrevious = (idx) => {
        if (idx <= 0 || idx >= ocrResults.length) return;
        setOcrResults(prev => {
            const updated = [...prev];
            const prevQ = updated[idx - 1];
            const currQ = updated[idx];
            
            const combinedQuestion = prevQ.question + '\n' + currQ.question;
            const combinedOptions = [...(prevQ.options || []), ...(currQ.options || [])].filter(o => o && o.trim() !== '');
            while (combinedOptions.length < 4) combinedOptions.push('');
            
            updated[idx - 1] = {
                ...prevQ,
                question: combinedQuestion,
                options: combinedOptions.slice(0, 4)
            };
            updated.splice(idx, 1);
            return updated;
        });
    };

    const duplicateQuestion = (idx) => {
        setOcrResults(prev => {
            const updated = [...prev];
            const clone = JSON.parse(JSON.stringify(updated[idx]));
            updated.splice(idx + 1, 0, clone);
            return updated;
        });
    };

    const startInlineEdit = (idx) => {
        setInlineEditIdx(idx);
        setInlineEditData(JSON.parse(JSON.stringify(ocrResults[idx])));
    };

    const saveInlineEdit = () => {
        if (inlineEditIdx !== null && inlineEditData) {
            setOcrResults(prev => {
                const updated = [...prev];
                updated[inlineEditIdx] = inlineEditData;
                return updated;
            });
            setInlineEditIdx(null);
            setInlineEditData(null);
        }
    };

    const cancelInlineEdit = () => {
        setInlineEditIdx(null);
        setInlineEditData(null);
    };

    const handleQuestionDragStart = (idx) => {
        setDragIdx(idx);
    };

    const handleQuestionDragOver = (e) => {
        e.preventDefault();
    };

    const handleQuestionDrop = (targetIdx) => {
        if (dragIdx === null || dragIdx === targetIdx) return;
        moveQuestion(dragIdx, targetIdx);
        setDragIdx(null);
    };

    const handlePaste = async (e) => {
        const file = e.clipboardData?.files?.[0];
        if (!file) return; // If text is pasted, let it paste normally

        const isImage = file.type.startsWith('image/');
        if (!isImage) return; // Ignore non-image files

        e.preventDefault(); // Stop image blob from pasting as text
        setShowSuggestions(false);
        setExtractedQuestions([]);

        const parsed = await extractFromFile(file);
        setExtractedQuestions(parsed);
        setShowSuggestions(parsed.length > 0);

        if (parsed.length === 0) {
            alert('No questions could be detected in this pasted image. Try a clearer image or check the file.');
        }
    };

    // When user clicks a suggestion — fill question field + open answer picker
    const handleSuggestionClick = (item, idx) => {
        setQuestion(item.question);
        setActiveOcrQuestionText(item.question);
        
        // Remove the clicked question from the extracted list
        setExtractedQuestions(prev => prev.filter((_, i) => i !== idx));
        setShowSuggestions(false);
        
        if (item.options && item.options.length > 0) {
            setPickerOptions(item.options);
            setShowAnswerPicker(true);
        }
    };

    // When user picks the correct answer from the modal
    const handleAnswerPick = (chosenOption) => {
        setAnswer(chosenOption);
        // Fill remaining option slots with the other options
        const remaining = pickerOptions.filter(o => o !== chosenOption);
        // Pad to 3 slots (the form has 3 other-options fields)
        while (remaining.length < 3) remaining.push('');
        setOptions(remaining.slice(0, 3));
        setShowAnswerPicker(false);
        setPickerOptions([]);
    };

    const handleEmojiClick = (emojiObject) => {
        const emoji = emojiObject.emoji;
        switch (activeEmojiField) {
            case 'question': setQuestion(prev => (prev || '') + emoji); break;
            case 'answer': setAnswer(prev => (prev || '') + emoji); break;
            case 'option0': handleOptionChange(0, (options[0] || '') + emoji); break;
            case 'option1': handleOptionChange(1, (options[1] || '') + emoji); break;
            case 'option2': handleOptionChange(2, (options[2] || '') + emoji); break;
            case 'review': setReview(prev => (prev || '') + emoji); break;
            default: break;
        }
        setShowEmojiPicker(false);
    };

    // Clear tags and options if question is cleared
    useEffect(() => {
        if (!question || question.trim() === '') {
            setTags([]);
            setCustomTags([]);
            setHiddenOriginalTags([]);
            setAnswer('');
            setOptions(['', '', '']);
            setActiveOcrQuestionText(null);
        }
    }, [question]);

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

    const uniqueSubjects = useMemo(() => {
        if (!data) return Details.SUBJECT;
        return Array.from(new Set([...Details.SUBJECT, ...data.map(q => q.subject).filter(Boolean)]));
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
            setShowRelatedNotes(false)

            if (activeOcrQuestionText) {
                setOcrResults(prev => prev.filter(q => q.question !== activeOcrQuestionText));
                setExtractedQuestions(prev => prev.filter(q => q.question !== activeOcrQuestionText));
                setActiveOcrQuestionText(null);
            }

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
            setShowRelatedNotes(false)
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
            setShowRelatedNotes(false)
        }
    }

    return (
        <div className="qa-page-container">
            {/* ── PDF Verification Modal (2-step: pages → question list) ─── */}
            {showPdfVerification && (
                <div className="qa-modal-overlay" onClick={() => { if (!isExtracting) setShowPdfVerification(false); }}>
                    <div className="qa-modal" style={{ maxWidth: pdfReviewStep === 'list' ? '900px' : '800px', width: '92%', transition: 'max-width 0.3s ease' }} onClick={e => e.stopPropagation()}>
                        {/* ── Header ─── */}
                        <div className="qa-modal-header">
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {pdfReviewStep === 'list' && (
                                    <IonIcon icon={chevronBackOutline} style={{ cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setPdfReviewStep('pages')} title="Back to page selection" />
                                )}
                                {pdfReviewStep === 'pages' ? 'Step 1 — Select PDF Pages' : 'Step 2 — Review Extracted Questions'}
                            </h4>
                            <div className="qa-modal-close" onClick={() => { if (!isExtracting) setShowPdfVerification(false); }}>
                                <IonIcon icon={close} />
                            </div>
                        </div>

                        {/* ── Step indicator ─── */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem 1rem 0' }}>
                            <div style={{ width: '40%', height: '4px', borderRadius: '2px', background: '#3b82f6', transition: 'opacity 0.3s', opacity: pdfReviewStep === 'pages' ? 1 : 0.3 }} />
                            <div style={{ width: '40%', height: '4px', borderRadius: '2px', background: '#3b82f6', transition: 'opacity 0.3s', opacity: pdfReviewStep === 'list' ? 1 : 0.3 }} />
                        </div>

                        {/* ── Body ─── */}
                        <div className="qa-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>

                            {/* Step 1: Page selection */}
                            {pdfReviewStep === 'pages' && (
                                <>
                                    <p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
                                        Select the pages you want to extract questions from. Uncheck irrelevant pages to speed up processing.
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                                        {pdfPages.map((dataUrl, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => togglePdfPageSelection(idx)}
                                                style={{
                                                    cursor: 'pointer',
                                                    border: selectedPdfPages[idx] ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                                                    borderRadius: '8px',
                                                    padding: '4px',
                                                    position: 'relative',
                                                    opacity: selectedPdfPages[idx] ? 1 : 0.5,
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <img src={dataUrl} alt={`Page ${idx + 1}`} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '4px' }} />
                                                <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'white', borderRadius: '50%', padding: '2px', display: 'flex' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPdfPages[idx] || false}
                                                        onChange={() => togglePdfPageSelection(idx)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                    />
                                                </div>
                                                <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Page {idx + 1}</div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Step 2: Question list review */}
                            {pdfReviewStep === 'list' && (
                                <>
                                    <p style={{ marginBottom: '0.75rem', color: '#64748b', fontSize: '0.85rem' }}>
                                        {ocrResults.length} question{ocrResults.length !== 1 ? 's' : ''} extracted. Drag to reorder, use sort buttons, or remove unwanted items.
                                    </p>

                                    {/* Sort toolbar */}
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                        <button className="qa-btn qa-btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={sortQuestionsAlpha} title="Sort A → Z">
                                            <IonIcon icon={textOutline} /> A → Z
                                        </button>
                                        <button className="qa-btn qa-btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={sortQuestionsByLength} title="Sort by question length (shortest first)">
                                            <IonIcon icon={swapVerticalOutline} /> Short → Long
                                        </button>
                                        <button className="qa-btn qa-btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={shuffleQuestions} title="Randomize order">
                                            <IonIcon icon={shuffleOutline} /> Shuffle
                                        </button>
                                    </div>

                                    {/* Question cards */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {ocrResults.map((item, idx) => (
                                            <div
                                                key={idx}
                                                draggable={inlineEditIdx !== idx}
                                                onDragStart={() => handleQuestionDragStart(idx)}
                                                onDragOver={handleQuestionDragOver}
                                                onDrop={() => handleQuestionDrop(idx)}
                                                style={{
                                                    background: dragIdx === idx ? '#eff6ff' : '#f8fafc',
                                                    border: dragIdx === idx ? '2px dashed #3b82f6' : '1px solid #e2e8f0',
                                                    borderRadius: '8px',
                                                    padding: '0.75rem',
                                                    cursor: inlineEditIdx === idx ? 'default' : 'grab',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                                    {/* Drag handle + number */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '28px', paddingTop: '2px' }}>
                                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>#{idx + 1}</span>
                                                        <IonIcon icon={swapVerticalOutline} style={{ fontSize: '1rem', color: '#94a3b8' }} />
                                                    </div>

                                                    {/* Question text / Edit Form */}
                                                    {inlineEditIdx === idx ? (
                                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                            <textarea
                                                                value={inlineEditData?.question || ''}
                                                                onChange={(e) => setInlineEditData({ ...inlineEditData, question: e.target.value })}
                                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', minHeight: '60px' }}
                                                            />
                                                            <div style={{ display: 'grid', gap: '0.25rem' }}>
                                                                {inlineEditData?.options?.map((opt, oIdx) => (
                                                                    <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                        <span style={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.8rem', width: '15px' }}>{String.fromCharCode(65 + oIdx)}.</span>
                                                                        <input
                                                                            type="text"
                                                                            value={opt || ''}
                                                                            onChange={(e) => {
                                                                                const newOpts = [...inlineEditData.options]
                                                                                newOpts[oIdx] = e.target.value
                                                                                setInlineEditData({ ...inlineEditData, options: newOpts })
                                                                            }}
                                                                            style={{ flex: 1, padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                                                <button className="qa-btn qa-btn-primary" style={{ padding: '2px 10px', fontSize: '0.75rem', height: 'auto', minHeight: '24px' }} onClick={saveInlineEdit}>Save</button>
                                                                <button className="qa-btn qa-btn-secondary" style={{ padding: '2px 10px', fontSize: '0.75rem', height: 'auto', minHeight: '24px' }} onClick={cancelInlineEdit}>Cancel</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ flex: 1 }}>
                                                            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                                                                {item.question}
                                                            </p>
                                                            {item.options && item.options.filter(o => o).length > 0 && (
                                                                <div style={{ marginTop: '0.35rem', paddingLeft: '0.5rem' }}>
                                                                    {item.options.map((opt, oIdx) => (
                                                                        opt && <p key={oIdx} style={{ margin: '2px 0', fontSize: '0.8rem', color: '#475569' }}>
                                                                            <span style={{ fontWeight: 700, color: '#94a3b8', marginRight: '4px' }}>{String.fromCharCode(65 + oIdx)}.</span> {opt}
                                                                        </p>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Move up/down, Edit, & delete */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <IonIcon icon={arrowUpOutline} style={{ cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#cbd5e1' : '#64748b', fontSize: '1rem' }} onClick={() => moveQuestion(idx, idx - 1)} />
                                                        <IonIcon icon={arrowDownOutline} style={{ cursor: idx === ocrResults.length - 1 ? 'default' : 'pointer', color: idx === ocrResults.length - 1 ? '#cbd5e1' : '#64748b', fontSize: '1rem' }} onClick={() => moveQuestion(idx, idx + 1)} />
                                                        <IonIcon icon={createOutline} style={{ cursor: 'pointer', color: '#3b82f6', fontSize: '1rem', marginTop: '4px' }} onClick={() => startInlineEdit(idx)} title="Edit question text and options inline" />
                                                        <IonIcon icon={copyOutline} style={{ cursor: 'pointer', color: '#10b981', fontSize: '1rem', marginTop: '4px' }} onClick={() => duplicateQuestion(idx)} title="Duplicate (useful for splitting merged questions)" />
                                                        {idx > 0 && <IonIcon icon={linkOutline} style={{ cursor: 'pointer', color: '#f59e0b', fontSize: '1rem', marginTop: '4px' }} onClick={() => mergeWithPrevious(idx)} title="Merge with previous question" />}
                                                        <IonIcon icon={trashOutline} style={{ cursor: 'pointer', color: '#ef4444', fontSize: '1rem', marginTop: '4px' }} onClick={() => deleteOcrQuestion(idx)} title="Remove this question" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {ocrResults.length === 0 && (
                                        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 0' }}>No questions remaining. Go back and reselect pages.</p>
                                    )}
                                </>
                            )}
                        </div>

                        {/* ── Footer ─── */}
                        <div className="qa-modal-footer">
                            {pdfReviewStep === 'pages' ? (
                                <>
                                    <button className='qa-btn qa-btn-secondary' onClick={() => { setShowPdfVerification(false); }}>Close</button>
                                    <button className='qa-btn qa-btn-primary' onClick={handleProceedPdf} disabled={isExtracting || !selectedPdfPages.some(Boolean)}>
                                        {isExtracting ? <><Loader size={16} /> Processing…</> : 'Proceed Next →'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button className='qa-btn qa-btn-secondary' onClick={() => setPdfReviewStep('pages')}>← Back to Pages</button>
                                    <button className='qa-btn qa-btn-primary' onClick={handleConfirmQuestions} disabled={ocrResults.length === 0}>
                                        Confirm {ocrResults.length} Question{ocrResults.length !== 1 ? 's' : ''}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Answer Picker Modal ───────────────────────────────────── */}
            {showAnswerPicker && (
                <div className="qa-modal-overlay" onClick={() => setShowAnswerPicker(false)}>
                    <div className="qa-modal qa-answer-picker-modal" onClick={e => e.stopPropagation()}>
                        <div className="qa-modal-header">
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <IonIcon icon={checkmarkCircleOutline} style={{ color: '#10b981', fontSize: '1.4rem' }} />
                                Select Correct Answer
                            </h4>
                            <div className="qa-modal-close" onClick={() => setShowAnswerPicker(false)}>
                                <IonIcon icon={close} />
                            </div>
                        </div>
                        <div className="qa-modal-body" style={{ textAlign: 'left', padding: '1rem' }}>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                                Click the option that is the <strong>correct answer</strong>. The remaining options will fill the other fields automatically.
                            </p>
                            <div className="qa-answer-options-grid">
                                {pickerOptions.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        className="qa-answer-option-btn"
                                        onClick={() => handleAnswerPick(opt)}
                                        title={`Set "${opt}" as the correct answer`}
                                    >
                                        <span className="qa-answer-option-label">
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        <span className="qa-answer-option-text">{opt}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="qa-modal-footer" style={{ justifyContent: 'center' }}>
                            <button className='qa-btn qa-btn-secondary' style={{ width: 'auto' }} onClick={() => setShowAnswerPicker(false)}>
                                Skip — I'll type manually
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Emoji Picker Modal ───────────────────────────────────── */}
            {showEmojiPicker && (
                <div className="qa-modal-overlay" onClick={() => setShowEmojiPicker(false)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '10px', padding: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                            <IonIcon icon={close} style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setShowEmojiPicker(false)} />
                        </div>
                        <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                </div>
            )}

            {/* ── Delete Popup Modal ───────────────────────────────────── */}
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

            <div 
                className={`qa-main-layout ${isDragging ? 'is-dragging' : ''}`} 
                ref={layoutRef} 
                style={{ gridTemplateColumns: `${leftWidth}% 24px 1fr` }}
            >
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
                                
                                {/* Metadata Toggle Section (Dropdown) */}
                                <details className="qa-metadata-details">
                                    <summary className="qa-metadata-summary">
                                        <div className="qa-metadata-summary-content">
                                            <IonIcon icon={createOutline} />
                                            <span>Metadata</span>
                                        </div>
                                    </summary>
                                    <div className="qa-metadata-body">
                                        <div className="qa-form-row col-2">
                                            <div className="qa-form-group">
                                                <label className="qa-label">Category</label>
                                                <select className="qa-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                                                    {Details.CATEGORY.map((obj, index) => <option key={index} value={obj}>{obj}</option>)}
                                                </select>
                                            </div>
                                            <div className="qa-form-group">
                                                <label className="qa-label">Subject</label>
                                                <input className="qa-input" value={subject} onChange={(e) => setSubject(e.target.value)} list="subjects-list" placeholder="Select or enter subject" required />
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
                                    </div>
                                </details>
                            </div>
                        </div>

                        <div className="qa-form">
                            {/* Metadata Toggle Section was moved to header */}

                            <div className="qa-form-group">
                                <label className="qa-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    Question
                                    <span className="qa-ocr-label-hint">
                                        <IonIcon icon={imageOutline} />
                                        Drop image / PDF here to auto-extract
                                    </span>
                                </label>

                                {/* ── Drag-and-drop / Paste zone ──────────────────── */}
                                <div
                                    ref={dropZoneRef}
                                    className={`qa-drop-zone ${isDragOver ? 'dragging' : ''} ${isExtracting ? 'extracting' : ''}`}
                                    onDragOver={handleDropZoneDragOver}
                                    onDragLeave={handleDropZoneDragLeave}
                                    onDrop={handleDropZoneDrop}
                                    onPaste={handlePaste}
                                >
                                    <VoiceInputWrapper value={question} onTextUpdate={setQuestion} lang={voiceLang} className="voice-input-wrapper-textarea">
                                        <ReactTransliterate
                                            value={question}
                                            onChangeText={setQuestion}
                                            lang="ml"
                                            enabled={voiceLang === 'ml-IN'}
                                            containerStyles={{ width: '100%' }}
                                            renderComponent={(props) => <textarea {...props} className={`qa-input qa-textarea ${isDuplicateQuestion ? 'qa-duplicate-input' : ''}`} placeholder="Type your question here..." rows="3" required />}
                                        />
                                    </VoiceInputWrapper>

                                    {/* Drag overlay hint */}
                                    {isDragOver && !isExtracting && (
                                        <div className="qa-drop-overlay">
                                            <IonIcon icon={imageOutline} className="qa-drop-overlay-icon" />
                                            <span>Release to read questions from image</span>
                                        </div>
                                    )}

                                    {/* OCR loading overlay */}
                                    {isExtracting && (
                                        <div className="qa-extracting-overlay">
                                            <div className="qa-extracting-spinner" />
                                            <span className="qa-extracting-text">Reading image… {ocrProgress}%</span>
                                            <div className="qa-extracting-bar">
                                                <div className="qa-extracting-bar-fill" style={{ width: `${ocrProgress}%` }} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Show Extracted Questions Unhide Button & Resume PDF Review */}
                                <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {pdfPages.length > 0 && !showPdfVerification && (
                                        <button 
                                            type="button"
                                            className="qa-btn qa-btn-secondary" 
                                            style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            onClick={() => setShowPdfVerification(true)}
                                            title="Reopen the PDF extraction popup"
                                        >
                                            <IonIcon icon={imageOutline} />
                                            Resume PDF Extraction
                                        </button>
                                    )}

                                    {!showSuggestions && extractedQuestions.length > 0 && (
                                        <button 
                                            type="button"
                                            className="qa-btn" 
                                            style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            onClick={() => setShowSuggestions(true)}
                                        >
                                            <IonIcon icon={imageOutline} />
                                            Show {extractedQuestions.length} Extracted Questions
                                        </button>
                                    )}
                                </div>

                                {/* OCR error */}
                                {ocrError && (
                                    <div className="qa-duplicate-warning">
                                        <IonIcon icon={alertCircleOutline} style={{ fontSize: '1.2rem' }} />
                                        <span>{ocrError}</span>
                                    </div>
                                )}

                                {/* Extracted question suggestion list */}
                                {showSuggestions && !showAnswerPicker && extractedQuestions.length > 0 && (
                                    <div className="qa-suggestion-list">
                                        <div className="qa-suggestion-header">
                                            <IonIcon icon={imageOutline} />
                                            <span>{extractedQuestions.length} question{extractedQuestions.length !== 1 ? 's' : ''} detected — click one to fill</span>
                                            <button 
                                                className="qa-suggestion-close" 
                                                onClick={() => {
                                                    setShowSuggestions(false);
                                                    setExtractedQuestions([]);
                                                }} 
                                                title="Dismiss all"
                                            >
                                                <IonIcon icon={close} />
                                            </button>
                                        </div>
                                        {extractedQuestions.map((item, idx) => (
                                            <div key={idx} className="qa-suggestion-row">
                                                <button
                                                    type="button"
                                                    className="qa-suggestion-item"
                                                    style={{ flex: 1, margin: 0 }}
                                                    onClick={() => handleSuggestionClick(item, idx)}
                                                    title={item.question}
                                                >
                                                    <span className="qa-suggestion-num">{idx + 1}</span>
                                                    <span className="qa-suggestion-text">
                                                        {item.question.length > 90
                                                            ? item.question.slice(0, 90) + '…'
                                                            : item.question}
                                                    </span>
                                                    {item.options.length > 0 && (
                                                        <span className="qa-suggestion-opts-badge">
                                                            {item.options.length} opts
                                                        </span>
                                                    )}
                                                </button>
                                                <button 
                                                    type="button"
                                                    className="qa-suggestion-delete-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExtractedQuestions(prev => prev.filter((_, i) => i !== idx));
                                                    }}
                                                    title="Delete this extracted question"
                                                >
                                                    <IonIcon icon={trashOutline} style={{ fontSize: '1.2rem' }} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

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
                                <label className="qa-label">Wrong Options</label>
                                <div className="qa-options-grid">
                                    {options.map((opt, idx) => (
                                        <VoiceInputWrapper key={idx} value={opt} onTextUpdate={(val) => handleOptionChange(idx, val)} lang={voiceLang}>
                                            <ReactTransliterate
                                                value={opt}
                                                onChangeText={(val) => handleOptionChange(idx, val)}
                                                lang="ml"
                                                enabled={voiceLang === 'ml-IN'}
                                                renderComponent={(props) => <input {...props} className="qa-input" placeholder={`Wrong Option ${idx + 1}`} required />}
                                            />
                                        </VoiceInputWrapper>
                                    ))}
                                </div>
                            </div>

                            <div className="qa-form-group">
                                <label className="qa-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    Review / Notes
                                    <IonIcon 
                                        icon={happyOutline} 
                                        style={{ cursor: 'pointer', color: '#10b981', fontSize: '1.2rem' }} 
                                        onClick={() => { setActiveEmojiField('review'); setShowEmojiPicker(true); }}
                                        onMouseDown={(e) => e.preventDefault()}
                                        title="Add Emoji"
                                    />
                                    <span 
                                        style={{ cursor: 'pointer', fontSize: '1.2rem' }} 
                                        onClick={() => setReview(prev => (prev || '') + '✅')}
                                        onMouseDown={(e) => e.preventDefault()}
                                        title="Quick Add ✅"
                                    >✅</span>
                                    <span 
                                        style={{ cursor: 'pointer', fontSize: '1.2rem' }} 
                                        onClick={() => setReview(prev => (prev || '') + '❌')}
                                        onMouseDown={(e) => e.preventDefault()}
                                        title="Quick Add ❌"
                                    >❌</span>
                                </label>
                                <VoiceInputWrapper value={review} onTextUpdate={setReview} lang={voiceLang} className="voice-input-wrapper-textarea">
                                    <ReactTransliterate
                                        value={review}
                                        onChangeText={setReview}
                                        lang="ml"
                                        enabled={voiceLang === 'ml-IN'}
                                        containerStyles={{ width: '100%' }}
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
                                        setShowRelatedNotes(false);
                                    }}>Cancel</button>
                                )}
                                <button onClick={handleSave} className="qa-btn qa-btn-primary">
                                    <IonIcon icon={editId ? cloudUploadOutline : addOutline} style={{ marginRight: 8 }} />
                                    {editId ? 'Update Question' : 'Add Question'}
                                </button>
                            </div>

                            {/* Datalists for Auto-suggestions */}
                            <datalist id="subjects-list">
                                {uniqueSubjects.map((s, idx) => <option key={`s-${idx}`} value={s} />)}
                            </datalist>
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

                {/* Resizer Handle */}
                <div className="qa-resizer" onMouseDown={handleMouseDown}></div>

                {/* Right Side: List or PDF Viewer */}
                <div className="qa-list-section" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {rightPanelMode === 'list' ? (
                        <>
                            <div className="qa-list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <h3>All Questions</h3>
                                    <button className="qa-btn qa-btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => setRightPanelMode('pdf')} title="Open a side-by-side PDF Viewer">
                                        <IonIcon icon={imageOutline} /> View PDF
                                    </button>
                                </div>
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
                        </>
                    ) : (
                        <div ref={rightPanelRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                            {/* Top Viewer */}
                            <div style={{ height: showSecondViewer ? `${topHeight}%` : '100%', display: 'flex', flexDirection: 'column', transition: isVerticalDragging ? 'none' : 'height 0.2s ease' }}>
                                <div className="qa-list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <h3>PDF Viewer</h3>
                                        <button className="qa-btn qa-btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setRightPanelMode('list')}>
                                            ← Back to List
                                        </button>
                                        {!showSecondViewer && (
                                            <button className="qa-btn qa-btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => setShowSecondViewer(true)}>
                                                <IonIcon icon={addOutline} /> Add Viewer Below
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input 
                                            type="file" 
                                            accept="application/pdf"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    if (sidePdfUrl) URL.revokeObjectURL(sidePdfUrl);
                                                    setSidePdfUrl(URL.createObjectURL(file));
                                                }
                                            }}
                                            style={{ fontSize: '0.8rem', maxWidth: '250px' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column', pointerEvents: isDragging || isVerticalDragging ? 'none' : 'auto' }}>
                                    {sidePdfUrl ? (
                                        <iframe src={sidePdfUrl} width="100%" height="100%" style={{ border: 'none', flex: 1 }} title="PDF Viewer" />
                                    ) : (
                                        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#64748b', textAlign: 'center', padding: '2rem' }}>
                                            <p>Select a PDF file using the button above to view it.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Resizer & Bottom Viewer */}
                            {showSecondViewer && (
                                <>
                                    <div 
                                        className="qa-horizontal-resizer" 
                                        onMouseDown={handleVerticalMouseDown}
                                        style={{ height: '12px', cursor: 'row-resize', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0', borderRadius: '4px' }}
                                    >
                                        <div style={{ width: '40px', height: '4px', background: '#cbd5e1', borderRadius: '2px' }}></div>
                                    </div>
                                    
                                    <div style={{ height: `${100 - topHeight}%`, display: 'flex', flexDirection: 'column', transition: isVerticalDragging ? 'none' : 'height 0.2s ease' }}>
                                        <div className="qa-list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingBottom: '0.25rem', paddingTop: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <h3 style={{ fontSize: '0.9rem' }}>Second Viewer</h3>
                                                <button className="qa-btn qa-btn-secondary" style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem', color: '#ef4444' }} onClick={() => setShowSecondViewer(false)}>
                                                    Close Viewer
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <input 
                                                    type="file" 
                                                    accept="application/pdf"
                                                    onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            if (bottomPdfUrl) URL.revokeObjectURL(bottomPdfUrl);
                                                            setBottomPdfUrl(URL.createObjectURL(file));
                                                        }
                                                    }}
                                                    style={{ fontSize: '0.75rem', maxWidth: '250px' }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column', pointerEvents: isDragging || isVerticalDragging ? 'none' : 'auto' }}>
                                            {bottomPdfUrl ? (
                                                <iframe src={bottomPdfUrl} width="100%" height="100%" style={{ border: 'none', flex: 1 }} title="Second PDF Viewer" />
                                            ) : (
                                                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: '#64748b', textAlign: 'center', padding: '1rem', fontSize: '0.85rem' }}>
                                                    <p>Select another PDF file here.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default QuestionsAndAnswers