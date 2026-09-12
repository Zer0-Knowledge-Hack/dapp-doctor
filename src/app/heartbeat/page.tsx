'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/app/AppShell';
import { Field } from '@/components/app/Field';
import { Notice } from '@/components/app/Notice';
import { Monitor, type MonitorHandle } from '@/components/heartbeat/Monitor';
import { createMonitorSound, type MonitorSound } from '@/components/heartbeat/sound';
import { useEngineText, useLang } from '@/components/i18n/LanguageProvider';
import { Sheet } from '@/components/ui/Sheet';
import { Stamp } from '@/components/ui/Stamp';
import { describeChain } from '@/lib/diagnostics/networks';
import type { OverallStatus } from '@/lib/diagnostics/types';
import { isListenableUrl, readRpc } from '@/lib/heartbeat/listen';
import { LOCALE, type Lang } from '@/lib/i18n/lang';
import { CUSTOM_BLOCK_SECONDS, PATIENTS, type Patient } from '@/lib/heartbeat/patients';
import {
  amplitude,
  comaAfterSeconds,
  FLATLINE_AFTER_FAILURES,
  fullness,
  heartRate,
  parseBlock,
  pitch,
  pollIntervalMs,
  pulseState,
  type BlockSample,
  type Pulse,
} from '@/lib/heartbeat/vitals';

/** Block times for chains we recognise, so a pasted RPC gets the right pace. */
const BLOCK_SECONDS_BY_CHAIN: Record<number, number> = { 8453: 2, 84532: 2, 1: 12, 11155111: 12 };
const SHOCKS_BEFORE_TIME_OF_DEATH = 3;

/** What the monitor shows: the patient's pulse, or the monitor switched off. */
type Display = Pulse | 'off';

const STAMP_STATUS: Record<Display, OverallStatus> = {
  off: 'NOT_TESTED',
  waiting: 'NOT_TESTED',
  alive: 'READY',
  coma: 'AT_RISK',
  flatline: 'BLOCKED',
};

