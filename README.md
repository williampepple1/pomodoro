# Pomodoro App

A lightweight Pomodoro timer built with plain HTML, CSS, and JavaScript.

## Features

- Focus, short break, and long break modes
- Start / pause / reset / skip controls
- Automatic session progression:
  - Focus -> Short Break
  - Every N focus sessions -> Long Break
- Custom timer settings (saved in browser localStorage)
- Optional browser notifications when sessions end

## Run Locally

No build setup is required.

1. Open `index.html` directly in your browser, or
2. Serve the folder with any static server.

Example with Python:

```bash
python -m http.server 8000
```

Then open: `http://localhost:8000`

## Project Structure

- `index.html`: app layout and controls
- `styles.css`: styling and responsive layout
- `script.js`: timer logic, mode switching, and settings persistence
