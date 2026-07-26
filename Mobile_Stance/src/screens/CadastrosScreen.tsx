import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/auth-context';
import { listClientes, updateCliente } from '../lib/clientes';
import { listProdutos, updateProduto } from '../lib/produtos';
import { listTecidos, updateTecido } from '../lib/tecidos';
import { listMesasCorte, updateMesaCorte } from '../lib/mesasCorte';
import type { Cliente, MesaCorte, Produto, Tecido } from '../models';
import { colors } from '../theme';
import { ClienteFormModal } from '../components/cadastros/ClienteFormModal';
import { ProdutoFormModal } from '../components/cadastros/ProdutoFormModal';
import { ProdutoGradeModal } from '../components/cadastros/ProdutoGradeModal';
import { TecidoFormModal } from '../components/cadastros/TecidoFormModal';
import { MesaCorteFormModal } from '../components/cadastros/MesaCorteFormModal';

type SubTab = 'clientes' | 'produtos' | 'materiais' | 'mesas';

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'clientes', label: 'Clientes' },
  { id: 'produtos', label: 'Produtos' },
  { id: 'materiais', label: 'Materiais' },
  { id: 'mesas', label: 'Mesas' },
];

/**
 * Cadastros mobile — porta Clientes/Produtos/Materiais/Mesas de Corte
 * (Terceiros ficou fora, é item próprio da navegação — mesma decisão de
 * 2026-07-24 do desktop). Nenhum dos 4 tem busca no desktop (só Bancas
 * tem) — mantido igual aqui. Sem DELETE físico em nenhum: desativar é
 * sempre o Switch "Ativo" na linha.
 */
