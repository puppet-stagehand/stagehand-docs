export type SupportStatus = 'supported' | 'compatible' | 'limited' | 'deprecated' | 'unsupported';

export interface Tier {
  id: 'openvox' | 'puppet-core' | 'puppet-enterprise' | 'pe-advanced';
  name: string;
  audience: string;
  entitlement: 'community' | 'commercial' | 'advanced';
  summary: string;
  features: string[];
}

export interface CompatibilityRecord {
  id: string;
  platform: string;
  puppet_versions: string;
  stagehand_versions: string;
  tier: Tier['id'];
  provider: string;
  transport: string;
  operating_systems: string[];
  status: SupportStatus;
  limitations: string[];
  docs_path: string;
  evidence_url: string;
  last_verified: string;
}
