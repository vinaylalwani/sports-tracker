# Lakers Load Intelligence

A modern basketball analytics platform focused on modeling workload-based injury risk and minute optimization for the Los Angeles Lakers starting five.

## Features

- **Player Overview Panel**: Real-time risk scores and recommendations for all 5 starting players
- **Historical Risk Trends**: Visualize baseline and dynamic risk over the last 20 games
- **Video Analysis**: Upload and analyze game footage with movement metrics
- **Schedule Stress Analysis**: Track back-to-backs, road trips, and rest days
- **Minutes Optimization Simulator**: Interactive tool to predict risk based on playing time
- **Feature Importance**: Understand what factors contribute most to injury risk
- **Team Availability Summary**: Overall team health and playoff readiness metrics

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** components
- **Recharts** for data visualization
- **Radix UI** primitives
- **MediaPipe Pose** for pose estimation and movement analysis

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Design

- Dark theme with purple (#552583) and gold (#FDB927) accents
- Professional NBA front office analytics tool aesthetic
- Responsive design for all screen sizes
- Smooth animations and transitions

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main dashboard page
│   └── globals.css         # Global styles
├── components/
│   ├── dashboard/          # Dashboard components
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── mockData.ts         # Mock data for demo
│   ├── videoAnalysis.ts    # Video analysis engine with pose estimation
│   └── utils.ts            # Utility functions
└── public/                 # Static assets
```

## Video Analysis - How It Works

### Current Implementation

**Pose Estimation**: Uses **MediaPipe Pose** (Google's pre-trained computer vision model)
- ✅ Real ML model (not LLM inference)
- ✅ Detects 33 body landmarks in real-time
- ✅ Runs entirely in browser using WebAssembly
- ✅ Industry-standard pose estimation

**Movement Quality Assessment**: Rule-based algorithms (heuristics)
- ⚠️ NOT a trained ML model
- ⚠️ NOT an LLM inference
- ✅ Uses biomechanical principles and research-based thresholds
- ✅ Calculates metrics based on sports science literature

### What It Analyzes

- **Jump Count**: Detects vertical jumps via velocity spikes
- **Acceleration Bursts**: Identifies rapid movement changes
- **Movement Intensity**: Measures overall velocity and activity
- **Contact Proxy**: Estimates contact based on ground proximity
- **Landing Mechanics**: Analyzes knee angles (valgus detection)
- **Movement Asymmetry**: Compares left vs right side patterns
- **Fatigue Indicators**: Detects movement degradation over time
- **Overall Injury Risk**: Weighted combination of all factors

### Limitations & Future Improvements

Current system uses heuristic algorithms. For production use, consider:
1. Training ML model on actual injury data
2. Using player-specific baselines
3. Integrating professional biomechanics APIs
4. Adding temporal sequence analysis (LSTM/Transformer models)

## NBA API Integration

The app includes integration with **BALLDONTLIE NBA API** (free tier):
- Real NBA player data and statistics
- Game schedules and results
- Player performance metrics
- Team information

API endpoints:
- `/api/nba/players` - Get player data
- `/api/nba/stats` - Get player statistics
- `/api/nba/games` - Get game schedules

**Note**: ESPN doesn't provide a free public API. BALLDONTLIE is the recommended free alternative for NBA data.

## Demo Data

The application uses mock data for demonstration purposes. Player risk scores and analytics are simulated. Video analysis uses real pose estimation with heuristic-based movement assessment.

## License

MIT
