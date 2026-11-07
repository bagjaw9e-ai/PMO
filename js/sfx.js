function makeNoise(ctx, seconds) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function envGain(ctx, gainNode, start, peak, attack, release) {
  const gain = gainNode.gain;
  gain.cancelScheduledValues(start);
  gain.setValueAtTime(0.0001, start);
  gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), start + attack);
  gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
}

export function createSfx(cues) {
  let ctx = null;
  let master = null;
  let noise = null;
  let buzzGain = null;
  let buzzFilter = null;
  let crackleGain = null;
  let prev = 0;
  let ready = false;

  function ensure() {
    if (ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    noise = makeNoise(ctx, 2);

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 58;
    const osc2 = ctx.createOscillator();
    osc2.type = "square";
    osc2.frequency.value = 116;
    const thin = ctx.createGain();
    thin.gain.value = 0.18;
    buzzFilter = ctx.createBiquadFilter();
    buzzFilter.type = "lowpass";
    buzzFilter.frequency.value = 240;
    buzzFilter.Q.value = 0.7;
    buzzGain = ctx.createGain();
    buzzGain.gain.value = 0;
    osc.connect(buzzFilter);
    osc2.connect(thin);
    thin.connect(buzzFilter);
    buzzFilter.connect(buzzGain);
    buzzGain.connect(master);
    osc.start();
    osc2.start();

    const crack = ctx.createBufferSource();
    crack.buffer = noise;
    crack.loop = true;
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 1600;
    crackleGain = ctx.createGain();
    crackleGain.gain.value = 0;
    crack.connect(highpass);
    highpass.connect(crackleGain);
    crackleGain.connect(master);
    crack.start();
  }

  function noiseBurst(start, duration, peak, fromFreq, toFreq, q) {
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = q;
    filter.frequency.setValueAtTime(Math.max(40, fromFreq), start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, toFreq), start + duration);
    const gain = ctx.createGain();
    envGain(ctx, gain, start, peak, Math.min(0.04, duration * 0.25), duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  function playCue(cue) {
    if (!ctx) return;
    const now = ctx.currentTime + 0.01;
    const gain = cue.gain ?? 0.2;
    if (cue.type === "whoosh") {
      noiseBurst(now, 0.38, gain, 240, 2200, 0.65);
      return;
    }
    if (cue.type === "impact") {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.2);
      envGain(ctx, g, now, gain, 0.012, 0.24);
      osc.connect(g);
      g.connect(master);
      osc.start(now);
      osc.stop(now + 0.28);
      noiseBurst(now, 0.12, gain * 0.45, 180, 70, 0.8);
      return;
    }
    if (cue.type === "glitch") {
      for (let i = 0; i < 5; i += 1) {
        noiseBurst(now + i * 0.038, 0.028, gain * (0.45 + (i % 2) * 0.35), 900 + i * 380, 2400, 3.2);
      }
      return;
    }
    if (cue.type === "crackle") {
      noiseBurst(now, 0.16, gain, 1400, 3200, 1.4);
      noiseBurst(now + 0.07, 0.09, gain * 0.6, 600, 1800, 1.1);
      return;
    }
    if (cue.type === "spark") {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.12);
      envGain(ctx, g, now, gain, 0.008, 0.12);
      osc.connect(g);
      g.connect(master);
      osc.start(now);
      osc.stop(now + 0.16);
    }
  }

  function thump(peak) {
    const now = ctx.currentTime;
    const hit = (freq, delay, amount) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(Math.max(28, freq * 0.5), now + delay + 0.14);
      envGain(ctx, g, now + delay, amount, 0.01, 0.15);
      osc.connect(g);
      g.connect(master);
      osc.start(now + delay);
      osc.stop(now + delay + 0.2);
    };
    hit(70, 0, peak);
    hit(48, 0.13, peak * 0.62);
  }

  return {
    unlock() {
      ensure();
      if (ctx.state === "suspended") ctx.resume();
      ready = true;
    },
    intro() {
      playCue({ type: "whoosh", gain: 0.24 });
      playCue({ type: "impact", gain: 0.3 });
    },
    reset(time) {
      prev = time;
    },
    update(time, playing, ambient) {
      if (!ready || !ctx) {
        prev = time;
        return;
      }
      const dt = time - prev;
      const live = playing && dt > 0 && dt < 0.35;
      if (live) {
        for (const cue of cues) {
          if (cue.t > prev && cue.t <= time) playCue(cue);
        }
        if (ambient.heartBpm > 0) {
          const b0 = (prev * ambient.heartBpm) / 60;
          const b1 = (time * ambient.heartBpm) / 60;
          if (Math.floor(b0) !== Math.floor(b1)) thump(ambient.heartGain || 0.1);
        }
        if (ambient.crackle > 0 && Math.random() < ambient.crackle * 7 * Math.min(dt, 0.05)) {
          const now = ctx.currentTime;
          const g = crackleGain.gain;
          g.cancelScheduledValues(now);
          g.setValueAtTime(0.0001, now);
          g.exponentialRampToValueAtTime(ambient.crackle * 0.85, now + 0.012);
          g.exponentialRampToValueAtTime(0.0001, now + 0.07);
        }
      } else if (crackleGain) {
        crackleGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03);
      }
      const buzzTarget = playing ? ambient.buzz || 0 : 0;
      buzzGain.gain.setTargetAtTime(Math.max(0.0001, buzzTarget), ctx.currentTime, 0.08);
      buzzFilter.frequency.setTargetAtTime(ambient.buzzCutoff || 240, ctx.currentTime, 0.12);
      prev = time;
    },
  };
}
