/**
 * Zenith Cutter — Mobile
 *
 * @format
 */

import { useMemo, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppHeader } from './src/components/AppHeader';
import { BottomTabBar } from './src/components/BottomTabBar';
import { AuthProvider, useAuth } from './src/lib/auth-context';
import { getAllowedNavItems, type PageId } from './src/navigation';
import { BancasScreen } from './src/screens/BancasScreen';
import { CadastrosScreen } from './src/screens/CadastrosScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { OrdensCorteScreen } from './src/screens/OrdensCorteScreen';
import { ProducaoScreen } from './src/screens/ProducaoScreen';
import { RelatoriosScreen } from './src/screens/RelatoriosScreen';

function PageContent({ page }: { page: PageId }) {
  switch (page) {
    case 'dashboard':
      return <DashboardScreen />;
    case 'ordens-corte':
      return <OrdensCorteScreen />;
    case 'producao':
      return <ProducaoScreen />;
    case 'cadastros':
      return <CadastrosScreen />;
    case 'bancas':
      return <BancasScreen />;
    case 'relatorios':
      return <RelatoriosScreen />;
    default:
      return null;
  }
}

function AppContent() {
  const { session, usuario, empresa, loading, signOut } = useAuth();
  const allowedItems = useMemo(() => getAllowedNavItems(usuario?.papel), [usuario?.papel]);
  const [activePage, setActivePage] = useState<PageId>('dashboard');

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

  const paginaAtiva = allowedItems.some((item) => item.id === activePage)
    ? activePage
    : (allowedItems[0]?.id ?? 'dashboard');

  return (
    <View style={styles.app}>
      <AppHeader empresaNome={empresa?.nome} usuarioNome={usuario.nome} onSignOut={() => signOut()} />
      <View style={styles.content}>
        <PageContent page={paginaAtiva} />
      </View>
      <BottomTabBar items={allowedItems} active={paginaAtiva} onSelect={setActivePage} />
    </View>
  );
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
  app: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default App;
