import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { SelectModal, type SelectOption } from '../../components/SelectModal';
import { KpiCard } from '../../components/relatorios/KpiCard';
import { FiltroChip } from '../../components/relatorios/FiltroChip';
import { SimpleBarChart } from '../../components/charts/SimpleBarChart';
import { SimpleLineChart } from '../../components/charts/SimpleLineChart';
import {
  FILTROS_MATERIAIS_VAZIOS,
  agruparPorMaterial,
  calcularConsumoPorMaterial,
  calcularKpisRelatorioMateriais,
  calcularMateriaisMaisUsados,
  calcularTendenciaPerdas,
  filtrarOrdensRelatorioMateriais,
  filtrarPerdasRelatorioMateriais,
  listarCoresDisponiveis,
  type RelatorioMateriaisFiltros,
} from '../../lib/relatorioMateriais';
import type { Cliente, OrdemCorteResumo, RelatorioPerdaLinha, Tecido } from '../../models';
import { colors } from '../../theme';
import { relatoriosStyles as styles } from './sharedStyles';

export function MateriaisTab({
  ordens,
  perdas,
  clientes,
  tecidos,
}: {
  ordens: OrdemCorteResumo[] | null;
  perdas: RelatorioPerdaLinha[] | null;
  clientes: Cliente[];
  tecidos: Tecido[];
}) {
  const [filtros, setFiltros] = useState<RelatorioMateriaisFiltros>(FILTROS_MATERIAIS_VAZIOS);
  const [pickerAberto, setPickerAberto] = useState<'material' | 'cor' | 'cliente' | null>(null);

  const tecidosPorId = useMemo(() => new Map(tecidos.map((t) => [t.id, t])), [tecidos]);

  const ordensFiltradas = useMemo(
    () => (ordens ? filtrarOrdensRelatorioMateriais(ordens, tecidosPorId, filtros) : []),
    [ordens, tecidosPorId, filtros],
  );
  const perdasFiltradas = useMemo(
    () => (perdas ? filtrarPerdasRelatorioMateriais(perdas, tecidosPorId, filtros) : []),
    [perdas, tecidosPorId, filtros],
  );
  const agregado = useMemo(() => agruparPorMaterial(ordensFiltradas, perdasFiltradas, tecidosPorId), [ordensFiltradas, perdasFiltradas, tecidosPorId]);
  const kpis = useMemo(() => calcularKpisRelatorioMateriais(agregado), [agregado]);
  const consumo = useMemo(() => calcularConsumoPorMaterial(agregado), [agregado]);
  const maisUsados = useMemo(() => calcularMateriaisMaisUsados(agregado), [agregado]);
  const tendenciaPerdas = useMemo(() => calcularTendenciaPerdas(perdasFiltradas), [perdasFiltradas]);
  const cores = useMemo(() => listarCoresDisponiveis(tecidos), [tecidos]);

  function atualizar<K extends keyof RelatorioMateriaisFiltros>(chave: K, valor: RelatorioMateriaisFiltros[K]) {
    setFiltros((prev) => ({ ...prev, [chave]: valor }));
  }

  const opcoesMaterial: SelectOption[] = [{ value: 'todos', label: 'Todos' }, ...tecidos.map((t) => ({ value: t.id, label: t.nome }))];
  const opcoesCor: SelectOption[] = [{ value: 'todos', label: 'Todas' }, ...cores.map((c) => ({ value: c, label: c }))];
  const opcoesCliente: SelectOption[] = [{ value: 'todos', label: 'Todos' }, ...clientes.map((c) => ({ value: c.id, label: c.nome }))];

  if (ordens === null || perdas === null) {
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
          label={filtros.tecidoId === 'todos' ? 'Material' : opcoesMaterial.find((o) => o.value === filtros.tecidoId)?.label || 'Material'}
          onPress={() => setPickerAberto('material')}
        />
        <FiltroChip label={filtros.cor === 'todos' ? 'Cor' : filtros.cor} onPress={() => setPickerAberto('cor')} />
        <FiltroChip
          label={filtros.clienteId === 'todos' ? 'Cliente' : opcoesCliente.find((o) => o.value === filtros.clienteId)?.label || 'Cliente'}
          onPress={() => setPickerAberto('cliente')}
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
        <KpiCard label="Total de Ordens" valor={kpis.totalOrdens} />
        <KpiCard label="Peças Produzidas" valor={kpis.totalPecasProduzidas} />
        <KpiCard label="Perdas Registradas" valor={kpis.totalPerdasRegistradas} />
        <KpiCard label="Material Mais Usado" valor={kpis.materialMaisUsado ?? '—'} />
      </View>

      {consumo.length > 0 && (
        <>
          <Text style={styles.subtitulo}>Consumo de Material</Text>
          <SimpleBarChart data={consumo.map((c) => ({ label: c.material, value: c.quantidade }))} />
        </>
      )}
      {maisUsados.length > 0 && (
        <>
          <Text style={styles.subtitulo}>Materiais Mais Usados</Text>
          <SimpleBarChart data={maisUsados.map((m) => ({ label: m.material, value: m.ordens }))} color={colors.statusPending} />
        </>
      )}
      {tendenciaPerdas.length > 0 && (
        <>
          <Text style={styles.subtitulo}>Tendência de Perdas</Text>
          <SimpleLineChart
            data={tendenciaPerdas.map((t) => ({ label: t.label, value: t.quantidade }))}
            width={320}
            color={colors.statusDelayed}
          />
        </>
      )}

      <Text style={styles.subtitulo}>Materiais ({agregado.length})</Text>
      {agregado.length === 0 ? (
        <Text style={styles.empty}>Nenhum material encontrado com os filtros atuais.</Text>
      ) : (
        agregado.map((item) => (
          <View key={item.tecido_id} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitulo}>{item.material}</Text>
              <Text style={styles.rowSubtitulo}>
                {item.cor} · {item.ordens} ordem(ns) · {item.perdasRegistradas} perda(s)
              </Text>
            </View>
            <Text style={styles.rowBadge}>{item.pecasProduzidas} peça(s)</Text>
          </View>
        ))
      )}

      <SelectModal
        visible={pickerAberto === 'material'}
        title="Material"
        options={opcoesMaterial}
        onSelect={(v) => {
          atualizar('tecidoId', v);
          setPickerAberto(null);
        }}
        onClose={() => setPickerAberto(null)}
      />
      <SelectModal
        visible={pickerAberto === 'cor'}
        title="Cor"
        options={opcoesCor}
        onSelect={(v) => {
          atualizar('cor', v);
          setPickerAberto(null);
        }}
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
    </ScrollView>
  );
}
