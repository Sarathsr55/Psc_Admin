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
        <div style={{display:'flex'}}>
          <p style={{background:'#62c862ff',color:'white',padding:'0 10px',borderRadius:20}}>{data?.post} level</p>
          <Seperator width={10} />
          	
          <p style={{background:'#5dadc8ff',color:'white',padding:'0 10px',borderRadius:20}}>{data?.subject}</p>
          <Seperator width={10} />
          <p>{data?.topic}</p>
        </div>
          <Seperator height={10} /> 
        <p className="question-text"><strong>Question:</strong> {data?.question}</p>

        <p className="answer-text"><strong>Answer:</strong> {data?.answer}</p>
        <div className="options-list">
          <p><strong>Options:</strong></p>
          <ul style={{display:'flex',justifyContent:'space-evenly',flexWrap:'wrap'}}>
            {data?.options && data?.options.map((opt, idx) => (
              <li key={idx} className="option-item">{opt}</li>
            ))}
          </ul>
        </div>

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
