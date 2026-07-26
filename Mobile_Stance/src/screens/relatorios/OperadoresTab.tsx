import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { SelectModal, type SelectOption } from '../../components/SelectModal';
import { KpiCard } from '../../components/relatorios/KpiCard';
import { FiltroChip } from '../../components/relatorios/FiltroChip';
import { SimpleBarChart } from '../../components/charts/SimpleBarChart';
import { SimpleLineChart } from '../../components/charts/SimpleLineChart';
import {
  FILTROS_OPERADORES_VAZIOS,
  agruparPorOperador,
  calcularComparacaoTempoProducao,
  calcularKpisRelatorioOperadores,
  calcularPecasPorOperador,
  calcularProdutividadeDiaria,
  filtrarRelatorioOperadores,
  listarOperadoresDisponiveis,
  type RelatorioOperadoresFiltros,
} from '../../lib/relatorioOperadores';
import { formatarDuracaoMinutos } from '../../lib/relatorioProducao';
import { STATUS_ORDEM_CORTE_LABEL, type RelatorioProducaoLinha, type StatusOrdemCorte } from '../../models';
import { colors } from '../../theme';
import { relatoriosStyles as styles } from './sharedStyles';

const TODAS_ETAPAS: StatusOrdemCorte[] = ['planejado', 'em_fila', 'enfesto', 'corte', 'embalagem', 'despacho', 'pronto', 'cancelada'];

export function OperadoresTab({ linhas }: { linhas: RelatorioProducaoLinha[] | null }) {
  const [filtros, setFiltros] = useState<RelatorioOperadoresFiltros>(FILTROS_OPERADORES_VAZIOS);
  const [pickerAberto, setPickerAberto] = useState<'operador' | 'etapa' | null>(null);

  const operadoresDisponiveis = useMemo(() => listarOperadoresDisponiveis(linhas ?? []), [linhas]);
  const filtradas = useMemo(() => (linhas ? filtrarRelatorioOperadores(linhas, filtros) : []), [linhas, filtros]);
  const agregado = useMemo(() => agruparPorOperador(filtradas), [filtradas]);
  const kpis = useMemo(() => calcularKpisRelatorioOperadores(linhas ?? [], filtradas, agregado), [linhas, filtradas, agregado]);
  const pecasPorOperador = useMemo(() => calcularPecasPorOperador(agregado), [agregado]);
  const comparacaoTempo = useMemo(() => calcularComparacaoTempoProducao(agregado), [agregado]);
  const produtividadeDiaria = useMemo(() => calcularProdutividadeDiaria(filtradas), [filtradas]);

  function atualizar<K extends keyof RelatorioOperadoresFiltros>(chave: K, valor: RelatorioOperadoresFiltros[K]) {
    setFiltros((prev) => ({ ...prev, [chave]: valor }));
  }

  function toggleEtapa(status: StatusOrdemCorte) {
    atualizar('etapas', filtros.etapas.includes(status) ? filtros.etapas.filter((s) => s !== status) : [...filtros.etapas, status]);
  }

  const opcoesOperador: SelectOption[] = [{ value: 'todos', label: 'Todos' }, ...operadoresDisponiveis.map((o) => ({ value: o.id, label: o.nome }))];
  const opcoesEtapa: SelectOption[] = TODAS_ETAPAS.map((s) => ({ value: s, label: STATUS_ORDEM_CORTE_LABEL[s] }));

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
        <FiltroChip
          label={filtros.operadorId === 'todos' ? 'Operador' : opcoesOperador.find((o) => o.value === filtros.operadorId)?.label || 'Operador'}
          onPress={() => setPickerAberto('operador')}
        />
        <FiltroChip label={filtros.etapas.length === 0 ? 'Etapa' : `Etapa (${filtros.etapas.length})`} onPress={() => setPickerAberto('etapa')} />
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
        <KpiCard label="Total de Operadores" valor={kpis.totalOperadores} />
        <KpiCard label="Peças Concluídas" valor={kpis.pecasConcluidas} />
        <KpiCard label="Tempo Médio de Produção" valor={formatarDuracaoMinutos(kpis.tempoMedioMinutos)} />
        <KpiCard label="Média de Peças por Operador" valor={kpis.mediaPecasPorOperador} />
      </View>

      {pecasPorOperador.length > 0 && (
        <>
          <Text style={styles.subtitulo}>Peças por Operador</Text>
          <SimpleBarChart data={pecasPorOperador.map((o) => ({ label: o.operador, value: o.pecas }))} />
        </>
      )}
      {comparacaoTempo.length > 0 && (
        <>
          <Text style={styles.subtitulo}>Comparação de Tempo de Produção</Text>
          <SimpleBarChart data={comparacaoTempo.map((o) => ({ label: o.operador, value: o.minutos }))} color={colors.statusPending} />
        </>
      )}
      {produtividadeDiaria.length > 0 && (
        <>
          <Text style={styles.subtitulo}>Produtividade Diária</Text>
          <SimpleLineChart data={produtividadeDiaria.map((d) => ({ label: d.label, value: d.quantidade }))} width={320} />
        </>
      )}

      <Text style={styles.subtitulo}>Operadores ({agregado.length})</Text>
      {agregado.length === 0 ? (
        <Text style={styles.empty}>Nenhum operador encontrado com os filtros atuais.</Text>
      ) : (
        agregado.map((item) => (
          <View key={item.operador_id} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitulo}>{item.operador}</Text>
              <Text style={styles.rowSubtitulo}>
                Em andamento: {item.pecasEmAndamento} · Tempo médio: {formatarDuracaoMinutos(item.tempoMedioMinutos)}
              </Text>
            </View>
            <Text style={styles.rowBadge}>{item.pecasConcluidas} concluídas</Text>
          </View>
        ))
      )}

      <SelectModal
        visible={pickerAberto === 'operador'}
        title="Operador"
        options={opcoesOperador}
        onSelect={(v) => {
          atualizar('operadorId', v);
          setPickerAberto(null);
        }}
        onClose={() => setPickerAberto(null)}
      />
      <SelectModal
        visible={pickerAberto === 'etapa'}
        title="Etapa"
        options={opcoesEtapa}
        multiple
        selectedValues={filtros.etapas}
        onSelect={(v) => toggleEtapa(v as StatusOrdemCorte)}
        onClose={() => setPickerAberto(null)}
      />
    </ScrollView>
  );
}
