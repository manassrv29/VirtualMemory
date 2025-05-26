# Memory Management Algorithm Visualizer

A comprehensive Next.js application that simulates and visualizes page replacement algorithms (FIFO, LRU, and Optimal) with interactive step-by-step analysis.

## Features

- **Three Page Replacement Algorithms**: FIFO, LRU, and Optimal
- **Two Simulation Modes**: Results Summary and Step-by-Step Visualization
- **Interactive UI**: Professional design with smooth animations
- **Real-time Visualization**: Frame-by-frame memory state visualization
- **Export Options**: CSV, PDF, and PNG export capabilities
- **Performance Analysis**: Comparative charts and metrics
- **Responsive Design**: Works on all devices

## Tech Stack

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom animations
- **Charts**: Chart.js with React Chart.js 2
- **UI Components**: Radix UI primitives
- **Export**: jsPDF and html2canvas
- **Deployment**: Vercel-optimized

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd memory-management-app
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

This application is optimized for Vercel deployment:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy automatically

### Environment Variables

No environment variables are required for basic functionality.

## API Endpoints

- `POST /api/simulate` - Run page replacement algorithm simulation
- `GET /api/health` - Health check endpoint

## Usage

1. **Configure Simulation**:
   - Enter a reference string (comma-separated page numbers)
   - Set the number of memory frames (1-10)
   - Select algorithms to compare
   - Choose simulation mode

2. **Run Simulation**:
   - Click "Run Simulation" to start
   - View results in summary or step-by-step mode

3. **Analyze Results**:
   - Compare algorithm performance
   - Export results in various formats
   - Step through the simulation manually

## Algorithm Details

### FIFO (First-In-First-Out)
- Replaces the oldest page in memory
- Simple implementation with a circular queue
- May suffer from Belady's anomaly

### LRU (Least Recently Used)
- Replaces the page that hasn't been used for the longest time
- Tracks usage timestamps for each page
- Generally performs better than FIFO

### Optimal (Belady's Algorithm)
- Replaces the page that will be used farthest in the future
- Theoretical optimal performance
- Used as a benchmark for other algorithms

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
\`\`\`

The application is now fully converted from Express.js to Next.js API routes and optimized for Vercel deployment. Key changes include:

1. **Removed Express.js dependency** - All backend logic is now in Next.js API routes
2. **Added proper error handling** - Enhanced error responses with error codes
3. **Vercel optimization** - Added vercel.json configuration for optimal deployment
4. **Health check endpoint** - Added for monitoring and debugging
5. **CORS handling** - Proper CORS headers for API routes
6. **Enhanced validation** - Better input validation and error messages
7. **Response metadata** - Added useful metadata to API responses

The application will now work perfectly on Vercel with full functionality including the backend simulation algorithms, interactive UI, and export capabilities.
