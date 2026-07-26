import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { SelectModal, type SelectOption } from '../../components/SelectModal';
import { FiltroChip } from '../../components/relatorios/FiltroChip';
import {
  FILTROS_HISTORICO_VAZIOS,
  filtrarHistoricoOrdens,
  type HistoricoOrdensFiltros,
  type OrdemHistoricoLinha,
} from '../../lib/historicoOrdens';
import { STATUS_ORDEM_CORTE_LABEL, type Cliente, type Produto, type StatusOrdemCorte, type Tecido } from '../../models';
import { colors } from '../../theme';
import { relatoriosStyles as styles } from './sharedStyles';

const TODAS_ETAPAS: StatusOrdemCorte[] = ['planejado', 'em_fila', 'enfesto', 'corte', 'embalagem', 'despacho', 'pronto', 'cancelada'];

/** Aba "Histórico de Ordens" — porta `HistoricoOrdensTab.tsx` do desktop, sem paginação (lista completa). */
export function HistoricoOrdensTab({
  linhas,
  clientes,
  produtos,
  tecidos,
}: {
  linhas: OrdemHistoricoLinha[] | null;
  clientes: Cliente[];
  produtos: Produto[];
  tecidos: Tecido[];
}) {
  const [filtros, setFiltros] = useState<HistoricoOrdensFiltros>(FILTROS_HISTORICO_VAZIOS);
  const [pickerAberto, setPickerAberto] = useState<'etapa' | 'cliente' | 'produto' | 'material' | null>(null);

  const filtradas = useMemo(() => (linhas ? filtrarHistoricoOrdens(linhas, filtros) : []), [linhas, filtros]);

  function atualizar<K extends keyof HistoricoOrdensFiltros>(chave: K, valor: HistoricoOrdensFiltros[K]) {
    setFiltros((prev) => ({ ...prev, [chave]: valor }));
  }

  function toggleEtapa(status: StatusOrdemCorte) {
    atualizar('etapas', filtros.etapas.includes(status) ? filtros.etapas.filter((s) => s !== status) : [...filtros.etapas, status]);
  }

  const opcoesEtapa: SelectOption[] = TODAS_ETAPAS.map((s) => ({ value: s, label: STATUS_ORDEM_CORTE_LABEL[s] }));
  const opcoesCliente: SelectOption[] = [{ value: 'todos', label: 'Todos' }, ...clientes.map((c) => ({ value: c.id, label: c.nome }))];
  const opcoesProduto: SelectOption[] = [{ value: 'todos', label: 'Todos' }, ...produtos.map((p) => ({ value: p.id, label: p.nome }))];
  const opcoesTecido: SelectOption[] = [{ value: 'todos', label: 'Todos' }, ...tecidos.map((t) => ({ value: t.id, label: t.nome }))];

  if (linhas === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <TextInput
        style={styles.input}
        placeholder="Buscar por número..."
        placeholderTextColor={colors.muted}
        value={filtros.numero}
        onChangeText={(v) => atualizar('numero', v)}
      />

      <View style={styles.filtrosRow}>
        <FiltroChip label={filtros.etapas.length === 0 ? 'Etapa' : `Etapa (${filtros.etapas.length})`} onPress={() => setPickerAberto('etapa')} />
        <FiltroChip
          label={filtros.clienteId === 'todos' ? 'Cliente' : opcoesCliente.find((o) => o.value === filtros.clienteId)?.label || 'Cliente'}
          onPress={() => setPickerAberto('cliente')}
        />
        <FiltroChip
          label={filtros.produtoId === 'todos' ? 'Produto' : opcoesProduto.find((o) => o.value === filtros.produtoId)?.label || 'Produto'}
          onPress={() => setPickerAberto('produto')}
        />
        <FiltroChip
          label={filtros.tecidoId === 'todos' ? 'Material' : opcoesTecido.find((o) => o.value === filtros.tecidoId)?.label || 'Material'}
          onPress={() => setPickerAberto('material')}
        />
      </View>

      <Text style={styles.subtitulo}>Ordens ({filtradas.length})</Text>
      {filtradas.length === 0 ? (
        <Text style={styles.empty}>Nenhuma ordem encontrada com os filtros atuais.</Text>
      ) : (
        filtradas.map((linha) => (
          <View key={linha.id} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitulo}>
                Nº {linha.numero} — {linha.cliente_nome}
              </Text>
              <Text style={styles.rowSubtitulo}>
                {linha.produto_nome} · {linha.tecido_nome} · {linha.quantidade_total} peça(s)
              </Text>
            </View>
            <Text style={styles.rowBadge}>{STATUS_ORDEM_CORTE_LABEL[linha.status]}</Text>
          </View>
        ))
      )}

      <SelectModal
        visible={pickerAberto === 'etapa'}
        title="Etapa"
        options={opcoesEtapa}
        multiple
        selectedValues={filtros.etapas}
        onSelect={(v) => toggleEtapa(v as StatusOrdemCorte)}
        onClose={() => setPickerAberto(null)}
      />
      <SelectModal
        visible={pickerAberto === 'cliente'}
        title="Cliente"
        options={opcoesCliente}
        onSelect={(v) => {
          atualizar('clienteId', v);
          setPickerAberto(null);
        }}
        onClose={() => setPickerAberto(null)}
      />
      <SelectModal
        visible={pickerAberto === 'produto'}
        title="Produto"
        options={opcoesProduto}
        onSelect={(v) => {
          atualizar('produtoId', v);
          setPickerAberto(null);
        }}
        onClose={() => setPickerAberto(null)}
      />
      <SelectModal
        visible={pickerAberto === 'material'}
        title="Material"
        options={opcoesTecido}
        onSelect={(v) => {
          atualizar('tecidoId', v);
          setPickerAberto(null);
        }}
        onClose={() => setPickerAberto(null)}
      />
    </ScrollView>
  );
}
