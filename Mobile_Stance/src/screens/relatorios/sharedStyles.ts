import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

/** Estilos compartilhados pelas 6 abas de Relatórios (filtros, KPIs, linhas de tabela). */
export const relatoriosStyles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 10,
  },
  filtrosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filtroChip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: 150,
  },
  filtroChipTexto: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.foreground,
  },
  datasRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.foreground,
  },
  dataInput: {
    flex: 1,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subtitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: 8,
  },
  empty: {
    fontSize: 13,
    color: colors.muted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowMain: {
    flex: 1,
  },
  rowTitulo: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
  },
  rowSubtitulo: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  rowBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.foreground,
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
