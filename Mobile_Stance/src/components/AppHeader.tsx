import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme';

/**
 * Cabeçalho compartilhado por todas as telas (extraído de
 * `ProducaoScreen.tsx`, que era a única tela antes desta expansão —
 * agora fica montado uma única vez em `App.tsx`, acima da troca de
 * tela, em vez de duplicado em cada uma).
 */
export function AppHeader({
  empresaNome,
  usuarioNome,
  onSignOut,
}: {
  empresaNome: string | undefined;
  usuarioNome: string | undefined;
  onSignOut: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTitleRow}>
        <View style={styles.headerAccent} />
        <View>
          <Text style={styles.headerTitle}>Zenith Cutter</Text>
          <Text style={styles.headerSubtitle}>
            {empresaNome ?? '...'} · {usuarioNome ?? '...'}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={onSignOut}>
        <Text style={styles.signOut}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.foreground,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#cbd5e1',
    fontSize: 12,
    marginTop: 2,
  },
  signOut: {
    color: '#f87171',
    fontWeight: '600',
  },
});
