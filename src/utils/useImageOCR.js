/**
 * useImageOCR — Tesseract.js OCR hook (100% Free, NO API required)
 *
 * Highly optimized for low-quality screenshots and precise 4-option extraction.
 */

import { useState, useCallback } from 'react';

// ─── Tesseract CDN loader ──────────────────────────────────────────────────────
let _tesseractReady = null;
function loadTesseract() {
    if (_tesseractReady) return _tesseractReady;
    _tesseractReady = new Promise((resolve, reject) => {
        if (window.Tesseract) return resolve(window.Tesseract);
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve(window.Tesseract);
        script.onerror = () => reject(new Error('Failed to load Tesseract.js from CDN.'));
        document.head.appendChild(script);
    });
    return _tesseractReady;
}

// ─── Image preprocessing ───────────────────────────────────────────────────────
async function preprocessImage(file) {
    const img = await createImageBitmap(file);

    // Upscale to give Tesseract more pixels (300 DPI equivalent)
    const scale = img.width < 1500 ? 1500 / img.width : 1.5;
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);

    // Grayscale (helps Tesseract's internal binarization)
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        d[i] = d[i + 1] = d[i + 2] = gray;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
}

// ─── PDF → canvases ────────────────────────────────────────────────────────────
async function pdfToCanvases(file) {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const canvases = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 3.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        canvases.push(canvas);
    }
    return canvases;
}

// ─── Advanced option parser ───────────────────────────────────────────────────

/**
 * Fallback parser for extracting a single question and its options from a 
 * flat text string (e.g. when everything is inline on one line).
 */
function extractQuestionAndOptions(rawText) {
    if (!rawText?.trim()) return null;

    let text = rawText
        .replace(/\r\n?/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/^[|!1lI]\s/gm, '1) ') // OCR correction for 1
        .replace(/\s{2,}/g, ' ')
        .trim();

    let markerRegex = /\([A-Da-d]\)/g;
    let matches = [...text.matchAll(markerRegex)];

    if (matches.length < 4) {
        markerRegex = /(?:\s|^)(?:[A-Da-d]\)|[1-4]\)|\([1-4]\)|\[[A-Da-d]\])(?=\s|$)/g;
        const altMatches = [...text.matchAll(markerRegex)];
        if (altMatches.length >= 4) matches = altMatches;
    }
    
    if (matches.length < 4) {
        markerRegex = /(?:\s|^)(?:[A-Da-d]\.|[1-4]\.)(?=\s|$)/g;
        const altMatches = [...text.matchAll(markerRegex)];
        if (altMatches.length >= 4) matches = altMatches;
    }

    if (matches.length >= 4) {
        const optsMatches = matches.slice(-4);
        
        let qText = text.substring(0, optsMatches[0].index).trim();
        let opt1 = text.substring(optsMatches[0].index + optsMatches[0][0].length, optsMatches[1].index).trim();
        let opt2 = text.substring(optsMatches[1].index + optsMatches[1][0].length, optsMatches[2].index).trim();
        let opt3 = text.substring(optsMatches[2].index + optsMatches[2][0].length, optsMatches[3].index).trim();
        let opt4 = text.substring(optsMatches[3].index + optsMatches[3][0].length).trim();
        
        qText = qText.replace(/^(?:Q(?:uestion)?\s*\.?\s*)?\d{1,3}[.):\s]\s*/i, '');
        return { question: qText, options: [opt1, opt2, opt3, opt4] };
    }

    // Split by parens if no strict markers found
    const parenChunks = text.split(/(?=\()/).map(s => s.trim()).filter(Boolean);
    if (parenChunks.length > 1) {
        let qText = '';
        let opts = [];
        
        if (parenChunks.length > 4) {
            qText = parenChunks.slice(0, -4).join(' ');
            qText = qText.replace(/^(?:Q(?:uestion)?\s*\.?\s*)?\d{1,3}[.):\s]\s*/i, '');
            opts = parenChunks.slice(-4);
        } else {
            opts = parenChunks;
        }
        
        while (opts.length < 4) opts.push('');
        return { question: qText, options: opts };
    }

    return {
        question: text.replace(/^(?:Q(?:uestion)?\s*\.?\s*)?\d{1,3}[.):\s]\s*/i, ''),
        options: ['', '', '', '']
    };
}

/**
 * Robust line-based multi-question parser.
 * Reads line by line, grouping text into Question and Option blocks based on prefixes.
 */
