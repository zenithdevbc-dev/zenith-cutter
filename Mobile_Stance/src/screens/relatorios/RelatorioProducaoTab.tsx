import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { SelectModal, type SelectOption } from '../../components/SelectModal';
import { KpiCard } from '../../components/relatorios/KpiCard';
import { FiltroChip } from '../../components/relatorios/FiltroChip';
import {
  FILTROS_RELATORIO_VAZIOS,
  calcularKpisRelatorioProducao,
  filtrarRelatorioProducao,
  formatarDuracaoMinutos,
  type RelatorioProducaoFiltros,
} from '../../lib/relatorioProducao';
import { STATUS_ORDEM_CORTE_LABEL, type Cliente, type RelatorioProducaoLinha, type StatusOrdemCorte, type Tecido } from '../../models';
import { colors } from '../../theme';
import { relatoriosStyles as styles } from './sharedStyles';

const TODAS_ETAPAS: StatusOrdemCorte[] = ['planejado', 'em_fila', 'enfesto', 'corte', 'embalagem', 'despacho', 'pronto', 'cancelada'];

/** Aba "Produção" — porta `RelatorioProducaoTab.tsx` do desktop. Sem gráficos (o desktop também não tem, aqui nem lá). */
export function RelatorioProducaoTab({
  linhas,
  clientes,
  tecidos,
}: {
  linhas: RelatorioProducaoLinha[] | null;
  clientes: Cliente[];
  tecidos: Tecido[];
}) {
  const [filtros, setFiltros] = useState<RelatorioProducaoFiltros>(FILTROS_RELATORIO_VAZIOS);
  const [pickerAberto, setPickerAberto] = useState<'etapa' | 'cliente' | 'material' | null>(null);

  const filtradas = useMemo(() => (linhas ? filtrarRelatorioProducao(linhas, filtros) : []), [linhas, filtros]);
  const kpis = useMemo(() => calcularKpisRelatorioProducao(filtradas), [filtradas]);

  function atualizar<K extends keyof RelatorioProducaoFiltros>(chave: K, valor: RelatorioProducaoFiltros[K]) {
    setFiltros((prev) => ({ ...prev, [chave]: valor }));
  }

  function toggleEtapa(status: StatusOrdemCorte) {
    atualizar('etapas', filtros.etapas.includes(status) ? filtros.etapas.filter((s) => s !== status) : [...filtros.etapas, status]);
  }

  const opcoesEtapa: SelectOption[] = TODAS_ETAPAS.map((s) => ({ value: s, label: STATUS_ORDEM_CORTE_LABEL[s] }));
  const opcoesCliente: SelectOption[] = [{ value: 'todos', label: 'Todos' }, ...clientes.map((c) => ({ value: c.id, label: c.nome }))];
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
      <View style={styles.filtrosRow}>
        <FiltroChip label={filtros.etapas.length === 0 ? 'Etapa' : `Etapa (${filtros.etapas.length})`} onPress={() => setPickerAberto('etapa')} />
        <FiltroChip
          label={filtros.clienteId === 'todos' ? 'Cliente' : opcoesCliente.find((o) => o.value === filtros.clienteId)?.label || 'Cliente'}
          onPress={() => setPickerAberto('cliente')}
        />
        <FiltroChip
          label={filtros.tecidoId === 'todos' ? 'Material' : opcoesTecido.find((o) => o.value === filtros.tecidoId)?.label || 'Material'}
          onPress={() => setPickerAberto('material')}
        />
      </View>
      <View style={styles.datasRow}>
        <TextInput
          style={[styles.input, styles.dataInput]}
          placeholder="Início (AAAA-MM-DD)"
          placeholderTextColor={colors.muted}
          value={filtros.dataInicio}
          onChangeText={(v) => atualizar('dataInicio', v)}
        />
        <TextInput
          style={[styles.input, styles.dataInput]}
          placeholder="Fim (AAAA-MM-DD)"
          placeholderTextColor={colors.muted}
          value={filtros.dataFim}
          onChangeText={(v) => atualizar('dataFim', v)}
        />
      </View>

      <View style={styles.kpiGrid}>
        <KpiCard label="Total de Peças" valor={kpis.totalPecas} />
        <KpiCard label="Peças Concluídas" valor={kpis.pecasConcluidas} />
        <KpiCard label="Peças em Andamento" valor={kpis.pecasEmAndamento} />
        <KpiCard label="Atrasadas" valor={kpis.atrasadas} />
        <KpiCard label="Tempo Médio de Produção" valor={formatarDuracaoMinutos(kpis.tempoMedioMinutos)} />
      </View>

      <Text style={styles.subtitulo}>Ordens ({filtradas.length})</Text>
      {filtradas.length === 0 ? (
        <Text style={styles.empty}>Nenhuma ordem encontrada com os filtros atuais.</Text>
      ) : (
        filtradas.map((linha) => (
          <View key={linha.ordem_id} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitulo}>
                Nº {linha.numero} — {linha.cliente_nome}
              </Text>
              <Text style={styles.rowSubtitulo}>
                {linha.tecido_nome} · {linha.operador_nome ?? 'Sem operador'}
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
