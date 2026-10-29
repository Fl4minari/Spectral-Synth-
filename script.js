const voiceDefaults = {
  1: { volume: 70, attack: 20, release: 50, distortion: 25, reverb: 30, wave: "sawtooth" },
  2: { volume: 70, attack: 20, release: 50, distortion: 25, reverb: 30, wave: "sawtooth" }
};

const melodies = {
  1: ["C4", null, "G4", "Eb4", null, "Bb3", "D4", null, "C4", "G3", null, "Eb4", "Bb3", null, "D4", "G4"],
  2: [null, "G3", "Bb3", null, "D4", "F4", null, "Eb4", "G3", null, "C4", "D4", null, "Bb3", "F3", null]
};

const voices = {};
let audioReady = false;
let tempo = 92;

function byId(id) { return document.getElementById(id); }
function setStatus(id, text, mode = "") {
  const el = byId(`state-${id}`);
  el.textContent = `● ${text}`;
  el.classList.toggle("playing", mode === "playing");
  el.classList.toggle("muted", mode === "muted");
}
function updateAudioStatus(active) {
  // These status decorations are optional; never let a missing label block audio playback.
  const status = byId("audio-status");
  const indicator = byId("audio-indicator");
  if (status) status.textContent = active ? "AUDIO ACTIVE" : "AUDIO STANDBY";
  if (indicator) indicator.classList.toggle("active", active);
}
function makeVoice(id) {
  const distortion = new Tone.Distortion({ distortion: 0.25, wet: 1 });
  const reverb = new Tone.Reverb({ decay: 2.4, wet: 0.3 });
  const gain = new Tone.Gain(0.7);
  const panner = new Tone.Panner(id === 1 ? -1 : 1);
  const synth = new Tone.Synth({
    oscillator: { type: "sawtooth" },
    envelope: { attack: 0.2, decay: 0.08, sustain: 0.55, release: 0.5 }
  });
  synth.connect(distortion);
  distortion.connect(reverb);
  reverb.connect(gain);
  gain.connect(panner);
  panner.toDestination();
  const sequence = new Tone.Sequence((time, note) => {
    if (note && !voices[id].muted) {
      synth.triggerAttackRelease(note, "8n", time, 0.8);
    }
  }, melodies[id], "8n");
  sequence.loop = true;
  sequence.playbackRate = 1;
  voices[id] = { synth, distortion, reverb, gain, panner, sequence, muted: false, playing: false, settings: { ...voiceDefaults[id] } };
  applySettings(id);
}

function applySettings(id) {
  const v = voices[id];
  if (!v) return;
  const s = v.settings;
  v.gain.gain.rampTo(s.volume / 100, 0.04);
  v.synth.set({
    oscillator: { type: s.wave },
    envelope: {
      attack: Math.max(0.005, s.attack / 100 * 1.5),
      decay: 0.08,
      sustain: 0.55,
      release: Math.max(0.03, s.release / 100 * 2.5)
    }
  });
  v.distortion.distortion = s.distortion / 100;
  v.reverb.wet.rampTo(s.reverb / 100, 0.05);
  byId(`volume-out-${id}`).textContent = `${s.volume}%`;
  byId(`attack-out-${id}`).textContent = `${s.attack}%`;
  byId(`release-out-${id}`).textContent = `${s.release}%`;
  byId(`distortion-out-${id}`).textContent = `${s.distortion}%`;
  byId(`reverb-out-${id}`).textContent = `${s.reverb}%`;
  const dAngle = -135 + s.distortion * 2.7;
  const rAngle = -135 + s.reverb * 2.7;
  byId(`distortion-${id}`).style.setProperty("--rotation", `${dAngle}deg`);
  byId(`reverb-${id}`).style.setProperty("--rotation", `${rAngle}deg`);
}

async function ensureAudio() {
  if (!audioReady) {
    await Tone.start();
    await Promise.all([voices[1].reverb.ready, voices[2].reverb.ready]);
    audioReady = true;
  } else {
    await Tone.start();
  }
  updateAudioStatus(true);
}

async function startVoice(id) {
  await ensureAudio();
  const v = voices[id];

  if (!v.playing) {
    // Re-schedule the sequence from its first note every time Start is pressed.
    // Keep the shared Transport alive so stopping one/both voices cannot leave it
    // in a stale stopped state that prevents the next start.
    v.sequence.stop();
    v.sequence.cancel(0);
    v.sequence.start(Tone.Transport.seconds, 0);
    v.playing = true;
  }

  v.muted = false;
  v.gain.gain.rampTo(v.settings.volume / 100, 0.04);
  const panel = document.querySelector(`[data-voice="${id}"]`);
  panel.querySelector(".mute").classList.remove("is-muted");
  panel.querySelector(".start").classList.add("is-playing");
  panel.querySelector(".stop").classList.remove("is-stopped");
  setStatus(id, "PLAYING", "playing");
  if (Tone.Transport.state !== "started") Tone.Transport.start();
}

