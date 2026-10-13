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
    const scale = img.width < 1800 ? 1800 / img.width : 1.5;
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

    // Grayscale + Adaptive contrast enhancement (helps preserve quotes and punctuation)
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
        let gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        // Mild contrast stretch: keep dark text sharp, push near-white background to pure white
        if (gray > 210) {
            gray = 255;
        } else if (gray < 80) {
            gray = 0;
        } else {
            gray = ((gray - 80) / 130) * 255;
        }
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

function cleanOcrTextArtifacts(str) {
    if (!str) return '';

    let text = str;

    // 1. Fix broken quotes & punctuation misread by Tesseract:
    // e.g. **.* or **" or '.* or “ * etc. -> standard quotes
    text = text
        .replace(/[\*•\.\s]*\*+[\*\.\s]*([“"”'‘])/g, '$1') // e.g. **" -> "
        .replace(/([“"”'‘])[\*•\.\s]*\*+/g, '$1')          // e.g. "** -> "
        .replace(/[\*·•]{2,}/g, '')                         // remove standalone asterisks / bullet chains
        .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"') // Normalize double quotes
        .replace(/[\u2018\u2019\u201A\u201B`]/g, "'")             // Normalize single quotes
        .replace(/'\s*\.\s*\*/g, "'")                             // '.* -> '
        .replace(/\*\s*\.\s*'/g, "'")                             // *.' -> '
        .replace(/\*\s*\.\s*\*/g, '')                             // *.* -> empty

    // 2. Fix common Malayalam OCR conjunct / ligature mistakes:
    // ശ്രീ often misrecognized as (ശീ, [ശീ, {ശീ, (ശ്രീ, or ശ്രീ with broken brackets
    text = text
        .replace(/[\(\[\{]\s*ശീ\b/g, 'ശ്രീ')
        .replace(/[\(\[\{]\s*ശ്രീ\b/g, 'ശ്രീ')
        .replace(/\bശീ\s*നാരായണ/g, 'ശ്രീ നാരായണ')
        .replace(/\bശീ\s*ശങ്കര/g, 'ശ്രീ ശങ്കര')
        .replace(/\bശീ\s*ബുദ്ധ/g, 'ശ്രീ ബുദ്ധ');

    // Fix au-length mark Unicode inconsistency:
    // Tesseract often outputs archaic U+0D4C (ൌ) instead of modern au-length mark U+0D57 (ൗ)
    // e.g. "ഹൌസ്" -> "ഹൗസ്"
    text = text.replace(/\u0D4C/g, '\u0D57');

    // Fix au-vowel mark (ൗ / U+0D57 or ൌ / U+0D4C) misread as Malayalam 'യ' (ya):
    // e.g. "മയലവി" -> "മൗലവി", "വക്കത്തുമയലവി" -> "വക്കം മൗലവി" / "വക്കത്ത് മൗലവി", "ഹയസ്" -> "ഹൗസ്"
    text = text
        .replace(/മയലവി/g, 'മൗലവി')
        .replace(/മയലാന/g, 'മൗലാന')
        .replace(/മയന/g, 'മൗന')
        .replace(/മയലിക/g, 'മൗലിക')
        .replace(/കയതുക/g, 'കൗതുക')
        .replace(/ഗയരവ/g, 'ഗൗരവ')
        .replace(/സയര/g, 'സൗര')
        .replace(/സയന്ദര്യ/g, 'സൗന്ദര്യ')
        .replace(/സയകര/g, 'സൗകര്യ')
        .replace(/യയവന/g, 'യൗവന')
        .replace(/പയര/g, 'പൗര')
        .replace(/ഹയസ്/g, 'ഹൗസ്');

    // Fix tra/t-ra conjunct (ത്ര vs പ്ര) confusion:
    // Tesseract often misidentifies the double-loop 'ത്ര' (tra) combined with 'പ' as 'പ്ര' + 'ത'
    // e.g. "പ്രതം" -> "പത്രം", "പ്രവർത്തനം" -> "പ്രവർത്തനം" (retained), "ദിനപ്രതം" -> "ദിനപത്രം"
    text = text
        .replace(/ദിനപ്രതം/g, 'ദിനപത്രം')
        .replace(/വാരികപ്രതം/g, 'വാരികപത്രം')
        .replace(/വാർത്താപ്രതം/g, 'വാർത്താപത്രം')
        .replace(/മാതൃഭൂമി\s*പ്രതം/g, 'മാതൃഭൂമി പത്രം')
        .replace(/മലയാള\s*മനോരമ\s*പ്രതം/g, 'മലയാള മനോരമ പത്രം')
        .replace(/\bപ്രതം\b/g, 'പത്രം')
        .replace(/പ്രതങ്ങൾ\b/g, 'പത്രങ്ങൾ')
        .replace(/പ്രതത്തി/g, 'പത്രത്തി')
        .replace(/പ്രതപ്രവർത്ത/g, 'പത്രപ്രവർത്ത')
        .replace(/പ്രതാധിപ/g, 'പത്രാധിപ');

    // Fix conjunct character displacement (e.g. നാടക്രതയം -> നാടകത്രയം, കവിതക്രതയം -> കവിതാത്രയം)
    text = text
        .replace(/നാടക്രതയം/g, 'നാടകത്രയം')
        .replace(/കവിതക്രതയം/g, 'കവിതാത്രയം')
        .replace(/രത്നക്രതയം/g, 'രത്നത്രയം')
        .replace(/ത്രയ([ം|ങ])/g, 'ത്രയ$1')
        .replace(/ക്രതയം/g, 'ത്രയം');

    // Fix missing leading consonant when left-vowel sign േ (e-sign / U+0D47) or െ (U+0D46) starts a word:
    // Tesseract often skips the leading 'ക' (ka) in 'കേ' or 'കെ', outputting "േരള" instead of "കേരള"
    text = text
        .replace(/(?:^|[\s"'(])േരള/g, (match) => match.replace('േരള', 'കേരള'))
        .replace(/(?:^|[\s"'(])േന്ദ്ര/g, (match) => match.replace('േന്ദ്ര', 'കേന്ദ്ര'))
        .replace(/(?:^|[\s"'(])േശവ/g, (match) => match.replace('േശവ', 'കേശവ'))
        .replace(/(?:^|[\s"'(])േണൽ/g, (match) => match.replace('േണൽ', 'കേണൽ'))
        .replace(/(?:^|[\s"'(])േസരി/g, (match) => match.replace('േസരി', 'കേസരി'))
        .replace(/(?:^|[\s"'(])േള/g, (match) => match.replace('േള', 'കേള'));

    // 3. Remove stray OCR phantom letters that Tesseract creates from diamond / bullet icons:
    // e.g. "ഭ", "൫", "ഭക", "ക", "൭", "ഭ൫", "കക", "ര" when appearing at the very beginning of a line/sentence
    // followed by whitespace or quote.
    const phantomBulletAtStart = /^[ഭ൫൭കഖഗഘങചഛജഝഞടഠഡഢണതഥദധനപഫബഭമയരറലളഴവശഷസഹളഴറ]*[ഭ൫൭ക]+[ഭ൫൭ക\d\s\.\-–—]*\s+(?=[^\s])/;
    text = text.replace(phantomBulletAtStart, '');

    return text.trim();
}

function parseKeyValuePairsFromText(rawText) {
    if (!rawText?.trim()) return [];

    // Split text into lines
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const pairs = [];
    let currentPair = null;

    // Standard Unicode bullets: diamonds (◆, ◇), dots (•, ●), squares (■), asterisks
    const standardBulletRegex = /^[\u25C6\u25C7\u25C8\u25CA\u25CF\u2022\u25AA\u25AB\u2023\u2043\u2219\u2726\u2727\u2731\u2732\u2733\u2748\u2749\u274A\u274B\u25D8\u27A4\u2794\u2799\u279C\u27B2\u27B5\u27BD\u27BF\u25B6\u25BA\u25C4\u25C0\u2218\u2013\u2014\-*•\+\~#]+\s*/;
    
    // Numeric bullets: "1. ", "1) ", "(1) "
    const numberBulletRegex = /^(?:\d{1,3}[\.\)\-:]|\([0-9A-Za-z]\))\s*/;

    // Phantom OCR bullet artifacts misread from diamond bullet icons:
    // e.g. "ഭ ", "൫ ", "ഭക ", "ക ", "൭ ", "ഭ൫ ", "ഭ- ", "ക. "
    const phantomOcrBulletRegex = /^(?:[ഭ൫൭ക]|[ഭ൫൭ക]{2,3}|[\(\[\{]?[ഭ൫൭ക][\)\]\}]?)[ \t\.\-–—:]+\s*/;

    // Separators between key and value:
    // e.g. " - ", " — ", " – ", " : ", " = ", " -> ", " → "
    // Also matches " -" or "- " at word boundaries
    const separatorRegex = /(?:\s+[-–—]\s*|\s*[-–—]\s+|\s*:\s*|\s*={1,2}\s*|\s*->\s*|\s*→\s*)/;

    for (let i = 0; i < lines.length; i++) {
        let rawLine = lines[i];

        // Clean quotes, asterisks, and ligature issues
        let line = cleanOcrTextArtifacts(rawLine);

        // Check if line starts with any bullet (standard, numeric, or phantom OCR letters)
        const hasStandardBullet = standardBulletRegex.test(line);
        const hasNumberBullet = numberBulletRegex.test(line);
        const hasPhantomBullet = phantomOcrBulletRegex.test(line);

        let cleanedLine = line
            .replace(standardBulletRegex, '')
            .replace(numberBulletRegex, '')
            .replace(phantomOcrBulletRegex, '')
            .trim();

        // One more pass for any residual phantom prefix like "ഭ " or "൭ "
        cleanedLine = cleanedLine.replace(/^[ഭ൫൭ക]\s+/, '').trim();

        if (!cleanedLine) continue;

        // Try to split on key-value separator
        const sepMatch = cleanedLine.search(separatorRegex);

        if (hasStandardBullet || hasNumberBullet || hasPhantomBullet || sepMatch !== -1) {
            // New key-value pair boundary
            if (currentPair) {
                if (currentPair.key.trim() || currentPair.value.trim()) {
                    pairs.push(currentPair);
                }
            }

            if (sepMatch !== -1) {
                // Split at separator
                const parts = cleanedLine.split(separatorRegex);
                const k = parts[0]?.trim() || '';
                const v = parts.slice(1).join(' - ').trim();
                currentPair = { key: k, value: v };
            } else {
                // Bullet line but separator might be on this line or next wrapped line
                currentPair = { key: cleanedLine, value: '' };
            }
        } else {
            // Continuation line — belongs to previous pair
            if (currentPair) {
                const contSepMatch = cleanedLine.search(separatorRegex);
                if (!currentPair.value && contSepMatch !== -1) {
                    const parts = cleanedLine.split(separatorRegex);
                    currentPair.key += ' ' + parts[0].trim();
                    currentPair.value = parts.slice(1).join(' - ').trim();
                } else if (currentPair.value) {
                    // Append to value
                    currentPair.value += ' ' + cleanedLine;
                } else {
                    // If current key exists but no value yet, and this line doesn't have a dash,
                    // check if current key ends as a complete clause, else append to key
                    currentPair.key += ' ' + cleanedLine;
                }
            } else {
                currentPair = { key: cleanedLine, value: '' };
            }
        }
    }

    if (currentPair && (currentPair.key.trim() || currentPair.value.trim())) {
        pairs.push(currentPair);
    }

    // Clean up final pairs
    return pairs.map(p => {
        let k = cleanOcrTextArtifacts(p.key.trim());
        let v = cleanOcrTextArtifacts(p.value.trim());

        // Strip phantom bullet letters at start of key
        k = k.replace(/^[ഭ൫൭ക\s\.\-–—:]+/, '').trim();

        // If key ends with a stray hyphen or colon, strip it
        k = k.replace(/[-–—:]+$/, '').trim();

        // If value starts with a stray hyphen or colon, strip it
        v = v.replace(/^[-–—:]+/, '').trim();

        // Remove phantom letters that leaked into value start
        v = v.replace(/^[ഭ൫൭ക]\s+/, '').trim();

        return { key: k, value: v };
    }).filter(p => p.key || p.value);
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

    const runOCRKeyValues = useCallback(async (sources) => {
        setIsExtracting(true);
        setOcrProgress(10);
        setOcrError(null);
        try {
            const Tesseract = await loadTesseract();
            const allPairs = [];

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

                const pagePairs = parseKeyValuePairsFromText(data.text);
                allPairs.push(...pagePairs);
            }

            setOcrProgress(100);
            return allPairs;
        } catch (err) {
            console.error('[useImageOCR] runOCRKeyValues error:', err);
            setOcrError(err?.message || 'OCR key-value extraction failed.');
            return [];
        } finally {
            setIsExtracting(false);
        }
    }, []);

    const extractKeyValuesFromFile = useCallback(async (file) => {
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
            const parsed = parseKeyValuePairsFromText(allText);
            setOcrProgress(100);
            return parsed;
        } catch (err) {
            console.error('[useImageOCR] extractKeyValuesFromFile error:', err);
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

    return { 
        extractFromFile, 
        extractCanvasesFromPDF, 
        runOCR, 
        runOCRKeyValues, 
        extractKeyValuesFromFile, 
        isExtracting, 
        ocrProgress, 
        ocrError 
    };
}
