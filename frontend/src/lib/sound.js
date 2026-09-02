// Web Audio API Sound Engine for ResidentOne

let audioCtx = null;
let intercomInterval = null;
let isIntercomPlaying = false;

// Audio Mute State with localStorage persistence
const MUTE_STORAGE_KEY = "residentone_audio_muted";
let isMutedState = typeof window !== "undefined" ? localStorage.getItem(MUTE_STORAGE_KEY) === "true" : false;

const soundListeners = new Set();

function notifyMuteChange() {
  soundListeners.forEach((listener) => listener(isMutedState));
}

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Unlock audio context on first user interaction
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener("click", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
  };
  window.addEventListener("click", unlockAudio, { passive: true });
  window.addEventListener("keydown", unlockAudio, { passive: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true });
}

/**
 * Synthesizes a single bell/tone note with gentle attack and decay
 */
function playTone(freq, startTime, duration, type = "sine", gainLevel = 0.3) {
  const ctx = getAudioContext();
  if (!ctx || isMutedState) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(gainLevel, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  } catch (err) {
    console.warn("Audio playback failed:", err);
  }
}

/**
 * Plays a single two-tone intercom doorbell chime
 */
function playDoorbellChime() {
  const ctx = getAudioContext();
  if (!ctx || isMutedState) return;

  const now = ctx.currentTime;
  // Tone 1: High E5 (659.25 Hz)
  playTone(659.25, now, 0.4, "sine", 0.4);
  playTone(1318.5, now, 0.3, "triangle", 0.1); // Harmonic

  // Tone 2: Warm C5 (523.25 Hz)
  playTone(523.25, now + 0.35, 0.6, "sine", 0.45);
  playTone(1046.5, now + 0.35, 0.4, "triangle", 0.1); // Harmonic
}

export const sound = {
  /**
   * Start looping the intercom ring tone (plays every 3 seconds)
   */
  playIntercomRing: () => {
    if (isIntercomPlaying) return;
    isIntercomPlaying = true;
    playDoorbellChime();

    if (intercomInterval) clearInterval(intercomInterval);
    intercomInterval = setInterval(() => {
      if (isIntercomPlaying) {
        playDoorbellChime();
      }
    }, 3200);
  },

  /**
   * Stop the looping intercom ring tone immediately
   */
  stopIntercomRing: () => {
    isIntercomPlaying = false;
    if (intercomInterval) {
      clearInterval(intercomInterval);
      intercomInterval = null;
    }
  },

  /**
   * Soft 2-tone notification chime for general alerts and notices
   */
  playNotification: () => {
    const ctx = getAudioContext();
    if (!ctx || isMutedState) return;

    const now = ctx.currentTime;
    playTone(587.33, now, 0.2, "sine", 0.3); // D5
    playTone(880, now + 0.15, 0.35, "sine", 0.35); // A5
  },

  /**
   * Upbeat 3-note harmonic chime for success actions (check-in, approval, payments)
   */
  playSuccess: () => {
    const ctx = getAudioContext();
    if (!ctx || isMutedState) return;

    const now = ctx.currentTime;
    playTone(523.25, now, 0.18, "sine", 0.3); // C5
    playTone(659.25, now + 0.12, 0.18, "sine", 0.35); // E5
    playTone(783.99, now + 0.24, 0.4, "sine", 0.4); // G5
  },

  /**
   * Alert tone for high-priority or urgent warnings
   */
  playAlert: () => {
    const ctx = getAudioContext();
    if (!ctx || isMutedState) return;

    const now = ctx.currentTime;
    playTone(880, now, 0.15, "sawtooth", 0.25);
    playTone(660, now + 0.18, 0.25, "sawtooth", 0.25);
  },

  /**
   * Mute / Unmute Controls
   */
  isMuted: () => isMutedState,

  setMuted: (muted) => {
    isMutedState = Boolean(muted);
    if (typeof window !== "undefined") {
      localStorage.setItem(MUTE_STORAGE_KEY, String(isMutedState));
    }
    if (isMutedState) {
      sound.stopIntercomRing();
    }
    notifyMuteChange();
  },

  toggleMute: () => {
    sound.setMuted(!isMutedState);
    return isMutedState;
  },

  subscribeMute: (callback) => {
    soundListeners.add(callback);
    return () => soundListeners.delete(callback);
  },

  /**
   * Desktop Push Notifications
   */
  requestDesktopPermission: async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        return await Notification.requestPermission();
      }
      return Notification.permission;
    }
    return "denied";
  },

  showDesktopNotification: (title, body = "", options = {}, onClick = null) => {
    if (typeof window === "undefined" || !("Notification" in window)) return null;
    if (Notification.permission !== "granted") return null;

    try {
      const notif = new Notification(title, {
        body,
        icon: "/logo192.png",
        badge: "/favicon.ico",
        vibrate: [200, 100, 200],
        ...options,
      });

      if (onClick) {
        notif.onclick = () => {
          window.focus();
          onClick();
          notif.close();
        };
      }
      return notif;
    } catch (err) {
      console.warn("Desktop notification failed:", err);
      return null;
    }
  },
};

export default sound;
