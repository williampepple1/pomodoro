const SessionMode = {
  FOCUS: "focus",
  SHORT_BREAK: "shortBreak",
  LONG_BREAK: "longBreak",
};

const state = {
  durationsMinutes: {
    [SessionMode.FOCUS]: 25,
    [SessionMode.SHORT_BREAK]: 5,
    [SessionMode.LONG_BREAK]: 15,
  },
  cyclesBeforeLongBreak: 4,
  currentMode: SessionMode.FOCUS,
  focusSessionsCompleted: 0,
  isRunning: false,
  remainingSeconds: 25 * 60,
  intervalId: null,
};

const el = {
  sessionLabel: document.getElementById("sessionLabel"),
  timerDisplay: document.getElementById("timerDisplay"),
  cycleText: document.getElementById("cycleText"),
  statusMessage: document.getElementById("statusMessage"),
  startPauseBtn: document.getElementById("startPauseBtn"),
  resetBtn: document.getElementById("resetBtn"),
  skipBtn: document.getElementById("skipBtn"),
  settingsForm: document.getElementById("settingsForm"),
  focusMinutes: document.getElementById("focusMinutes"),
  shortBreakMinutes: document.getElementById("shortBreakMinutes"),
  longBreakMinutes: document.getElementById("longBreakMinutes"),
  cyclesBeforeLongBreak: document.getElementById("cyclesBeforeLongBreak"),
  focusModeBtn: document.getElementById("focusModeBtn"),
  shortBreakModeBtn: document.getElementById("shortBreakModeBtn"),
  longBreakModeBtn: document.getElementById("longBreakModeBtn"),
};

function getStorageKey() {
  return "pomodoroSettingsV1";
}

function saveSettings() {
  const payload = {
    durationsMinutes: state.durationsMinutes,
    cyclesBeforeLongBreak: state.cyclesBeforeLongBreak,
  };
  localStorage.setItem(getStorageKey(), JSON.stringify(payload));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;

    const focus = Number(parsed.durationsMinutes?.[SessionMode.FOCUS]);
    const shortBreak = Number(parsed.durationsMinutes?.[SessionMode.SHORT_BREAK]);
    const longBreak = Number(parsed.durationsMinutes?.[SessionMode.LONG_BREAK]);
    const cycles = Number(parsed.cyclesBeforeLongBreak);

    if (Number.isInteger(focus) && focus > 0) state.durationsMinutes[SessionMode.FOCUS] = focus;
    if (Number.isInteger(shortBreak) && shortBreak > 0) {
      state.durationsMinutes[SessionMode.SHORT_BREAK] = shortBreak;
    }
    if (Number.isInteger(longBreak) && longBreak > 0) {
      state.durationsMinutes[SessionMode.LONG_BREAK] = longBreak;
    }
    if (Number.isInteger(cycles) && cycles >= 2) state.cyclesBeforeLongBreak = cycles;
  } catch {
    setStatus("Could not load saved settings.", true);
  }
}

function minutesToSeconds(minutes) {
  return minutes * 60;
}

function getModeLabel(mode) {
  if (mode === SessionMode.FOCUS) return "Focus Session";
  if (mode === SessionMode.SHORT_BREAK) return "Short Break";
  return "Long Break";
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function setMode(mode, shouldResetTimer = true) {
  state.currentMode = mode;
  if (shouldResetTimer) {
    state.remainingSeconds = minutesToSeconds(state.durationsMinutes[mode]);
  }
  render();
}

function setStatus(message, isError = false) {
  el.statusMessage.textContent = message;
  el.statusMessage.classList.toggle("error", isError);
}

function stopInterval() {
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
}

function startTimer() {
  if (state.isRunning) return;
  state.isRunning = true;
  el.startPauseBtn.textContent = "Pause";
  setStatus("Timer running.");

  state.intervalId = setInterval(() => {
    state.remainingSeconds -= 1;

    if (state.remainingSeconds <= 0) {
      state.remainingSeconds = 0;
      render();
      completeCurrentSession();
      return;
    }

    render();
  }, 1000);
}

function pauseTimer() {
  state.isRunning = false;
  stopInterval();
  el.startPauseBtn.textContent = "Start";
  setStatus("Timer paused.");
}

function resetCurrentModeTimer() {
  stopInterval();
  state.isRunning = false;
  state.remainingSeconds = minutesToSeconds(state.durationsMinutes[state.currentMode]);
  el.startPauseBtn.textContent = "Start";
  setStatus("Timer reset.");
  render();
}

function nextAutomaticMode() {
  if (state.currentMode === SessionMode.FOCUS) {
    state.focusSessionsCompleted += 1;
    const completedCycle = state.focusSessionsCompleted % state.cyclesBeforeLongBreak === 0;
    return completedCycle ? SessionMode.LONG_BREAK : SessionMode.SHORT_BREAK;
  }
  return SessionMode.FOCUS;
}

function completeCurrentSession() {
  stopInterval();
  state.isRunning = false;
  el.startPauseBtn.textContent = "Start";

  const upcomingMode = nextAutomaticMode();
  setMode(upcomingMode);
  setStatus(`Session complete. Switched to ${getModeLabel(upcomingMode)}.`);

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Pomodoro", {
      body: `Time for ${getModeLabel(upcomingMode).toLowerCase()}.`,
    });
  }
}