function parseQuestionsFromText(rawText) {
    if (!rawText?.trim()) return [];

    // Normalize OCR text before line splitting to ensure each option marker starts on a new line
    let normalizedText = rawText
        .replace(/\(8\)/g, '(B)') // Common OCR mistake: (8) instead of (B)
        .replace(/([^\n])\s+(\([A-Da-d1-4]\)|\[[A-Da-d1-4]\]|[A-Da-d1-4][.)])\s/g, '$1\n$2 '); // Force inline options to new lines

    const lines = normalizedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const questions = [];
    let currentQ = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Match question numbers: "1. ", "1) ", "Q1. ", "1- ", or even just "1 " if text follows
        const qMatch = /^(?:Q(?:uestion)?\s*\.?\s*)?(\d{1,3})\s*([.):\-]|\b)?\s*(.*)/i.exec(line);
        
        // Match letter options: "A. ", "A) ", "(A) ", "A."
        const optMatch = /^(?:\([A-Da-d1-4]\)|\[[A-Da-d1-4]\]|[A-Da-d1-4][.)])\s*(.+)/.exec(line);

        if (optMatch && (!qMatch || currentQ)) {
            // It's definitely an option
            if (currentQ) {
                currentQ.options.push(optMatch[1]);
            } else {
                currentQ = { text: line, options: [] }; // Orphan option
            }
        } else if (qMatch && qMatch[3]) {
            const num = parseInt(qMatch[1], 10);
            const delimiter = qMatch[2];
            
            // Check if this is actually a numeric option (1) 2) 3) 4)) belonging to the current question
            const isNumericOption = currentQ && 
                                    currentQ.options.length < 4 && 
                                    num >= 1 && num <= 4 && 
                                    delimiter === ')';

            if (isNumericOption) {
                currentQ.options.push(qMatch[3]);
            } else {
                // It's a new question boundary
                if (currentQ) questions.push(currentQ);
                currentQ = {
                    text: qMatch[3], // Extracted text without the number prefix
                    options: []
                };
            }
        } else {
            // Continuation line — append to the last active element
            if (currentQ) {
                if (currentQ.options.length > 0) {
                    currentQ.options[currentQ.options.length - 1] += ' ' + line;
                } else {
                    currentQ.text += ' ' + line;
                }
            } else {
                currentQ = { text: line, options: [] };
            }
        }
    }

    if (currentQ) questions.push(currentQ);

    // Format output and apply inline fallback for questions that had no options on separate lines
    const result = questions.map(q => {
        if (q.options.length === 0) {
            const fallback = extractQuestionAndOptions(q.text);
            if (fallback && fallback.options.some(o => o)) {
                return fallback;
            }
        }
        
        const opts = [...q.options];
        while (opts.length < 4) opts.push('');
        
        return {
            question: q.text,
            options: opts.slice(0, 4)
        };
    });

    // If we couldn't split anything and it looks like a single chunk, try a full fallback
    if (result.length === 0) {
        const fallback = extractQuestionAndOptions(rawText);
        return fallback ? [fallback] : [];
    }

    return result.filter(q => q.question.trim());
}

// ─── Main hook ─────────────────────────────────────────────────────────────────
export function useImageOCR() {
    const [isExtracting, setIsExtracting] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [ocrError, setOcrError] = useState(null);

    const extractCanvasesFromPDF = useCallback(async (file) => {
        setIsExtracting(true);
        setOcrProgress(5);
        setOcrError(null);
        try {
            const canvases = await pdfToCanvases(file);
            // Convert to dataURLs so they can be easily rendered and passed to Tesseract
            const dataUrls = canvases.map(c => c.toDataURL('image/jpeg', 0.8));
            return dataUrls;
        } catch (err) {
            console.error('[useImageOCR] PDF extraction error:', err);
            setOcrError(err?.message || 'Failed to extract PDF pages.');
            return [];
        } finally {
            setIsExtracting(false);
            setOcrProgress(0);
        }
    }, []);

    const runOCR = useCallback(async (sources) => {
        setIsExtracting(true);
        setOcrProgress(10);
        setOcrError(null);
        try {
            const Tesseract = await loadTesseract();
            const allQuestions = [];

            for (let i = 0; i < sources.length; i++) {
                const pStart = 20 + (i / sources.length) * 70;
                const pEnd = 20 + ((i + 1) / sources.length) * 70;

                const { data } = await Tesseract.recognize(sources[i], 'eng+mal', {
                    tessedit_pageseg_mode: '3',
                    preserve_interword_spaces: '1',
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            setOcrProgress(Math.round(pStart + m.progress * (pEnd - pStart)));
                        } else if (m.status === 'loading language traineddata') {
                            setOcrProgress(Math.round(5 + m.progress * 15));
                        }
                    },
                });

                // Parse questions from THIS page's text independently
                const pageQuestions = parseQuestionsFromText(data.text);
                allQuestions.push(...pageQuestions);
            }

            setOcrProgress(95);
            setOcrProgress(100);
            return allQuestions;
        } catch (err) {
            console.error('[useImageOCR] Error:', err);
            setOcrError(err?.message || 'OCR failed — try a higher-resolution image.');
            return [];
        } finally {
            setIsExtracting(false);
        }
    }, []);

    const extractFromFile = useCallback(async (file) => {
        setIsExtracting(true);
        setOcrProgress(0);
        setOcrError(null);

        try {
            setOcrProgress(5);
            const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            let sources;

            if (isPDF) {
                setOcrProgress(15);
                sources = await pdfToCanvases(file);
            } else {
                setOcrProgress(15);
                sources = [await preprocessImage(file)];
            }

            const Tesseract = await loadTesseract();
            let allText = '';
            for (let i = 0; i < sources.length; i++) {
                const pStart = 20 + (i / sources.length) * 70;
                const pEnd = 20 + ((i + 1) / sources.length) * 70;

                const { data } = await Tesseract.recognize(sources[i], 'eng+mal', {
                    tessedit_pageseg_mode: '3',
                    preserve_interword_spaces: '1',
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            setOcrProgress(Math.round(pStart + m.progress * (pEnd - pStart)));
                        } else if (m.status === 'loading language traineddata') {
                            setOcrProgress(Math.round(5 + m.progress * 15));
                        }
                    },
                });
                allText += (allText ? '\n\n' : '') + data.text;
            }

            setOcrProgress(95);
            const parsed = parseQuestionsFromText(allText);
            setOcrProgress(100);
            return parsed;

        } catch (err) {
            console.error('[useImageOCR] Error:', err);
            setOcrError(err?.message || 'OCR failed — try a higher-resolution image.');
            return [];
        } finally {
            setIsExtracting(false);
        }
    }, []);

    return { extractFromFile, extractCanvasesFromPDF, runOCR, isExtracting, ocrProgress, ocrError };
}
