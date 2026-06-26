import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aspmm.app',
  appName: 'ASPMM',
  webDir: 'public',
  server: {
    url: 'https://aspmm.netlify.app',
    cleartext: true
  }
};

export default config;