function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {
      // Ignore browser-level permission errors.
    });
  }
}

function handleSettingsSubmit(event) {
  event.preventDefault();

  const focus = Number(el.focusMinutes.value);
  const shortBreak = Number(el.shortBreakMinutes.value);
  const longBreak = Number(el.longBreakMinutes.value);
  const cycles = Number(el.cyclesBeforeLongBreak.value);

  const valid =
    Number.isInteger(focus) &&
    Number.isInteger(shortBreak) &&
    Number.isInteger(longBreak) &&
    Number.isInteger(cycles) &&
    focus > 0 &&
    shortBreak > 0 &&
    longBreak > 0 &&
    cycles >= 2;

  if (!valid) {
    setStatus("Please enter valid positive numbers (cycles must be at least 2).", true);
    return;
  }

  state.durationsMinutes[SessionMode.FOCUS] = focus;
  state.durationsMinutes[SessionMode.SHORT_BREAK] = shortBreak;
  state.durationsMinutes[SessionMode.LONG_BREAK] = longBreak;
  state.cyclesBeforeLongBreak = cycles;
  saveSettings();
  resetCurrentModeTimer();
  setStatus("Settings saved.");
}

function handleSkip() {
  stopInterval();
  state.isRunning = false;
  el.startPauseBtn.textContent = "Start";
  const upcomingMode = nextAutomaticMode();
  setMode(upcomingMode);
  setStatus(`Skipped. Switched to ${getModeLabel(upcomingMode)}.`);
}

function updateActiveModeButtons() {
  const activeByMode = {
    [SessionMode.FOCUS]: el.focusModeBtn,
    [SessionMode.SHORT_BREAK]: el.shortBreakModeBtn,
    [SessionMode.LONG_BREAK]: el.longBreakModeBtn,
  };
  Object.values(activeByMode).forEach((button) => button.classList.remove("active"));
  activeByMode[state.currentMode].classList.add("active");
}

function render() {
  el.sessionLabel.textContent = getModeLabel(state.currentMode);
  el.timerDisplay.textContent = formatTime(state.remainingSeconds);
  const cycleProgress = (state.focusSessionsCompleted % state.cyclesBeforeLongBreak) + 1;
  el.cycleText.textContent = `Cycle ${cycleProgress} of ${state.cyclesBeforeLongBreak}`;
  updateActiveModeButtons();
}

function syncSettingsInputs() {
  el.focusMinutes.value = state.durationsMinutes[SessionMode.FOCUS];
  el.shortBreakMinutes.value = state.durationsMinutes[SessionMode.SHORT_BREAK];
  el.longBreakMinutes.value = state.durationsMinutes[SessionMode.LONG_BREAK];
  el.cyclesBeforeLongBreak.value = state.cyclesBeforeLongBreak;
}

function bindEvents() {
  el.startPauseBtn.addEventListener("click", () => {
    if (state.isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  });

  el.resetBtn.addEventListener("click", () => {
    resetCurrentModeTimer();
  });

  el.skipBtn.addEventListener("click", () => {
    handleSkip();
  });

  el.settingsForm.addEventListener("submit", handleSettingsSubmit);

  el.focusModeBtn.addEventListener("click", () => {
    setMode(SessionMode.FOCUS);
    setStatus("Switched to Focus Session.");
  });
  el.shortBreakModeBtn.addEventListener("click", () => {
    setMode(SessionMode.SHORT_BREAK);
    setStatus("Switched to Short Break.");
  });
  el.longBreakModeBtn.addEventListener("click", () => {
    setMode(SessionMode.LONG_BREAK);
    setStatus("Switched to Long Break.");
  });
}

function init() {
  loadSettings();
  syncSettingsInputs();
  state.remainingSeconds = minutesToSeconds(state.durationsMinutes[state.currentMode]);
  bindEvents();
  render();
  requestNotificationPermission();
}

init();
