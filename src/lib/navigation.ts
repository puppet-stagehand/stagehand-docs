export interface NavigationItem {
  href: string;
  label: string;
}

export const primaryNavigation: readonly NavigationItem[] = [
  { href: '/docs/why-stagehand/', label: 'Why Stagehand?' },
  { href: '/features/', label: 'Features' },
  { href: '/compatibility/', label: 'Compatibility' },
  { href: '/docs/', label: 'Docs' },
  { href: '/downloads/', label: 'Downloads' },
];
