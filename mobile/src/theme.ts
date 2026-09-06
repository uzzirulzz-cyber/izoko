/** PlayBeat brand tokens — matching the storefront dark/amber theme. */
export const colors = {
  bg: '#050814',
  surface: '#0A122E',
  surfaceAlt: '#070C1F',
  border: 'rgba(148,163,184,0.16)',
  borderStrong: 'rgba(148,163,184,0.30)',
  text: '#E2E8F0',
  textDim: '#94A3B8',
  textFaint: '#64748B',
  amber: '#FFC107',
  amberLight: '#FFD54D',
  amberDark: '#F5B800',
  green: '#34D399',
  red: '#F87171',
  sky: '#7DD3FC',
  violet: '#C4B5FD',
  white: '#FFFFFF',
  black: '#0F172A',
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 22 } as const;

export const spacing = (n: number) => n * 4;

/** Format a PKR price the way the storefront does ("Rs 1,250"). */
export function formatPrice(n: number): string {
  return `Rs ${Math.round(n).toLocaleString('en-PK')}`;
}
