'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Notice } from '@/components/app/Notice';
import { OutcomeLabel } from '@/components/app/OutcomeLabel';
import { revealResult } from '@/components/app/revealResult';
import { HealthDonut, HealthLineChart, HealthSeriesChart, IssuesBarChart } from '@/components/dashboard/charts';
import { aggregateEvents } from '@/lib/dashboard/aggregate';
import { readLocalHistory } from '@/lib/history/local';
import { CopyButton } from '@/components/ui/CopyButton';
import { Icon } from '@/components/ui/Icon';
import { InfoTip } from '@/components/ui/Tooltip';
import { toast } from '@/components/ui/Toasts';
import { useEngineText, useLang } from '@/components/i18n/LanguageProvider';
import { Sheet } from '@/components/ui/Sheet';
import type {
  AlertKind,
  DashboardEvent,
  DashboardSnapshot,
  PeriodId,
  RpcHealth,
  StatusCounts,
} from '@/lib/dashboard/types';
import { PERIOD_IDS } from '@/lib/dashboard/types';
import { describeChain } from '@/lib/diagnostics/networks';
import type { OverallStatus } from '@/lib/diagnostics/types';
import { LOCALE, type Lang } from '@/lib/i18n/lang';
import { formatRelative } from '@/lib/time/relative';

interface DashboardPayload {
  configured: boolean;
  period: PeriodId;
  generatedAt: string;
  snapshot: DashboardSnapshot | null;
}

