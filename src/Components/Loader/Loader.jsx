import React from 'react';
import './Loader.css';

export const Loader = ({ size = 50, text = '' }) => {
    return (
        <div className="loader-container">
            <div className="spinner" style={{ width: size, height: size }}></div>
            {text && <p className="loader-text">{text}</p>}
        </div>
    );
};
