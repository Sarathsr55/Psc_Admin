import React from "react";
import "./QuestionDisplay.css";
import Seperator from "../../Components/Seperator";

export default function QuestionDisplay( {data} ) {
    
  if (!data || !data.question) {
    return <p className="no-data">No question available</p>;
  }

  return (
    <div className="display-container">
      <div className="display-card">
          <Seperator height={10} />
        <div style={{display:'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px'}}>
          <p style={{background:'#e2e8f0',color:'#475569',padding:'2px 10px',borderRadius:20, fontSize: '0.75rem', fontWeight: 600}}>{data?.post} Level</p>
          <p style={{background:'#e0f2fe',color:'#0284c7',padding:'2px 10px',borderRadius:20, fontSize: '0.75rem', fontWeight: 600}}>{data?.subject}</p>
          {data?.topic && <p style={{color:'#64748b', fontSize: '0.8rem', fontWeight: 500}}>{data?.topic}</p>}
          {data?.isPreviousYear && (
              <p style={{background:'#fef3c7',color:'#d97706',padding:'2px 10px',borderRadius:20, fontWeight: 'bold', fontSize: '0.75rem'}}>PYQ</p>
          )}
          {data?.review && data.review.trim() !== '' && (
            <>
              <Seperator width={10} />
              <p style={{background:'#9b59b6',color:'white',padding:'0 10px',borderRadius:20, fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'}}>
                📝 Notes
              </p>
            </>
          )}
        </div>
          <Seperator height={12} /> 
        <p className="question-text"><strong>Q:</strong> {data?.question}</p>

        <p className="answer-text"><strong>A:</strong> {data?.answer}</p>
        
        {data?.options && data.options.length > 0 && (
          <div className="options-list">
            <ul>
              {data.options.map((opt, idx) => (
                <li key={idx} className="option-item">
                  <span style={{fontWeight: 700, marginRight: '6px', color: '#94a3b8'}}>{String.fromCharCode(65 + idx)}.</span> {opt}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data?.tags && data.tags.length > 0 && (
          <div className="display-tags-container">
            {data.tags.map((tag, idx) => (
              <span key={idx} className="display-tag-pill">{tag}</span>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