const COPY = {
  en: {
    periods: { '24h': 'Last 24 hours', '7d': 'Last 7 days', '30d': 'Last 30 days', all: 'All' } as Record<PeriodId, string>,
    refresh: 'Refresh',
    refreshing: 'Refreshing…',
    lastUpdated: 'Last updated',
    kpis: {
      total: 'Total diagnostics',
      totalHint: 'Diagnostics executed during the selected period.',
      totalTip: 'Every stored diagnosis that finished in this period. The dashboard never invents a run.',
      healthy: 'Healthy',
      healthyHint: 'of diagnostics',
      healthyTip: 'A diagnosis is Healthy when all six checks passed (READY).',
      atRisk: 'At risk',
      atRiskHint: 'of diagnostics',
      atRiskTip: 'Nothing critical failed, but there are warnings or checks that could not run.',
      blocked: 'Blocked',
      blockedHint: 'of diagnostics',
      blockedTip: 'A critical check failed. The configuration is not safe to treat as working.',
      average: 'Average diagnosis time',
      averageTip: 'Mean of durationMs on the stored reports in this period.',
      ofTotal: 'of total',
      p95: 'P95',
      vsPrevious: 'vs previous period',
    },
    learnMore: 'Learn more',
    copied: 'Copied',
    copy: 'Copy',
    refreshed: 'Dashboard refreshed.',
    sections: {
      series: 'DApp health over time',
      distribution: 'Health distribution',
      issues: 'Most common issues',
      networks: 'Network health',
      rpcs: 'RPC reliability',
      checks: 'Diagnostic checks',
      alerts: 'Active alerts',
      recent: 'Recent diagnostics',
      performance: 'Diagnosis performance',
      detail: 'Diagnosis detail',
    },
    seriesEmpty: 'Not enough historical data',
    seriesHint: 'Run more diagnostics to build this trend.',
    donutEmpty: 'No data available',
    issuesEmpty: 'No FAIL or WARN checks in this period.',
    alertsEmpty: 'No alerts. Nothing in this period met a real threshold.',
    performanceEmpty: 'Not enough data',
    emptyTitle: 'No diagnostics yet',
    emptyBody: 'Run your first diagnosis to start building your dashboard.',
    run: 'Run diagnosis',
    unconfigured:
      'Event storage is not configured on this deployment. Diagnoses still run, but they are not kept, so this dashboard stays empty. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (or the Vercel KV equivalents).',
    error: 'Unable to load dashboard data',
    retry: 'Retry',
    fromDevice: 'These figures come from diagnoses saved on this device. Nothing is estimated.',
    statusLabels: { READY: 'READY', AT_RISK: 'AT RISK', BLOCKED: 'BLOCKED', NOT_TESTED: 'NOT TESTED' } as Record<keyof StatusCounts, string>,
    rpcHealth: { healthy: 'Healthy', degraded: 'Degraded', down: 'Down' } as Record<RpcHealth, string>,
    rpcWindow: 'Current status uses the latest access check. Down only if that check failed in the last 6 hours. An older failure is Degraded, not Down.',
    alertTitle: {
      'rpc-degraded': 'RPC availability degraded',
      'network-identity': 'Network identity failures detected',
      'critical-read': 'Critical contract reads failing',
      fallback: 'Fallback RPC unavailable',
    } as Record<AlertKind, string>,
    alertCause: {
      'rpc-degraded': 'RPC access failed at least twice in this period.',
      'network-identity': 'The node answered a different chain than the app expected, more than once.',
      'critical-read': 'The declared read was rejected or empty, more than once.',
      fallback: 'The backup RPC failed or warned, more than once.',
    } as Record<AlertKind, string>,
    columns: {
      network: 'Network',
      diagnostics: 'Diagnostics',
      ready: 'Ready',
      atRisk: 'At risk',
      blocked: 'Blocked',
      health: 'Health',
      rpc: 'RPC',
      successes: 'Successes',
      failures: 'Failures',
      successRate: 'Success rate',
      average: 'Avg duration',
      last: 'Last diagnosis',
      status: 'Status',
      check: 'Check',
      pass: 'PASS',
      warn: 'WARN',
      fail: 'FAIL',
      notTested: 'NOT TESTED',
      when: 'When',
      failed: 'Failed checks',
      duration: 'Duration',
      action: 'Action',
      issues: 'Issues',
      share: 'Share',
      severity: 'Severity',
      resource: 'Resource',
      count: 'Count',
    },
    performance: {
      average: 'Average',
      median: 'Median',
      p95: 'P95',
      fastest: 'Fastest',
      slowest: 'Slowest',
    },
    search: 'Search RPC or contract',
    filterStatus: 'Status',
    filterNetwork: 'Network',
    allStatuses: 'All statuses',
    allNetworks: 'All networks',
    view: 'View',
    open: 'Open',
    severity: { critical: 'Critical', warning: 'Warning' },
    source: { diagnose: 'Diagnose', compare: 'Compare' },
  },
  es: {
    periods: { '24h': 'Últimas 24 horas', '7d': 'Últimos 7 días', '30d': 'Últimos 30 días', all: 'Todo' } as Record<PeriodId, string>,
    refresh: 'Actualizar',
    refreshing: 'Actualizando…',
    lastUpdated: 'Última actualización',
    kpis: {
      total: 'Diagnósticos totales',
      totalHint: 'Diagnósticos ejecutados en el período elegido.',
      totalTip: 'Cada diagnóstico guardado que terminó en este período. El panel no inventa corridas.',
      healthy: 'Sanos',
      healthyHint: 'de los diagnósticos',
      healthyTip: 'Un diagnóstico es sano cuando los seis chequeos pasaron (LISTO).',
      atRisk: 'En riesgo',
      atRiskHint: 'de los diagnósticos',
      atRiskTip: 'Nada crítico falló, pero hay avisos o chequeos que no pudieron correr.',
      blocked: 'Bloqueados',
      blockedHint: 'de los diagnósticos',
      blockedTip: 'Falló un chequeo crítico. La configuración no se puede tratar como que funciona.',
      average: 'Tiempo medio de diagnóstico',
      averageTip: 'Media de durationMs de los reportes guardados en este período.',
      ofTotal: 'del total',
      p95: 'P95',
      vsPrevious: 'frente al período anterior',
    },
    learnMore: 'Saber más',
    copied: 'Copiado',
    copy: 'Copiar',
    refreshed: 'Panel actualizado.',
    sections: {
      series: 'Salud de la dApp en el tiempo',
      distribution: 'Distribución de salud',
      issues: 'Problemas más frecuentes',
      networks: 'Salud por red',
      rpcs: 'Fiabilidad del RPC',
      checks: 'Chequeos de diagnóstico',
      alerts: 'Alertas activas',
      recent: 'Diagnósticos recientes',
      performance: 'Rendimiento del diagnóstico',
      detail: 'Detalle del diagnóstico',
    },
    seriesEmpty: 'No hay suficientes datos históricos',
    seriesHint: 'Corre más diagnósticos para armar esta tendencia.',
    donutEmpty: 'No hay datos',
    issuesEmpty: 'Ningún chequeo en FAIL o WARN en este período.',
    alertsEmpty: 'Sin alertas. Nada en este período cruzó un umbral real.',
    performanceEmpty: 'No hay datos suficientes',
    emptyTitle: 'Todavía no hay diagnósticos',
    emptyBody: 'Corre tu primer diagnóstico para empezar a armar el panel.',
    run: 'Diagnosticar',
    unconfigured:
      'El almacenamiento de eventos no está configurado en este despliegue. Los diagnósticos corren, pero no se guardan, así que este panel permanece vacío. Definí UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN (o los equivalentes KV de Vercel).',
    error: 'No se pudieron cargar los datos del panel',
    retry: 'Reintentar',
    fromDevice: 'Estas cifras salen de diagnósticos guardados en este dispositivo. Nada se estima.',
    statusLabels: { READY: 'LISTO', AT_RISK: 'EN RIESGO', BLOCKED: 'BLOQUEADO', NOT_TESTED: 'SIN PROBAR' } as Record<keyof StatusCounts, string>,
    rpcHealth: { healthy: 'Sano', degraded: 'Degradado', down: 'Caído' } as Record<RpcHealth, string>,
    rpcWindow: 'El estado actual usa el último chequeo de acceso. Caído solo si ese chequeo falló en las últimas 6 horas. Un fallo más viejo es Degradado, no Caído.',
    alertTitle: {
      'rpc-degraded': 'Disponibilidad del RPC degradada',
      'network-identity': 'Fallos de identidad de red',
      'critical-read': 'Lecturas críticas del contrato fallando',
      fallback: 'RPC de respaldo no disponible',
    } as Record<AlertKind, string>,
    alertCause: {
      'rpc-degraded': 'El acceso al RPC falló al menos dos veces en este período.',
      'network-identity': 'El nodo respondió una chain distinta a la que la app esperaba, más de una vez.',
      'critical-read': 'La lectura declarada fue rechazada o vacía, más de una vez.',
      fallback: 'El RPC de respaldo falló o avisó, más de una vez.',
    } as Record<AlertKind, string>,
    columns: {
      network: 'Red',
      diagnostics: 'Diagnósticos',
      ready: 'Listo',
      atRisk: 'En riesgo',
      blocked: 'Bloqueado',
      health: 'Salud',
      rpc: 'RPC',
      successes: 'Éxitos',
      failures: 'Fallos',
      successRate: 'Tasa de éxito',
      average: 'Duración media',
      last: 'Último diagnóstico',
      status: 'Estado',
      check: 'Chequeo',
      pass: 'PASA',
      warn: 'AVISO',
      fail: 'FALLA',
      notTested: 'SIN PROBAR',
      when: 'Cuándo',
      failed: 'Chequeos fallidos',
      duration: 'Duración',
      action: 'Acción',
      issues: 'Problemas',
      share: 'Proporción',
      severity: 'Severidad',
      resource: 'Recurso',
      count: 'Cantidad',
    },
    performance: {
      average: 'Promedio',
      median: 'Mediana',
      p95: 'P95',
      fastest: 'Más rápido',
      slowest: 'Más lento',
    },
    search: 'Buscar RPC o contrato',
    filterStatus: 'Estado',
    filterNetwork: 'Red',
    allStatuses: 'Todos los estados',
    allNetworks: 'Todas las redes',
    view: 'Ver',
    open: 'Abrir',
    severity: { critical: 'Crítica', warning: 'Aviso' },
    source: { diagnose: 'Diagnóstico', compare: 'Comparación' },
  },
} satisfies Record<Lang, unknown>;

