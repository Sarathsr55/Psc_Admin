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

function extractQuestionAndOptions(rawText) {
    if (!rawText?.trim()) return [];

    let text = rawText
        .replace(/\r\n?/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/^[|!1lI]\s/gm, '1) ') // OCR correction for 1
        .replace(/\s{2,}/g, ' ')
        .trim();

    // 1. First, try the user's explicit strict rule: (A), (B), (C), (D) or (a), (b), (c), (d)
    let markerRegex = /\([A-Da-d]\)/g;
    let matches = [...text.matchAll(markerRegex)];

    // 2. If we didn't find exactly 4, maybe they used A), B), C), D) or 1), 2), 3), 4) or (1), (2)
    if (matches.length < 4) {
        markerRegex = /(?:\s|^)(?:[A-Da-d]\)|[1-4]\)|\([1-4]\)|\[[A-Da-d]\])(?=\s|$)/g;
        const altMatches = [...text.matchAll(markerRegex)];
        if (altMatches.length >= 4) {
            matches = altMatches;
        }
    }
    
    // 3. What if it's A., B., C., D.?
    if (matches.length < 4) {
        markerRegex = /(?:\s|^)(?:[A-Da-d]\.|[1-4]\.)(?=\s|$)/g;
        const altMatches = [...text.matchAll(markerRegex)];
        if (altMatches.length >= 4) {
            matches = altMatches;
        }
    }

    // 4. If we found at least 4 markers, extract perfectly based on their positions
    if (matches.length >= 4) {
        // If there are more than 4, take the last 4 (often questions have list items inside them, but options are at the end)
        const optsMatches = matches.slice(-4);
        
        let qText = text.substring(0, optsMatches[0].index).trim();
        let opt1 = text.substring(optsMatches[0].index + optsMatches[0][0].length, optsMatches[1].index).trim();
        let opt2 = text.substring(optsMatches[1].index + optsMatches[1][0].length, optsMatches[2].index).trim();
        let opt3 = text.substring(optsMatches[2].index + optsMatches[2][0].length, optsMatches[3].index).trim();
        let opt4 = text.substring(optsMatches[3].index + optsMatches[3][0].length).trim();
        
        qText = qText.replace(/^(?:Q(?:uestion)?\s*\.?\s*)?(\d{1,3})[.):\s]\s*/i, '');
        return [{ question: qText, options: [opt1, opt2, opt3, opt4] }];
    }

    // FALLBACK: User's requested logic - split the sentence before the "(" symbol.
    // This rescues heavily mangled OCR where (A)(B)(C)(D) became (10), (9), (8).
    // We use a positive lookahead `(?=\()` so the parenthesis is preserved in the chunks.
    const parenChunks = text.split(/(?=\()/).map(s => s.trim()).filter(Boolean);
    
    if (parenChunks.length > 1) {
        let qText = '';
        let opts = [];
        
        if (parenChunks.length > 4) {
            // If there are more than 4 chunks, assume the last 4 are the options
            qText = parenChunks.slice(0, -4).join(' ');
            qText = qText.replace(/^(?:Q(?:uestion)?\s*\.?\s*)?(\d{1,3})[.):\s]\s*/i, '');
            opts = parenChunks.slice(-4);
        } else if (parenChunks.length === 4) {
            // Exactly 4 chunks - assume they are all options
            opts = parenChunks;
        } else {
            // Less than 4 chunks - could be a missing question or missing markers.
            // We just pad the rest with empty strings.
            opts = parenChunks;
        }
        
        while (opts.length < 4) opts.push(''); // Pad up to 4 options
        
        return [{
            question: qText,
            options: opts
        }];
    }

    // Ultimate fallback if no parentheses at all
    return [{
        question: text,
        options: ['', '', '', '']
    }];
}

function parseQuestionsFromText(rawText) {
    if (!rawText?.trim()) return [];
    
    // If multiple questions are in the same image, we can try to split them by "1.", "2.", etc.
    // For now, since it's usually screenshots of a single question, just extract the best sequence.
    return extractQuestionAndOptions(rawText);
}

// ─── Main hook ─────────────────────────────────────────────────────────────────
export function useImageOCR() {
    const [isExtracting, setIsExtracting] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [ocrError, setOcrError] = useState(null);

    const extractFromFile = useCallback(async (file) => {
        setIsExtracting(true);
        setOcrProgress(0);
        setOcrError(null);

        try {
            setOcrProgress(5);
            const Tesseract = await loadTesseract();
            
            const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            let sources;

            if (isPDF) {
                setOcrProgress(15);
                sources = await pdfToCanvases(file);
            } else {
                setOcrProgress(15);
                sources = [await preprocessImage(file)];
            }

            let allText = '';
            for (let i = 0; i < sources.length; i++) {
                const pStart = 20 + (i / sources.length) * 70;
                const pEnd = 20 + ((i + 1) / sources.length) * 70;

                const { data } = await Tesseract.recognize(sources[i], 'eng+mal', {
                    tessedit_pageseg_mode: '3', // PSM 3: Default, fully automatic page segmentation (best for general text)
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

    return { extractFromFile, isExtracting, ocrProgress, ocrError };
}
