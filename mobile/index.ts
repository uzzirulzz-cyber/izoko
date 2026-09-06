import { registerRootComponent } from 'expo';

import App from './src/App';

// registerRootComponent ensures the environment is set up consistently
// across Expo Go, development builds and production standalone builds.
registerRootComponent(App);
