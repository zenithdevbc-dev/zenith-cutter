import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme';

/**
 * Peças de UI compartilhadas pelos 5 modais de formulário de Cadastros
 * (Cliente/Produto/Material/Mesa de Corte/Terceiro) — cabeçalho, rótulo
 * de campo e os estilos comuns. Cada entidade continua com seu próprio
 * componente de formulário (campos diferem bastante, ex. Terceiro tem 8
 * campos contra 4 de Cliente) — só o "chrome" em volta é compartilhado,
 * equivalente ao `Dialog` do shadcn/ui no desktop.
 */
export function FormModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={formStyles.header}>
      <Text style={formStyles.title}>{title}</Text>
      <TouchableOpacity onPress={onClose}>
        <Text style={formStyles.close}>Fechar</Text>
      </TouchableOpacity>
    </View>
  );
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={formStyles.field}>
      <Text style={formStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

export const formStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.card,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  close: {
    color: colors.muted,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  field: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.foreground,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.primaryForeground,
    fontWeight: '700',
    fontSize: 14,
  },
});
