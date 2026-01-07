import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.nutri.app',
    appName: 'Nutri',
    webDir: 'out',

    // For development, point to local server
    // For production, remove this and use static files
    server: {
        // Use localhost for development
        url: 'http://localhost:3000',
        cleartext: true, // Allow HTTP for development
    },

    android: {
        // Allow mixed content (HTTP) in development
        allowMixedContent: true,

        // Splash screen config
        backgroundColor: '#000000',

        // Enable deep links
        // appendUserAgent: 'NutriApp',
    },

    plugins: {
        // Camera permissions for meal photos
        Camera: {
            permissions: ['photos', 'camera'],
        },
    },
};

export default config;
