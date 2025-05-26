"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Download,
  FileText,
  ImageIcon,
  BarChart3,
  Activity,
  Cpu,
  HardDrive,
} from "lucide-react"
import { Line, Bar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

interface SimulationState {
  step: number
  page: number
  memory: (number | null)[]
  fault: boolean
  explanation: string
  algorithm: string
}

interface AlgorithmResult {
  pageFaults: number[]
  hitRatio: number[]
  missRatio: number[]
  states: SimulationState[]
  totalFaults: number
  totalHits: number
}

interface SimulationResults {
  [algorithm: string]: AlgorithmResult
}

export default function MemoryManagementApp() {
  const [referenceString, setReferenceString] = useState("1,2,3,4,1,2,5,1,2,3,4,5")
  const [frameSize, setFrameSize] = useState(3)
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>(["FIFO", "LRU", "Optimal"])
  const [simulationMode, setSimulationMode] = useState<"summary" | "step">("summary")
  const [currentStep, setCurrentStep] = useState(0)
  const [isSimulating, setIsSimulating] = useState(false)
  const [isAutoPlay, setIsAutoPlay] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(1000)
  const [results, setResults] = useState<SimulationResults | null>(null)
  const [currentStates, setCurrentStates] = useState<SimulationState[]>([])
  const [loading, setLoading] = useState(false)

  // Validate inputs
  const refArray = referenceString
    .split(",")
    .map((num) => Number.parseInt(num.trim()))
    .filter((num) => !isNaN(num))

  const isValidInput = refArray.length > 0 && frameSize > 0 && frameSize <= 10

  // Run simulation
  const runSimulation = useCallback(async () => {
    if (!isValidInput) return

    setLoading(true)
    setIsSimulating(true)
    setCurrentStep(0)
    setResults(null)
    setCurrentStates([])

    try {
      const simulationResults: SimulationResults = {}

      for (const algorithm of selectedAlgorithms) {
        const response = await fetch("/api/simulate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refs: refArray,
            frames: frameSize,
            algorithm,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          throw new Error(errorData.error || `Failed to simulate ${algorithm}`)
        }

        const result = await response.json()

        // Handle the new response format with metadata
        simulationResults[algorithm] = {
          pageFaults: result.pageFaults,
          hitRatio: result.hitRatio,
          missRatio: result.missRatio,
          states: result.states,
          totalFaults: result.totalFaults,
          totalHits: result.totalHits,
        }
      }

      setResults(simulationResults)

      if (simulationMode === "step" && selectedAlgorithms.length > 0) {
        setCurrentStates(simulationResults[selectedAlgorithms[0]].states)
      }
    } catch (error) {
      console.error("Simulation error:", error)
      alert(`Failed to run simulation: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
      setIsSimulating(false)
    }
  }, [refArray, frameSize, selectedAlgorithms, simulationMode, isValidInput])

  // Auto-play functionality for step mode
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isAutoPlay && simulationMode === "step" && currentStates.length > 0) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= currentStates.length - 1) {
            setIsAutoPlay(false)
            return prev
          }
          return prev + 1
        })
      }, animationSpeed)
    }

    return () => clearInterval(interval)
  }, [isAutoPlay, simulationMode, currentStates.length, animationSpeed])

  // Export functions
  const exportToPDF = async () => {
    const element = document.getElementById("simulation-results")
    if (!element) return

    const canvas = await html2canvas(element)
    const imgData = canvas.toDataURL("image/png")

    const pdf = new jsPDF("landscape")
    const imgWidth = 297
    const pageHeight = 210
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight

    let position = 0

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    pdf.save("memory-management-simulation.pdf")
  }

  const exportToPNG = async () => {
    const element = document.getElementById("simulation-results")
    if (!element) return

    const canvas = await html2canvas(element)
    const link = document.createElement("a")
    link.download = "memory-management-simulation.png"
    link.href = canvas.toDataURL()
    link.click()
  }

  const exportToCSV = () => {
    if (!results) return

    const csvData = []
    csvData.push(["Algorithm", "Total References", "Page Faults", "Hit Ratio", "Miss Ratio"])

    Object.entries(results).forEach(([algorithm, result]) => {
      const totalRefs = refArray.length
      const hitRatio = (result.hitRatio[result.hitRatio.length - 1] || 0).toFixed(4)
      const missRatio = (result.missRatio[result.missRatio.length - 1] || 0).toFixed(4)

      csvData.push([algorithm, totalRefs.toString(), result.totalFaults.toString(), hitRatio, missRatio])
    })

    const csvContent = csvData.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "simulation-results.csv"
    link.click()
  }

  // Chart data
  const chartData = {
    labels: Array.from({ length: refArray.length }, (_, i) => i + 1),
    datasets: Object.entries(results || {}).map(([algorithm, result], index) => ({
      label: `${algorithm} Page Faults`,
      data: result.pageFaults,
      borderColor: `hsl(${index * 120}, 70%, 50%)`,
      backgroundColor: `hsla(${index * 120}, 70%, 50%, 0.1)`,
      fill: false,
      tension: 0.4,
    })),
  }

  const hitRatioData = {
    labels: Array.from({ length: refArray.length }, (_, i) => i + 1),
    datasets: Object.entries(results || {}).map(([algorithm, result], index) => ({
      label: `${algorithm} Hit Ratio`,
      data: result.hitRatio,
      borderColor: `hsl(${index * 120}, 70%, 50%)`,
      backgroundColor: `hsla(${index * 120}, 70%, 50%, 0.1)`,
      fill: false,
      tension: 0.4,
    })),
  }

  const comparisonData = {
    labels: Object.keys(results || {}),
    datasets: [
      {
        label: "Page Faults",
        data: Object.values(results || {}).map((result) => result.totalFaults),
        backgroundColor: "rgba(239, 68, 68, 0.8)",
        borderColor: "rgba(239, 68, 68, 1)",
        borderWidth: 2,
      },
      {
        label: "Page Hits",
        data: Object.values(results || {}).map((result) => result.totalHits),
        backgroundColor: "rgba(34, 197, 94, 0.8)",
        borderColor: "rgba(34, 197, 94, 1)",
        borderWidth: 2,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Algorithm Performance",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="gradient-bg text-white py-12">
        <div className="container mx-auto px-4">
          <div className="text-center animate-slide-in">
            <div className="flex items-center justify-center gap-4 mb-4">
              <Cpu className="w-12 h-12" />
              <h1 className="text-4xl md:text-6xl font-bold">Memory Management</h1>
              <HardDrive className="w-12 h-12" />
            </div>
            <p className="text-xl md:text-2xl opacity-90 max-w-3xl mx-auto">
              Interactive visualization of FIFO, LRU, and Optimal page replacement algorithms
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Badge variant="secondary" className="text-sm">
                <Activity className="w-4 h-4 mr-1" />
                Real-time Simulation
              </Badge>
              <Badge variant="secondary" className="text-sm">
                <BarChart3 className="w-4 h-4 mr-1" />
                Performance Analysis
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Input Section */}
        <Card className="mb-8 animate-fade-in gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              Simulation Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="reference-string">Reference String</Label>
                <Input
                  id="reference-string"
                  value={referenceString}
                  onChange={(e) => setReferenceString(e.target.value)}
                  placeholder="e.g., 1,2,3,4,1,2,5"
                  disabled={loading}
                />
                <p className="text-sm text-gray-600">Enter page numbers separated by commas</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frame-size">Number of Frames</Label>
                <Input
                  id="frame-size"
                  type="number"
                  min="1"
                  max="10"
                  value={frameSize}
                  onChange={(e) => setFrameSize(Number.parseInt(e.target.value) || 1)}
                  disabled={loading}
                />
                <p className="text-sm text-gray-600">Available memory frames (1-10)</p>
              </div>

              <div className="space-y-2">
                <Label>Simulation Mode</Label>
                <Select value={simulationMode} onValueChange={(value: "summary" | "step") => setSimulationMode(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Results Summary</SelectItem>
                    <SelectItem value="step">Step-by-Step</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Algorithms to Compare</Label>
              <div className="flex flex-wrap gap-2">
                {["FIFO", "LRU", "Optimal"].map((algorithm) => (
                  <Button
                    key={algorithm}
                    variant={selectedAlgorithms.includes(algorithm) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedAlgorithms((prev) =>
                        prev.includes(algorithm) ? prev.filter((a) => a !== algorithm) : [...prev, algorithm],
                      )
                    }}
                    disabled={loading}
                  >
                    {algorithm}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <Button
                onClick={runSimulation}
                disabled={!isValidInput || loading || selectedAlgorithms.length === 0}
                className="flex items-center gap-2"
              >
                {loading ? <div className="loading-spinner" /> : <Play className="w-4 h-4" />}
                Run Simulation
              </Button>

              {simulationMode === "step" && currentStates.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsAutoPlay(!isAutoPlay)}
                    className="flex items-center gap-2"
                  >
                    {isAutoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isAutoPlay ? "Pause" : "Auto Play"}
                  </Button>

                  <div className="flex items-center gap-2">
                    <Label htmlFor="speed">Speed:</Label>
                    <Input
                      id="speed"
                      type="range"
                      min="500"
                      max="3000"
                      step="250"
                      value={animationSpeed}
                      onChange={(e) => setAnimationSpeed(Number.parseInt(e.target.value))}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-600">{animationSpeed}ms</span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0}
                  >
                    <SkipBack className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep(Math.min(currentStates.length - 1, currentStep + 1))}
                    disabled={currentStep >= currentStates.length - 1}
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </>
              )}

              <Separator orientation="vertical" className="h-8" />

              <div className="export-buttons">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={!results}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToPDF}
                  disabled={!results}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToPNG}
                  disabled={!results}
                  className="flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  PNG
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {results && (
          <div id="simulation-results" className="space-y-8">
            {simulationMode === "summary" ? (
              <SummaryMode
                results={results}
                refArray={refArray}
                chartData={chartData}
                hitRatioData={hitRatioData}
                comparisonData={comparisonData}
                chartOptions={chartOptions}
              />
            ) : (
              <StepMode
                currentStates={currentStates}
                currentStep={currentStep}
                frameSize={frameSize}
                refArray={refArray}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Summary Mode Component
function SummaryMode({
  results,
  refArray,
  chartData,
  hitRatioData,
  comparisonData,
  chartOptions,
}: {
  results: SimulationResults
  refArray: number[]
  chartData: any
  hitRatioData: any
  comparisonData: any
  chartOptions: any
}) {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Summary Cards */}
      <div className="results-grid">
        {Object.entries(results).map(([algorithm, result]) => (
          <Card key={algorithm} className="gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {algorithm} Algorithm
                <Badge variant="outline">{result.totalFaults} faults</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{result.totalFaults}</div>
                    <div className="text-sm text-gray-600">Page Faults</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{result.totalHits}</div>
                    <div className="text-sm text-gray-600">Page Hits</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Hit Ratio</span>
                    <span>{((result.totalHits / refArray.length) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(result.totalHits / refArray.length) * 100} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Miss Ratio</span>
                    <span>{((result.totalFaults / refArray.length) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(result.totalFaults / refArray.length) * 100} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="results-grid">
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle>Page Faults Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="chart-container">
              <Line data={chartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader>
            <CardTitle>Hit Ratio Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="chart-container">
              <Line data={hitRatioData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader>
            <CardTitle>Algorithm Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="chart-container">
              <Bar data={comparisonData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Step Mode Component
function StepMode({
  currentStates,
  currentStep,
  frameSize,
  refArray,
}: {
  currentStates: SimulationState[]
  currentStep: number
  frameSize: number
  refArray: number[]
}) {
  const currentState = currentStates[currentStep]

  if (!currentState) return null

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Progress Indicator */}
      <Card className="gradient-card">
        <CardHeader>
          <CardTitle>Simulation Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>
                Step {currentStep + 1} of {currentStates.length}
              </span>
              <span>{Math.round(((currentStep + 1) / currentStates.length) * 100)}% Complete</span>
            </div>
            <Progress value={((currentStep + 1) / currentStates.length) * 100} className="h-3" />

            <div className="flex flex-wrap gap-2 justify-center">
              {refArray.map((page, index) => (
                <div
                  key={index}
                  className={`step-indicator ${
                    index < currentStep + 1 ? "completed" : index === currentStep ? "active" : "pending"
                  }`}
                >
                  {page}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Step Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Frame Visualization */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              Memory Frames - Step {currentStep + 1}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-lg font-semibold mb-2">
                  Accessing Page:{" "}
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {currentState.page}
                  </Badge>
                </div>
                <div className={`text-sm font-medium ${currentState.fault ? "text-red-600" : "text-green-600"}`}>
                  {currentState.fault ? "PAGE FAULT" : "PAGE HIT"}
                </div>
              </div>

              <div className="frame-container">
                {currentState.memory.map((frame, index) => (
                  <div
                    key={index}
                    className={`frame ${
                      frame === null
                        ? "empty"
                        : frame === currentState.page
                          ? (currentState.fault ? "fault" : "hit")
                          : "filled"
                    } memory-block ${frame === currentState.page ? "highlight" : ""}`}
                  >
                    {frame !== null ? frame : "—"}
                  </div>
                ))}
              </div>

              <div className="text-center text-sm text-gray-600">
                Frame {Array.from({ length: frameSize }, (_, i) => i + 1).join(", ")}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Explanation */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle>Step Explanation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <h4 className="font-semibold text-blue-800 mb-2">{currentState.algorithm} Algorithm</h4>
                <p className="text-blue-700">{currentState.explanation}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold">{currentStep + 1}</div>
                  <div className="text-sm text-gray-600">Current Step</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold">{currentState.page}</div>
                  <div className="text-sm text-gray-600">Page Reference</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step Table */}
      <Card className="gradient-card">
        <CardHeader>
          <CardTitle>Simulation Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="simulation-table">
              <thead>
                <tr>
                  <th>Step</th>
                  <th>Page</th>
                  {Array.from({ length: frameSize }, (_, i) => (
                    <th key={i}>Frame {i + 1}</th>
                  ))}
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {currentStates.slice(0, currentStep + 1).map((state, index) => (
                  <tr key={index} className={index === currentStep ? "active" : ""}>
                    <td className="font-medium">{state.step}</td>
                    <td className="font-medium">{state.page}</td>
                    {state.memory.map((frame, frameIndex) => (
                      <td key={frameIndex} className="text-center">
                        {frame !== null ? frame : "—"}
                      </td>
                    ))}
                    <td>
                      <Badge variant={state.fault ? "destructive" : "default"}>{state.fault ? "Fault" : "Hit"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