type Copy = (typeof COPY)[Lang];

function formatNumber(value: number, lang: Lang): string {
  return value.toLocaleString(LOCALE[lang]);
}

function formatPercent(ratio: number, lang: Lang): string {
  return `${(ratio * 100).toLocaleString(LOCALE[lang], { maximumFractionDigits: 1 })}%`;
}

function formatDuration(ms: number, lang: Lang): string {
  if (ms >= 1000) return `${(ms / 1000).toLocaleString(LOCALE[lang], { maximumFractionDigits: 1 })} s`;
  return `${ms.toLocaleString(LOCALE[lang])} ms`;
}

function formatWhen(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleString(LOCALE[lang], { dateStyle: 'medium', timeStyle: 'short' });
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="font-display text-[clamp(1.05rem,2vw,1.3rem)] leading-tight font-black">{children}</h2>
  );
}

export function DashboardView(): React.ReactElement {
  const lang = useLang();
  const copy = COPY[lang];
  const text = useEngineText();
  const [period, setPeriod] = useState<PeriodId>('7d');
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OverallStatus | ''>('');
  const [chainFilter, setChainFilter] = useState<string>('');
  const [selected, setSelected] = useState<DashboardEvent | null>(null);
  const [localEvents, setLocalEvents] = useState<DashboardEvent[]>([]);

  const load = useCallback(async (nextPeriod: PeriodId, announce = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dashboard?period=${nextPeriod}`, { cache: 'no-store' });
      const body = (await response.json()) as DashboardPayload & { error?: string };
      if (!response.ok) {
        setError(body.error ?? copy.error);
        setPayload(null);
      } else {
        setPayload(body);
        if (announce) toast(copy.refreshed);
      }
    } catch {
      setError(copy.error);
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [copy.error, copy.refreshed]);

  useEffect(() => {
    void load(period);
  }, [load, period]);

  useEffect(() => {
    setLocalEvents(readLocalHistory());
  }, [payload]);

  useEffect(() => {
    if (selected) revealResult('dashboard-detail');
  }, [selected]);

  const serverSnapshot = payload?.snapshot ?? null;
  const localSnapshot = useMemo(
    () => (localEvents.length > 0 ? aggregateEvents(localEvents, period) : null),
    [localEvents, period],
  );
  const usingDevice = !serverSnapshot || serverSnapshot.total === 0;
  const snapshot = usingDevice ? localSnapshot : serverSnapshot;

  useEffect(() => {
    if (!snapshot) return;
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;
    const found = snapshot.recent.find((event) => event.id === id);
    if (found) setSelected(found);
  }, [snapshot]);

  const recent = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.recent.filter((event) => {
      if (statusFilter && event.status !== statusFilter) return false;
      if (chainFilter && String(event.expectedChainId) !== chainFilter) return false;
      if (!query.trim()) return true;
      const needle = query.trim().toLowerCase();
      return (
        event.rpcUrl.toLowerCase().includes(needle) ||
        (event.contractAddress ?? '').toLowerCase().includes(needle) ||
        event.headline.toLowerCase().includes(needle)
      );
    });
  }, [snapshot, statusFilter, chainFilter, query]);

  return (
    <div className="mt-4 min-w-0 space-y-5 sm:mt-5 sm:space-y-6">
      <Toolbar
        copy={copy}
        lang={lang}
        period={period}
        generatedAt={snapshot?.generatedAt ?? payload?.generatedAt ?? null}
        loading={loading}
        onPeriod={setPeriod}
        onRefresh={() => void load(period, true)}
      />

      {error && (
        <Notice tone="failure">
          {copy.error}{' '}
          <button type="button" onClick={() => void load(period)} className="font-semibold underline underline-offset-4">
            {copy.retry}
          </button>
        </Notice>
      )}

      {usingDevice && snapshot && snapshot.total > 0 && (
        <p className="text-xs text-muted">{copy.fromDevice}</p>
      )}
      {payload && !payload.configured && (!snapshot || snapshot.total === 0) && (
        <Notice tone="action">{copy.unconfigured}</Notice>
      )}

      {loading && !snapshot && <SkeletonGrid />}

      {!loading && (!snapshot || snapshot.total === 0) && <EmptyState copy={copy} />}

      {!loading && snapshot && snapshot.period === period && snapshot.total > 0 && (
        <>
          <KpiRow copy={copy} lang={lang} snapshot={snapshot} />

          <div className="grid min-w-0 gap-6 lg:grid-cols-12">
            <Sheet className="min-w-0 px-4 py-5 sm:px-6 lg:col-span-7">
              <SectionHeading>{copy.sections.series}</SectionHeading>
              {snapshot.series.length === 0 ? (
                <div className="mt-5">
                  <p className="font-semibold">{copy.seriesEmpty}</p>
                  <p className="mt-2 text-sm text-muted">{copy.seriesHint}</p>
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  {snapshot.series.length >= 2 && (
                    <HealthLineChart series={snapshot.series} labels={copy.statusLabels} />
                  )}
                  <HealthSeriesChart series={snapshot.series} />
                </div>
              )}
            </Sheet>
            <Sheet className="min-w-0 px-4 py-5 sm:px-6 lg:col-span-5">
              <SectionHeading>{copy.sections.distribution}</SectionHeading>
              <div className="mt-6">
                {snapshot.total === 0 ? (
                  <p className="text-sm text-muted">{copy.donutEmpty}</p>
                ) : (
                  <HealthDonut counts={snapshot.counts} labels={copy.statusLabels} />
                )}
              </div>
            </Sheet>
          </div>

          <Sheet className="min-w-0 px-4 py-5 sm:px-6">
            <SectionHeading>{copy.sections.issues}</SectionHeading>
            {snapshot.issues.length === 0 ? (
              <p className="mt-4 text-sm text-muted">{copy.issuesEmpty}</p>
            ) : (
              <div className="mt-6">
                <IssuesBarChart
                  items={snapshot.issues.map((row) => ({ id: row.id, title: text(row.title), problems: row.problems }))}
                  unit=""
                />
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
                  <thead className="border-y-2 border-ink">
                    <tr>
                      <th className="py-2.5 pr-3 font-semibold">{copy.columns.check}</th>
                      <th className="py-2.5 pr-3 text-right font-semibold">{copy.columns.issues}</th>
                      <th className="hidden py-2.5 pr-3 text-right font-semibold sm:table-cell">{copy.columns.fail}</th>
                      <th className="hidden py-2.5 pr-3 text-right font-semibold sm:table-cell">{copy.columns.warn}</th>
                      <th className="py-2.5 text-right font-semibold">{copy.columns.share}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.issues.map((row) => (
                      <tr key={row.id} className="border-b border-ink">
                        <th className="py-2.5 pr-3 font-medium">{text(row.title)}</th>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{formatNumber(row.problems, lang)}</td>
                        <td className="hidden py-2.5 pr-3 text-right font-mono tabular-nums sm:table-cell">{formatNumber(row.fail, lang)}</td>
                        <td className="hidden py-2.5 pr-3 text-right font-mono tabular-nums sm:table-cell">{formatNumber(row.warn, lang)}</td>
                        <td className="py-2.5 text-right font-mono tabular-nums">{formatPercent(row.share, lang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
            )}
          </Sheet>

          <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <Sheet className="min-w-0 px-4 py-5 sm:px-6">
            <SectionHeading>{copy.sections.networks}</SectionHeading>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[18rem] border-collapse text-left text-sm">
                <thead className="border-y-2 border-ink">
                  <tr>
                    <th className="py-2.5 pr-3 font-semibold">{copy.columns.network}</th>
                    <th className="py-2.5 pr-3 text-right font-semibold">{copy.columns.diagnostics}</th>
                    <th className="hidden py-2.5 pr-3 text-right font-semibold sm:table-cell">{copy.columns.ready}</th>
                    <th className="hidden py-2.5 pr-3 text-right font-semibold sm:table-cell">{copy.columns.atRisk}</th>
                    <th className="hidden py-2.5 pr-3 text-right font-semibold md:table-cell">{copy.columns.blocked}</th>
                    <th className="py-2.5 text-right font-semibold">{copy.columns.health}</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.networks.map((row) => (
                    <tr key={row.expectedChainId} className="border-b border-ink">
                      <th className="py-2.5 pr-3 font-medium">{describeChain(row.expectedChainId)}</th>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{formatNumber(row.diagnostics, lang)}</td>
                      <td className="hidden py-2.5 pr-3 text-right font-mono tabular-nums sm:table-cell">{formatNumber(row.ready, lang)}</td>
                      <td className="hidden py-2.5 pr-3 text-right font-mono tabular-nums sm:table-cell">{formatNumber(row.atRisk, lang)}</td>
                      <td className="hidden py-2.5 pr-3 text-right font-mono tabular-nums md:table-cell">{formatNumber(row.blocked, lang)}</td>
                      <td className="py-2.5 text-right font-mono tabular-nums">{formatPercent(row.health, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Sheet>

          <Sheet className="min-w-0 px-4 py-5 sm:px-6">
            <SectionHeading>{copy.sections.checks}</SectionHeading>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[16rem] border-collapse text-left text-sm">
                <thead className="border-y-2 border-ink">
                  <tr>
                    <th className="py-2.5 pr-3 font-semibold">{copy.columns.check}</th>
                    <th className="py-2.5 pr-3 text-right font-semibold">{copy.columns.pass}</th>
                    <th className="py-2.5 pr-3 text-right font-semibold">{copy.columns.fail}</th>
                    <th className="py-2.5 text-right font-semibold">{copy.columns.successRate}</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.checks.map((row) => (
                    <tr key={row.id} className="border-b border-ink">
                      <th className="py-2.5 pr-3 font-medium">{text(row.title)}</th>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{formatNumber(row.pass, lang)}</td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{formatNumber(row.fail, lang)}</td>
                      <td className="py-2.5 text-right font-mono tabular-nums">
                        {row.successRate === null ? copy.performanceEmpty : formatPercent(row.successRate, lang)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Sheet>
          </div>

          <Sheet className="min-w-0 px-4 py-5 sm:px-6">
            <SectionHeading>{copy.sections.rpcs}</SectionHeading>
            <p className="mt-2 max-w-[70ch] text-sm text-muted">{copy.rpcWindow}</p>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
                <thead className="border-y-2 border-ink">
                  <tr>
                    <th className="py-2.5 pr-3 font-semibold">{copy.columns.rpc}</th>
                    <th className="py-2.5 pr-3 text-right font-semibold">{copy.columns.diagnostics}</th>
                    <th className="hidden py-2.5 pr-3 text-right font-semibold md:table-cell">{copy.columns.successes}</th>
                    <th className="hidden py-2.5 pr-3 text-right font-semibold md:table-cell">{copy.columns.failures}</th>
                    <th className="py-2.5 pr-3 text-right font-semibold">{copy.columns.successRate}</th>
                    <th className="hidden py-2.5 pr-3 text-right font-semibold lg:table-cell">{copy.columns.average}</th>
                    <th className="hidden py-2.5 pr-3 font-semibold lg:table-cell">{copy.columns.last}</th>
                    <th className="py-2.5 font-semibold">{copy.columns.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.rpcs.map((row) => (
                    <tr key={row.rpcUrl} className="border-b border-ink align-top">
                      <th className="max-w-[12rem] py-2.5 pr-3 font-mono text-xs font-medium break-all sm:max-w-[18rem]">{row.rpcUrl}</th>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{formatNumber(row.diagnostics, lang)}</td>
                      <td className="hidden py-2.5 pr-3 text-right font-mono tabular-nums md:table-cell">{formatNumber(row.successes, lang)}</td>
                      <td className="hidden py-2.5 pr-3 text-right font-mono tabular-nums md:table-cell">{formatNumber(row.failures, lang)}</td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{formatPercent(row.successRate, lang)}</td>
                      <td className="hidden py-2.5 pr-3 text-right font-mono tabular-nums lg:table-cell">{formatDuration(row.averageMs, lang)}</td>
                      <td className="hidden py-2.5 pr-3 text-muted lg:table-cell">{formatWhen(row.lastAt, lang)}</td>
                      <td className="py-2.5">
                        <span className={`border-l-[3px] pl-1.5 font-semibold ${
                          row.health === 'healthy' ? 'border-triage-green' : row.health === 'degraded' ? 'border-triage-amber' : 'border-triage-red'
                        }`}>
                          {copy.rpcHealth[row.health]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Sheet>

          <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <Sheet className="min-w-0 px-4 py-5 sm:px-6">
            <SectionHeading>{copy.sections.performance}</SectionHeading>
            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(
                [
                  ['average', snapshot.performance.averageMs],
                  ['median', snapshot.performance.medianMs],
                  ['p95', snapshot.performance.p95Ms],
                  ['fastest', snapshot.performance.fastestMs],
                  ['slowest', snapshot.performance.slowestMs],
                ] as const
              ).map(([key, value]) => (
                <div key={key} className="border-l-[3px] border-ink pl-3">
                  <dt className="text-xs text-muted sm:text-sm">{copy.performance[key]}</dt>
                  <dd className="mt-1 font-display text-[clamp(1.1rem,2.4vw,1.5rem)] font-black tabular-nums">
                    {value === null ? copy.performanceEmpty : formatDuration(value, lang)}
                  </dd>
                </div>
              ))}
            </dl>
          </Sheet>

          <Sheet className="min-w-0 px-4 py-5 sm:px-6">
            <SectionHeading>{copy.sections.alerts}</SectionHeading>
            {snapshot.alerts.length === 0 ? (
              <p className="mt-4 text-sm text-muted">{copy.alertsEmpty}</p>
            ) : (
              <ul className="mt-6 divide-y divide-ink border-y border-ink">
                {snapshot.alerts.map((alert) => (
                  <li key={`${alert.kind}:${alert.resource}`} className="py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <p className="font-semibold">{copy.alertTitle[alert.kind]}</p>
                      <span className={`border-l-[3px] pl-1.5 text-sm font-semibold ${
                        alert.severity === 'critical' ? 'border-triage-red' : 'border-triage-amber'
                      }`}>
                        {copy.severity[alert.severity]}
                      </span>
                    </div>
                    <p className="mt-2 max-w-[70ch] text-sm">{copy.alertCause[alert.kind]}</p>
                    <p className="mt-2 font-mono text-xs break-all text-muted">{alert.resource}</p>
                    <p className="mt-1 text-sm text-muted">
                      {formatWhen(alert.at, lang)} · {formatNumber(alert.count, lang)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Sheet>
          </div>

          <Sheet className="min-w-0 px-4 py-5 sm:px-6">
            <SectionHeading>{copy.sections.recent}</SectionHeading>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <label className="block sm:col-span-1">
                <span className="mb-2 block text-sm font-semibold">{copy.search}</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="field min-h-12 w-full px-3 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">{copy.filterStatus}</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as OverallStatus | '')}
                  className="field min-h-12 w-full px-3 text-sm"
                >
                  <option value="">{copy.allStatuses}</option>
                  <option value="READY">READY</option>
                  <option value="AT_RISK">AT_RISK</option>
                  <option value="BLOCKED">BLOCKED</option>
                  <option value="NOT_TESTED">NOT_TESTED</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">{copy.filterNetwork}</span>
                <select
                  value={chainFilter}
                  onChange={(event) => setChainFilter(event.target.value)}
                  className="field min-h-12 w-full px-3 text-sm"
                >
                  <option value="">{copy.allNetworks}</option>
                  {snapshot.networks.map((row) => (
                    <option key={row.expectedChainId} value={String(row.expectedChainId)}>
                      {describeChain(row.expectedChainId)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
                <thead className="border-y-2 border-ink">
                  <tr>
                    <th className="py-2.5 pr-3 font-semibold">{copy.columns.when}</th>
                    <th className="hidden py-2.5 pr-3 font-semibold sm:table-cell">{copy.columns.network}</th>
                    <th className="py-2.5 pr-3 font-semibold">{copy.columns.rpc}</th>
                    <th className="py-2.5 pr-3 font-semibold">{copy.columns.status}</th>
                    <th className="hidden py-2.5 pr-3 font-semibold md:table-cell">{copy.columns.failed}</th>
                    <th className="hidden py-2.5 pr-3 font-semibold sm:table-cell">{copy.columns.duration}</th>
                    <th className="py-2.5 font-semibold">{copy.columns.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((event) => {
                    const failed = event.checks.filter((check) => check.outcome === 'FAIL' || check.outcome === 'WARN');
                    return (
                      <tr key={event.id} className="border-b border-ink align-top">
                        <td className="whitespace-nowrap py-2.5 pr-3 text-muted" title={formatWhen(event.recordedAt, lang)}>
                          {formatRelative(event.recordedAt, lang)}
                        </td>
                        <td className="hidden py-2.5 pr-3 sm:table-cell">{describeChain(event.expectedChainId)}</td>
                        <td className="max-w-[10rem] py-2.5 pr-3 font-mono text-xs break-all sm:max-w-[14rem]">{event.rpcUrl}</td>
                        <td className="py-2.5 pr-3"><OutcomeLabel outcome={event.status} /></td>
                        <td className="hidden py-2.5 pr-3 text-sm md:table-cell">
                          {failed.length === 0 ? '—' : failed.map((check) => text(check.title)).join(', ')}
                        </td>
                        <td className="hidden py-2.5 pr-3 font-mono tabular-nums sm:table-cell">{formatDuration(event.durationMs, lang)}</td>
                        <td className="py-2.5">
                          <button
                            type="button"
                            onClick={() => setSelected(event)}
                            className="btn-plain min-h-10 px-3 text-sm"
                          >
                            {copy.view}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Sheet>

          {selected && (
            <Sheet className="px-5 py-6 sm:px-8">
              <h2 id="dashboard-detail" tabIndex={-1} className="font-display text-[clamp(1.25rem,2.4vw,1.75rem)] font-black outline-none">
                {copy.sections.detail}
              </h2>
              <p className="mt-3 text-sm text-muted">
                {formatWhen(selected.recordedAt, lang)} · {copy.source[selected.source]} · {describeChain(selected.expectedChainId)}
              </p>
              <p className="mt-4 max-w-[70ch] font-semibold">{text(selected.headline)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <p className="font-mono text-xs break-all text-muted">{selected.rpcUrl}</p>
                <CopyButton value={selected.rpcUrl} label={copy.copy} copiedLabel={copy.copied} />
              </div>
              <ol className="mt-6 border-t-2 border-ink">
                {selected.checks.map((check, index) => (
                  <li key={check.id} className="grid grid-cols-[2.5rem_1fr] gap-x-3 border-b border-ink py-5">
                    <span className="font-display text-lg font-bold sm:text-xl">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="font-bold">{text(check.title)}</h3>
                        <OutcomeLabel outcome={check.outcome} />
                      </div>
                      <p className="mt-2 max-w-[70ch] text-sm">{text(check.summary)}</p>
                      {check.action && (
                        <p className="mt-3 max-w-[70ch] border-l-[3px] border-pen pl-3 text-sm text-pen">
                          {text(check.action)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </Sheet>
          )}
        </>
      )}
    </div>
  );
}

function Toolbar({ copy, lang, period, generatedAt, loading, onPeriod, onRefresh }: {
  copy: Copy;
  lang: Lang;
  period: PeriodId;
  generatedAt: string | null;
  loading: boolean;
  onPeriod: (period: PeriodId) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap gap-2">
        {PERIOD_IDS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={period === id}
            onClick={() => onPeriod(id)}
            className="btn-plain min-h-11 px-3 text-xs sm:px-4 sm:text-sm"
          >
            {copy.periods[id]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {generatedAt && (
          <p className="text-sm text-muted">
            {copy.lastUpdated}: {formatWhen(generatedAt, lang)}
          </p>
        )}
        <button type="button" onClick={onRefresh} disabled={loading} className="btn-pen inline-flex min-h-11 items-center gap-2 px-5 text-sm disabled:opacity-60">
          <Icon name={loading ? 'spinner' : 'refresh'} />
          {loading ? copy.refreshing : copy.refresh}
        </button>
      </div>
    </div>
  );
}

function KpiRow({ copy, lang, snapshot }: { copy: Copy; lang: Lang; snapshot: DashboardSnapshot }) {
  const total = snapshot.total;
  const trend = snapshot.trend;
  const items = [
    {
      label: copy.kpis.total,
      tip: copy.kpis.totalTip,
      value: formatNumber(total, lang),
      note: copy.kpis.totalHint,
      trend: trend ? `${trend.totalDelta >= 0 ? '+' : ''}${formatNumber(trend.totalDelta, lang)} ${copy.kpis.vsPrevious}` : null,
      bar: 'border-ink',
    },
    {
      label: copy.kpis.healthy,
      tip: copy.kpis.healthyTip,
      value: formatNumber(snapshot.counts.READY, lang),
      note: total ? `${formatPercent(snapshot.counts.READY / total, lang)} ${copy.kpis.healthyHint}` : null,
      trend: trend?.readyShareDelta !== null && trend?.readyShareDelta !== undefined
        ? `${trend.readyShareDelta >= 0 ? '+' : ''}${formatPercent(trend.readyShareDelta, lang)} ${copy.kpis.vsPrevious}`
        : null,
      bar: 'border-triage-green',
    },
    {
      label: copy.kpis.atRisk,
      tip: copy.kpis.atRiskTip,
      value: formatNumber(snapshot.counts.AT_RISK, lang),
      note: total ? `${formatPercent(snapshot.counts.AT_RISK / total, lang)} ${copy.kpis.atRiskHint}` : null,
      trend: null,
      bar: 'border-triage-amber',
    },
    {
      label: copy.kpis.blocked,
      tip: copy.kpis.blockedTip,
      value: formatNumber(snapshot.counts.BLOCKED, lang),
      note: total ? `${formatPercent(snapshot.counts.BLOCKED / total, lang)} ${copy.kpis.blockedHint}` : null,
      trend: null,
      bar: 'border-triage-red',
    },
    {
      label: copy.kpis.average,
      tip: copy.kpis.averageTip,
      value: snapshot.averageMs === null ? copy.performanceEmpty : formatDuration(snapshot.averageMs, lang),
      note: snapshot.p95Ms === null ? null : `${copy.kpis.p95} ${formatDuration(snapshot.p95Ms, lang)}`,
      trend: null,
      bar: 'border-ink',
    },
  ];

  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <Sheet key={item.label} className="min-w-0 px-3 py-3.5 last:col-span-2 sm:px-4 sm:last:col-span-2 lg:last:col-span-1">
          <p className={`flex items-start justify-between gap-1 border-l-[3px] pl-2 text-xs leading-snug font-semibold text-muted ${item.bar}`}>
            <span>{item.label}</span>
            <InfoTip label={item.label}>{item.tip}</InfoTip>
          </p>
          <p className="mt-2 font-display text-[clamp(1.2rem,2.4vw,1.55rem)] leading-none font-black tabular-nums">{item.value}</p>
          {item.note && <p className="mt-2 text-[0.7rem] leading-snug text-muted">{item.note}</p>}
          {item.trend && <p className="mt-1 text-[0.7rem] font-semibold">{item.trend}</p>}
        </Sheet>
      ))}
    </div>
  );
}

function EmptyState({ copy }: { copy: Copy }) {
  return (
    <Sheet className="px-5 py-8 sm:px-8">
      <p className="font-display text-[clamp(1.25rem,2.4vw,1.75rem)] font-black">{copy.emptyTitle}</p>
      <p className="mt-3 max-w-[50ch] text-muted">{copy.emptyBody}</p>
      <Link href="/diagnose" prefetch={false} className="btn-pen mt-6 inline-flex min-h-12 items-center px-6">
        {copy.run}
      </Link>
    </Sheet>
  );
}

function SkeletonGrid() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Sheet key={index} className="px-4 py-5">
            <div className="h-3 w-24 bg-paper" />
            <div className="mt-4 h-9 w-16 bg-paper" />
            <div className="mt-3 h-3 w-32 bg-paper" />
          </Sheet>
        ))}
      </div>
      <Sheet className="px-5 py-6">
        <div className="h-6 w-48 bg-paper" />
        <div className="mt-6 h-48 w-full bg-paper" />
      </Sheet>
    </div>
  );
}
