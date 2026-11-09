// Extends app.json with values that only exist per environment (EAS env vars).
//
// Google Sign-In's config plugin refuses to build without the iOS URL scheme
// (the reversed iOS OAuth client id), so it is added only when configured;
// without it the app simply hides the Google button.
module.exports = ({ config }) => {
  const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ...(googleIosUrlScheme
        ? [["@react-native-google-signin/google-signin", { iosUrlScheme: googleIosUrlScheme }]]
        : []),
    ],
  };
};
