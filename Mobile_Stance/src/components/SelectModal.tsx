import { FlatList, Modal, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors } from '../theme';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectModalProps {
  visible: boolean;
  title: string;
  options: SelectOption[];
  onSelect: (value: string) => void;
  onClose: () => void;
  emptyMessage?: string;
}

/**
 * Lista de opções em modal — equivalente simples do `<Select>` do
 * shadcn/ui usado no desktop, sem depender de um picker nativo (mais
 * previsível entre versões do Android).
 */
export function SelectModal({
  visible,
  title,
  options,
  onSelect,
  onClose,
  emptyMessage = 'Nenhuma opção disponível.',
}: SelectModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {options.length === 0 ? (
            <Text style={styles.empty}>{emptyMessage}</Text>
          ) : (
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              style={styles.list}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => onSelect(item.value)}>
                  <Text style={styles.optionText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          )}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '70%',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderTopWidth: 3,
    borderTopColor: colors.primary,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 12,
  },
  empty: {
    fontSize: 14,
    color: colors.muted,
    paddingVertical: 12,
  },
  list: {
    flexGrow: 0,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: {
    fontSize: 15,
    color: colors.foreground,
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.muted,
    fontWeight: '600',
  },
});
