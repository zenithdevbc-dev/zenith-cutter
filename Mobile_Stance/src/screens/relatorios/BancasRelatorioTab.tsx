import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { SelectModal, type SelectOption } from '../../components/SelectModal';
import { KpiCard } from '../../components/relatorios/KpiCard';
import { FiltroChip } from '../../components/relatorios/FiltroChip';
import { SimpleBarChart } from '../../components/charts/SimpleBarChart';
import { SimpleLineChart } from '../../components/charts/SimpleLineChart';
import {
  FILTROS_BANCAS_VAZIOS,
  agruparPorBanca,
  calcularAtividadeBancasPorDia,
  calcularKpisRelatorioBancas,
  calcularPecasPorBanca,
  filtrarRelatorioBancas,
  type RelatorioBancasFiltros,
} from '../../lib/relatorioBancas';
import type { Banca, RelatorioProducaoLinha } from '../../models';
import { colors } from '../../theme';
import { relatoriosStyles as styles } from './sharedStyles';

const OPCOES_STATUS: SelectOption[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'ativas', label: 'Ativas' },
  { value: 'inativas', label: 'Inativas' },
];

/** Aba "Terceiros" — porta `BancasTab.tsx` do desktop. Mostra toda banca cadastrada, mesmo sem nenhuma ordem ainda. */
export function BancasRelatorioTab({ linhas, bancas }: { linhas: RelatorioProducaoLinha[] | null; bancas: Banca[] }) {
  const [filtros, setFiltros] = useState<RelatorioBancasFiltros>(FILTROS_BANCAS_VAZIOS);
  const [pickerAberto, setPickerAberto] = useState<'banca' | 'status' | null>(null);

  const bancasFiltradas = useMemo(() => {
    if (filtros.status === 'ativas') return bancas.filter((b) => b.ativo);
    if (filtros.status === 'inativas') return bancas.filter((b) => !b.ativo);
    return bancas;
  }, [bancas, filtros.status]);

  const filtradas = useMemo(() => (linhas ? filtrarRelatorioBancas(linhas, filtros) : []), [linhas, filtros]);
  const agregado = useMemo(() => agruparPorBanca(filtradas, bancasFiltradas), [filtradas, bancasFiltradas]);
  const kpis = useMemo(() => calcularKpisRelatorioBancas(bancasFiltradas, agregado), [bancasFiltradas, agregado]);
  const pecasPorBanca = useMemo(() => calcularPecasPorBanca(agregado), [agregado]);
  const atividade = useMemo(() => calcularAtividadeBancasPorDia(filtradas), [filtradas]);

  function atualizar<K extends keyof RelatorioBancasFiltros>(chave: K, valor: RelatorioBancasFiltros[K]) {
    setFiltros((prev) => ({ ...prev, [chave]: valor }));
  }

  const opcoesBanca: SelectOption[] = [{ value: 'todas', label: 'Todas' }, ...bancas.map((b) => ({ value: b.id, label: b.nome }))];

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
          label={filtros.bancaId === 'todas' ? 'Terceiro' : opcoesBanca.find((o) => o.value === filtros.bancaId)?.label || 'Terceiro'}
          onPress={() => setPickerAberto('banca')}
        />
        <FiltroChip
          label={filtros.status === 'todas' ? 'Status' : OPCOES_STATUS.find((o) => o.value === filtros.status)?.label || 'Status'}
          onPress={() => setPickerAberto('status')}
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
        <KpiCard label="Total de Terceiros" valor={kpis.totalBancas} />
        <KpiCard label="Terceiros Ativos" valor={kpis.bancasAtivas} />
        <KpiCard label="Peças Produzidas" valor={kpis.pecasProduzidas} />
        <KpiCard label="Média por Terceiro" valor={kpis.mediaPecasPorBanca} />
      </View>

      {pecasPorBanca.length > 0 && (
        <>
          <Text style={styles.subtitulo}>Peças por Terceiro</Text>
          <SimpleBarChart data={pecasPorBanca.map((b) => ({ label: b.banca, value: b.pecas }))} />
        </>
      )}
      {atividade.length > 0 && (
        <>
          <Text style={styles.subtitulo}>Atividade ao Longo do Tempo</Text>
          <SimpleLineChart data={atividade.map((a) => ({ label: a.label, value: a.quantidade }))} width={320} />
        </>
      )}

      <Text style={styles.subtitulo}>Terceiros ({agregado.length})</Text>
      {agregado.length === 0 ? (
        <Text style={styles.empty}>Nenhum terceiro encontrado com os filtros atuais.</Text>
      ) : (
        agregado.map((item) => (
          <View key={item.banca_id} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitulo}>{item.banca}</Text>
              <Text style={styles.rowSubtitulo}>
                {item.ativo ? 'Ativo' : 'Inativo'}
                {item.ultimaAtividade ? ` · Última atividade: ${new Date(item.ultimaAtividade).toLocaleDateString('pt-BR')}` : ''}
              </Text>
            </View>
            <Text style={styles.rowBadge}>{item.pecas} peça(s)</Text>
          </View>
        ))
      )}

      <SelectModal
        visible={pickerAberto === 'banca'}
        title="Terceiro"
        options={opcoesBanca}
        onSelect={(v) => {
          atualizar('bancaId', v);
          setPickerAberto(null);
        }}
        onClose={() => setPickerAberto(null)}
      />
      <SelectModal
        visible={pickerAberto === 'status'}
        title="Status"
        options={OPCOES_STATUS}
        onSelect={(v) => {
          atualizar('status', v as RelatorioBancasFiltros['status']);
          setPickerAberto(null);
        }}
        onClose={() => setPickerAberto(null)}
      />
    </ScrollView>
  );
}
