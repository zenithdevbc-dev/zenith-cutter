module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  // react-native-url-polyfill, @react-native-async-storage/async-storage
  // (usados em src/lib/supabase.ts) e react-native-svg (usado nos
  // gráficos do Dashboard/Relatórios) publicam ESM não transpilado —
  // precisam entrar na exceção do default transformIgnorePatterns, senão
  // o Jest tenta executar "import"/"export" direto e quebra.
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-async-storage/async-storage|react-native-url-polyfill|react-native-svg)/)',
  ],
};
