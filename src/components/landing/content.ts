import type { Lang } from '@/lib/i18n/lang';
import { STATUS_LABELS } from '@/lib/i18n/engineText';
import type { CheckOutcome, OverallStatus } from '@/lib/diagnostics/types';

export type Availability = 'LIVE' | 'NOT_YET';
export const isLive = (item: { availability: Availability }): boolean =>
  item.availability === 'LIVE';

const repository = 'https://github.com/Zer0-Knowledge-Hack/dapp-doctor';
const mcpCommand = 'claude mcp add --transport http dapp-doctor https://dapp-doctor.vercel.app/api/mcp';

/** Verdict labels as the stamps print them, in each language. */
export const statusLabels: Record<OverallStatus, string> = STATUS_LABELS.en;

/**
 * The landing's copy. English is the source; the Spanish below has exactly
 * the same shape, which the type enforces, so a section can never exist in
 * one language and be missing in the other. Availability flags are set once
 * here, in English, and the Spanish copy must match them.
 */
const en = {
  motion: { pauseLabel: 'Pause heartbeat' },
  header: {
    availability: 'LIVE',
    name: 'DApp Doctor',
    homeLabel: 'DApp Doctor, home page',
    navigationLabel: 'Main navigation',
    skip: 'Skip to content',
    links: [
      { label: 'Dashboard', href: '/dashboard', availability: 'LIVE' },
      { label: 'Diagnose', href: '/diagnose', availability: 'LIVE' },
      { label: 'Compare', href: '/compare', availability: 'LIVE' },
      { label: 'Heartbeat', href: '/heartbeat', availability: 'LIVE' },
      { label: 'Launch', href: '/launch', availability: 'LIVE' },
      { label: 'History', href: '/history', availability: 'LIVE' },
      { label: 'Help', href: '/help', availability: 'LIVE' },
    ],
  },
  hero: {
    availability: 'LIVE',
    headline: "Your dApp isn't broken. It's lying.",
    body: "The page loads and the node answers, but the balance says zero. DApp Doctor finds out why: the wrong network, a lagging node, or a contract that isn't there. Get a verdict in seconds.",
    primary: { label: 'Diagnose my dApp', href: '/diagnose' },
    secondary: { label: 'Watch it catch a broken one', href: '/diagnose?demo=broken' },
  },
  symptoms: {
    availability: 'LIVE',
    headline: "Misconfigured dApps don't crash. They show the wrong numbers.",
    items: [
      { title: 'The wrong network.', body: 'Your app was built for Base Sepolia. Your RPC answers Base Mainnet. Every read succeeds, and every read is wrong.', availability: 'LIVE' },
      { title: 'A lagging node.', body: 'It answers every call on time, with state that stopped being true a minute ago.', availability: 'LIVE' },
      { title: "A contract that isn't there.", body: 'The address has no code on this network, so reads come back empty, and your interface shows zeros as if they were data.', availability: 'LIVE' },
    ],
  },
  sixChecks: {
    availability: 'LIVE',
    headline: 'Six checks. Read-only. Seconds.',
    items: [
      { title: 'RPC access', body: 'Does the URL answer as a node? If not, is it DNS, a timeout, a rate limit, or a JSON-RPC error? Each one needs a different fix.', availability: 'LIVE' },
      { title: 'Network identity', body: 'Is the node on the network your app expects?', availability: 'LIVE' },
      { title: 'Node freshness', body: 'Is its latest block recent, or is it serving stale state?', availability: 'LIVE' },
      { title: 'Contract bytecode', body: 'Is there actually a contract at that address, on this network?', availability: 'LIVE' },
      { title: 'Critical read', body: 'Does the contract answer the call your app makes, in the shape your app expects?', availability: 'LIVE' },
      { title: 'Fallback RPC', body: 'Does your backup answer, and is it on the same network? A backup on the wrong chain fails silently the day you need it.', availability: 'LIVE' },
    ],
  },
  verdicts: {
    availability: 'LIVE',
    headline: 'A verdict you can act on.',
    items: [
      { status: 'READY', body: 'All six checks passed.', availability: 'LIVE' },
      { status: 'AT_RISK', body: 'Nothing critical failed, but something needs attention or could not be checked.', availability: 'LIVE' },
      { status: 'BLOCKED', body: 'A critical check failed. The verdict names the root cause, not a list of symptoms.', availability: 'LIVE' },
    ],
    principles: [
      { text: 'Not tested never counts as passing.', availability: 'LIVE' },
      { text: 'Every failure comes with what to do about it.', availability: 'LIVE' },
    ],
  },
  beforeAfter: {
    availability: 'LIVE',
    headline: 'One report proves nothing. Two do.',
    body: 'Run the broken setup and the fixed one side by side. DApp Doctor shows which checks your fix resolved, and names any it broke.',
    // This is a fixed illustration from the brief, never a live diagnosis.
    caption: 'Example comparison',
    columns: { check: 'Check', before: 'Before', after: 'After', change: 'Change' },
    rows: [
      { check: 'Network identity', before: 'FAIL', after: 'PASS', change: 'fixed', availability: 'LIVE' },
      { check: 'Fallback RPC', before: 'NOT_TESTED', after: 'PASS', change: 'fixed', availability: 'LIVE' },
    ],
    primary: { label: 'Compare two setups', href: '/compare' },
  },
  waysIn: {
    availability: 'LIVE',
    headline: 'Bring your config the way you have it.',
    items: [
      { title: 'Fill in the details', body: 'Enter the RPC URL, the network your app expects, and optionally a contract and a fallback.', availability: 'LIVE' },
      { title: 'Paste it', body: 'An RPC URL, a .env file, or your wagmi or hardhat config. It is read in your browser; only the values the checks need are sent.', availability: 'NOT_YET' },
      {
        title: 'Ask your agent',
        body: 'Connect DApp Doctor to Claude Code or Cursor as an MCP server. Your agent reads the project and runs the diagnosis.',
        // Live in production since 11 September 2026: tools verified over the protocol.
        command: mcpCommand,
        availability: 'LIVE',
      },
      { title: 'Point it at a repo', body: 'Paste a public GitHub repository and DApp Doctor reads its configuration.', availability: 'NOT_YET' },
    ],
  },
  pro: {
    availability: 'LIVE',
    headline: 'Pro keeps the chart.',
    body: 'Every diagnosis is saved, so you can see when a configuration broke and prove when it was fixed.',
    features: [
      { text: 'Saved diagnosis history.', availability: 'LIVE' },
      { text: 'Launch Check: a stricter bar before you go to mainnet.', availability: 'LIVE' },
      { text: 'Saved setups you re-check in one click, with a timeline of when each one broke and when it recovered.', availability: 'NOT_YET' },
    ],
    // Snapshot of the brief. Confirm against RevenueCat before integration.
    plans: [
      { name: 'Monthly', currency: 'USD', price: '9.99', period: 'per month', availability: 'LIVE' },
      { name: 'Yearly', currency: 'USD', price: '79.99', period: 'per year', availability: 'LIVE' },
      { name: 'Lifetime', currency: 'USD', price: '99.99', period: 'one-time', availability: 'LIVE' },
    ],
    notice: 'During the hackathon, purchases are RevenueCat Test Store transactions. No card is charged.',
    primary: { label: 'See Pro plans', href: '/history' },
  },
  trust: {
    availability: 'LIVE',
    headline: 'Read-only by design.',
    introduction: 'No private keys, no seed phrases, no transactions. The only calls DApp Doctor makes are reads:',
    methods: ['eth_call', 'eth_getCode', 'eth_chainId', 'eth_blockNumber', 'eth_getBlockByNumber'],
    conjunction: 'and',
    security: 'It refuses private and internal network addresses before opening a connection, so it cannot be turned against the infrastructure it runs on.',
    source: 'The code is open source.',
    primary: { label: 'Read the code', href: repository },
  },
  finalCall: {
    availability: 'LIVE',
    headline: 'Your dApp has been lying long enough.',
    primary: { label: 'Diagnose my dApp', href: '/diagnose' },
  },
  footer: {
    availability: 'LIVE',
    body: 'Built for the Burning Token hackathon by NERDCONF, September 2026.',
    navigationLabel: 'Footer navigation',
    links: [
      { label: 'Diagnose', href: '/diagnose', availability: 'LIVE' },
      { label: 'Dashboard', href: '/dashboard', availability: 'LIVE' },
      { label: 'Help', href: '/help', availability: 'LIVE' },
      { label: 'Listen to a chain', href: '/heartbeat', availability: 'LIVE' },
      { label: 'Source code', href: repository, availability: 'LIVE' },
    ],
  },
} as const;

