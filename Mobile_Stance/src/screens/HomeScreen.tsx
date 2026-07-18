import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/auth-context';

// Placeholder da Fase A — só confirma que login/sessão funcionam de
// ponta a ponta. A tela de Produção (Fase B) substitui isto.
export function HomeScreen() {
  const { usuario, empresa, signOut } = useAuth();

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Zenith Cutter</Text>
      <Text style={styles.text}>Empresa: {empresa?.nome ?? '...'}</Text>
      <Text style={styles.text}>Usuário: {usuario?.nome ?? '...'}</Text>
      <Text style={styles.text}>Papel: {usuario?.papel ?? '...'}</Text>

      <TouchableOpacity style={styles.button} onPress={() => signOut()}>
        <Text style={styles.buttonText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  text: {
    fontSize: 15,
    color: '#374151',
  },
  button: {
    marginTop: 24,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
