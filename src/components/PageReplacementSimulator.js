import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Line, Bar, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import 'html2canvas';
import { motion, AnimatePresence } from 'framer-motion';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend
);

const PageReplacementSimulator = () => {
  const [referenceString, setReferenceString] = useState('');
  const [frameSize, setFrameSize] = useState(3);
  const [selectedAlgorithms, setSelectedAlgorithms] = useState(['FIFO']); // Default to FIFO
  const [isAutoRun, setIsAutoRun] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1000); // ms
  const [simulationMode, setSimulationMode] = useState('step'); // 'step' or 'full'
  const [explanation, setExplanation] = useState('');
  const [memoryState, setMemoryState] = useState({
    virtualAddress: null,
    physicalAddress: null,
    tlbHit: false,
    pageFault: false,
    currentPage: null,
    frames: new Array(frameSize).fill(null),
    pageTable: new Map(),
    tlb: new Map(),
    stepExplanation: '',
  });
  const animationRef = useRef(null);
  const [results, setResults] = useState(null); // Initialize as null
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [simulationStates, setSimulationStates] = useState([]); // To store all states from backend

  // Helper: Validate frame size
  const isFrameSizeValid = Number.isInteger(frameSize) && frameSize > 0 && frameSize <= 10;
  // Helper: Validate reference string
  const refArray = referenceString
    .split(',')
    .map(num => parseInt(num.trim()))
    .filter(num => !isNaN(num));
  const isReferenceStringValid = refArray.length > 0;

  // Algorithms are implemented in the backend

  const runSimulation = useCallback(async () => {
    if (!isReferenceStringValid || !isFrameSizeValid || selectedAlgorithms.length === 0) return;
    setIsSimulating(true);
    setSimulationComplete(false);
    setCurrentStep(0);
    setSimulationStates([]);
    setResults(null);
    setExplanation('');
    setMemoryState(prev => ({ ...prev, frames: new Array(frameSize).fill(null), currentPage: null, pageFault: false }));
    setIsAutoRun(simulationMode === 'full'); // Start auto-run automatically in full mode

    const algorithm = selectedAlgorithms[0];
    
    try {
      const response = await fetch('http://localhost:5000/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refs: refArray,
          frames: frameSize,
          algorithm: algorithm
        })
      });

      if (!response.ok) {
        throw new Error('Simulation failed');
      }

      const result = await response.json();
      
      setResults({
        [algorithm]: {
          pageFaults: result.pageFaults,
          hitRatio: result.hitRatio,
          missRatio: result.missRatio,
          totalFaults: result.totalFaults,
          totalHits: result.totalHits
        }
      });
      setSimulationStates(result.states);

      if (simulationMode === 'full') {
          startMemoryAnimation(result.states);
      } else if (simulationMode === 'step' && result.states.length > 0) {
          const firstState = result.states[0];
          setMemoryState(prev => ({
              ...prev,
              currentPage: firstState.page,
              frames: firstState.memory,
              pageFault: firstState.fault
          }));
          setExplanation(firstState.explanation);
      }

    } catch (error) {
      console.error('Simulation error:', error);
      setIsSimulating(false);
      alert('Failed to run simulation. Please try again.');
    }
  }, [isReferenceStringValid, isFrameSizeValid, refArray, frameSize, selectedAlgorithms, simulationMode]);

  const stopSimulation = () => {
    setIsSimulating(false);
    setIsAutoRun(false);
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    setSimulationComplete(true);
  };

  const startMemoryAnimation = (states) => {
    let currentIndex = currentStep; // Start from the current step
    
    const animateStep = () => {
      if (currentIndex >= states.length) {
        setIsSimulating(false);
        setSimulationComplete(true);
        return;
      }

      if (!isSimulating && simulationMode === 'full') {
           setSimulationComplete(true);
           return;
      }

      const currentState = states[currentIndex];
      setMemoryState(prev => ({
        ...prev,
        currentPage: currentState.page,
        frames: currentState.memory,
        pageFault: currentState.fault
      }));
      
      setCurrentStep(currentIndex);
      setExplanation(currentState.explanation);

      if (simulationMode === 'full' && isAutoRun) {
        animationRef.current = setTimeout(() => {
          currentIndex++;
          animateStep();
        }, animationSpeed);
      } else if (simulationMode === 'full' && !isAutoRun) {
         animationRef.current = setTimeout(animateStep, animationSpeed);
      }
    };

    if (simulationMode === 'full') {
       animateStep();
    }
  };

  useEffect(() => {
    if (simulationMode === 'full' && isSimulating) {
        if (isAutoRun) {
            startMemoryAnimation(simulationStates); // Pass the full states array
        } else {
            if (animationRef.current) {
                clearTimeout(animationRef.current);
            }
        }
    } else if (simulationMode === 'full' && !isSimulating) {
         if (animationRef.current) {
            clearTimeout(animationRef.current);
        }
    }

  }, [isAutoRun, isSimulating, simulationMode, simulationStates, currentStep]);

  const handleNextStep = () => {
    if (currentStep < simulationStates.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      const nextState = simulationStates[nextStep];
      setMemoryState(prev => ({
        ...prev,
        currentPage: nextState.page,
        frames: nextState.memory,
        pageFault: nextState.fault
      }));
      setExplanation(nextState.explanation);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      const prevState = simulationStates[prevStep];
      setMemoryState(prev => ({
        ...prev,
        currentPage: prevState.page,
        frames: prevState.memory,
        pageFault: prevState.fault
      }));
      setExplanation(prevState.explanation);
    }
  };

  const exportToCSV = () => {
    if (!simulationComplete || !results || selectedAlgorithms.length === 0) return;

    const headers = ['Algorithm', 'Total References', 'Total Page Faults', 'Hit Ratio', 'Miss Ratio'];
    const algo = selectedAlgorithms[0];
    const algoResults = results[algo];
    
    if (!algoResults) return;

    const totalReferences = refArray.length;
    const totalFaults = algoResults?.totalFaults || 0;
    const hitRatio = (algoResults?.hitRatio[algoResults.hitRatio.length - 1] || 0).toFixed(4);
    const missRatio = (algoResults?.missRatio[algoResults.missRatio.length - 1] || 0).toFixed(4);

    const data = [
      algo,
      totalReferences,
      totalFaults,
      hitRatio,
      missRatio
    ];

    const csvContent = [
      headers.join(','),
      data.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'page_replacement_results.csv');
  };

  const exportGraph = async (format = 'pdf') => {
    if (!simulationComplete || !results || selectedAlgorithms.length === 0) return;

    const chartContainers = document.querySelectorAll('.chart-container canvas');
    const canvas = chartContainers[0]; // Assuming the first chart is the target for export
    if (!canvas) {
      alert('No chart found to export.');
      return;
    }
    const imgData = canvas.toDataURL('image/png');
    
    if (format === 'pdf') {
      const pdf = new jsPDF('landscape'); // Use landscape for better chart fitting
      const imgProps= pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('page_replacement_graph.pdf');
    } else {
      const link = document.createElement('a');
      link.download = 'page_replacement_graph.png';
      link.href = imgData;
      link.click();
    }
  };

  // Chart Data - depends on results state
  const pageFaultsData = {
    labels: simulationComplete && results && refArray.length > 0 ? Array.from({ length: refArray.length }, (_, i) => i + 1) : [],
    datasets: selectedAlgorithms.map((algo, index) => ({
      label: `${algo} Page Faults`,
      data: results?.[algo]?.pageFaults || [],
      borderColor: `hsl(${index * 120}, 70%, 50%)`,
      backgroundColor: `hsla(${index * 120}, 70%, 50%, 0.1)`,
      fill: false,
      tension: 0.4
    }))
  };

  const hitRatioData = {
    labels: simulationComplete && results && refArray.length > 0 ? Array.from({ length: refArray.length }, (_, i) => i + 1) : [],
    datasets: selectedAlgorithms.map((algo, index) => ({
      label: `${algo} Hit Ratio`,
      data: results?.[algo]?.hitRatio || [],
      borderColor: `hsl(${index * 120}, 70%, 50%)`,
      backgroundColor: `hsla(${index * 120}, 70%, 50%, 0.1)`,
      fill: false,
      tension: 0.4
    }))
  };

  const missRatioData = {
    labels: simulationComplete && results && refArray.length > 0 ? Array.from({ length: refArray.length }, (_, i) => i + 1) : [],
    datasets: selectedAlgorithms.map((algo, index) => ({
      label: `${algo} Miss Ratio`,
      data: results?.[algo]?.missRatio || [],
      borderColor: `hsl(${index * 120}, 70%, 50%)`,
      backgroundColor: `hsla(${index * 120}, 70%, 50%, 0.1)`,
      fill: false,
      tension: 0.4
    }))
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    animation: { // Adjusted animation duration
      duration: simulationMode === 'full' && isAutoRun ? animationSpeed * 0.8 : 1000,
      easing: 'easeInOutQuart'
    },
    maintainAspectRatio: false, // Added to allow chart resizing
  };

  // Overall Results Component
  const OverallResults = () => {
    const algo = selectedAlgorithms[0];
    const algoResults = results?.[algo];
    const totalReferences = refArray.length;
    const totalFaults = algoResults?.totalFaults || 0;
    const faultRate = totalReferences > 0 ? (totalFaults / totalReferences).toFixed(2) : '0.00';

    if (!simulationComplete || !algoResults) return null;

    return (
      <motion.div 
        className="overall-results"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h3>Simulation Results Summary ({algo})</h3>
        <div className="results-summary">
          <div className="result-item">
            <h4>Total References</h4>
            <p>{totalReferences}</p>
          </div>
          <div className="result-item">
            <h4>Total Page Faults</h4>
            <p>{totalFaults}</p>
          </div>
          <div className="result-item">
            <h4>Fault Rate</h4>
            <p>{faultRate}</p>
          </div>
        </div>
      </motion.div>
    );
  };

  // Frame Visualization Component (Current Step)
  const FrameVisualization = () => {
      const currentState = simulationStates[currentStep];

      if (!currentState) return null;

      return (
        <motion.div 
          className="frame-visualization card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
           <div className="card-body">
              <h5 className="card-title">Current Frame State (Step {currentStep + 1})</h5>
              <div className="frames-container">
                {currentState.memory.map((frame, index) => (
                  <motion.div
                    key={index}
                    className={`frame ${frame === currentState.page ? (currentState.fault ? 'fault' : 'hit') : ''}`}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {frame !== null ? frame : '-'}
                  </motion.div>
                ))}
              </div>
               <div className="explanation-box mt-3">
                    <h4>Explanation</h4>
                    <p>{currentState.explanation}</p>
                </div>
            </div>
        </motion.div>
      );
  };

  // Table Visualization Component (All Steps)
  const TableVisualization = () => (
    <motion.div 
      className="table-visualization card"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
        <div className="card-body">
            <h5 className="card-title">Frame States Table</h5>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>Reference</th>
                    {Array.from({ length: frameSize }, (_, i) => <th key={i}>F{i + 1}</th>)}
                    <th>Page Fault</th>
                  </tr>
                </thead>
                <tbody>
                  {simulationStates.map((state, index) => (
                    <tr key={index} className={index === currentStep ? 'active-step' : ''}>
                      <td>{state.step}</td>
                      <td>{state.page}</td>
                      {state.memory.map((frame, frameIndex) => (
                        <td key={frameIndex}>{frame !== null ? frame : '-'}</td>
                      ))}
                      <td>{state.fault ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>
    </motion.div>
  );

  return (
    <div className="simulator container animate-fade-in">
     
      {/* Simulation Mode Selector at the very top */}
      <div className="row mb-4">
          <div className="col-12">
               <div className="simulation-mode-selector card">
                   <div className="card-body">
                        <h5 className="card-title">Select Simulation Mode</h5>
                       <div className="d-flex align-items-center gap-3">
                            <label className="mb-0">Mode:</label>
                            <select 
                                value={simulationMode} 
                                onChange={(e) => setSimulationMode(e.target.value)}
                                disabled={isSimulating}
                                className="form-select form-select-sm w-auto"
                            >
                                <option value="step">Step by Step</option>
                                <option value="full">Full Simulation</option>
                            </select>
                       </div>
                   </div>
               </div>
          </div>
      </div>

      {/* Input Fields */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="form-group card card-body">
            <label className="tooltip">
              Reference String (comma-separated)
              <span className="tooltip-text">Enter page numbers separated by commas (e.g., 1,2,3,4,1,2,5)</span>
            </label>
            <input
              type="text"
              className="form-control"
              value={referenceString}
              onChange={(e) => setReferenceString(e.target.value)}
              placeholder="e.g., 1,2,3,4,1,2,5,1,2,3,4,5"
              disabled={isSimulating}
            />
          </div>
        </div>
        <div className="col-md-3">
          <div className="form-group card card-body">
            <label className="tooltip">
              Frame Size
              <span className="tooltip-text">Number of frames available in memory (1-10)</span>
            </label>
            <input
              type="number"
              className="form-control"
              value={frameSize}
              onChange={(e) => setFrameSize(parseInt(e.target.value))}
              min="1"
              max="10"
              disabled={isSimulating}
            />
          </div>
        </div>
        <div className="col-md-3">
          <div className="form-group card card-body">
            <label className="tooltip">
              Algorithm
              <span className="tooltip-text">Select one algorithm for the simulation</span>
            </label>
            <select
              className="form-control"
              value={selectedAlgorithms[0] || 'FIFO'}
              onChange={(e) => setSelectedAlgorithms([e.target.value])}
              disabled={isSimulating}
            >
              <option value="FIFO">FIFO</option>
              <option value="LRU">LRU</option>
              <option value="Optimal">Optimal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Control Panel */}
      <div className="control-panel card card-body mb-4">
          <h5 className="card-title">Simulation Controls</h5>
           <div className="d-flex flex-wrap align-items-center gap-3">
            {/* Group for Run/Stop buttons - always visible */}
            <div className="button-group d-flex gap-3 flex-wrap">
              <button
                className="btn btn-primary tooltip"
                onClick={runSimulation}
                disabled={!isReferenceStringValid || !isFrameSizeValid || isSimulating || selectedAlgorithms.length === 0}
              >
                Run Simulation
                <span className="tooltip-text">Start the page replacement simulation</span>
              </button>
              <button
                className="btn btn-danger tooltip"
                onClick={stopSimulation}
                disabled={!isSimulating}
              >
                Stop Simulation
                <span className="tooltip-text">Stop the current simulation</span>
              </button>
            </div>

            {/* Group for Conditional controls (Auto-Run/Pause, Speed, Step Navigation) */}
            <div className="d-flex align-items-center gap-3 flex-wrap flex-grow-1 justify-content-center">
                {simulationMode === 'full' && isSimulating && (
                      <>
                           <button
                               className="btn btn-secondary tooltip"
                               onClick={() => setIsAutoRun(!isAutoRun)}
                           >
                               {isAutoRun ? 'Pause Auto-Run' : 'Resume Auto-Run'}
                               <span className="tooltip-text">{isAutoRun ? 'Pause automatic simulation mode' : 'Resume automatic simulation mode'}</span>
                           </button>
                            <div className="speed-control d-flex align-items-center gap-2">
                                 <label className="mb-0">Speed:</label>
                                  <input
                                       type="range"
                                       min="100"
                                       max="2000"
                                       step="100"
                                       value={animationSpeed}
                                       onChange={(e) => setAnimationSpeed(parseInt(e.target.value))}
                                       className="form-range"
                                   />
                                   <span className="speed-value" style={{minWidth: '50px'}}>{animationSpeed}ms</span>
                             </div>
                        </>
                  )}

                {simulationMode === 'step' && simulationStates.length > 0 && !isSimulating && (
                    <>
                        <button 
                             onClick={handlePrevStep}
                             disabled={currentStep === 0}
                             className="btn btn-secondary tooltip"
                         >
                             Previous Step
                             <span className="tooltip-text">Go to the previous simulation step</span>
                         </button>
                         <button 
                             onClick={handleNextStep}
                             disabled={currentStep === simulationStates.length - 1}
                              className="btn btn-secondary tooltip"
                         >
                             Next Step
                             <span className="tooltip-text">Go to the next simulation step</span>
                         </button>
                   </>
                )}
            </div>

            {/* Group for Export buttons - always visible */}
            <div className="button-group d-flex gap-3 flex-wrap">
              <button
                className="btn btn-success tooltip"
                onClick={exportToCSV}
                disabled={!simulationComplete || !results}
              >
                Export CSV
                <span className="tooltip-text">Download results as CSV file</span>
              </button>
              <button
                className="btn btn-info tooltip"
                onClick={() => exportGraph('pdf')}
                disabled={!simulationComplete || !results}
              >
                Export PDF
                <span className="tooltip-text">Download graphs as PDF</span>
              </button>
              <button
                className="btn btn-info tooltip"
                onClick={() => exportGraph('png')}
                disabled={!simulationComplete || !results}
              >
                Export PNG
                <span className="tooltip-text">Download graphs as PNG</span>
              </button>
            </div>
          </div>
      </div>

      {/* Simulation Results and Visualizations */}

      {/* Overall Results after simulation completion */}
      {simulationComplete && <OverallResults />}

      {/* Table Visualization always shown after simulation starts */}
       {simulationStates.length > 0 && <TableVisualization />}

      {/* Current Frame Visualization and Explanation */}
       {((simulationMode === 'step' && simulationStates.length > 0 && !isSimulating) || (simulationMode === 'full' && isSimulating)) ? 
            <FrameVisualization /> : null
       }

      {/* Page Fault Analysis Charts after simulation completion */}
      {simulationComplete && results && selectedAlgorithms.length > 0 && results[selectedAlgorithms[0]] && (
        <motion.div className="graph-grid animate-fade-in">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Page Faults Over Time</h5>
              <div className="chart-container">
                <Line data={pageFaultsData} options={chartOptions} />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Hit Ratio Over Time</h5>
              <div className="chart-container">
                <Line data={hitRatioData} options={chartOptions} />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Miss Ratio Over Time</h5>
              <div className="chart-container">
                <Line data={missRatioData} options={chartOptions} />
              </div>
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
};

export default PageReplacementSimulator;