/** The English copy's shape with its words widened to any string; codes and flags stay exact. */
type Copy<T> = T extends Availability | OverallStatus | CheckOutcome
  ? T
  : T extends string
    ? string
    : T extends readonly (infer U)[]
      ? readonly Copy<U>[]
      : T extends object
        ? { readonly [K in keyof T]: Copy<T[K]> }
        : T;

export type LandingCopy = Copy<typeof en>;

const es: LandingCopy = {
  motion: { pauseLabel: 'Pausar el latido' },
  header: {
    availability: 'LIVE',
    name: 'DApp Doctor',
    homeLabel: 'DApp Doctor, página de inicio',
    navigationLabel: 'Navegación principal',
    skip: 'Saltar al contenido',
    links: [
      { label: 'Panel', href: '/dashboard', availability: 'LIVE' },
      { label: 'Diagnosticar', href: '/diagnose', availability: 'LIVE' },
      { label: 'Comparar', href: '/compare', availability: 'LIVE' },
      { label: 'Latido', href: '/heartbeat', availability: 'LIVE' },
      { label: 'Lanzamiento', href: '/launch', availability: 'LIVE' },
      { label: 'Historial', href: '/history', availability: 'LIVE' },
      { label: 'Ayuda', href: '/help', availability: 'LIVE' },
    ],
  },
  hero: {
    availability: 'LIVE',
    headline: 'Tu dApp no está rota. Está mintiendo.',
    body: 'La página carga y el nodo responde, pero el saldo dice cero. DApp Doctor encuentra por qué: la red equivocada, un nodo atrasado o un contrato que no está. Un veredicto en segundos.',
    primary: { label: 'Diagnosticar mi dApp', href: '/diagnose' },
    secondary: { label: 'Mira cómo atrapa una rota', href: '/diagnose?demo=broken' },
  },
  symptoms: {
    availability: 'LIVE',
    headline: 'Las dApps mal configuradas no se caen. Muestran números equivocados.',
    items: [
      { title: 'La red equivocada.', body: 'Tu app se hizo para Base Sepolia. Tu RPC responde Base Mainnet. Cada lectura funciona, y cada lectura está mal.', availability: 'LIVE' },
      { title: 'Un nodo atrasado.', body: 'Responde cada llamada a tiempo, con un estado que dejó de ser cierto hace un minuto.', availability: 'LIVE' },
      { title: 'Un contrato que no está.', body: 'La dirección no tiene código en esta red, así que las lecturas vuelven vacías y tu interfaz muestra ceros como si fueran datos.', availability: 'LIVE' },
    ],
  },
  sixChecks: {
    availability: 'LIVE',
    headline: 'Seis chequeos. Solo lectura. Segundos.',
    items: [
      { title: 'Acceso al RPC', body: '¿La URL responde como un nodo? Si no, ¿es DNS, un tiempo agotado, un límite de pedidos o un error JSON-RPC? Cada uno se arregla distinto.', availability: 'LIVE' },
      { title: 'Identidad de red', body: '¿El nodo está en la red que tu app espera?', availability: 'LIVE' },
      { title: 'Frescura del nodo', body: '¿Su último bloque es reciente, o está sirviendo un estado viejo?', availability: 'LIVE' },
      { title: 'Bytecode del contrato', body: '¿Hay de verdad un contrato en esa dirección, en esta red?', availability: 'LIVE' },
      { title: 'Lectura crítica', body: '¿El contrato responde la llamada que hace tu app, con la forma que tu app espera?', availability: 'LIVE' },
      { title: 'RPC de respaldo', body: '¿Tu respaldo responde, y está en la misma red? Un respaldo en la cadena equivocada falla en silencio el día que lo necesitas.', availability: 'LIVE' },
    ],
  },
  verdicts: {
    availability: 'LIVE',
    headline: 'Un veredicto con el que puedes actuar.',
    items: [
      { status: 'READY', body: 'Pasaron los seis chequeos.', availability: 'LIVE' },
      { status: 'AT_RISK', body: 'No falló nada crítico, pero algo necesita atención o no se pudo revisar.', availability: 'LIVE' },
      { status: 'BLOCKED', body: 'Falló un chequeo crítico. El veredicto nombra la causa raíz, no una lista de síntomas.', availability: 'LIVE' },
    ],
    principles: [
      { text: 'Lo que no se probó nunca cuenta como aprobado.', availability: 'LIVE' },
      { text: 'Cada falla viene con qué hacer.', availability: 'LIVE' },
    ],
  },
  beforeAfter: {
    availability: 'LIVE',
    headline: 'Un reporte no prueba nada. Dos, sí.',
    body: 'Corre la configuración rota y la arreglada lado a lado. DApp Doctor muestra qué chequeos resolvió tu arreglo, y nombra los que rompió.',
    caption: 'Comparación de ejemplo',
    columns: { check: 'Chequeo', before: 'Antes', after: 'Después', change: 'Cambio' },
    rows: [
      { check: 'Identidad de red', before: 'FAIL', after: 'PASS', change: 'arreglado', availability: 'LIVE' },
      { check: 'RPC de respaldo', before: 'NOT_TESTED', after: 'PASS', change: 'arreglado', availability: 'LIVE' },
    ],
    primary: { label: 'Comparar dos configuraciones', href: '/compare' },
  },
  waysIn: {
    availability: 'LIVE',
    headline: 'Trae tu configuración como la tengas.',
    items: [
      { title: 'Completa los datos', body: 'Ingresa la URL del RPC, la red que espera tu app y, si quieres, un contrato y un respaldo.', availability: 'LIVE' },
      { title: 'Pégala', body: 'Una URL de RPC, un archivo .env o tu config de wagmi o hardhat. Se lee en tu navegador; solo se envían los valores que los chequeos necesitan.', availability: 'NOT_YET' },
      {
        title: 'Pídeselo a tu agente',
        body: 'Conecta DApp Doctor a Claude Code o Cursor como servidor MCP. Tu agente lee el proyecto y corre el diagnóstico.',
        command: mcpCommand,
        availability: 'LIVE',
      },
      { title: 'Apúntalo a un repo', body: 'Pega un repositorio público de GitHub y DApp Doctor lee su configuración.', availability: 'NOT_YET' },
    ],
  },
  pro: {
    availability: 'LIVE',
    headline: 'Pro guarda la historia clínica.',
    body: 'Cada diagnóstico se guarda, para ver cuándo se rompió una configuración y probar cuándo se arregló.',
    features: [
      { text: 'Historial de diagnósticos guardado.', availability: 'LIVE' },
      { text: 'Launch Check: una vara más alta antes de ir a mainnet.', availability: 'LIVE' },
      { text: 'Configuraciones guardadas que vuelves a revisar en un clic, con una línea de tiempo de cuándo se rompió y se recuperó cada una.', availability: 'NOT_YET' },
    ],
    plans: [
      { name: 'Mensual', currency: 'USD', price: '9.99', period: 'por mes', availability: 'LIVE' },
      { name: 'Anual', currency: 'USD', price: '79.99', period: 'por año', availability: 'LIVE' },
      { name: 'De por vida', currency: 'USD', price: '99.99', period: 'pago único', availability: 'LIVE' },
    ],
    notice: 'Durante la hackathon, las compras son transacciones de prueba de RevenueCat Test Store. No se cobra ninguna tarjeta.',
    primary: { label: 'Ver los planes Pro', href: '/history' },
  },
  trust: {
    availability: 'LIVE',
    headline: 'Solo lectura, por diseño.',
    introduction: 'Sin claves privadas, sin frases semilla, sin transacciones. Las únicas llamadas que hace DApp Doctor son lecturas:',
    methods: ['eth_call', 'eth_getCode', 'eth_chainId', 'eth_blockNumber', 'eth_getBlockByNumber'],
    conjunction: 'y',
    security: 'Rechaza direcciones de redes privadas e internas antes de abrir una conexión, así que no se puede usar contra la infraestructura donde corre.',
    source: 'El código es abierto.',
    primary: { label: 'Leer el código', href: repository },
  },
  finalCall: {
    availability: 'LIVE',
    headline: 'Tu dApp ya mintió suficiente.',
    primary: { label: 'Diagnosticar mi dApp', href: '/diagnose' },
  },
  footer: {
    availability: 'LIVE',
    body: 'Hecho para la hackathon Burning Token de NERDCONF, septiembre de 2026.',
    navigationLabel: 'Navegación del pie',
    links: [
      { label: 'Diagnosticar', href: '/diagnose', availability: 'LIVE' },
      { label: 'Panel', href: '/dashboard', availability: 'LIVE' },
      { label: 'Ayuda', href: '/help', availability: 'LIVE' },
      { label: 'Escuchar una red', href: '/heartbeat', availability: 'LIVE' },
      { label: 'Código fuente', href: repository, availability: 'LIVE' },
    ],
  },
};

const COPY: Record<Lang, LandingCopy> = { en, es };

export function landingFor(lang: Lang): LandingCopy {
  return COPY[lang];
}

/** The English copy, for places that only need the availability flags. */
export const landing = en;
