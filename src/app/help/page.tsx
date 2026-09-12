'use client';

import Link from 'next/link';
import { AppShell } from '@/components/app/AppShell';
import { OutcomeLabel } from '@/components/app/OutcomeLabel';
import { useLang } from '@/components/i18n/LanguageProvider';
import { Sheet } from '@/components/ui/Sheet';
import { Icon } from '@/components/ui/Icon';
import type { Lang } from '@/lib/i18n/lang';

const COPY = {
  en: {
    title: 'How to use DApp Doctor',
    intro: 'A step-by-step manual. DApp Doctor reads your RPC configuration. It never asks for a wallet, a seed phrase or a private key, and it never sends a transaction.',
    stepsTitle: 'The ten steps',
    steps: [
      {
        id: 'open-diagnose',
        title: 'Open Diagnose',
        body: 'Go to Diagnose to check the RPC configuration your dApp actually uses. The engine runs six read-only checks.',
        href: '/diagnose',
        link: 'Open Diagnose',
      },
      {
        id: 'rpc-url',
        title: 'Enter the RPC URL',
        body: 'This is the endpoint your app calls. It must be http or https. The example below is illustrative, not a recommendation.',
        example: 'https://mainnet.base.org',
        note: 'Example only. Use the URL from your own .env or wagmi config.',
      },
      {
        id: 'chain-id',
        title: 'Enter the expected chain ID',
        body: 'The chain ID is the network your application believes it is on. DApp Doctor compares that number to the network the RPC actually answers.',
        examples: [
          { label: 'Base Mainnet', value: '8453' },
          { label: 'Ethereum Mainnet', value: '1' },
          { label: 'Arbitrum One', value: '42161' },
        ],
        note: 'Those numbers are examples. Use the chain your dApp is built for.',
      },
      {
        id: 'contract',
        title: 'Add a contract (optional)',
        body: 'If the app reads a contract, paste its address. Without one, bytecode and the critical read stay NOT TESTED — that is risk, not proof that they work.',
      },
      {
        id: 'critical-read',
        title: 'Add a critical read (optional)',
        body: 'A zero-argument view the app depends on. DApp Doctor encodes it, calls it with eth_call, and decodes the answer. If the function is missing or the ABI is wrong, the check fails.',
        example: 'symbol() returns (string)',
        note: 'Example of the expected shape: name() returns (type).',
      },
      {
        id: 'fallback',
        title: 'Add a fallback RPC (optional)',
        body: 'A backup endpoint. If it points at another network, the day the primary goes down the app will silently read the wrong chain. Without a fallback the diagnosis cannot be READY.',
      },
      {
        id: 'run',
        title: 'Run the diagnosis',
        body: 'Press Diagnose. The button shows that the checks are running. There is no live per-check progress from the server — the wait is one real request.',
        wait: 'Running diagnostic checks…',
      },
      {
        id: 'read-the-result',
        title: 'Read the result',
        body: 'The stamp is the verdict. READY means all six checks passed. AT RISK means nothing critical failed, but there are warnings or untested checks. BLOCKED means a critical check failed — the headline names it.',
      },
      {
        id: 'fix',
        title: 'Fix the problem',
        body: 'Each failing check has a summary (what was observed) and an action (what to do). Observed data is under the row if you need the raw evidence.',
      },
      {
        id: 'compare',
        title: 'Compare before and after',
        body: 'A single report proves the failure. Compare runs the broken configuration and the fixed one at the same moment and shows which checks were FIXED or REGRESSED.',
        href: '/compare',
        link: 'Open Compare',
      },
    ],
    statuses: 'What the verdicts mean',
    outcomes: 'What a check outcome means',
    outcome: {
      PASS: 'The check completed successfully.',
      WARN: 'The check completed, but the configuration may need attention.',
      FAIL: 'The check found a problem that should be fixed.',
      NOT_TESTED: 'The check could not run. That is not evidence that it works.',
    },
    after: 'After you have a report',
    dashboard: 'Open the dashboard to monitor the diagnoses this installation has stored.',
    dashboardLink: 'View dashboard',
  },
  es: {
    title: 'Cómo usar DApp Doctor',
    intro: 'Un manual paso a paso. DApp Doctor lee la configuración RPC. Nunca pide wallet, frase semilla ni clave privada, y nunca manda una transacción.',
    stepsTitle: 'Los diez pasos',
    steps: [
      {
        id: 'open-diagnose',
        title: 'Abrí Diagnosticar',
        body: 'Andá a Diagnosticar para revisar la configuración RPC que tu dApp usa de verdad. El motor corre seis chequeos de solo lectura.',
        href: '/diagnose',
        link: 'Abrir Diagnosticar',
      },
      {
        id: 'rpc-url',
        title: 'Ingresá la URL del RPC',
        body: 'Es el endpoint que llama tu app. Tiene que ser http o https. El ejemplo de abajo es ilustrativo, no una recomendación.',
        example: 'https://mainnet.base.org',
        note: 'Solo un ejemplo. Usá la URL de tu .env o de la config de wagmi.',
      },
      {
        id: 'chain-id',
        title: 'Ingresá el chain ID esperado',
        body: 'El chain ID es la red que tu aplicación cree que está usando. DApp Doctor lo compara con la red que el RPC responde de verdad.',
        examples: [
          { label: 'Base Mainnet', value: '8453' },
          { label: 'Ethereum Mainnet', value: '1' },
          { label: 'Arbitrum One', value: '42161' },
        ],
        note: 'Esos números son ejemplos. Usá la chain para la que está hecha tu dApp.',
      },
      {
        id: 'contract',
        title: 'Sumá un contrato (opcional)',
        body: 'Si la app lee un contrato, pegá su dirección. Sin una, el bytecode y la lectura crítica quedan SIN PROBAR: eso es riesgo, no prueba de que funcionan.',
      },
      {
        id: 'critical-read',
        title: 'Sumá una lectura crítica (opcional)',
        body: 'Una función view de cero argumentos de la que depende la app. DApp Doctor la codifica, la llama con eth_call y decodifica la respuesta. Si falta la función o el ABI no coincide, el chequeo falla.',
        example: 'symbol() returns (string)',
        note: 'Forma esperada: nombre() returns (tipo).',
      },
      {
        id: 'fallback',
        title: 'Sumá un RPC de respaldo (opcional)',
        body: 'Un endpoint de backup. Si apunta a otra red, el día que caiga el primario la app va a leer la chain equivocada en silencio. Sin respaldo el diagnóstico no puede ser LISTO.',
      },
      {
        id: 'run',
        title: 'Corré el diagnóstico',
        body: 'Pulsá Diagnosticar. El botón muestra que los chequeos están corriendo. El servidor no manda progreso por chequeo: la espera es un request real.',
        wait: 'Corriendo los chequeos…',
      },
      {
        id: 'read-the-result',
        title: 'Leé el resultado',
        body: 'El sello es el veredicto. LISTO significa que pasaron los seis. EN RIESGO: nada crítico falló, pero hay avisos o chequeos sin probar. BLOQUEADO: falló un chequeo crítico; el titular lo nombra.',
      },
      {
        id: 'fix',
        title: 'Arreglá el problema',
        body: 'Cada chequeo que falla tiene un resumen (qué se observó) y una acción (qué hacer). Los datos observados están bajo la fila si necesitás la evidencia cruda.',
      },
      {
        id: 'compare',
        title: 'Compará antes y después',
        body: 'Un solo reporte prueba la falla. Comparar corre la configuración rota y la arreglada en el mismo momento y muestra qué chequeos se ARREGLARON o se ROMPIERON.',
        href: '/compare',
        link: 'Abrir Comparar',
      },
    ],
    statuses: 'Qué significan los veredictos',
    outcomes: 'Qué significa el resultado de un chequeo',
    outcome: {
      PASS: 'El chequeo terminó bien.',
      WARN: 'El chequeo terminó, pero la configuración puede necesitar atención.',
      FAIL: 'El chequeo encontró un problema que hay que corregir.',
      NOT_TESTED: 'El chequeo no pudo correr. Eso no es evidencia de que funciona.',
    },
    after: 'Después del reporte',
    dashboard: 'Abrí el panel para monitorear los diagnósticos que esta instalación ya guardó.',
    dashboardLink: 'Ver el panel',
  },
} satisfies Record<Lang, unknown>;

