const { version } = require('./package.json');

module.exports = ({ config }) => {
  const IS_DEV = process.env.APP_VARIANT === 'development';

  const base = {
    ...config,
    // Single source of truth: version is always read from package.json.
    // Run `npm version patch|minor|major` to bump — app.json never needs editing.
    version,
  };

  if (IS_DEV) {
    return {
      ...base,
      name: `${base.name} (Dev)`,
      // Amber instead of indigo, so the dev build is tellable apart from the
      // production one at a glance on the home screen.
      icon: './assets/icon-dev.png',
      splash: { ...base.splash, image: './assets/splash-icon-dev.png' },
      plugins: base.plugins.map((plugin) =>
        Array.isArray(plugin) && plugin[0] === 'expo-notifications'
          ? [plugin[0], { ...plugin[1], color: '#F18437' }]
          : plugin
      ),
      ios: {
        ...base.ios,
        bundleIdentifier: base.ios?.bundleIdentifier
          ? `${base.ios.bundleIdentifier}.dev`
          : undefined,
      },
      android: {
        ...base.android,
        package: base.android?.package ? `${base.android.package}.dev` : undefined,
        adaptiveIcon: {
          ...base.android?.adaptiveIcon,
          backgroundColor: '#F18437',
          backgroundImage: './assets/android-icon-background-dev.png',
        },
      },
    };
  }

  return base;
};
