const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Supabase + Hermes: OTEL dynamic import sorununu önler
config.resolver.unstable_enablePackageExports = false;

// Production bundle: drop console.* + sıkı minification (APK boyutu)
config.transformer.minifierConfig = {
  ...(config.transformer.minifierConfig || {}),
  keep_classnames: false,
  keep_fnames: false,
  mangle: { keep_classnames: false, keep_fnames: false },
  output: { ascii_only: true, comments: false },
  compress: { drop_console: true },
};

module.exports = config;
