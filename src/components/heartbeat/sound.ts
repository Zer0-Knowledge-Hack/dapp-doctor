/**
 * The monitor's voice, synthesised with Web Audio: no audio files to load.
 *
 * A browser only lets a page make sound after the person has clicked, so the
 * context is created on the Listen button, never on page load.
 */
export interface MonitorSound {
  beep(frequency: number): void;
  setFlatline(on: boolean): void;
  charge(): void;
  zap(): void;
  setMuted(muted: boolean): void;
  close(): void;
}

export function createMonitorSound(): MonitorSound | null {
  const AudioContextClass =
    typeof window === 'undefined'
      ? undefined
      : window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  const context = new AudioContextClass();
  const master = context.createGain();
  master.gain.value = 1;
  master.connect(context.destination);

  let flatline: { oscillator: OscillatorNode; gain: GainNode } | null = null;

  function tone(frequency: number, duration: number, volume: number, type: OscillatorType = 'sine') {
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    // A short attack and a quick decay: a click-free hospital beep.
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  return {
    beep(frequency) {
      tone(frequency, 0.14, 0.22);
    },

    setFlatline(on) {
      if (on && !flatline) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, context.currentTime + 0.05);
        oscillator.connect(gain).connect(master);
        oscillator.start();
        flatline = { oscillator, gain };
      } else if (!on && flatline) {
        const { oscillator, gain } = flatline;
        gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.05);
        oscillator.stop(context.currentTime + 0.08);
        flatline = null;
      }
    },

    // The rising whine of a defibrillator charging.
    charge() {
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.setValueAtTime(420, now);
      oscillator.frequency.exponentialRampToValueAtTime(2400, now + 0.75);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.1);
      gain.gain.setValueAtTime(0.08, now + 0.7);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      oscillator.connect(gain).connect(master);
      oscillator.start(now);
      oscillator.stop(now + 0.82);
    },

    // The discharge: a burst of filtered noise with a low thump under it.
    zap() {
      const now = context.currentTime;
      const length = Math.floor(context.sampleRate * 0.3);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const noise = context.createBufferSource();
      noise.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      noise.connect(filter).connect(gain).connect(master);
      noise.start(now);
      tone(70, 0.25, 0.5, 'triangle');
    },

    setMuted(muted) {
      master.gain.setValueAtTime(muted ? 0 : 1, context.currentTime);
    },

    close() {
      flatline = null;
      void context.close();
    },
  };
}
