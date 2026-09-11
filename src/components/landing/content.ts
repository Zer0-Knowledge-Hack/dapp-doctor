import type { OverallStatus } from '@/lib/diagnostics/types';

export type Availability = 'LIVE' | 'NOT_YET';
export const isLive = (item: { availability: Availability }): boolean =>
  item.availability === 'LIVE';

const repository = 'https://github.com/Zer0-Knowledge-Hack/dapp-doctor';
const diagnose = { label: 'Diagnose my dApp', href: '/diagnose' } as const;

export const statusLabels: Record<OverallStatus, string> = {
  READY: 'READY',
  AT_RISK: 'AT RISK',
  BLOCKED: 'BLOCKED',
  NOT_TESTED: 'NOT TESTED',
};

export const landing = {
  motion: { pauseLabel: 'Pause heartbeat' },
  header: {
    availability: 'LIVE',
    name: 'DApp Doctor',
    navigationLabel: 'Main navigation',
    skip: 'Skip to content',
    links: [
      { label: 'Diagnose', href: '/diagnose', availability: 'LIVE' },
      { label: 'Compare', href: '/compare', availability: 'LIVE' },
      { label: 'Pro', href: '/history', availability: 'LIVE' },
      { label: 'Heartbeat', href: '/heartbeat', availability: 'LIVE' },
      { label: 'Source code', href: repository, availability: 'LIVE' },
    ],
  },
  hero: {
    availability: 'LIVE',
    headline: "Your dApp isn't broken. It's lying.",
    body: "The page loads and the node answers, but the balance says zero. DApp Doctor finds out why: the wrong network, a lagging node, or a contract that isn't there. Get a verdict in seconds.",
    primary: diagnose,
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
      { check: 'Fallback RPC', before: 'NOT TESTED', after: 'PASS', change: 'fixed', availability: 'LIVE' },
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
        command: 'claude mcp add --transport http dapp-doctor https://dapp-doctor.vercel.app/api/mcp',
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
    primary: diagnose,
  },
  footer: {
    availability: 'LIVE',
    body: 'Built for the Burning Token hackathon by NERDCONF, September 2026.',
    navigationLabel: 'Footer navigation',
    links: [
      { label: 'Diagnose', href: '/diagnose', availability: 'LIVE' },
      { label: 'Listen to a chain', href: '/heartbeat', availability: 'LIVE' },
      { label: 'Source code', href: repository, availability: 'LIVE' },
    ],
  },
} as const;
