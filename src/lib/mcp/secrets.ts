/**
 * Refuses configuration text that carries a wallet secret.
 *
 * An agent reading a project for DApp Doctor will open `.env` files, and
 * those routinely hold a deployer's private key next to the RPC URL. A
 * diagnosis never needs it. Rather than trusting every agent to strip it,
 * the server refuses the whole request when it sees one, so the secret is
 * never parsed, stored or echoed — including in the refusal itself, which
 * names only the line number.
 *
 * This errs on the side of refusing: a 64-hex constant that is not a key
 * gets refused too. That costs the agent one retry; a leaked key costs a
 * wallet.
 */

export interface SecretFinding {
  line: number;
  kind: 'private-key' | 'seed-phrase' | 'secret-variable';
}

/** Keys whose value is a wallet secret by name alone. */
const SECRET_KEY_NAME =
  /(?:private[_-]?key|priv[_-]?key|secret[_-]?key|mnemonic|seed[_-]?phrase|wallet[_-]?seed|deployer[_-]?key)\s*[:=]\s*["'`]?\S/i;

/** A raw 32-byte value: the shape of an EVM private key, with or without 0x. */
const HEX_32_BYTES = /(?:^|[^0-9a-fA-F])(?:0x)?[0-9a-fA-F]{64}(?:[^0-9a-fA-F]|$)/;

/**
 * 12 to 24 short lowercase words as an assigned or quoted value: the shape of
 * a BIP-39 mnemonic. It must follow `=`, `:` or a quote, because a plain
 * English comment also has twelve short lowercase words in a row.
 */
const MNEMONIC = /(?:[=:]\s*["'`]?|["'`])(?:[a-z]{3,8}\s+){11,23}[a-z]{3,8}["'`]?\s*[,;]?\s*$/;

const COMMENT = /^\s*(?:#|\/\/)/;

export function findSecrets(text: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    const lineNumber = index + 1;
    // Value-shape checks ignore URLs: some providers (Ankr, for one) put a
    // 64-hex API key in the RPC path, and that URL is exactly what we need.
    const outsideUrls = line.replace(/https?:\/\/\S+/g, ' ');
    if (SECRET_KEY_NAME.test(line)) {
      findings.push({ line: lineNumber, kind: 'secret-variable' });
    } else if (HEX_32_BYTES.test(outsideUrls)) {
      findings.push({ line: lineNumber, kind: 'private-key' });
    } else if (!COMMENT.test(line) && MNEMONIC.test(outsideUrls)) {
      findings.push({ line: lineNumber, kind: 'seed-phrase' });
    }
  });
  return findings;
}

const KIND_LABEL: Record<SecretFinding['kind'], string> = {
  'private-key': 'a value shaped like a private key',
  'seed-phrase': 'a value shaped like a seed phrase',
  'secret-variable': 'a variable named like a wallet secret',
};

/** The refusal text. Names line numbers only; never repeats the value. */
export function describeSecrets(findings: SecretFinding[]): string {
  const lines = findings.map((finding) => `line ${finding.line}: ${KIND_LABEL[finding.kind]}`).join('; ');
  return (
    `Refused without processing: the text contains ${lines}. ` +
    'DApp Doctor never needs wallet secrets. Remove those lines and send only the ones that set RPC URLs, ' +
    'chain ids and contract addresses — or call diagnose_rpc with the values directly.'
  );
}
