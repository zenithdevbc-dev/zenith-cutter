import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { SelectModal, type SelectOption } from '../../components/SelectModal';
import { KpiCard } from '../../components/relatorios/KpiCard';
import { FiltroChip } from '../../components/relatorios/FiltroChip';
import { SimpleBarChart } from '../../components/charts/SimpleBarChart';
import { SimpleLineChart } from '../../components/charts/SimpleLineChart';
import {
  FILTROS_CLIENTES_VAZIOS,
  agruparPorCliente,
  calcularAtividadeClientesPorDia,
  calcularKpisRelatorioClientes,
  calcularPecasPorCliente,
  filtrarRelatorioClientes,
  formatarMateriaisUsados,
  type RelatorioClientesFiltros,
} from '../../lib/relatorioClientes';
import { formatarDuracaoMinutos } from '../../lib/relatorioProducao';
import type { Cliente, RelatorioProducaoLinha, Tecido } from '../../models';
import { colors } from '../../theme';
import { relatoriosStyles as styles } from './sharedStyles';

export function ClientesTab({
  linhas,
  clientes,
  tecidos,
}: {
  linhas: RelatorioProducaoLinha[] | null;
  clientes: Cliente[];
  tecidos: Tecido[];
}) {
  const [filtros, setFiltros] = useState<RelatorioClientesFiltros>(FILTROS_CLIENTES_VAZIOS);
  const [pickerAberto, setPickerAberto] = useState<'cliente' | 'material' | null>(null);

  const filtradas = useMemo(() => (linhas ? filtrarRelatorioClientes(linhas, filtros) : []), [linhas, filtros]);
  const agregado = useMemo(() => agruparPorCliente(filtradas), [filtradas]);
  const kpis = useMemo(() => calcularKpisRelatorioClientes(clientes, agregado), [clientes, agregado]);
  const pecasPorCliente = useMemo(() => calcularPecasPorCliente(agregado), [agregado]);
  const atividade = useMemo(() => calcularAtividadeClientesPorDia(filtradas), [filtradas]);

  function atualizar<K extends keyof RelatorioClientesFiltros>(chave: K, valor: RelatorioClientesFiltros[K]) {
    setFiltros((prev) => ({ ...prev, [chave]: valor }));
  }

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
        <KpiCard label="Total de Clientes" valor={kpis.totalClientes} />
        <KpiCard label="Clientes Ativos" valor={kpis.clientesAtivos} />
        <KpiCard label="Peças Produzidas" valor={kpis.pecasProduzidas} />
        <KpiCard label="Média por Cliente" valor={kpis.mediaPecasPorCliente} />
      </View>

      {pecasPorCliente.length > 0 && (
        <>
          <Text style={styles.subtitulo}>Peças por Cliente</Text>
          <SimpleBarChart data={pecasPorCliente.map((c) => ({ label: c.cliente, value: c.pecas }))} />
        </>
      )}
      {atividade.length > 0 && (
        <>
          <Text style={styles.subtitulo}>Atividade ao Longo do Tempo</Text>
          <SimpleLineChart data={atividade.map((a) => ({ label: a.label, value: a.quantidade }))} width={320} />
        </>
      )}

      <Text style={styles.subtitulo}>Clientes ({agregado.length})</Text>
      {agregado.length === 0 ? (
        <Text style={styles.empty}>Nenhum cliente encontrado com os filtros atuais.</Text>
      ) : (
        agregado.map((item) => (
          <View key={item.cliente_id} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitulo}>{item.cliente}</Text>
              <Text style={styles.rowSubtitulo}>
                {formatarMateriaisUsados(item.materiaisUsados)} · Tempo médio: {formatarDuracaoMinutos(item.tempoMedioMinutos)}
              </Text>
            </View>
            <Text style={styles.rowBadge}>{item.pecas} peça(s)</Text>
          </View>
        ))
      )}

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