export default function HelpPage() {
  const copy = COPY[useLang()];
  return (
    <AppShell compact title={copy.title} intro={<p>{copy.intro}</p>}>
      <section className="mt-10">
        <h2 className="font-display text-[clamp(1.25rem,2.4vw,1.75rem)] font-black">{copy.stepsTitle}</h2>
        <ol className="mt-6 space-y-6">
          {copy.steps.map((step, index) => (
            <li key={step.id} id={step.id}>
              <Sheet className="px-5 py-6 sm:px-8">
                <p className="font-display text-xl font-black sm:text-2xl">{String(index + 1).padStart(2, '0')}</p>
                <h3 className="mt-2 text-lg font-bold">{step.title}</h3>
                <p className="mt-3 max-w-[70ch]">{step.body}</p>
                {'example' in step && step.example && (
                  <p className="mt-4 border-2 border-ink bg-paper px-3 py-2 font-mono text-sm">{step.example}</p>
                )}
                {'examples' in step && step.examples && (
                  <ul className="mt-4 space-y-1 font-mono text-sm">
                    {step.examples.map((item) => (
                      <li key={item.value}>
                        {item.label}: {item.value}
                      </li>
                    ))}
                  </ul>
                )}
                {'note' in step && step.note && <p className="mt-3 text-sm text-muted">{step.note}</p>}
                {'wait' in step && step.wait && (
                  <p className="mt-4 inline-flex items-center gap-2 border-l-[3px] border-pen pl-3 font-semibold text-pen">
                    <Icon name="spinner" />
                    {step.wait}
                  </p>
                )}
                {'href' in step && step.href && step.link && (
                  <Link href={step.href} prefetch={false} className="btn-pen mt-5 inline-flex min-h-12 items-center px-5">
                    {step.link}
                  </Link>
                )}
              </Sheet>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-[clamp(1.25rem,2.4vw,1.75rem)] font-black">{copy.statuses}</h2>
        <div className="mt-6 flex flex-wrap gap-4">
          <OutcomeLabel outcome="READY" />
          <OutcomeLabel outcome="AT_RISK" />
          <OutcomeLabel outcome="BLOCKED" />
          <OutcomeLabel outcome="NOT_TESTED" />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-[clamp(1.25rem,2.4vw,1.75rem)] font-black">{copy.outcomes}</h2>
        <ul className="mt-6 space-y-4">
          {(['PASS', 'WARN', 'FAIL', 'NOT_TESTED'] as const).map((outcome) => (
            <li key={outcome} className="max-w-[70ch]">
              <OutcomeLabel outcome={outcome} />
              <p className="mt-2">{copy.outcome[outcome]}</p>
            </li>
          ))}
        </ul>
      </section>

      <Sheet className="mt-12 px-5 py-6 sm:px-8">
        <h2 className="font-display text-[clamp(1.25rem,2.4vw,1.75rem)] font-black">{copy.after}</h2>
        <p className="mt-3 max-w-[70ch]">{copy.dashboard}</p>
        <Link href="/dashboard" prefetch={false} className="btn-pen mt-5 inline-flex min-h-12 items-center px-5">
          {copy.dashboardLink}
        </Link>
      </Sheet>
    </AppShell>
  );
}
