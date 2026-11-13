/**
 * Pomodoro Timer - Enhanced Modern Edition
 * Features: Drift-free timing, SVG circular progress, task manager,
 * Web Audio chimes, dynamic browser tab/favicon, daily statistics, and settings persistence.
 */

const SessionMode = {
  FOCUS: "focus",
  SHORT_BREAK: "shortBreak",
  LONG_BREAK: "longBreak",
};

const MODE_CONFIG = {
  [SessionMode.FOCUS]: {
    label: "Focus Session",
    color: "#f43f5e",
    emoji: "🍅",
  },
  [SessionMode.SHORT_BREAK]: {
    label: "Short Break",
    color: "#10b981",
    emoji: "☕",
  },
  [SessionMode.LONG_BREAK]: {
    label: "Long Break",
    color: "#6366f1",
    emoji: "🌴",
  },
};

const STORAGE_KEYS = {
  SETTINGS: "pomodoroSettingsV2",
  OLD_SETTINGS: "pomodoroSettingsV1",
  TASKS: "pomodoroTasksV1",
  STATS: "pomodoroStatsV1",
};

// Application State
const state = {
  durationsMinutes: {
    [SessionMode.FOCUS]: 25,
    [SessionMode.SHORT_BREAK]: 5,
    [SessionMode.LONG_BREAK]: 15,
  },
  cyclesBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  soundEnabled: true,
  soundVolume: 0.7,

  currentMode: SessionMode.FOCUS,
  focusSessionsCompleted: 0,
  remainingSeconds: 25 * 60,
  isRunning: false,
  targetEndTime: null,
  intervalId: null,

  activeTaskId: null,
  tasks: [],

  stats: {
    todayDate: getTodayDateString(),
    todaySessions: 0,
    todayMinutes: 0,
    totalSessions: 0,
    totalMinutes: 0,
  },
};

// DOM Elements
const el = {
  body: document.body,
  favicon: document.getElementById("favicon"),
  sessionLabel: document.getElementById("sessionLabel"),
  timerDisplay: document.getElementById("timerDisplay"),
  cycleIndicator: document.getElementById("cycleIndicator"),
  cycleText: document.getElementById("cycleText"),
  statusMessage: document.getElementById("statusMessage"),
  progressRingCircle: document.getElementById("progressRingCircle"),

  startPauseBtn: document.getElementById("startPauseBtn"),
  startPauseIcon: document.getElementById("startPauseIcon"),
  startPauseText: document.getElementById("startPauseText"),
  resetBtn: document.getElementById("resetBtn"),
  skipBtn: document.getElementById("skipBtn"),

  focusModeBtn: document.getElementById("focusModeBtn"),
  shortBreakModeBtn: document.getElementById("shortBreakModeBtn"),
  longBreakModeBtn: document.getElementById("longBreakModeBtn"),

  soundToggleBtn: document.getElementById("soundToggleBtn"),
  soundIcon: document.getElementById("soundIcon"),
  statsToggleBtn: document.getElementById("statsToggleBtn"),
  settingsToggleBtn: document.getElementById("settingsToggleBtn"),

  activeTaskBanner: document.getElementById("activeTaskBanner"),
  activeTaskName: document.getElementById("activeTaskName"),
  clearActiveTaskBtn: document.getElementById("clearActiveTaskBtn"),

  taskForm: document.getElementById("taskForm"),
  taskInput: document.getElementById("taskInput"),
  taskEstPomodoros: document.getElementById("taskEstPomodoros"),
  taskList: document.getElementById("taskList"),
  emptyTasksText: document.getElementById("emptyTasksText"),
  taskCountBadge: document.getElementById("taskCountBadge"),
  clearCompletedTasksBtn: document.getElementById("clearCompletedTasksBtn"),

  statsModal: document.getElementById("statsModal"),
  closeStatsBtn: document.getElementById("closeStatsBtn"),
  doneStatsBtn: document.getElementById("doneStatsBtn"),
  resetStatsBtn: document.getElementById("resetStatsBtn"),
  statTodaySessions: document.getElementById("statTodaySessions"),
  statTodayMinutes: document.getElementById("statTodayMinutes"),
  statTotalSessions: document.getElementById("statTotalSessions"),
  statTotalMinutes: document.getElementById("statTotalMinutes"),

  settingsModal: document.getElementById("settingsModal"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  settingsForm: document.getElementById("settingsForm"),
  focusMinutes: document.getElementById("focusMinutes"),
  shortBreakMinutes: document.getElementById("shortBreakMinutes"),
  longBreakMinutes: document.getElementById("longBreakMinutes"),
  cyclesBeforeLongBreak: document.getElementById("cyclesBeforeLongBreak"),
  autoStartBreaks: document.getElementById("autoStartBreaks"),
  autoStartPomodoros: document.getElementById("autoStartPomodoros"),
  soundEnabled: document.getElementById("soundEnabled"),
  soundVolume: document.getElementById("soundVolume"),
  volumeValue: document.getElementById("volumeValue"),
  testSoundBtn: document.getElementById("testSoundBtn"),
  requestNotifBtn: document.getElementById("requestNotifBtn"),
  restoreDefaultsBtn: document.getElementById("restoreDefaultsBtn"),
};

// SVG Ring Constants
const RING_RADIUS = 135;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function initProgressRing() {
  if (el.progressRingCircle) {
    el.progressRingCircle.style.strokeDasharray = `${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`;
    el.progressRingCircle.style.strokeDashoffset = "0";
  }
}

function updateProgressRing() {
  if (!el.progressRingCircle) return;
  const totalSeconds = state.durationsMinutes[state.currentMode] * 60;
  const fractionRemaining = totalSeconds > 0 ? state.remainingSeconds / totalSeconds : 0;
  const offset = RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, fractionRemaining)));
  el.progressRingCircle.style.strokeDashoffset = offset;
}

