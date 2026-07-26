import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

/**
 * Placeholder temporário — usado só durante a expansão do mobile
 * enquanto uma tela ainda não foi implementada na fase corrente. Cada
 * uso é substituído pela tela real assim que a fase correspondente é
 * concluída; não deve sobrar nenhum no fim da expansão.
 */
export function PlaceholderScreen({ titulo }: { titulo: string }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.texto}>{titulo} — em construção.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  texto: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
});