const COPY = {
  en: {
    title: 'RPC Heartbeat',
    intro: 'Put a stethoscope on a blockchain. Every beat is a new block: the spike is how many transactions it carried, the pitch is how full it was. When the RPC stops answering, you will hear it.',
    patient: 'Patient',
    stamp: {
      off: { label: 'OFF', spoken: 'The monitor is off.' },
      waiting: { label: 'NO SIGNAL', spoken: 'Waiting for the first block.' },
      alive: { label: 'PULSE', spoken: 'Pulse detected: new blocks are arriving.' },
      coma: { label: 'COMA', spoken: 'Coma: the RPC answers, but no new block is arriving.' },
      flatline: { label: 'FLATLINE', spoken: 'Flatline: the RPC stopped answering.' },
    } as Record<Display, { label: string; spoken: string }>,
    patients: {} as Record<string, { label: string; note: string }>,
    custom: { label: 'Your RPC', note: 'Read straight from your browser. The URL never reaches DApp Doctor.' },
    listening: 'Listening.',
    timeOfDeath: (time: string) => `Time of death ${time}.`,
    off: 'Monitor off.',
    perMinute: (rate: number) => ` ${rate} blocks per minute.`,
    charging: 'CHARGING…',
    clear: 'CLEAR!',
    vitals: {
      rate: 'Heart rate', rateUnit: 'blocks per minute',
      block: 'Last block',
      strength: 'Pulse strength', strengthUnit: 'transactions',
      pressure: 'Blood pressure', pressureUnit: 'of the gas limit used',
      since: 'Since the last block', sinceUnit: 'seconds',
    },
    shock: 'Defibrillate',
    shockCharging: 'Charging…',
    shockChecking: 'Checking for a pulse…',
    stop: 'Stop listening',
    again: 'Listen again',
    soundOn: 'Turn sound on',
    soundIsOn: 'Sound on',
    diagnose: 'Find out why with a diagnosis',
    badUrl: 'That is not an http(s) address. Paste the full RPC URL, starting with https://.',
    coma: (block: string, age: number) => `It answers, but its chain stopped at block ${block}, ${age} s ago. A shock cannot fix a node that fell behind: listen to another RPC.`,
    revived: (block: string) => `Pulse is back. Block ${block} came in.`,
    dead: (time: string) => `No response after three shocks. Time of death: ${time}. The monitor is off.`,
    noResponse: (reason: string, count: number, of: number) => `No response. ${reason} Shock ${count} of ${of}.`,
    notABlock: 'The RPC answered, but not with a block.',
    customLabel: 'Or listen to your own RPC',
    customButton: 'Listen to it',
    customHelp: ['Read straight from your browser to the RPC, with', 'and', 'only. The URL never reaches DApp Doctor, and a tab you are not looking at stops asking.'],
    reading: 'Reading the monitor',
    legend: (coma: number, failures: number) => [
      ['A beat', 'A new block. Nothing else makes the trace spike: no block, no beat.'],
      ['Taller spike', 'More transactions in that block.'],
      ['Higher beep', 'A fuller block, closer to its gas limit.'],
      ['Coma', `The RPC answers, but the chain it shows has not moved for ${coma} seconds. The node fell behind.`],
      ['Flatline', `The RPC failed to answer ${failures} times in a row. Try the defibrillator.`],
    ],
    live: ['Everything on the monitor is live. The dead RPC is really unreachable: addresses ending in', 'never resolve, so its flatline is genuine.'],
  },
  es: {
    title: 'Latido del RPC',
    intro: 'Ponle un estetoscopio a una blockchain. Cada latido es un bloque nuevo: el pico es cuántas transacciones trajo, el tono es qué tan lleno venía. Cuando el RPC deje de responder, lo vas a escuchar.',
    patient: 'Paciente',
    stamp: {
      off: { label: 'APAGADO', spoken: 'El monitor está apagado.' },
      waiting: { label: 'SIN SEÑAL', spoken: 'Esperando el primer bloque.' },
      alive: { label: 'PULSO', spoken: 'Hay pulso: están llegando bloques nuevos.' },
      coma: { label: 'COMA', spoken: 'Coma: el RPC responde, pero no llegan bloques nuevos.' },
      flatline: { label: 'LÍNEA PLANA', spoken: 'Línea plana: el RPC dejó de responder.' },
    } as Record<Display, { label: string; spoken: string }>,
    patients: {
      base: { label: 'Base', note: 'Un bloque cada 2 segundos. Un corazón sano y rápido.' },
      ethereum: { label: 'Ethereum', note: 'Un bloque cada 12 segundos. Tranquilo, como una ballena dormida.' },
      'base-sepolia': { label: 'Base Sepolia', note: 'La gemela de pruebas. El mismo ritmo, sin nada en juego.' },
      dead: { label: 'Un RPC muerto', note: 'Una dirección que nunca puede responder. Trae el desfibrilador.' },
    } as Record<string, { label: string; note: string }>,
    custom: { label: 'Tu RPC', note: 'Se lee directo desde tu navegador. La URL nunca llega a DApp Doctor.' },
    listening: 'Escuchando.',
    timeOfDeath: (time: string) => `Hora de muerte ${time}.`,
    off: 'Monitor apagado.',
    perMinute: (rate: number) => ` ${rate} bloques por minuto.`,
    charging: 'CARGANDO…',
    clear: '¡DESPEJEN!',
    vitals: {
      rate: 'Ritmo cardíaco', rateUnit: 'bloques por minuto',
      block: 'Último bloque',
      strength: 'Fuerza del pulso', strengthUnit: 'transacciones',
      pressure: 'Presión', pressureUnit: 'del límite de gas usado',
      since: 'Desde el último bloque', sinceUnit: 'segundos',
    },
    shock: 'Desfibrilar',
    shockCharging: 'Cargando…',
    shockChecking: 'Buscando pulso…',
    stop: 'Dejar de escuchar',
    again: 'Escuchar de nuevo',
    soundOn: 'Activar el sonido',
    soundIsOn: 'Sonido activado',
    diagnose: 'Averigua por qué con un diagnóstico',
    badUrl: 'Esa no es una dirección http(s). Pega la URL completa del RPC, empezando por https://.',
    coma: (block: string, age: number) => `Responde, pero su cadena se detuvo en el bloque ${block}, hace ${age} s. Una descarga no arregla un nodo que se quedó atrás: escucha otro RPC.`,
    revived: (block: string) => `Volvió el pulso. Llegó el bloque ${block}.`,
    dead: (time: string) => `Sin respuesta después de tres descargas. Hora de muerte: ${time}. El monitor está apagado.`,
    noResponse: (reason: string, count: number, of: number) => `Sin respuesta. ${reason} Descarga ${count} de ${of}.`,
    notABlock: 'El RPC respondió, pero no con un bloque.',
    customLabel: 'O escucha tu propio RPC',
    customButton: 'Escucharlo',
    customHelp: ['Se lee directo desde tu navegador al RPC, solo con', 'y', '. La URL nunca llega a DApp Doctor, y una pestaña que no estás mirando deja de preguntar.'],
    reading: 'Cómo leer el monitor',
    legend: (coma: number, failures: number) => [
      ['Un latido', 'Un bloque nuevo. Nada más hace subir el trazo: sin bloque, no hay latido.'],
      ['Pico más alto', 'Más transacciones en ese bloque.'],
      ['Pitido más agudo', 'Un bloque más lleno, más cerca de su límite de gas.'],
      ['Coma', `El RPC responde, pero la cadena que muestra no se movió en ${coma} segundos. El nodo se quedó atrás.`],
      ['Línea plana', `El RPC no respondió ${failures} veces seguidas. Prueba el desfibrilador.`],
    ],
    live: ['Todo lo que muestra el monitor es en vivo. El RPC muerto es realmente inalcanzable: las direcciones que terminan en', 'nunca resuelven, así que su línea plana es real.'],
  },
} satisfies Record<Lang, unknown>;