function stopVoice(id) {
  const v = voices[id];
  if (!v) return;
  v.sequence.stop();
  v.synth.triggerRelease();
  v.playing = false;
  const panel = document.querySelector(`[data-voice="${id}"]`);
  panel.querySelector(".start").classList.remove("is-playing");
  panel.querySelector(".stop").classList.add("is-stopped");
  setStatus(id, "STOPPED");

  // Do not stop the global Transport. Sequences can be restarted reliably from
  // the current transport position, including after STOP BOTH.
  updateAudioStatus(voices[1].playing || voices[2].playing);
}

function toggleMute(id) {
  const v = voices[id];
  v.muted = !v.muted;
  v.gain.gain.rampTo(v.muted ? 0 : v.settings.volume / 100, 0.03);
  document.querySelector(`[data-voice="${id}"] .mute`).classList.toggle("is-muted", v.muted);
  setStatus(id, v.muted ? "MUTED" : (v.playing ? "PLAYING" : "READY"), v.muted ? "muted" : (v.playing ? "playing" : ""));
}
function resetVoice(id) {
  voices[id].settings = { ...voiceDefaults[id] };
  ["volume", "attack", "release"].forEach(key => byId(`${key}-${id}`).value = voices[id].settings[key]);
  applySettings(id);
  document.querySelectorAll(`[data-voice="${id}"] .wave-shape`).forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.wave === "sawtooth");
  });
  voices[id].muted = false;
  voices[id].gain.gain.rampTo(voices[id].settings.volume / 100, 0.04);
  const panel = document.querySelector(`[data-voice="${id}"]`);
  panel.querySelector(".mute").classList.remove("is-muted");
  panel.querySelector(".stop").classList.remove("is-stopped");
  panel.querySelector(".start").classList.toggle("is-playing", voices[id].playing);
  setStatus(id, voices[id].playing ? "PLAYING" : "READY", voices[id].playing ? "playing" : "");
}
function resetAll() {
  resetVoice(1); resetVoice(2);
  byId("tempo").value = 92;
  tempo = 92; byId("tempo-value").textContent = tempo;
  Tone.Transport.bpm.rampTo(tempo, 0.05);
}

document.addEventListener("DOMContentLoaded", () => {
  makeVoice(1); makeVoice(2);
  Tone.Transport.bpm.value = tempo;

  [1, 2].forEach(id => {
    ["volume", "attack", "release"].forEach(key => {
      byId(`${key}-${id}`).addEventListener("input", e => {
        voices[id].settings[key] = Number(e.target.value);
        applySettings(id);
      });
    });
    document.querySelectorAll(`[data-voice="${id}"] .wave-shape`).forEach(btn => {
      btn.addEventListener("click", () => {
        voices[id].settings.wave = btn.dataset.wave;
        document.querySelectorAll(`[data-voice="${id}"] .wave-shape`).forEach(other => other.classList.toggle("selected", other === btn));
        applySettings(id);
      });
    });
    document.querySelectorAll(`[data-voice="${id}"] [data-action]`).forEach(btn => {
      btn.addEventListener("click", async () => {
        const action = btn.dataset.action;
        if (action === "start") await startVoice(id);
        if (action === "stop") stopVoice(id);
        if (action === "mute") toggleMute(id);
        if (action === "reset") resetVoice(id);
      });
    });
    ["distortion", "reverb"].forEach(key => {
      const knob = byId(`${key}-${id}`);
      let lastY = null;
      knob.addEventListener("pointerdown", e => {
        lastY = e.clientY;
        knob.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      knob.addEventListener("pointermove", e => {
        if (lastY === null) return;
        const delta = (lastY - e.clientY) * 0.65;
        lastY = e.clientY;
        voices[id].settings[key] = Math.max(0, Math.min(100, Math.round(voices[id].settings[key] + delta)));
        applySettings(id);
      });
      const endDrag = () => { lastY = null; };
      knob.addEventListener("pointerup", endDrag);
      knob.addEventListener("pointercancel", endDrag);
      knob.addEventListener("lostpointercapture", endDrag);
      knob.addEventListener("dblclick", () => { voices[id].settings[key] = key === "distortion" ? 25 : 30; applySettings(id); });
    });
  });

  byId("tempo").addEventListener("input", e => {
    tempo = Number(e.target.value);
    byId("tempo-value").textContent = tempo;
    Tone.Transport.bpm.rampTo(tempo, 0.05);
  });
  byId("global-start").addEventListener("click", async () => { await startVoice(1); await startVoice(2); });
  byId("global-stop").addEventListener("click", () => { stopVoice(1); stopVoice(2); });
  byId("reset-all").addEventListener("click", resetAll);
});