// Helpers
function getTodayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatMinutes(mins) {
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function updateFavicon(color) {
  if (!el.favicon) return;
  const encodedColor = encodeURIComponent(color);
  el.favicon.href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='${encodedColor}'/></svg>`;
}

function updateDocumentTitle() {
  const timeFormatted = formatTime(state.remainingSeconds);
  const modeInfo = MODE_CONFIG[state.currentMode];
  if (state.isRunning) {
    document.title = `(${timeFormatted}) ${modeInfo.label} | Pomodoro`;
  } else if (state.remainingSeconds < state.durationsMinutes[state.currentMode] * 60) {
    document.title = `⏸ (${timeFormatted}) ${modeInfo.label} | Pomodoro`;
  } else {
    document.title = `Pomodoro Timer`;
  }
}

function setStatus(message, type = "normal") {
  el.statusMessage.textContent = message;
  el.statusMessage.className = "status";
  if (type === "error") el.statusMessage.classList.add("error");
  if (type === "running") el.statusMessage.classList.add("running");
  if (type === "success") el.statusMessage.classList.add("success");
}

// Audio Engine (Web Audio API)
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playChime(isCompletionOfFocus = true) {
  if (!state.soundEnabled || state.soundVolume <= 0) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const baseVol = Math.max(0.01, Math.min(1, state.soundVolume));
    // Focus complete: upbeat triad (C5, E5, G5, C6)
    // Break complete: relaxing chime (G5, E5, C5)
    const notes = isCompletionOfFocus
      ? [523.25, 659.25, 783.99, 1046.5]
      : [783.99, 659.25, 523.25];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const startTime = ctx.currentTime + idx * 0.16;
      const duration = 0.55;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3 * baseVol, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (err) {
    console.warn("Audio playback error:", err);
  }
}

// Storage & Persistence
function saveSettings() {
  const payload = {
    durationsMinutes: state.durationsMinutes,
    cyclesBeforeLongBreak: state.cyclesBeforeLongBreak,
    autoStartBreaks: state.autoStartBreaks,
    autoStartPomodoros: state.autoStartPomodoros,
    soundEnabled: state.soundEnabled,
    soundVolume: state.soundVolume,
  };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(payload));
}

function loadSettings() {
  try {
    let raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      // Check legacy settings key
      raw = localStorage.getItem(STORAGE_KEYS.OLD_SETTINGS);
    }
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

    if (typeof parsed.autoStartBreaks === "boolean") state.autoStartBreaks = parsed.autoStartBreaks;
    if (typeof parsed.autoStartPomodoros === "boolean") state.autoStartPomodoros = parsed.autoStartPomodoros;
    if (typeof parsed.soundEnabled === "boolean") state.soundEnabled = parsed.soundEnabled;
    if (typeof parsed.soundVolume === "number" && parsed.soundVolume >= 0 && parsed.soundVolume <= 1) {
      state.soundVolume = parsed.soundVolume;
    }
  } catch {
    setStatus("Could not load saved settings.", "error");
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(state.tasks));
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      state.tasks = parsed;
    }
  } catch {
    state.tasks = [];
  }
}

function saveStats() {
  localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(state.stats));
}

function loadStats() {
  try {
    const today = getTodayDateString();
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      state.stats.totalSessions = Number(parsed.totalSessions) || 0;
      state.stats.totalMinutes = Number(parsed.totalMinutes) || 0;

      if (parsed.todayDate === today) {
        state.stats.todayDate = today;
        state.stats.todaySessions = Number(parsed.todaySessions) || 0;
        state.stats.todayMinutes = Number(parsed.todayMinutes) || 0;
      } else {
        state.stats.todayDate = today;
        state.stats.todaySessions = 0;
        state.stats.todayMinutes = 0;
      }
    }
  } catch {
    // Keep initialized state
  }
}

function recordFocusSessionCompleted() {
  const today = getTodayDateString();
  if (state.stats.todayDate !== today) {
    state.stats.todayDate = today;
    state.stats.todaySessions = 0;
    state.stats.todayMinutes = 0;
  }

  const focusDuration = state.durationsMinutes[SessionMode.FOCUS];
  state.stats.todaySessions += 1;
  state.stats.todayMinutes += focusDuration;
  state.stats.totalSessions += 1;
  state.stats.totalMinutes += focusDuration;
  saveStats();
  renderStats();
}

// Timer Engine (Drift-Free timestamp-based)
function stopInterval() {
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
}

function tick() {
  if (!state.isRunning || !state.targetEndTime) return;

  const now = Date.now();
  const remaining = Math.max(0, Math.ceil((state.targetEndTime - now) / 1000));

  if (remaining !== state.remainingSeconds) {
    state.remainingSeconds = remaining;
    renderTimer();
  }

  if (remaining <= 0) {
    completeCurrentSession();
  }
}

function startTimer() {
  if (state.isRunning) return;
  getAudioContext();

  state.isRunning = true;
  state.targetEndTime = Date.now() + state.remainingSeconds * 1000;

  el.startPauseIcon.textContent = "⏸";
  el.startPauseText.textContent = "Pause";
  setStatus(`${MODE_CONFIG[state.currentMode].label} in progress...`, "running");

  stopInterval();
  state.intervalId = setInterval(tick, 250);
  renderTimer();
}

function pauseTimer() {
  if (!state.isRunning) return;

  if (state.targetEndTime) {
    state.remainingSeconds = Math.max(0, Math.ceil((state.targetEndTime - Date.now()) / 1000));
    state.targetEndTime = null;
  }

  state.isRunning = false;
  stopInterval();

  el.startPauseIcon.textContent = "▶";
  el.startPauseText.textContent = "Start";
  setStatus("Timer paused.");
  renderTimer();
}

function resetCurrentModeTimer() {
  stopInterval();
  state.isRunning = false;
  state.targetEndTime = null;
  state.remainingSeconds = state.durationsMinutes[state.currentMode] * 60;

  el.startPauseIcon.textContent = "▶";
  el.startPauseText.textContent = "Start";
  setStatus("Timer reset.");
  render();
}

function setMode(mode, shouldReset = true) {
  stopInterval();
  state.isRunning = false;
  state.targetEndTime = null;
  state.currentMode = mode;

  if (shouldReset) {
    state.remainingSeconds = state.durationsMinutes[mode] * 60;
  }

  el.body.setAttribute("data-mode", mode);
  updateFavicon(MODE_CONFIG[mode].color);
  el.startPauseIcon.textContent = "▶";
  el.startPauseText.textContent = "Start";
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
  state.targetEndTime = null;
  el.startPauseIcon.textContent = "▶";
  el.startPauseText.textContent = "Start";

  const finishedMode = state.currentMode;
  const isFocusFinished = finishedMode === SessionMode.FOCUS;

  // Sound chime
  playChime(isFocusFinished);

  // If focus completed, update statistics & active task
  if (isFocusFinished) {
    recordFocusSessionCompleted();
    if (state.activeTaskId) {
      incrementActiveTaskProgress();
    }
  }

  const upcomingMode = nextAutomaticMode();
  setMode(upcomingMode);

  const message = `🎉 ${MODE_CONFIG[finishedMode].label} complete! Up next: ${MODE_CONFIG[upcomingMode].label}.`;
  setStatus(message, "success");

  // Browser system notification
  sendBrowserNotification(
    `${MODE_CONFIG[upcomingMode].label} Time!`,
    `Great work! ${MODE_CONFIG[finishedMode].label} is finished.`
  );

  // Auto-start handling
  const shouldAutoStart =
    (upcomingMode === SessionMode.FOCUS && state.autoStartPomodoros) ||
    (upcomingMode !== SessionMode.FOCUS && state.autoStartBreaks);

  if (shouldAutoStart) {
    setTimeout(() => {
      startTimer();
    }, 1000);
  }
}

function handleSkip() {
  stopInterval();
  state.isRunning = false;
  state.targetEndTime = null;
  el.startPauseIcon.textContent = "▶";
  el.startPauseText.textContent = "Start";

  const upcomingMode = nextAutomaticMode();
  setMode(upcomingMode);
  setStatus(`Skipped to ${MODE_CONFIG[upcomingMode].label}.`);
}

function sendBrowserNotification(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%23f43f5e'/></svg>",
      });
    } catch {
      // Ignore background notification restrictions
    }
  }
}

function requestNotificationPermission() {
  if (!("Notification" in window)) {
    setStatus("Notifications are not supported in this browser.", "error");
    return;
  }
  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      setStatus("Notifications enabled! You'll be alerted when sessions finish.", "success");
      updateNotifButtonLabel();
    } else {
      setStatus("Notification permission was denied or dismissed.", "error");
    }
  });
}

function updateNotifButtonLabel() {
  if (!el.requestNotifBtn) return;
  if (!("Notification" in window)) {
    el.requestNotifBtn.textContent = "📢 Not Supported";
    el.requestNotifBtn.disabled = true;
  } else if (Notification.permission === "granted") {
    el.requestNotifBtn.textContent = "✓ Notifications Active";
  } else {
    el.requestNotifBtn.textContent = "📢 Enable Notifications";
  }
}

// Tasks Management
function renderTasks() {
  el.taskList.innerHTML = "";
  const total = state.tasks.length;
  el.taskCountBadge.textContent = total;
  el.emptyTasksText.classList.toggle("hidden", total > 0);

  state.tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = `task-item ${task.id === state.activeTaskId ? "is-active" : ""} ${task.isCompleted ? "is-completed" : ""}`;
    li.setAttribute("data-id", task.id);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = !!task.isCompleted;
    checkbox.setAttribute("aria-label", `Mark "${task.title}" as completed`);

    const content = document.createElement("div");
    content.className = "task-content";

    const titleSpan = document.createElement("span");
    titleSpan.className = "task-title";
    titleSpan.textContent = task.title;

    const pomoSpan = document.createElement("span");
    pomoSpan.className = "task-pomo-count";
    pomoSpan.textContent = `🍅 ${task.completedPomodoros}/${task.estPomodoros}`;

    content.appendChild(titleSpan);
    content.appendChild(pomoSpan);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "task-delete-btn";
    deleteBtn.innerHTML = "✕";
    deleteBtn.setAttribute("aria-label", `Delete "${task.title}"`);
    deleteBtn.title = "Delete task";

    // Event listeners
    checkbox.addEventListener("click", (e) => {
      e.stopPropagation();
      task.isCompleted = checkbox.checked;
      if (task.isCompleted && state.activeTaskId === task.id) {
        state.activeTaskId = null;
      }
      saveTasks();
      renderTasks();
      renderActiveTaskBanner();
    });

    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      state.tasks = state.tasks.filter((t) => t.id !== task.id);
      if (state.activeTaskId === task.id) {
        state.activeTaskId = null;
      }
      saveTasks();
      renderTasks();
      renderActiveTaskBanner();
    });

    li.addEventListener("click", () => {
      if (task.isCompleted) return;
      state.activeTaskId = state.activeTaskId === task.id ? null : task.id;
      renderTasks();
      renderActiveTaskBanner();
    });

    li.appendChild(checkbox);
    li.appendChild(content);
    li.appendChild(deleteBtn);
    el.taskList.appendChild(li);
  });
}

function handleAddTask(e) {
  e.preventDefault();
  const title = el.taskInput.value.trim();
  const est = parseInt(el.taskEstPomodoros.value, 10) || 1;

  if (!title) return;

  const newTask = {
    id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title,
    estPomodoros: Math.max(1, Math.min(12, est)),
    completedPomodoros: 0,
    isCompleted: false,
    createdAt: Date.now(),
  };

  state.tasks.push(newTask);
  if (!state.activeTaskId) {
    state.activeTaskId = newTask.id;
  }

  saveTasks();
  el.taskInput.value = "";
  el.taskEstPomodoros.value = "1";
  renderTasks();
  renderActiveTaskBanner();
  setStatus(`Added task: "${newTask.title}"`);
}

function incrementActiveTaskProgress() {
  if (!state.activeTaskId) return;
  const activeTask = state.tasks.find((t) => t.id === state.activeTaskId);
  if (activeTask && !activeTask.isCompleted) {
    activeTask.completedPomodoros += 1;
    saveTasks();
    renderTasks();
    if (activeTask.completedPomodoros >= activeTask.estPomodoros) {
      setStatus(`🎯 Goal reached for task "${activeTask.title}"!`, "success");
    }
  }
}

function renderActiveTaskBanner() {
  const activeTask = state.tasks.find((t) => t.id === state.activeTaskId);
  if (activeTask && !activeTask.isCompleted) {
    el.activeTaskName.textContent = activeTask.title;
    el.activeTaskBanner.classList.remove("hidden");
  } else {
    state.activeTaskId = null;
    el.activeTaskBanner.classList.add("hidden");
  }
}

function clearCompletedTasks() {
  state.tasks = state.tasks.filter((t) => !t.isCompleted);
  saveTasks();
  renderTasks();
  renderActiveTaskBanner();
  setStatus("Cleared completed tasks.");
}

// Statistics
function renderStats() {
  el.statTodaySessions.textContent = state.stats.todaySessions;
  el.statTodayMinutes.textContent = formatMinutes(state.stats.todayMinutes);
  el.statTotalSessions.textContent = state.stats.totalSessions;
  el.statTotalMinutes.textContent = formatMinutes(state.stats.totalMinutes);
}

function resetStats() {
  if (!confirm("Are you sure you want to reset all focus statistics?")) return;
  state.stats = {
    todayDate: getTodayDateString(),
    todaySessions: 0,
    todayMinutes: 0,
    totalSessions: 0,
    totalMinutes: 0,
  };
  saveStats();
  renderStats();
  setStatus("Statistics reset.");
}

// Rendering
function renderCycleIndicator() {
  el.cycleIndicator.innerHTML = "";
  const totalCycles = state.cyclesBeforeLongBreak;
  const currentCycleIdx = state.focusSessionsCompleted % totalCycles;

  for (let i = 0; i < totalCycles; i++) {
    const dot = document.createElement("span");
    dot.className = "cycle-dot";
    if (i < currentCycleIdx) {
      dot.classList.add("completed");
    } else if (i === currentCycleIdx) {
      dot.classList.add("active");
    }
    el.cycleIndicator.appendChild(dot);
  }

  el.cycleText.textContent = `Cycle ${currentCycleIdx + 1} of ${totalCycles}`;
}

function updateActiveModeButtons() {
  const modeMap = {
    [SessionMode.FOCUS]: el.focusModeBtn,
    [SessionMode.SHORT_BREAK]: el.shortBreakModeBtn,
    [SessionMode.LONG_BREAK]: el.longBreakModeBtn,
  };

  Object.values(modeMap).forEach((btn) => btn.classList.remove("active"));
  modeMap[state.currentMode]?.classList.add("active");
}

function renderTimer() {
  el.timerDisplay.textContent = formatTime(state.remainingSeconds);
  updateProgressRing();
  updateDocumentTitle();
}

function render() {
  el.sessionLabel.textContent = MODE_CONFIG[state.currentMode].label;
  renderTimer();
  renderCycleIndicator();
  updateActiveModeButtons();
  updateSoundButton();
}

function updateSoundButton() {
  if (state.soundEnabled) {
    el.soundIcon.textContent = "🔔";
    el.soundToggleBtn.title = "Sound is enabled (click to mute)";
  } else {
    el.soundIcon.textContent = "🔕";
    el.soundToggleBtn.title = "Sound is muted (click to unmute)";
  }
}

// Settings Handlers
function syncSettingsInputs() {
  el.focusMinutes.value = state.durationsMinutes[SessionMode.FOCUS];
  el.shortBreakMinutes.value = state.durationsMinutes[SessionMode.SHORT_BREAK];
  el.longBreakMinutes.value = state.durationsMinutes[SessionMode.LONG_BREAK];
  el.cyclesBeforeLongBreak.value = state.cyclesBeforeLongBreak;
  el.autoStartBreaks.checked = state.autoStartBreaks;
  el.autoStartPomodoros.checked = state.autoStartPomodoros;
  el.soundEnabled.checked = state.soundEnabled;
  el.soundVolume.value = Math.round(state.soundVolume * 100);
  el.volumeValue.textContent = `${Math.round(state.soundVolume * 100)}%`;
  updateNotifButtonLabel();
}

function handleSettingsSubmit(e) {
  e.preventDefault();

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
    setStatus("Please enter valid positive numbers (cycles at least 2).", "error");
    return;
  }

  state.durationsMinutes[SessionMode.FOCUS] = focus;
  state.durationsMinutes[SessionMode.SHORT_BREAK] = shortBreak;
  state.durationsMinutes[SessionMode.LONG_BREAK] = longBreak;
  state.cyclesBeforeLongBreak = cycles;
  state.autoStartBreaks = el.autoStartBreaks.checked;
  state.autoStartPomodoros = el.autoStartPomodoros.checked;
  state.soundEnabled = el.soundEnabled.checked;
  state.soundVolume = Number(el.soundVolume.value) / 100;

  saveSettings();
  closeModal(el.settingsModal);

  // If timer is not running, adjust remaining seconds
  if (!state.isRunning) {
    resetCurrentModeTimer();
  }
  render();
  setStatus("Settings saved successfully.", "success");
}

function restoreDefaultSettings() {
  if (!confirm("Reset all settings to default values?")) return;
  state.durationsMinutes[SessionMode.FOCUS] = 25;
  state.durationsMinutes[SessionMode.SHORT_BREAK] = 5;
  state.durationsMinutes[SessionMode.LONG_BREAK] = 15;
  state.cyclesBeforeLongBreak = 4;
  state.autoStartBreaks = false;
  state.autoStartPomodoros = false;
  state.soundEnabled = true;
  state.soundVolume = 0.7;

  saveSettings();
  syncSettingsInputs();
  if (!state.isRunning) {
    resetCurrentModeTimer();
  }
  render();
  setStatus("Default settings restored.");
}

// Modal Helpers
function openModal(modalEl) {
  modalEl.classList.remove("hidden");
}

function closeModal(modalEl) {
  modalEl.classList.add("hidden");
}

// Event Bindings
function bindEvents() {
  // Timer Controls
  el.startPauseBtn.addEventListener("click", () => {
    if (state.isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  });

  el.resetBtn.addEventListener("click", resetCurrentModeTimer);
  el.skipBtn.addEventListener("click", handleSkip);

  // Mode Selection
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

  // Sound Quick Toggle
  el.soundToggleBtn.addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    saveSettings();
    updateSoundButton();
    setStatus(state.soundEnabled ? "Sound unmuted." : "Sound muted.");
  });

  // Modals Open / Close
  el.statsToggleBtn.addEventListener("click", () => {
    renderStats();
    openModal(el.statsModal);
  });
  el.closeStatsBtn.addEventListener("click", () => closeModal(el.statsModal));
  el.doneStatsBtn.addEventListener("click", () => closeModal(el.statsModal));
  el.resetStatsBtn.addEventListener("click", resetStats);

  el.settingsToggleBtn.addEventListener("click", () => {
    syncSettingsInputs();
    openModal(el.settingsModal);
  });
  el.closeSettingsBtn.addEventListener("click", () => closeModal(el.settingsModal));
  el.settingsForm.addEventListener("submit", handleSettingsSubmit);
  el.restoreDefaultsBtn.addEventListener("click", restoreDefaultSettings);

  // Close modals on clicking overlay backdrop
  [el.statsModal, el.settingsModal].forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // Sound settings slider and test
  el.soundVolume.addEventListener("input", () => {
    el.volumeValue.textContent = `${el.soundVolume.value}%`;
    state.soundVolume = Number(el.soundVolume.value) / 100;
  });

  el.testSoundBtn.addEventListener("click", () => {
    getAudioContext();
    const oldEnabled = state.soundEnabled;
    state.soundEnabled = true;
    playChime(true);
    state.soundEnabled = oldEnabled;
  });

  el.requestNotifBtn.addEventListener("click", requestNotificationPermission);

  // Active Task Banner Clear
  el.clearActiveTaskBtn.addEventListener("click", () => {
    state.activeTaskId = null;
    renderTasks();
    renderActiveTaskBanner();
  });

  // Task Form & Clear
  el.taskForm.addEventListener("submit", handleAddTask);
  el.clearCompletedTasksBtn.addEventListener("click", clearCompletedTasks);

  // Tab Visibility Change (drift-free sync)
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.isRunning) {
      tick();
    }
  });

  // Keyboard Shortcuts
  window.addEventListener("keydown", (e) => {
    // Avoid triggering shortcuts while typing inside inputs, selects, textareas
    if (e.target.matches("input, textarea, select, [contenteditable]")) {
      return;
    }

    if (e.code === "Space") {
      e.preventDefault();
      if (state.isRunning) {
        pauseTimer();
      } else {
        startTimer();
      }
    } else if (e.key === "r" || e.key === "R") {
      resetCurrentModeTimer();
    } else if (e.key === "s" || e.key === "S") {
      handleSkip();
    } else if (e.key === "Escape") {
      closeModal(el.statsModal);
      closeModal(el.settingsModal);
    }
  });
}

// App Initialization
function init() {
  loadSettings();
  loadTasks();
  loadStats();
  initProgressRing();

  state.remainingSeconds = state.durationsMinutes[state.currentMode] * 60;
  el.body.setAttribute("data-mode", state.currentMode);
  updateFavicon(MODE_CONFIG[state.currentMode].color);

  syncSettingsInputs();
  bindEvents();
  render();
  renderTasks();
  renderActiveTaskBanner();
  renderStats();
}

init();
