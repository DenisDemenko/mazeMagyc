
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mazebridgerunner.app',
  appName: 'Maze Bridge Runner',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Keyboard: {
      resize: 'none',
    },
    SplashScreen: {
      launchShowDuration: 0,
    }
  }
};

export default config;
