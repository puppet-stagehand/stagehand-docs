export interface NavigationItem {
  href: string;
  label: string;
}

export const primaryNavigation: readonly NavigationItem[] = [
  { href: '/features/', label: 'Features' },
  { href: '/tiers/', label: 'Tiers' },
  { href: '/compatibility/', label: 'Compatibility' },
  { href: '/docs/', label: 'Docs' },
  { href: '/downloads/', label: 'Downloads' },
  { href: '/support/', label: 'Support' },
];
