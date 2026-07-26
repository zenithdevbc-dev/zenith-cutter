import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors } from '../../theme';

/** Botão de filtro compacto (abre um `SelectModal`) — reutilizado pelas 6 abas de Relatórios. */
export function FiltroChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.chip} onPress={onPress}>
      <Text style={styles.texto} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: 150,
  },
  texto: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.foreground,
  },
});
