// mobile-1 has no metro.config.js by default (neither does mobile/) — this one exists solely to
// wire react-native-svg-transformer so `import Icon from '../assets/foo.svg'` works, per
// UI_REBUILD.md Phase 3. Standard integration recipe from expo/metro-config + the transformer's
// own docs — SDK 57's getDefaultConfig shape is unchanged for this.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
};

module.exports = config;
