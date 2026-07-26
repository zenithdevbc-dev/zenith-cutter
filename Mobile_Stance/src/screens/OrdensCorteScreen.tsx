import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../lib/auth-context';
import { usePinConfirm } from '../components/usePinConfirm';
import { SelectModal, type SelectOption } from '../components/SelectModal';
import { OrdemCorteFormModal } from '../components/ordens/OrdemCorteFormModal';
import { InfoOrdemCorteModal } from '../components/ordens/InfoOrdemCorteModal';
import { arquivarOrdem, duplicateOrdemCorte, listOrdensCorte, updateOrdemCorte } from '../lib/ordensCorte';
import { listClientes } from '../lib/clientes';
import { listProdutos } from '../lib/produtos';
import { listTecidos } from '../lib/tecidos';
import {
  PIPELINE_PRODUCAO,
  STATUS_ORDEM_CORTE_LABEL,
  type Cliente,
  type OrdemCorteResumo,
  type Produto,
  type StatusOrdemCorte,
  type Tecido,
} from '../models';
import { colors } from '../theme';

const TODAS_ETAPAS: StatusOrdemCorte[] = [
  'planejado',
  'em_fila',
  'enfesto',
  'corte',
  'embalagem',
  'despacho',
  'pronto',
  'cancelada',
];

/**
 * Ordens de Corte mobile (admin/supervisor) — porta `OrdensCortePage.tsx`.
 * Filtragem 100% client-side sobre o array já buscado (mesmo padrão do
 * desktop). "Mostrar arquivadas" é mutuamente exclusivo com o filtro de
 * etapa — mesma lógica exata do desktop.
 */
