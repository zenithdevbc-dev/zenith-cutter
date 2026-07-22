/**
 * Zenith Cutter — Mobile
 *
 * @format
 */

import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/lib/auth-context';
import { LoginScreen } from './src/screens/LoginScreen';
import { ProducaoScreen } from './src/screens/ProducaoScreen';

function AppContent() {
  const { session, usuario, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  if (!session || !usuario) {
    return <LoginScreen />;
  }

  return <ProducaoScreen />;
}

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;
