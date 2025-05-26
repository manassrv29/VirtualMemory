/**
 * Page Replacement Algorithm Simulator
 * Author: Skand Mishra
 * Description: Simulates FIFO, LRU, and Optimal page replacement algorithms.
 */

/**
 * Calculates common statistics for every step
 */
const updateStats = (stats, hits, faults, index) => {
  stats.pageFaults.push(faults);
  stats.hitRatio.push(hits / (index + 1));
  stats.missRatio.push(faults / (index + 1));
};

/**
 * Simulates First-In-First-Out (FIFO) page replacement
 */
const simulateFIFO = (refs, frames) => {
  const memory = Array(frames).fill(null);
  const stats = { pageFaults: [], hitRatio: [], missRatio: [], states: [] };
  let pointer = 0, hits = 0, faults = 0;

  refs.forEach((page, i) => {
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
      currentState.explanation = `Page ${page} not found (Page Fault). Loaded into frame ${pointer}.`;
    } else {
      hits++;
      currentState.explanation = `Page ${page} found in memory (Page Hit).`;
    }

    stats.states.push(currentState);
    updateStats(stats, hits, faults, i);
  });

  return { ...stats, totalFaults: faults, totalHits: hits };
};

/**
 * Simulates Least Recently Used (LRU) page replacement
 */
const simulateLRU = (refs, frames) => {
  const memory = Array(frames).fill(null);
  const stats = { pageFaults: [], hitRatio: [], missRatio: [], states: [] };
  const lastUsed = new Map();
  let hits = 0, faults = 0;

  refs.forEach((page, i) => {
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
        currentState.explanation = `Page ${page} not found (Page Fault). Loaded into empty frame ${emptyIndex}.`;
      } else {
        let replaceIndex = 0;
        let lruTime = lastUsed.get(memory[0]);

        for (let j = 1; j < frames; j++) {
          const usage = lastUsed.get(memory[j]);
          if (usage < lruTime) {
            lruTime = usage;
            replaceIndex = j;
          }
        }

        const replacedPage = memory[replaceIndex];
        memory[replaceIndex] = page;
        currentState.explanation = `Page ${page} not found (Page Fault). Replaced LRU page ${replacedPage} in frame ${replaceIndex}.`;
      }

      faults++;
      currentState.fault = true;
    } else {
      hits++;
      currentState.explanation = `Page ${page} found in memory (Page Hit).`;
    }

    stats.states.push(currentState);
    updateStats(stats, hits, faults, i);
  });

  return { ...stats, totalFaults: faults, totalHits: hits };
};

/**
 * Simulates Optimal page replacement
 */
const simulateOptimal = (refs, frames) => {
  const memory = Array(frames).fill(null);
  const stats = { pageFaults: [], hitRatio: [], missRatio: [], states: [] };
  let hits = 0, faults = 0;

  refs.forEach((page, i) => {
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
        currentState.explanation = `Page ${page} not found (Page Fault). Loaded into empty frame ${emptyIndex}.`;
      } else {
        let replaceIndex = 0;
        let farthest = -1;

        for (let j = 0; j < frames; j++) {
          const nextUse = refs.indexOf(memory[j], i + 1);
          if (nextUse === -1) {
            replaceIndex = j;
            break;
          } else if (nextUse > farthest) {
            farthest = nextUse;
            replaceIndex = j;
          }
        }

        const replacedPage = memory[replaceIndex];
        memory[replaceIndex] = page;
        currentState.explanation = `Page ${page} not found (Page Fault). Replaced page ${replacedPage} in frame ${replaceIndex} (used farthest in future).`;
      }

      faults++;
      currentState.fault = true;
    } else {
      hits++;
      currentState.explanation = `Page ${page} found in memory (Page Hit).`;
    }

    stats.states.push(currentState);
    updateStats(stats, hits, faults, i);
  });

  return { ...stats, totalFaults: faults, totalHits: hits };
};

module.exports = {
  simulateFIFO,
  simulateLRU,
  simulateOptimal
};
