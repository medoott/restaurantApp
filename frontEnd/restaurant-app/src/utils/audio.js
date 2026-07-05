let sharedAudioCtx = null;

function getAudioContext() {
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

export function playNotificationSound(type = "chime", volume = 75) {
  try {
    const audioCtx = getAudioContext();
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime((volume / 100) * 0.1, audioCtx.currentTime);
    gainNode.connect(audioCtx.destination);

    if (type === "chime") {
      const osc1 = audioCtx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc1.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      osc1.connect(gainNode);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.4);
    } else if (type === "beep") {
      const osc = audioCtx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.connect(gainNode);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } else {
      // Bell
      const osc = audioCtx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.6);
      osc.connect(gainNode);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    }
  } catch (err) {
    console.warn("Failed to play notification sound", err);
  }
}
