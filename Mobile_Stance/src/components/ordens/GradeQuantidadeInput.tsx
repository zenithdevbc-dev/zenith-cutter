import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { ProdutoTamanho } from '../../models';
import { colors } from '../../theme';

interface GradeQuantidadeInputProps {
  grade: ProdutoTamanho[];
  quantidades: Record<string, string>;
  onChange: (produtoTamanhoId: string, valor: string) => void;
}

/** Grid de quantidade por tamanho — compartilhado entre criar e editar Ordem de Corte. */
export function GradeQuantidadeInput({ grade, quantidades, onChange }: GradeQuantidadeInputProps) {
  if (grade.length === 0) {
    return <Text style={styles.empty}>Selecione um produto com grade de tamanhos cadastrada.</Text>;
  }

  return (
    <View style={styles.grid}>
      {grade.map((tamanho) => (
        <View key={tamanho.id} style={styles.item}>
          <Text style={styles.label}>{tamanho.tamanho}</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={quantidades[tamanho.id] ?? ''}
            onChangeText={(valor) => onChange(tamanho.id, valor)}
            placeholder="0"
            placeholderTextColor={colors.muted}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  item: {
    width: 72,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 14,
    color: colors.foreground,
  },
  empty: {
    fontSize: 12,
    color: colors.muted,
  },
});
