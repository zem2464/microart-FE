import React, { useEffect } from 'react';
import { Spin } from 'antd';
import './Splash.css';

function Splash({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onFinish) onFinish();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="splash-container">
      <div className="splash-content">
        <div className="splash-logo">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <circle cx="60" cy="60" r="58" fill="#667eea" stroke="#fff" strokeWidth="2" />
            <text x="60" y="75" fontSize="48" fontWeight="bold" fill="#fff" textAnchor="middle">
              μA
            </text>
          </svg>
        </div>
        <h1>microArt</h1>
        <p>Initializing Application...</p>
        <Spin size="large" style={{ marginTop: '20px' }} />
      </div>
    </div>
  );
}

export default Splash;
