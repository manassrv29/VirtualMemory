const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { simulateFIFO, simulateLRU, simulateOptimal } = require("./simulator");

const app = express();
const PORT = 5000;

// Configure CORS with more permissive settings
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Input validation middleware
const validateSimulationInput = (req, res, next) => {
  const { refs, frames, algorithm } = req.body;

  if (!refs || !Array.isArray(refs) || refs.length === 0) {
    return res.status(400).json({ error: "Reference string must be a non-empty array" });
  }

  if (!frames || typeof frames !== 'number' || frames <= 0) {
    return res.status(400).json({ error: "Number of frames must be a positive number" });
  }

  if (!algorithm || !['FIFO', 'LRU', 'Optimal'].includes(algorithm)) {
    return res.status(400).json({ error: "Algorithm must be one of: FIFO, LRU, Optimal" });
  }

  next();
};

// Simulation endpoint
app.post("/simulate", validateSimulationInput, (req, res) => {
  try {
    const { refs, frames, algorithm } = req.body;

    let result;
    switch (algorithm) {
      case "FIFO":
        result = simulateFIFO(refs, frames);
        break;
      case "LRU":
        result = simulateLRU(refs, frames);
        break;
      case "Optimal":
        result = simulateOptimal(refs, frames);
        break;
      default:
        return res.status(400).json({ error: "Algorithm not supported" });
    }

    res.json(result);
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ error: "An error occurred during simulation" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

app.listen(PORT, () => {
  console.log(`VMem+ backend running on http://localhost:${PORT}`);
});
