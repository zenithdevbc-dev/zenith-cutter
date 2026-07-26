import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/auth-context';
import { listBancas, updateBanca } from '../lib/bancas';
import type { Banca } from '../models';
import { colors } from '../theme';
import { BancaFormModal } from '../components/cadastros/BancaFormModal';

type FiltroStatus = 'todas' | 'ativas' | 'inativas';

/**
 * Terceiros (tabela `bancas`) — item próprio da navegação (decisão de
 * 2026-07-24 no desktop). Único cadastro com busca + filtro de status,
 * mesmo padrão do desktop (os outros 4 não têm).
 */
export function BancasScreen() {
  const { usuario } = useAuth();
  const [bancas, setBancas] = useState<Banca[] | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todas');
  const [edit, setEdit] = useState<Banca | 'novo' | null>(null);

  const reload = useCallback(async () => {
    try {
      setBancas(await listBancas());
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível carregar os terceiros.');
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleToggleAtivo(item: Banca, ativo: boolean) {
    try {
      await updateBanca(item.id, { ativo });
      await reload();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível atualizar o terceiro.');
    }
  }

  const filtradas = useMemo(() => {
    if (!bancas) return [];
    const termo = busca.trim().toLowerCase();
    return bancas.filter((b) => {
      if (filtroStatus === 'ativas' && !b.ativo) return false;
      if (filtroStatus === 'inativas' && b.ativo) return false;
      if (!termo) return true;
      return (
        b.nome.toLowerCase().includes(termo) ||
        (b.responsavel ?? '').toLowerCase().includes(termo) ||
        (b.telefone ?? '').toLowerCase().includes(termo) ||
        (b.email ?? '').toLowerCase().includes(termo)
      );
    });
  }, [bancas, busca, filtroStatus]);

  const empresaId = usuario?.empresa_id ?? '';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.addButton} onPress={() => setEdit('novo')}>
          <Text style={styles.addButtonText}>+ Novo Terceiro</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Buscar por nome, responsável, telefone ou e-mail..."
          placeholderTextColor={colors.muted}
          value={busca}
          onChangeText={setBusca}
        />

        <View style={styles.filtroRow}>
          {(['todas', 'ativas', 'inativas'] as FiltroStatus[]).map((opcao) => (
            <TouchableOpacity
              key={opcao}
              style={[styles.filtroChip, filtroStatus === opcao && styles.filtroChipAtivo]}
              onPress={() => setFiltroStatus(opcao)}>
              <Text style={[styles.filtroChipTexto, filtroStatus === opcao && styles.filtroChipTextoAtivo]}>
                {opcao === 'todas' ? 'Todas' : opcao === 'ativas' ? 'Ativas' : 'Inativas'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {bancas === null ? (
          <ActivityIndicator />
        ) : filtradas.length === 0 ? (
          <Text style={styles.empty}>Nenhum terceiro encontrado.</Text>
        ) : (
          filtradas.map((item) => (
            <TouchableOpacity key={item.id} style={styles.row} onPress={() => setEdit(item)} activeOpacity={0.7}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitulo}>{item.nome}</Text>
                {(item.responsavel || item.tipo_servico) && (
                  <Text style={styles.rowSubtitulo}>
                    {[item.responsavel, item.tipo_servico].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </View>
              <Switch value={item.ativo} onValueChange={(ativo) => handleToggleAtivo(item, ativo)} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <BancaFormModal
        visible={edit !== null}
        banca={edit === 'novo' ? null : edit}
        empresaId={empresaId}
        onClose={() => setEdit(null)}
        onSaved={reload}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 8,
  },
  addButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 4,
  },
  addButtonText: {
    color: colors.primaryForeground,
    fontWeight: '700',
    fontSize: 13,
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
  filtroRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  filtroChip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  filtroChipAtivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filtroChipTexto: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.foreground,
  },
  filtroChipTextoAtivo: {
    color: colors.primaryForeground,
  },
  empty: {
    fontSize: 13,
    color: colors.muted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
});
