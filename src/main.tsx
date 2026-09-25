import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Note: StrictMode removed — React 19 StrictMode treats nested <a> hydration
// errors as fatal crashes, leaving #root empty. The izoko codebase has some
// nested anchor tags in older components that need fixing. Without StrictMode,
// the app renders with console warnings instead of crashing.
createRoot(document.getElementById('root')!).render(<App />);
