const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Supabase + Hermes: OTEL dynamic import sorununu önler
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
