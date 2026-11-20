export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: {
    androidScheme?: string;
  };
  android?: {
    allowMixedContent?: boolean;
    backgroundColor?: string;
  };
  plugins?: {
    SplashScreen?: {
      launchShowDuration?: number;
      launchAutoHide?: boolean;
      backgroundColor?: string;
      androidSplashResourceName?: string;
      showSpinner?: boolean;
    };
    StatusBar?: {
      style?: string;
      backgroundColor?: string;
      overlaysWebView?: boolean;
    };
    Keyboard?: {
      resize?: string;
      style?: string;
      resizeOnFullScreen?: boolean;
    };
  };
}

const config: CapacitorConfig = {
  appId: 'com.nexacalculator.app',
  appName: 'NEXA Calculator',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#07090E',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 450,
      launchAutoHide: true,
      backgroundColor: '#07090E',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#07090E',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
