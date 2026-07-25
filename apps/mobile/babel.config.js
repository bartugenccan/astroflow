module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Resolve to an absolute path so it works even when Metro transforms
    // files outside apps/mobile (react-native-worklets is not hoisted to the
    // monorepo root, so the bare specifier fails from root node_modules).
    plugins: [require.resolve('react-native-worklets/plugin')],
  };
};
