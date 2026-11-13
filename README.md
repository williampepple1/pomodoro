# Pomodoro App

A modern, distraction-free Pomodoro timer built with plain HTML, CSS, and JavaScript.

![Pomodoro Timer](https://raw.githubusercontent.com/williampepple1/pomodoro/main/screenshot.png) <!-- optional -->

## ✨ Features

- **Animated SVG Circular Progress Ring**: Smooth visual indication of remaining focus/break time with dynamic mode-colored glows.
- **Drift-Free Accurate Timing**: Timestamp-based countdown (`Date.now()`) ensuring 100% precision even when the browser tab is backgrounded or throttled.
- **Task Management & Session Tracking**:
  - Add tasks with estimated pomodoro counts (`🍅`).
  - Set an active focus task displayed prominently above the timer.
  - Automatically increments completed pomodoros when a focus session finishes.
  - Mark tasks complete or clear finished tasks.
- **Dynamic Browser Tab & Favicon**:
  - Live timer display in browser tab title (e.g. `(24:59) Focus | Pomodoro`).
  - Dynamic favicon color matching the active mode.
- **Synthesized Web Audio Chimes**:
  - Gentle polyphonic harmonic chimes on session completion (no external audio files required).
  - Quick mute/unmute button and volume controls with sound test preview.
- **Daily Focus Statistics**:
  - Tracks today's completed pomodoros and focus minutes.
  - Keeps all-time session totals and focus duration.
- **Keyboard Shortcuts**:
  - <kbd>Space</kbd>: Start / Pause
  - <kbd>R</kbd>: Reset current timer
  - <kbd>S</kbd>: Skip to next session
  - <kbd>Esc</kbd>: Close open modals
- **Customizable Settings**:
  - Adjustable Focus, Short Break, and Long Break durations.
  - Configurable cycles before Long Break.
  - Optional auto-start for breaks and pomodoros.
  - Browser notifications support.
  - All settings, tasks, and statistics are persisted automatically in `localStorage`.

## 🚀 Run Locally

No build setup or dependencies required!

1. Open `index.html` directly in any web browser, or
2. Serve the directory with any static file server:

```bash
# Using Python
python3 -m http.server 8000

# Or using Node (npx)
npx serve
```

Then visit: `http://localhost:8000`

## 📁 Project Structure

- `index.html`: Semantic app structure, SVG timer ring, task lists, and modals.
- `styles.css`: Glassmorphic dark theme, responsive grid/flexbox layout, mode color transitions, and animations.
- `script.js`: Drift-free timer logic, state management, audio synthesis, task manager, statistics, and persistence.