type Message = { tone: 'info' | 'success' | 'failure'; text: string } | null;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function HeartbeatPage() {
  const lang = useLang();
  const copy = COPY[lang];
  const text = useEngineText();
  const number = (value: number) => value.toLocaleString(LOCALE[lang]);
  const [target, setTarget] = useState<Patient>(PATIENTS[0]);
  const [customUrl, setCustomUrl] = useState('');
  const [listening, setListening] = useState(false);
  const [muted, setMuted] = useState(true);
  const [samples, setSamples] = useState<BlockSample[]>([]);
  const [failures, setFailures] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [answeredChain, setAnsweredChain] = useState<number | null>(null);
  const [nowSeconds, setNowSeconds] = useState(0);
  const [shock, setShock] = useState<'charging' | 'clear' | 'checking' | null>(null);
  const [shocks, setShocks] = useState(0);
  const [timeOfDeath, setTimeOfDeath] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);

  const monitor = useRef<MonitorHandle>(null);
  const sound = useRef<MonitorSound | null>(null);
  const sheet = useRef<HTMLDivElement>(null);
  // Each start bumps the session; a polling loop from an older session stops.
  const session = useRef(0);
  const targetRef = useRef(target);
  const latestRef = useRef<BlockSample | null>(null);

  const latest = samples.length > 0 ? samples[samples.length - 1] : null;
  const pulse: Display = timeOfDeath
    ? 'flatline'
    : listening
      ? pulseState({ latest, consecutiveFailures: failures, nowSeconds, expectedBlockSeconds: target.expectedBlockSeconds })
      : 'off';
  const stamp = { status: STAMP_STATUS[pulse], ...copy.stamp[pulse] };
  const rate = heartRate(samples);

  /** A block came in. Only a block we have not seen before makes the heart beat. */
  function applyBlock(block: BlockSample) {
    setFailures(0);
    setLastError(null);
    const previous = latestRef.current;
    if (previous && block.number <= previous.number) return;
    latestRef.current = block;
    setSamples((current) => [...current.slice(-11), block]);
    monitor.current?.beat(amplitude(block.txCount));
    sound.current?.beep(pitch(fullness(block)));
  }

  function fail(reason: string) {
    setFailures((count) => count + 1);
    setLastError(reason);
  }

  async function listenLoop(id: number) {
    while (session.current === id) {
      // A hidden tab stops asking: nobody is watching, and public RPCs are shared.
      if (!document.hidden) {
        const result = await readRpc(targetRef.current.rpcUrl, 'eth_getBlockByNumber', ['latest', false]);
        if (session.current !== id) return;
        if (result.ok) {
          const block = parseBlock(result.result);
          if (block) applyBlock(block);
          else fail('The RPC answered, but not with a block.');
        } else {
          fail(result.reason);
        }
      }
      await wait(pollIntervalMs(targetRef.current.expectedBlockSeconds));
    }
  }

  function start(next: Patient) {
    const id = ++session.current;
    targetRef.current = next;
    latestRef.current = null;
    setTarget(next);
    setSamples([]);
    setFailures(0);
    setLastError(null);
    setAnsweredChain(null);
    setShocks(0);
    setTimeOfDeath(null);
    setMessage(null);
    setNowSeconds(Date.now() / 1000);
    setListening(true);

    // Which chain answers is read from the RPC itself, so a pasted URL is
    // named by what it is, not by what someone typed.
    void readRpc(next.rpcUrl, 'eth_chainId').then((result) => {
      if (session.current !== id || !result.ok || typeof result.result !== 'string') return;
      const chainId = Number.parseInt(result.result, 16);
      if (!Number.isSafeInteger(chainId)) return;
      setAnsweredChain(chainId);
      const blockSeconds = BLOCK_SECONDS_BY_CHAIN[chainId];
      if (blockSeconds && next.chainId === null) {
        const paced = { ...targetRef.current, expectedBlockSeconds: blockSeconds };
        targetRef.current = paced;
        setTarget(paced);
      }
    });
    void listenLoop(id);
  }

  function stop() {
    session.current++;
    setListening(false);
    sound.current?.setFlatline(false);
  }

  /** Sound needs a click first; the first click on the sound button creates it. */
  function toggleSound() {
    if (!sound.current) sound.current = createMonitorSound();
    setMuted((current) => !current);
  }

  function listenToCustom() {
    const url = customUrl.trim();
    if (!isListenableUrl(url)) {
      setMessage({ tone: 'failure', text: copy.badUrl });
      return;
    }
    start({
      id: 'custom',
      label: copy.custom.label,
      rpcUrl: url,
      chainId: null,
      expectedBlockSeconds: CUSTOM_BLOCK_SECONDS,
      note: copy.custom.note,
    });
  }

  async function defibrillate() {
    const id = session.current;
    const current = targetRef.current;
    setMessage(null);
    setShock('charging');
    sound.current?.setFlatline(false);
    sound.current?.charge();
    await wait(800);
    if (session.current !== id) return;

    setShock('clear');
    sound.current?.zap();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sheet.current?.animate(
        [
          { transform: 'translate(0, 0)' },
          { transform: 'translate(-7px, 3px)' },
          { transform: 'translate(6px, -4px)' },
          { transform: 'translate(-4px, 2px)' },
          { transform: 'translate(0, 0)' },
        ],
        { duration: 320, easing: 'ease-out' },
      );
    }

    // CLEAR! holds for a moment; then the shock waits for the RPC to answer,
    // which for a dead one can take the whole timeout.
    const [result] = await Promise.all([
      readRpc(current.rpcUrl, 'eth_getBlockByNumber', ['latest', false]),
      wait(450).then(() => session.current === id && setShock('checking')),
    ]);
    const block = result.ok ? parseBlock(result.result) : null;
    if (session.current !== id) return;
    setShock(null);

    if (block) {
      const age = Math.round(Date.now() / 1000 - block.timestamp);
      applyBlock(block);
      if (age > comaAfterSeconds(current.expectedBlockSeconds)) {
        setMessage({
          tone: 'info',
          text: copy.coma(number(block.number), age),
        });
      } else {
        setShocks(0);
        setMessage({ tone: 'success', text: copy.revived(number(block.number)) });
      }
      return;
    }

    const count = shocks + 1;
    setShocks(count);
    if (count >= SHOCKS_BEFORE_TIME_OF_DEATH) {
      const time = new Date().toLocaleTimeString(LOCALE[lang], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      setTimeOfDeath(time);
      stop();
      setMessage({ tone: 'failure', text: copy.dead(time) });
    } else {
      const reason = result.ok ? copy.notABlock : text(result.reason);
      setMessage({ tone: 'failure', text: copy.noResponse(reason, count, SHOCKS_BEFORE_TIME_OF_DEATH) });
    }
  }

  // The monitor is already listening when the page opens, silently: sound
  // waits for a click, but the heartbeat does not. Unmounting ends the
  // session, which stops the polling loop, so React's development double
  // mount starts cleanly the second time.
  useEffect(() => {
    const sessions = session;
    const voice = sound;
    start(PATIENTS[0]);
    return () => {
      sessions.current++;
      voice.current?.close();
      voice.current = null;
    };
    // Runs once on arrival; the first patient is a constant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A one-second clock, so "since the last block" and the coma check keep moving.
  useEffect(() => {
    if (!listening) return;
    const timer = setInterval(() => setNowSeconds(Date.now() / 1000), 1000);
    return () => clearInterval(timer);
  }, [listening]);

  // The long flat tone plays only while the monitor is on and flatlined.
  // `muted` is listed so the tone starts when sound is first switched on mid-flatline.
  useEffect(() => {
    sound.current?.setFlatline(listening && pulse === 'flatline' && shock === null);
  }, [listening, pulse, shock, muted]);

  // Muted, or the tab hidden: silence.
  useEffect(() => {
    const apply = () => sound.current?.setMuted(muted || document.hidden);
    apply();
    document.addEventListener('visibilitychange', apply);
    return () => document.removeEventListener('visibilitychange', apply);
  }, [muted]);

  const needsShock = ((pulse === 'flatline' || pulse === 'coma') && listening) || shock !== null;
  const since = latest ? Math.max(0, Math.round(nowSeconds - latest.timestamp)) : null;
  const chainName = answeredChain !== null ? describeChain(answeredChain) : target.chainId !== null ? describeChain(target.chainId) : null;

  return (
    <AppShell
      title={copy.title}
      intro={<p>{copy.intro}</p>}
    >
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">{copy.patient}</span>
        {PATIENTS.map((patient) => (
          <button
            key={patient.id}
            type="button"
            onClick={() => start(patient)}
            aria-pressed={target.id === patient.id}
            className="btn-plain min-h-11 px-4 text-sm"
          >
            {copy.patients[patient.id]?.label ?? patient.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">{copy.patients[target.id]?.note ?? (target.id === 'custom' ? copy.custom.note : target.note)}</p>

      <div ref={sheet} className="mt-6">
        <Sheet className="px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
            <div className="min-w-0">
              <h2 className="font-display text-[clamp(1.25rem,2.8vw,1.6rem)] leading-[1.1] font-black">{target.id === 'custom' ? copy.custom.label : copy.patients[target.id]?.label ?? target.label}</h2>
              <p className="mt-2 text-sm text-muted">
                {chainName ? `${chainName}. ` : ''}
                {listening ? copy.listening : timeOfDeath ? copy.timeOfDeath(timeOfDeath) : copy.off}
              </p>
            </div>
            <Stamp key={stamp.label} status={stamp.status} label={stamp.label} />
          </div>

          <div className="relative mt-6">
            <Monitor ref={monitor} running={listening} label={`${stamp.spoken}${rate ? copy.perMinute(Math.round(rate)) : ''}`} className="h-40 sm:h-48" />
            {(shock === 'charging' || shock === 'clear') && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center font-display text-[clamp(3rem,10vw,6.5rem)] leading-none font-black text-pen"
              >
                {shock === 'charging' ? copy.charging : copy.clear}
              </span>
            )}
          </div>

          <dl className="mt-6 grid grid-cols-2 border-y-2 border-ink sm:grid-cols-5">
            {/* Phone: heart rate across the top, then two by two. Wider: one row of five. */}
            <Vital className="col-span-2 border-b sm:col-span-1 sm:border-r sm:border-b-0" label={copy.vitals.rate} unit={copy.vitals.rateUnit} value={rate ? String(Math.round(rate)) : '—'} />
            <Vital className="border-r border-b sm:border-b-0" label={copy.vitals.block} value={latest ? number(latest.number) : '—'} long />
            <Vital className="border-b sm:border-r sm:border-b-0" label={copy.vitals.strength} unit={copy.vitals.strengthUnit} value={latest ? String(latest.txCount) : '—'} />
            <Vital className="border-r" label={copy.vitals.pressure} unit={copy.vitals.pressureUnit} value={latest ? `${Math.round(fullness(latest) * 100)}%` : '—'} />
            <Vital label={copy.vitals.since} unit={copy.vitals.sinceUnit} value={since !== null ? String(since) : '—'} />
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {needsShock && (
              <button type="button" onClick={defibrillate} disabled={shock !== null} className="btn-pen min-h-12 px-6 disabled:opacity-60">
                {shock === 'checking' ? copy.shockChecking : shock ? copy.shockCharging : copy.shock}
              </button>
            )}
            <button
              type="button"
              onClick={() => (listening ? stop() : start(targetRef.current))}
              className={`${needsShock ? 'btn-plain' : 'btn-pen'} min-h-12 px-6`}
            >
              {listening ? copy.stop : copy.again}
            </button>
            <button type="button" onClick={toggleSound} aria-pressed={!muted} className="btn-plain min-h-12 px-5">
              {muted ? copy.soundOn : copy.soundIsOn}
            </button>
          </div>

          <p aria-live="polite" className="sr-only">{stamp.spoken}</p>

          {message && (
            <div className="mt-5">
              <Notice tone={message.tone}>{message.text}</Notice>
            </div>
          )}
          {!message && pulse === 'flatline' && lastError && (
            <div className="mt-5">
              <Notice tone="failure">
                {text(lastError)}{' '}
                <Link href="/diagnose" prefetch={false} className="font-semibold underline underline-offset-4">
                  {copy.diagnose}
                </Link>
                .
              </Notice>
            </div>
          )}
        </Sheet>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label={copy.customLabel} value={customUrl} onChange={setCustomUrl} placeholder="https://" />
        <button type="button" onClick={listenToCustom} className="btn-plain min-h-12 px-5">
          {copy.customButton}
        </button>
      </div>
      <p className="mt-3 max-w-[65ch] text-sm text-muted">
        {copy.customHelp[0]} <span className="font-mono">eth_chainId</span> {copy.customHelp[1]}{' '}
        <span className="font-mono">eth_getBlockByNumber</span>{lang === 'es' ? '' : ' '}{copy.customHelp[2]}
      </p>

      <section aria-labelledby="reading-heading" className="mt-14">
        <h2 id="reading-heading" className="font-display text-[clamp(1.25rem,2.8vw,1.6rem)] leading-[1.1] font-black">
          {copy.reading}
        </h2>
        <dl className="mt-6 border-t-2 border-ink">
          {copy.legend(comaAfterSeconds(target.expectedBlockSeconds), FLATLINE_AFTER_FAILURES).map(([term, meaning]) => (
            <div key={term} className="grid gap-1 border-b border-ink py-4 sm:grid-cols-[12rem_1fr] sm:gap-6">
              <dt className="font-semibold">{term}</dt>
              <dd className="max-w-[65ch]">{meaning}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 max-w-[65ch] text-sm leading-relaxed">
          {copy.live[0]} <span className="font-mono">.invalid</span> {copy.live[1]}
        </p>
      </section>
    </AppShell>
  );
}

function Vital({ label, value, unit, long = false, className = '' }: {
  label: string;
  value: string;
  unit?: string;
  /** A value with many digits, such as a block number: sized to fit a narrow column. */
  long?: boolean;
  className?: string;
}) {
  return (
    <div className={`min-w-0 border-ink px-3 py-4 ${className}`}>
      <dt className="text-sm font-semibold">{label}</dt>
      <dd className={`mt-1 font-display leading-none font-bold tabular-nums ${long ? 'text-[clamp(1.25rem,2.4vw,2rem)]' : 'text-[2rem]'}`}>
        {value}
      </dd>
      {unit && <dd className="mt-1 text-xs text-muted">{unit}</dd>}
    </div>
  );
}
