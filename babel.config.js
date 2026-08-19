module.exports = function (api) {
  // No explicit api.cache(true): api.env('test') below already caches via
  // cache.using() internally, and combining it with api.cache(true)/.forever()
  // throws ("Caching has already been configured with .never or .forever()").
  if (api.env('test')) {
    // Jest only: jest-expo's transformIgnorePatterns un-ignores some
    // React Native ecosystem packages in node_modules so their Flow/JSX can
    // be transpiled. Those files never use NativeWind and must not have
    // their JSX pragma rewritten to require react-native-css-interop, so
    // they're excluded here via `overrides`. This branch must stay test-only:
    // Metro (unlike Jest) computes a cache key by asking Babel which config
    // files apply with no `filename`, and Babel can't evaluate a
    // test/exclude pattern without one — resolving `overrides` outside of
    // Jest breaks Metro bundling entirely.
    return {
      overrides: [
        {
          exclude: /node_modules/,
          presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
        },
        {
          test: /node_modules/,
          presets: ['babel-preset-expo'],
        },
      ],
    };
  }

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
