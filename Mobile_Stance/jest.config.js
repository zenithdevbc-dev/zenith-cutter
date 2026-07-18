module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  // react-native-url-polyfill e @react-native-async-storage/async-storage
  // (usados em src/lib/supabase.ts) publicam ESM não transpilado —
  // precisam entrar na exceção do default transformIgnorePatterns, senão
  // o Jest tenta executar "import" direto e quebra.
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-async-storage/async-storage|react-native-url-polyfill)/)',
  ],
};
