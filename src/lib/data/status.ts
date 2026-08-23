import type { SupportStatus } from './types';

export interface StatusPresentation {
  label: string;
  symbol: 'check-circle' | 'link' | 'alert-triangle' | 'clock' | 'x-circle';
}

const presentations: Record<SupportStatus, StatusPresentation> = {
  supported: { label: 'Supported', symbol: 'check-circle' },
  compatible: { label: 'Compatible', symbol: 'link' },
  limited: { label: 'Limited', symbol: 'alert-triangle' },
  deprecated: { label: 'Deprecated', symbol: 'clock' },
  unsupported: { label: 'Unsupported', symbol: 'x-circle' },
};

export const statusPresentation = (status: SupportStatus): StatusPresentation =>
  presentations[status];
