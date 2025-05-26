import { type NextRequest, NextResponse } from "next/server"

interface SimulationRequest {
  refs: number[]
  frames: number
  algorithm: string
}

interface SimulationState {
  step: number
  page: number
  memory: (number | null)[]
  fault: boolean
  explanation: string
  algorithm: string
}

interface SimulationResult {
  pageFaults: number[]
  hitRatio: number[]
  missRatio: number[]
  states: SimulationState[]
  totalFaults: number
  totalHits: number
}

function simulateFIFO(refs: number[], frames: number): SimulationResult {
  const memory = new Array(frames).fill(null)
  const pageFaults: number[] = []
  const hitRatio: number[] = []
  const missRatio: number[] = []
  const states: SimulationState[] = []
  let faults = 0
  let hits = 0
  let pointer = 0

  for (let i = 0; i < refs.length; i++) {
    const page = refs[i]
    let fault = false
    let explanation = ""

    if (!memory.includes(page)) {
      // Page fault
      const replacedPage = memory[pointer]
      memory[pointer] = page
      const frameIndex = pointer
      pointer = (pointer + 1) % frames
      faults++
      fault = true

      if (replacedPage === null) {
        explanation = `Page ${page} loaded into empty frame ${frameIndex}.`
      } else {
        explanation = `Page ${page} replaces page ${replacedPage} in frame ${frameIndex} using FIFO policy.`
      }
    } else {
      // Page hit
      hits++
      const frameIndex = memory.indexOf(page)
      explanation = `Page ${page} found in frame ${frameIndex} (Page Hit).`
    }

    states.push({
      step: i + 1,
      page,
      memory: [...memory],
      fault,
      explanation,
      algorithm: "FIFO",
    })

    pageFaults.push(faults)
    hitRatio.push(hits / (i + 1))
    missRatio.push(faults / (i + 1))
  }

  return {
    pageFaults,
    hitRatio,
    missRatio,
    states,
    totalFaults: faults,
    totalHits: hits,
  }
}

function simulateLRU(refs: number[], frames: number): SimulationResult {
  const memory = new Array(frames).fill(null)
  const pageFaults: number[] = []
  const hitRatio: number[] = []
  const missRatio: number[] = []
  const states: SimulationState[] = []
  let faults = 0
  let hits = 0
  const lastUsed = new Map<number, number>()

  for (let i = 0; i < refs.length; i++) {
    const page = refs[i]
    let fault = false
    let explanation = ""

    if (!memory.includes(page)) {
      // Page fault
      if (memory.includes(null)) {
        // Empty frame available
        const emptyIndex = memory.indexOf(null)
        memory[emptyIndex] = page
        lastUsed.set(page, i)
        explanation = `Page ${page} loaded into empty frame ${emptyIndex}.`
      } else {
        // Find LRU page
        let lruPage = memory[0]
        let lruTime = lastUsed.get(lruPage) ?? -1
        let replaceIndex = 0

        for (let j = 1; j < frames; j++) {
          const pageTime = lastUsed.get(memory[j]) ?? -1
          if (pageTime < lruTime) {
            lruPage = memory[j]
            lruTime = pageTime
            replaceIndex = j
          }
        }

        memory[replaceIndex] = page
        explanation = `Page ${page} replaces least recently used page ${lruPage} in frame ${replaceIndex}.`
      }
      lastUsed.set(page, i)
      faults++
      fault = true
    } else {
      // Page hit
      hits++
      lastUsed.set(page, i)
      const frameIndex = memory.indexOf(page)
      explanation = `Page ${page} found in frame ${frameIndex} (Page Hit).`
    }

    states.push({
      step: i + 1,
      page,
      memory: [...memory],
      fault,
      explanation,
      algorithm: "LRU",
    })

    pageFaults.push(faults)
    hitRatio.push(hits / (i + 1))
    missRatio.push(faults / (i + 1))
  }

  return {
    pageFaults,
    hitRatio,
    missRatio,
    states,
    totalFaults: faults,
    totalHits: hits,
  }
}

