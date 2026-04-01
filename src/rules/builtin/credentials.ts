import type { Rule, RuleContext } from '../rule.js';
import type { Finding } from '../../core/file-entry.js';

const CREDENTIAL_PATTERNS = [
  { pattern: /\.pem$/, desc: 'PEM certificate/key' },
  { pattern: /\.key$/, desc: 'private key' },
  { pattern: /\.p12$/, desc: 'PKCS#12 keystore' },
  { pattern: /\.pfx$/, desc: 'PFX certificate' },
  { pattern: /\.keystore$/, desc: 'Java keystore' },
  { pattern: /\.jks$/, desc: 'Java keystore' },
  { pattern: /(?:^|[/\\])id_rsa/, desc: 'SSH private key' },
  { pattern: /(?:^|[/\\])id_ed25519/, desc: 'SSH private key' },
  { pattern: /(?:^|[/\\])id_ecdsa/, desc: 'SSH private key' },
  { pattern: /(?:^|[/\\])credentials\.json$/, desc: 'credentials file' },
  { pattern: /(?:^|[/\\])service[-_]?account.*\.json$/, desc: 'service account credentials' },
  { pattern: /(?:^|[/\\])\.gcp[-_]?credentials/, desc: 'GCP credentials' },
  { pattern: /(?:^|[/\\])\.aws[/\\]credentials/, desc: 'AWS credentials' },
  { pattern: /(?:^|[/\\])\.npmrc$/, desc: 'npm auth token' },
  { pattern: /(?:^|[/\\])\.pypirc$/, desc: 'PyPI auth token' },
];

export const credentialsRule: Rule = {
  id: 'credentials',
  name: 'Credential File Detection',
  description: 'Detects private keys, certificates, and credential files',
  defaultSeverity: 'block',

  async run(ctx: RuleContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const file of ctx.files) {
      for (const { pattern, desc } of CREDENTIAL_PATTERNS) {
        if (pattern.test(file.relativePath)) {
          findings.push({
            ruleId: 'credentials',
            severity: this.defaultSeverity,
            filePath: file.relativePath,
            message: `${desc} "${file.relativePath}" should not be published`,
            suggestion: `Add "${file.relativePath}" to .npmignore`,
          });
          break;
        }
      }
    }

    return findings;
  },
};
