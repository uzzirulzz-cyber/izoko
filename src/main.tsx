import { createRoot, hydrateRoot } from 'react-dom/client';
import React from 'react';
import App from './App.tsx';
import { HeroSurfaceBridge, heroReplicaPresent } from './heroBridge';
import './index.css';

// Error boundary to catch render crashes and show a fallback
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error('React render crash:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        style: { padding: '2rem', color: '#fff', background: '#050814', minHeight: '100vh', fontFamily: 'monospace' }
      },
        React.createElement('h1', null, 'Something went wrong'),
        React.createElement('pre', { style: { fontSize: '12px', overflow: 'auto' } },
          this.state.error?.message || String(this.state.error || 'Unknown error')),
        React.createElement('button', {
          onClick: () => { this.setState({ hasError: false, error: null }); window.location.reload(); },
          style: { marginTop: '1rem', padding: '0.5rem 1rem', background: '#F4C542', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer' }
        }, 'Reload')
      );
    }
    return this.props.children;
  }
}

const root = document.getElementById('root')!;

// ---- Perf (task §5): ADOPT the static hero replica instead of re-creating
// it. On the homepage the server shipped <div id="hero-root"> with the exact
// markup HeroSurfaceBridge renders. Hydrating it keeps the same DOM node the
// browser already painted (early LCP); createRoot below then never has to
// re-create the hero. On non-home routes the static replica is stripped
// immediately (same pre-mount flash window as the old in-#root block) and
// the surface renders on demand after client-side navigation to home.
const heroRoot = document.getElementById('hero-root');
if (heroRoot && heroReplicaPresent()) {
  const p = window.location.pathname.toLowerCase().replace(/\/+$/, '').replace(/^\//, '');
  const isHome = p === '' || p === 'storefront';
  if (isHome) {
    hydrateRoot(heroRoot, React.createElement(HeroSurfaceBridge));
  } else {
    heroRoot.innerHTML = '';
  }
}

createRoot(root).render(
  React.createElement(ErrorBoundary, null, React.createElement(App))
);