function simulateOptimal(refs: number[], frames: number): SimulationResult {
  const memory = new Array(frames).fill(null)
  const pageFaults: number[] = []
  const hitRatio: number[] = []
  const missRatio: number[] = []
  const states: SimulationState[] = []
  let faults = 0
  let hits = 0

  for (let i = 0; i < refs.length; i++) {
    const page = refs[i]
    let fault = false
    let explanation = ""

    if (!memory.includes(page)) {
      // Page fault
      if (memory.includes(null)) {
        // Empty frame available
        const emptyIndex = memory.indexOf(null)
        memory[emptyIndex] = page
        explanation = `Page ${page} loaded into empty frame ${emptyIndex}.`
      } else {
        // Find optimal page to replace
        let farthest = -1
        let replaceIndex = 0
        let replacedPage = memory[0]

        for (let j = 0; j < frames; j++) {
          const nextUse = refs.indexOf(memory[j], i + 1)
          if (nextUse === -1) {
            // Page never used again
            replaceIndex = j
            replacedPage = memory[j]
            explanation = `Page ${page} replaces page ${replacedPage} in frame ${j} (never used again).`
            break
          }
          if (nextUse > farthest) {
            farthest = nextUse
            replaceIndex = j
            replacedPage = memory[j]
          }
        }

        if (farthest !== -1 && explanation === "") {
          explanation = `Page ${page} replaces page ${replacedPage} in frame ${replaceIndex} (used farthest in future at step ${farthest + 1}).`
        }

        memory[replaceIndex] = page
      }
      faults++
      fault = true
    } else {
      // Page hit
      hits++
      const frameIndex = memory.indexOf(page)
      explanation = `Page ${page} found in frame ${frameIndex} (Page Hit).`
    }

    states.push({
      step: i + 1,
      page,
      memory: [...memory],
      fault,
      explanation,
      algorithm: "Optimal",
    })

    pageFaults.push(faults)
    hitRatio.push(hits / (i + 1))
    missRatio.push(faults / (i + 1))
  }

  return {
    pageFaults,
    hitRatio,
    missRatio,
    states,
    totalFaults: faults,
    totalHits: hits,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SimulationRequest = await request.json()
    const { refs, frames, algorithm } = body

    // Enhanced validation
    if (!refs || !Array.isArray(refs) || refs.length === 0) {
      return NextResponse.json(
        { error: "Reference string must be a non-empty array", code: "INVALID_REFS" },
        { status: 400 },
      )
    }

    if (!frames || typeof frames !== "number" || frames <= 0 || frames > 10) {
      return NextResponse.json(
        { error: "Number of frames must be between 1 and 10", code: "INVALID_FRAMES" },
        { status: 400 },
      )
    }

    if (!algorithm || !["FIFO", "LRU", "Optimal"].includes(algorithm)) {
      return NextResponse.json(
        { error: "Algorithm must be one of: FIFO, LRU, Optimal", code: "INVALID_ALGORITHM" },
        { status: 400 },
      )
    }

    // Validate reference string contains only positive integers
    if (!refs.every((ref) => Number.isInteger(ref) && ref > 0)) {
      return NextResponse.json(
        { error: "Reference string must contain only positive integers", code: "INVALID_REF_VALUES" },
        { status: 400 },
      )
    }

    let result: SimulationResult

    switch (algorithm) {
      case "FIFO":
        result = simulateFIFO(refs, frames)
        break
      case "LRU":
        result = simulateLRU(refs, frames)
        break
      case "Optimal":
        result = simulateOptimal(refs, frames)
        break
      default:
        return NextResponse.json({ error: "Algorithm not supported", code: "UNSUPPORTED_ALGORITHM" }, { status: 400 })
    }

    // Add metadata to response
    const response = {
      ...result,
      metadata: {
        algorithm,
        totalReferences: refs.length,
        frameCount: frames,
        efficiency: ((result.totalHits / refs.length) * 100).toFixed(2) + "%",
        timestamp: new Date().toISOString(),
      },
    }

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("Simulation error:", error)

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON in request body", code: "INVALID_JSON" }, { status: 400 })
    }

    return NextResponse.json(
      { error: "An internal error occurred during simulation", code: "INTERNAL_ERROR" },
      { status: 500 },
    )
  }
}

// Add OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