export function CadastrosScreen() {
  const { usuario } = useAuth();
  const [subTab, setSubTab] = useState<SubTab>('clientes');

  const [clientes, setClientes] = useState<Cliente[] | null>(null);
  const [produtos, setProdutos] = useState<Produto[] | null>(null);
  const [tecidos, setTecidos] = useState<Tecido[] | null>(null);
  const [mesas, setMesas] = useState<MesaCorte[] | null>(null);

  const [clienteEdit, setClienteEdit] = useState<Cliente | 'novo' | null>(null);
  const [produtoEdit, setProdutoEdit] = useState<Produto | 'novo' | null>(null);
  const [tecidoEdit, setTecidoEdit] = useState<Tecido | 'novo' | null>(null);
  const [mesaEdit, setMesaEdit] = useState<MesaCorte | 'novo' | null>(null);
  const [produtoGrade, setProdutoGrade] = useState<Produto | null>(null);

  const reload = useCallback(async () => {
    try {
      const [c, p, t, m] = await Promise.all([listClientes(), listProdutos(), listTecidos(), listMesasCorte()]);
      setClientes(c);
      setProdutos(p);
      setTecidos(t);
      setMesas(m);
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível carregar os cadastros.');
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleToggleClienteAtivo(item: Cliente, ativo: boolean) {
    try {
      await updateCliente(item.id, { ativo });
      await reload();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível atualizar o cliente.');
    }
  }

  async function handleToggleProdutoAtivo(item: Produto, ativo: boolean) {
    try {
      await updateProduto(item.id, { ativo });
      await reload();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível atualizar o produto.');
    }
  }

  async function handleToggleTecidoAtivo(item: Tecido, ativo: boolean) {
    try {
      await updateTecido(item.id, { ativo });
      await reload();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível atualizar o material.');
    }
  }

  async function handleToggleMesaAtivo(item: MesaCorte, ativo: boolean) {
    try {
      await updateMesaCorte(item.id, { ativo });
      await reload();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível atualizar a mesa de corte.');
    }
  }

  const empresaId = usuario?.empresa_id ?? '';

  return (
    <View style={styles.screen}>
      <View style={styles.subTabs}>
        {SUB_TABS.map((tab) => (
          <TouchableOpacity key={tab.id} style={styles.subTabCell} onPress={() => setSubTab(tab.id)}>
            <Text style={[styles.subTabLabel, subTab === tab.id && styles.subTabLabelAtiva]}>{tab.label}</Text>
            {subTab === tab.id && <View style={styles.subTabAccent} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {subTab === 'clientes' && (
          <>
            <AddButton label="Novo Cliente" onPress={() => setClienteEdit('novo')} />
            {clientes === null ? (
              <ActivityIndicator />
            ) : clientes.length === 0 ? (
              <Text style={styles.empty}>Nenhum cliente cadastrado.</Text>
            ) : (
              clientes.map((item) => (
                <ListRow
                  key={item.id}
                  titulo={item.nome}
                  subtitulo={item.documento ?? item.telefone ?? undefined}
                  ativo={item.ativo}
                  onToggleAtivo={(ativo) => handleToggleClienteAtivo(item, ativo)}
                  onPress={() => setClienteEdit(item)}
                />
              ))
            )}
          </>
        )}

        {subTab === 'produtos' && (
          <>
            <AddButton label="Novo Produto" onPress={() => setProdutoEdit('novo')} />
            {produtos === null ? (
              <ActivityIndicator />
            ) : produtos.length === 0 ? (
              <Text style={styles.empty}>Nenhum produto cadastrado.</Text>
            ) : (
              produtos.map((item) => (
                <ListRow
                  key={item.id}
                  titulo={item.nome}
                  subtitulo={item.codigo ?? undefined}
                  ativo={item.ativo}
                  onToggleAtivo={(ativo) => handleToggleProdutoAtivo(item, ativo)}
                  onPress={() => setProdutoEdit(item)}
                  acaoExtra={{ label: 'Grade', onPress: () => setProdutoGrade(item) }}
                />
              ))
            )}
          </>
        )}

        {subTab === 'materiais' && (
          <>
            <AddButton label="Novo Material" onPress={() => setTecidoEdit('novo')} />
            {tecidos === null ? (
              <ActivityIndicator />
            ) : tecidos.length === 0 ? (
              <Text style={styles.empty}>Nenhum material cadastrado.</Text>
            ) : (
              tecidos.map((item) => (
                <ListRow
                  key={item.id}
                  titulo={item.nome}
                  subtitulo={item.cor ?? item.composicao ?? undefined}
                  ativo={item.ativo}
                  onToggleAtivo={(ativo) => handleToggleTecidoAtivo(item, ativo)}
                  onPress={() => setTecidoEdit(item)}
                />
              ))
            )}
          </>
        )}

        {subTab === 'mesas' && (
          <>
            <AddButton label="Nova Mesa de Corte" onPress={() => setMesaEdit('novo')} />
            {mesas === null ? (
              <ActivityIndicator />
            ) : mesas.length === 0 ? (
              <Text style={styles.empty}>Nenhuma mesa de corte cadastrada.</Text>
            ) : (
              mesas.map((item) => (
                <ListRow
                  key={item.id}
                  titulo={item.nome}
                  subtitulo={item.observacoes ?? undefined}
                  ativo={item.ativo}
                  onToggleAtivo={(ativo) => handleToggleMesaAtivo(item, ativo)}
                  onPress={() => setMesaEdit(item)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      <ClienteFormModal
        visible={clienteEdit !== null}
        cliente={clienteEdit === 'novo' ? null : clienteEdit}
        empresaId={empresaId}
        onClose={() => setClienteEdit(null)}
        onSaved={reload}
      />
      <ProdutoFormModal
        visible={produtoEdit !== null}
        produto={produtoEdit === 'novo' ? null : produtoEdit}
        empresaId={empresaId}
        onClose={() => setProdutoEdit(null)}
        onSaved={reload}
      />
      <ProdutoGradeModal
        visible={produtoGrade !== null}
        produto={produtoGrade}
        empresaId={empresaId}
        onClose={() => setProdutoGrade(null)}
      />
      <TecidoFormModal
        visible={tecidoEdit !== null}
        tecido={tecidoEdit === 'novo' ? null : tecidoEdit}
        empresaId={empresaId}
        onClose={() => setTecidoEdit(null)}
        onSaved={reload}
      />
      <MesaCorteFormModal
        visible={mesaEdit !== null}
        mesa={mesaEdit === 'novo' ? null : mesaEdit}
        empresaId={empresaId}
        onClose={() => setMesaEdit(null)}
        onSaved={reload}
      />
    </View>
  );
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.addButton} onPress={onPress}>
      <Text style={styles.addButtonText}>+ {label}</Text>
    </TouchableOpacity>
  );
}

function ListRow({
  titulo,
  subtitulo,
  ativo,
  onToggleAtivo,
  onPress,
  acaoExtra,
}: {
  titulo: string;
  subtitulo?: string;
  ativo: boolean;
  onToggleAtivo: (ativo: boolean) => void;
  onPress: () => void;
  acaoExtra?: { label: string; onPress: () => void };
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitulo}>{titulo}</Text>
        {subtitulo ? <Text style={styles.rowSubtitulo}>{subtitulo}</Text> : null}
      </View>
      {acaoExtra && (
        <TouchableOpacity style={styles.rowAcaoExtra} onPress={acaoExtra.onPress}>
          <Text style={styles.rowAcaoExtraTexto}>{acaoExtra.label}</Text>
        </TouchableOpacity>
      )}
      <Switch value={ativo} onValueChange={onToggleAtivo} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  subTabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subTabCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  subTabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  subTabLabelAtiva: {
    color: colors.primary,
  },
  subTabAccent: {
    marginTop: 6,
    height: 2,
    width: 24,
    borderRadius: 1,
    backgroundColor: colors.primary,
  },
  content: {
    padding: 16,
    gap: 8,
  },
  empty: {
    fontSize: 13,
    color: colors.muted,
  },
  addButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 8,
  },
  addButtonText: {
    color: colors.primaryForeground,
    fontWeight: '700',
    fontSize: 13,
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
  rowAcaoExtra: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rowAcaoExtraTexto: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.foreground,
  },
});
