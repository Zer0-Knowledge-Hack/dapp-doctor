/**
 * The chains the monitor can listen to in one click. Each endpoint was checked
 * to accept requests straight from a browser (CORS), since the heartbeat is
 * read from the viewer's browser, not through our servers.
 */
export interface Patient {
  id: string;
  label: string;
  rpcUrl: string;
  /** What the chain is expected to answer. null when we cannot know in advance. */
  chainId: number | null;
  /** Typical seconds between blocks, which sets the polling pace and the coma threshold. */
  expectedBlockSeconds: number;
  note: string;
}

export const PATIENTS: Patient[] = [
  {
    id: 'base',
    label: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    chainId: 8453,
    expectedBlockSeconds: 2,
    note: 'A block every 2 seconds. A healthy, fast heart.',
  },
  {
    id: 'ethereum',
    label: 'Ethereum',
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    chainId: 1,
    expectedBlockSeconds: 12,
    note: 'A block every 12 seconds. Calm, like a sleeping whale.',
  },
  {
    id: 'base-sepolia',
    label: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    chainId: 84532,
    expectedBlockSeconds: 2,
    note: 'The testnet twin. Same rhythm, nothing at stake.',
  },
  {
    id: 'dead',
    label: 'A dead RPC',
    // .invalid is reserved and never resolves (RFC 2606): a real, guaranteed
    // outage, not a simulated one.
    rpcUrl: 'https://rpc.flatline.invalid',
    chainId: null,
    expectedBlockSeconds: 2,
    note: 'An address that can never answer. Bring the defibrillator.',
  },
];

/** Seconds between blocks assumed for an RPC someone pastes, until the chain says otherwise. */
export const CUSTOM_BLOCK_SECONDS = 2;
