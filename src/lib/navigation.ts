export interface NavigationItem {
  href: string;
  label: string;
}

export const primaryNavigation: readonly NavigationItem[] = [
  { href: '/about/', label: 'About' },
  { href: '/features/', label: 'Features' },
  { href: '/compatibility/', label: 'Compatibility' },
  { href: '/docs/', label: 'Docs' },
  { href: '/downloads/', label: 'Downloads' },
];
