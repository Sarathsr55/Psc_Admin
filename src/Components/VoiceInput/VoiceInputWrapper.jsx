import React, { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaStop } from 'react-icons/fa';
import './VoiceInput.css';

const VoiceInputWrapper = ({ 
    children, 
    onTextUpdate, 
    value = '', 
    className = '',
    lang = 'ml-IN'
}) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = lang;

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onresult = (event) => {
                let currentTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        currentTranscript += event.results[i][0].transcript + ' ';
                    }
                }
                
                if (currentTranscript.trim()) {
                    const newValue = value ? `${value} ${currentTranscript.trim()}` : currentTranscript.trim();
                    onTextUpdate(newValue);
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        } else {
            console.warn('Speech Recognition API not supported in this browser.');
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [lang, value, onTextUpdate]);

    const toggleListening = (e) => {
        e.preventDefault();
        if (!recognitionRef.current) {
            alert('Your browser does not support Voice to Text. Please use Google Chrome or Edge.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            try {
                recognitionRef.current.start();
            } catch (err) {
                console.error("Could not start recognition", err);
            }
        }
    };

    return (
        <div className={`voice-input-wrapper ${isListening ? 'listening' : ''} ${className}`} ref={wrapperRef}>
            {children}
            <div className="voice-controls">
                <button 
                    type="button" 
                    className={`voice-mic-btn ${isListening ? 'listening' : ''}`}
                    onClick={toggleListening}
                    title={isListening ? "Stop Listening" : "Start Voice Typing"}
                >
                    {isListening 
                        ? <FaStop size={16} color="#ef4444" /> 
                        : <FaMicrophone size={18} color="#000000" />
                    }
                    {isListening && <span className="listening-pulse"></span>}
                </button>
            </div>
        </div>
    );
};

export default VoiceInputWrapper;
