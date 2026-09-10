/**
 * Known networks. This exists only so the report can say
 * "you are pointing at Base Mainnet instead of Base Sepolia" rather than
 * "8453 != 84532". A chain ID missing from this table is not an error:
 * it is reported by number.
 */
export interface KnownNetwork {
  chainId: number;
  name: string;
  /** Public RPC, no API key. Used as a default fallback. */
  publicRpcUrl: string;
  testnet: boolean;
}

export const KNOWN_NETWORKS: Record<number, KnownNetwork> = {
  8453: {
    chainId: 8453,
    name: 'Base Mainnet',
    publicRpcUrl: 'https://mainnet.base.org',
    testnet: false,
  },
  84532: {
    chainId: 84532,
    name: 'Base Sepolia',
    publicRpcUrl: 'https://sepolia.base.org',
    testnet: true,
  },
  1: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    publicRpcUrl: 'https://eth.llamarpc.com',
    testnet: false,
  },
  11155111: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    publicRpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    testnet: true,
  },
};

/** Readable name for a chain ID, or the raw number if unknown. */
export function describeChain(chainId: number): string {
  return KNOWN_NETWORKS[chainId]?.name ?? `chain ID ${chainId}`;
}
