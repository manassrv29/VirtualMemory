// Page Replacement Algorithm Implementations

function simulateFIFO(refs, frames) {
  const memory = new Array(frames).fill(null);
  const pageFaults = [];
  const hitRatio = [];
  const missRatio = [];
  let faults = 0;
  let hits = 0;
  let pointer = 0;
  const states = [];

  for (let i = 0; i < refs.length; i++) {
    const page = refs[i];
    const currentState = {
      step: i + 1,
      page,
      memory: [...memory],
      fault: false,
      explanation: ''
    };

    if (!memory.includes(page)) {
      memory[pointer] = page;
      pointer = (pointer + 1) % frames;
      faults++;
      currentState.fault = true;
      currentState.explanation = `Page ${page} not found in memory (Page Fault). Loading into frame ${pointer}.`;
    } else {
      hits++;
      currentState.explanation = `Page ${page} found in memory (Page Hit).`;
    }

    states.push(currentState);
    pageFaults.push(faults);
    hitRatio.push(hits / (i + 1));
    missRatio.push(faults / (i + 1));
  }

  return {
    pageFaults,
    hitRatio,
    missRatio,
    states,
    totalFaults: faults,
    totalHits: hits
  };
}

function simulateLRU(refs, frames) {
  const memory = new Array(frames).fill(null);
  const pageFaults = [];
  const hitRatio = [];
  const missRatio = [];
  let faults = 0;
  let hits = 0;
  const lastUsed = new Map();
  const states = [];

  for (let i = 0; i < refs.length; i++) {
    const page = refs[i];
    const currentState = {
      step: i + 1,
      page,
      memory: [...memory],
      fault: false,
      explanation: ''
    };

    lastUsed.set(page, i);

    if (!memory.includes(page)) {
      if (memory.includes(null)) {
        const emptyIndex = memory.indexOf(null);
        memory[emptyIndex] = page;
        currentState.explanation = `Page ${page} not found in memory (Page Fault). Loading into empty frame ${emptyIndex}.`;
      } else {
        let lruPage = memory[0];
        let lruTime = lastUsed.get(lruPage);
        let replaceIndex = 0;

        for (let j = 1; j < frames; j++) {
          if (lastUsed.get(memory[j]) < lruTime) {
            lruPage = memory[j];
            lruTime = lastUsed.get(lruPage);
            replaceIndex = j;
          }
        }

        memory[replaceIndex] = page;
        currentState.explanation = `Page ${page} not found in memory (Page Fault). Replacing least recently used page ${lruPage} in frame ${replaceIndex}.`;
      }
      faults++;
      currentState.fault = true;
    } else {
      hits++;
      currentState.explanation = `Page ${page} found in memory (Page Hit).`;
    }

    states.push(currentState);
    pageFaults.push(faults);
    hitRatio.push(hits / (i + 1));
    missRatio.push(faults / (i + 1));
  }

  return {
    pageFaults,
    hitRatio,
    missRatio,
    states,
    totalFaults: faults,
    totalHits: hits
  };
}

function simulateOptimal(refs, frames) {
  const memory = new Array(frames).fill(null);
  const pageFaults = [];
  const hitRatio = [];
  const missRatio = [];
  let faults = 0;
  let hits = 0;
  const states = [];

  for (let i = 0; i < refs.length; i++) {
    const page = refs[i];
    const currentState = {
      step: i + 1,
      page,
      memory: [...memory],
      fault: false,
      explanation: ''
    };

    if (!memory.includes(page)) {
      if (memory.includes(null)) {
        const emptyIndex = memory.indexOf(null);
        memory[emptyIndex] = page;
        currentState.explanation = `Page ${page} not found in memory (Page Fault). Loading into empty frame ${emptyIndex}.`;
      } else {
        let farthest = -1;
        let replaceIndex = 0;

        for (let j = 0; j < frames; j++) {
          const nextUse = refs.indexOf(memory[j], i + 1);
          if (nextUse === -1) {
            replaceIndex = j;
            break;
          }
          if (nextUse > farthest) {
            farthest = nextUse;
            replaceIndex = j;
          }
        }

        const replacedPage = memory[replaceIndex];
        memory[replaceIndex] = page;
        currentState.explanation = `Page ${page} not found in memory (Page Fault). Replacing page ${replacedPage} in frame ${replaceIndex} as it won't be used for the longest time.`;
      }
      faults++;
      currentState.fault = true;
    } else {
      hits++;
      currentState.explanation = `Page ${page} found in memory (Page Hit).`;
    }

    states.push(currentState);
    pageFaults.push(faults);
    hitRatio.push(hits / (i + 1));
    missRatio.push(faults / (i + 1));
  }

  return {
    pageFaults,
    hitRatio,
    missRatio,
    states,
    totalFaults: faults,
    totalHits: hits
  };
}

module.exports = {
  simulateFIFO,
  simulateLRU,
  simulateOptimal
};