export function OrdensCorteScreen() {
  const { usuario } = useAuth();
  const { confirm: confirmPin, dialog: pinDialog } = usePinConfirm();

  const [ordens, setOrdens] = useState<OrdemCorteResumo[] | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [tecidos, setTecidos] = useState<Tecido[]>([]);

  const [busca, setBusca] = useState('');
  const [etapas, setEtapas] = useState<StatusOrdemCorte[]>([]);
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [clienteId, setClienteId] = useState('todos');
  const [produtoId, setProdutoId] = useState('todos');
  const [tecidoId, setTecidoId] = useState('todos');

  const [filtroAberto, setFiltroAberto] = useState<'etapa' | 'cliente' | 'produto' | 'material' | null>(null);
  const [formAberto, setFormAberto] = useState<OrdemCorteResumo | 'novo' | null>(null);
  const [infoAberto, setInfoAberto] = useState<OrdemCorteResumo | null>(null);

  const reload = useCallback(async () => {
    try {
      const [o, c, p, t] = await Promise.all([listOrdensCorte(), listClientes(), listProdutos(), listTecidos()]);
      setOrdens(o);
      setClientes(c.filter((x) => x.ativo));
      setProdutos(p.filter((x) => x.ativo));
      setTecidos(t.filter((x) => x.ativo));
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível carregar as ordens de corte.');
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtradas = useMemo(() => {
    if (!ordens) return [];
    const termo = busca.trim().toLowerCase();
    return ordens.filter((o) => {
      if (mostrarArquivadas) {
        if (!o.arquivada) return false;
      } else {
        if (o.arquivada) return false;
        if (etapas.length > 0 && !etapas.includes(o.status)) return false;
      }
      if (clienteId !== 'todos' && o.cliente_id !== clienteId) return false;
      if (produtoId !== 'todos' && o.produto_id !== produtoId) return false;
      if (tecidoId !== 'todos' && o.tecido_id !== tecidoId) return false;
      const dataCriacao = o.criado_em.slice(0, 10);
      if (dataInicio && dataCriacao < dataInicio) return false;
      if (dataFim && dataCriacao > dataFim) return false;
      if (
        termo &&
        !(
          String(o.numero).includes(termo) ||
          o.cliente_nome.toLowerCase().includes(termo) ||
          o.produto_nome.toLowerCase().includes(termo) ||
          o.tecido_nome.toLowerCase().includes(termo)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [ordens, busca, etapas, mostrarArquivadas, clienteId, produtoId, tecidoId, dataInicio, dataFim]);

  async function handleCancelar(ordem: OrdemCorteResumo) {
    if (!usuario) return;
    if (!(await confirmPin())) return;
    try {
      await updateOrdemCorte(ordem.id, { status: 'cancelada' }, usuario.id);
      await reload();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível cancelar a ordem.');
    }
  }

  async function handleDuplicar(ordem: OrdemCorteResumo) {
    if (!usuario) return;
    if (!(await confirmPin())) return;
    try {
      await duplicateOrdemCorte(ordem.id, usuario.id);
      await reload();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível duplicar a ordem.');
    }
  }

  async function handleArquivar(ordem: OrdemCorteResumo) {
    if (!usuario) return;
    if (!(await confirmPin())) return;
    try {
      await arquivarOrdem(ordem.id, usuario.id);
      await reload();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível arquivar a ordem.');
    }
  }

  function toggleEtapa(status: StatusOrdemCorte) {
    setEtapas((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
  }

  const opcoesEtapa: SelectOption[] = TODAS_ETAPAS.map((s) => ({ value: s, label: STATUS_ORDEM_CORTE_LABEL[s] }));
  const opcoesCliente: SelectOption[] = [{ value: 'todos', label: 'Todos' }, ...clientes.map((c) => ({ value: c.id, label: c.nome }))];
  const opcoesProduto: SelectOption[] = [{ value: 'todos', label: 'Todos' }, ...produtos.map((p) => ({ value: p.id, label: p.nome }))];
  const opcoesTecido: SelectOption[] = [{ value: 'todos', label: 'Todos' }, ...tecidos.map((t) => ({ value: t.id, label: t.nome }))];

  const empresaId = usuario?.empresa_id ?? '';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.addButton} onPress={() => setFormAberto('novo')}>
          <Text style={styles.addButtonText}>+ Nova Ordem de Corte</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Buscar por número, cliente, produto ou material..."
          placeholderTextColor={colors.muted}
          value={busca}
          onChangeText={setBusca}
        />

        <View style={styles.filtrosRow}>
          <FiltroChip label={etapas.length === 0 ? 'Etapa' : `Etapa (${etapas.length})`} onPress={() => setFiltroAberto('etapa')} />
          <FiltroChip
            label={clienteId === 'todos' ? 'Cliente' : opcoesCliente.find((o) => o.value === clienteId)?.label || 'Cliente'}
            onPress={() => setFiltroAberto('cliente')}
          />
          <FiltroChip
            label={produtoId === 'todos' ? 'Produto' : opcoesProduto.find((o) => o.value === produtoId)?.label || 'Produto'}
            onPress={() => setFiltroAberto('produto')}
          />
          <FiltroChip
            label={tecidoId === 'todos' ? 'Material' : opcoesTecido.find((o) => o.value === tecidoId)?.label || 'Material'}
            onPress={() => setFiltroAberto('material')}
          />
        </View>

        <View style={styles.datasRow}>
          <TextInput
            style={[styles.input, styles.dataInput]}
            placeholder="Início (AAAA-MM-DD)"
            placeholderTextColor={colors.muted}
            value={dataInicio}
            onChangeText={setDataInicio}
          />
          <TextInput
            style={[styles.input, styles.dataInput]}
            placeholder="Fim (AAAA-MM-DD)"
            placeholderTextColor={colors.muted}
            value={dataFim}
            onChangeText={setDataFim}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Mostrar arquivadas</Text>
          <Switch value={mostrarArquivadas} onValueChange={setMostrarArquivadas} />
        </View>

        {ordens === null ? (
          <ActivityIndicator />
        ) : filtradas.length === 0 ? (
          <Text style={styles.empty}>Nenhuma ordem encontrada com os filtros atuais.</Text>
        ) : (
          filtradas.map((ordem) => {
            const podeCancelar = ordem.status !== 'cancelada' && !PIPELINE_PRODUCAO.includes(ordem.status);
            const podeArquivar = ordem.status === 'cancelada' && !ordem.arquivada;
            return (
              <View key={ordem.id} style={styles.card}>
                <Text style={styles.cardTitle}>
                  Nº {ordem.numero} — {ordem.cliente_nome}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {ordem.produto_nome} · {ordem.tecido_nome} · {ordem.quantidade_total} peça(s)
                </Text>
                <Text style={styles.cardSubtitle}>
                  {STATUS_ORDEM_CORTE_LABEL[ordem.status]}
                  {ordem.banca_nome ? ` · ${ordem.banca_nome}` : ''}
                </Text>
                <View style={styles.cardAcoes}>
                  <AcaoButton label="Info" onPress={() => setInfoAberto(ordem)} />
                  <AcaoButton label="Editar" onPress={() => setFormAberto(ordem)} />
                  <AcaoButton label="Duplicar" onPress={() => handleDuplicar(ordem)} />
                  {podeCancelar && <AcaoButton label="Cancelar" onPress={() => handleCancelar(ordem)} />}
                  {podeArquivar && <AcaoButton label="Arquivar" onPress={() => handleArquivar(ordem)} />}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <SelectModal
        visible={filtroAberto === 'etapa'}
        title="Etapa"
        options={opcoesEtapa}
        multiple
        selectedValues={etapas}
        onSelect={(v) => toggleEtapa(v as StatusOrdemCorte)}
        onClose={() => setFiltroAberto(null)}
      />
      <SelectModal
        visible={filtroAberto === 'cliente'}
        title="Cliente"
        options={opcoesCliente}
        onSelect={(v) => {
          setClienteId(v);
          setFiltroAberto(null);
        }}
        onClose={() => setFiltroAberto(null)}
      />
      <SelectModal
        visible={filtroAberto === 'produto'}
        title="Produto"
        options={opcoesProduto}
        onSelect={(v) => {
          setProdutoId(v);
          setFiltroAberto(null);
        }}
        onClose={() => setFiltroAberto(null)}
      />
      <SelectModal
        visible={filtroAberto === 'material'}
        title="Material"
        options={opcoesTecido}
        onSelect={(v) => {
          setTecidoId(v);
          setFiltroAberto(null);
        }}
        onClose={() => setFiltroAberto(null)}
      />

      <OrdemCorteFormModal
        visible={formAberto !== null}
        ordem={formAberto === 'novo' ? null : formAberto}
        empresaId={empresaId}
        usuarioId={usuario?.id ?? ''}
        onClose={() => setFormAberto(null)}
        onSaved={reload}
      />
      <InfoOrdemCorteModal visible={infoAberto !== null} ordem={infoAberto} onClose={() => setInfoAberto(null)} />
      {pinDialog}
    </View>
  );
}

function FiltroChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.filtroChip} onPress={onPress}>
      <Text style={styles.filtroChipTexto} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function AcaoButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.acaoButton} onPress={onPress}>
      <Text style={styles.acaoButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 10,
  },
  addButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  dataInput: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 13,
    color: colors.foreground,
    fontWeight: '600',
  },
  empty: {
    fontSize: 13,
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    fontWeight: '700',
    color: colors.foreground,
    fontSize: 14,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  cardAcoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  acaoButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  acaoButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.foreground,
  },
});
