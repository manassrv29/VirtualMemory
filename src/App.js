import React, { useState, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import PageReplacementSimulator from './components/PageReplacementSimulator';

function App() {
  return (
    <div className="App">
      <div className="container mt-4">
        <div className="heading-container">
          <div className="heading-wrapper">
            <h1 className="main-heading">
              <span className="heading-line"></span>
              Page Replacement Algorithm Visualizer
              <span className="heading-line"></span>
            </h1>
            <div className="heading-decoration">
              <span className="decoration-dot"></span>
              <span className="decoration-dot"></span>
              <span className="decoration-dot"></span>
            </div>
          </div>
          <p className="sub-heading">Compare and analyze FIFO, LRU, and Optimal page replacement algorithms in real-time</p>
        </div>
        <PageReplacementSimulator />
      </div>
    </div>
  );
}

export default App;
