import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../lib/auth-context';
import { listBancas } from '../lib/bancas';
import { listOrdensCorte } from '../lib/ordensCorte';
import { listMesasComStatus } from '../lib/producao';
import { listRelatorioProducao } from '../lib/relatorios';
import {
  calcularDistribuicaoStatus,
  calcularPecasEmProducaoPorBanca,
  calcularProducaoUltimos30Dias,
} from '../lib/dashboardCharts';
import { gerarResumoProducao } from '../lib/resumoProducao';
import { STATUS_ORDEM_CORTE_LABEL, type Banca, type MesaCorteComStatus, type OrdemCorteResumo, type RelatorioProducaoLinha } from '../models';
import { colors } from '../theme';
import { DistribuicaoStatusChart } from '../components/dashboard/DistribuicaoStatusChart';
import { ProducaoUltimos30DiasChart } from '../components/dashboard/ProducaoUltimos30DiasChart';

/**
 * Dashboard mobile — porta `Desktop_Stance/.../DashboardPage.tsx`.
 * Mesas de Corte é visível a todos os papéis; o resto (resumo com
 * ordens, pesquisa rápida, distribuição por status, terceiros,
 * produção dos últimos 30 dias) fica atrás do mesmo gate
 * administrador/supervisor do desktop (`podeVerOrdens`).
 */
export function DashboardScreen() {
  const { usuario } = useAuth();
  const podeVerOrdens = usuario?.papel === 'administrador' || usuario?.papel === 'supervisor';

  const [mesas, setMesas] = useState<MesaCorteComStatus[] | null>(null);
  const [ordens, setOrdens] = useState<OrdemCorteResumo[] | null>(null);
  const [producao, setProducao] = useState<RelatorioProducaoLinha[] | null>(null);
  const [bancas, setBancas] = useState<Banca[] | null>(null);
  const [busca, setBusca] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    try {
      const tarefas: Promise<unknown>[] = [listMesasComStatus().then(setMesas)];
      if (podeVerOrdens) {
        tarefas.push(listOrdensCorte().then(setOrdens));
        tarefas.push(listRelatorioProducao().then(setProducao));
        tarefas.push(listBancas().then(setBancas));
      }
      await Promise.all(tarefas);
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível carregar o dashboard.');
    }
  }, [podeVerOrdens]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleRefresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  const mesasLivres = (mesas ?? []).filter((m) => m.ativo && !m.ocupada).length;
  const mesasOcupadas = (mesas ?? []).filter((m) => m.ativo && m.ocupada).length;

  const resumo = useMemo(() => {
    if (mesas === null || (podeVerOrdens && (ordens === null || producao === null))) return null;
    return gerarResumoProducao({
      mesasTotal: (mesas ?? []).filter((m) => m.ativo).length,
      mesasOcupadas,
      ordens: podeVerOrdens ? (ordens ?? []) : undefined,
      producao: podeVerOrdens ? (producao ?? []) : undefined,
    });
  }, [mesas, mesasOcupadas, ordens, producao, podeVerOrdens]);

  const distribuicaoStatus = useMemo(() => calcularDistribuicaoStatus(ordens ?? []), [ordens]);
  const producaoUltimos30Dias = useMemo(
    () => calcularProducaoUltimos30Dias(producao ?? []),
    [producao],
  );
  const pecasEmProducaoPorBanca = useMemo(
    () => calcularPecasEmProducaoPorBanca(producao ?? [], bancas ?? []),
    [producao, bancas],
  );
  const bancasAtivas = (bancas ?? []).filter((b) => b.ativo).length;

  const resultadosBusca = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo || !ordens) return [];
    return ordens
      .filter(
        (o) =>
          String(o.numero).includes(termo) ||
          o.cliente_nome.toLowerCase().includes(termo) ||
          o.produto_nome.toLowerCase().includes(termo) ||
          o.tecido_nome.toLowerCase().includes(termo),
      )
      .slice(0, 20);
  }, [ordens, busca]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      <View style={styles.card}>
        {resumo === null ? <ActivityIndicator /> : <Text style={styles.resumoTexto}>{resumo}</Text>}
      </View>

      {podeVerOrdens && (
        <Section title="Pesquisa rápida">
          <TextInput
            style={styles.input}
            placeholder="Buscar por número, cliente, produto ou material..."
            placeholderTextColor={colors.muted}
            value={busca}
            onChangeText={setBusca}
          />
          {busca.trim() !== '' &&
            (resultadosBusca.length === 0 ? (
              <Text style={styles.empty}>Nenhuma ordem encontrada.</Text>
            ) : (
              resultadosBusca.map((ordem) => (
                <View key={ordem.id} style={styles.rowBetween}>
                  <View style={styles.rowMain}>
                    <Text style={styles.rowLabel}>
                      Nº {ordem.numero} — {ordem.cliente_nome}
                    </Text>
                    <Text style={styles.rowSub}>{ordem.produto_nome}</Text>
                  </View>
                  <Text style={styles.badge}>{STATUS_ORDEM_CORTE_LABEL[ordem.status]}</Text>
                </View>
              ))
            ))}
        </Section>
      )}

      <Section title="Mesas de Corte">
        {mesas === null ? (
          <ActivityIndicator />
        ) : mesas.length === 0 ? (
          <Text style={styles.empty}>Nenhuma mesa de corte cadastrada.</Text>
        ) : (
          <>
            <View style={styles.contadores}>
              <Text style={styles.contadorTexto}>{mesasLivres} livre(s)</Text>
              <Text style={styles.contadorTexto}>{mesasOcupadas} ocupada(s)</Text>
            </View>
            {mesas
              .filter((m) => m.ativo)
              .map((mesa) => (
                <View key={mesa.id} style={styles.rowBetween}>
                  <Text style={styles.rowLabel}>{mesa.nome}</Text>
                  <Text style={styles.badge}>
                    {mesa.ocupada ? `Ocupada (Nº ${mesa.ordem_numero})` : 'Livre'}
                  </Text>
                </View>
              ))}
          </>
        )}
      </Section>

      {podeVerOrdens && (
        <Section title="Distribuição de Peças por Status">
          {ordens === null ? (
            <ActivityIndicator />
          ) : distribuicaoStatus.length === 0 ? (
            <Text style={styles.empty}>Nenhuma ordem cadastrada.</Text>
          ) : (
            <DistribuicaoStatusChart dados={distribuicaoStatus} />
          )}
        </Section>
      )}

      {podeVerOrdens && (
        <Section title="Terceiros">
          {bancas === null ? (
            <ActivityIndicator />
          ) : bancas.length === 0 ? (
            <Text style={styles.empty}>Nenhum terceiro cadastrado.</Text>
          ) : (
            <>
              <Text style={styles.contadorTexto}>{bancasAtivas} terceiro(s) ativo(s)</Text>
              {pecasEmProducaoPorBanca.length === 0 ? (
                <Text style={styles.empty}>Nenhuma peça em produção em terceiros no momento.</Text>
              ) : (
                pecasEmProducaoPorBanca.map((item) => (
                  <View key={item.banca_id} style={styles.rowBetween}>
                    <Text style={styles.rowLabel}>{item.nome}</Text>
                    <Text style={styles.badge}>{item.quantidade} peça(s) em produção</Text>
                  </View>
                ))
              )}
            </>
          )}
        </Section>
      )}

      {podeVerOrdens && (
        <Section title="Produção dos Últimos 30 Dias">
          {producao === null ? (
            <ActivityIndicator />
          ) : (
            <ProducaoUltimos30DiasChart dados={producaoUltimos30Dias} />
          )}
        </Section>
      )}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
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
    gap: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    padding: 12,
  },
  resumoTexto: {
    fontSize: 13,
    color: colors.foreground,
    lineHeight: 19,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  empty: {
    fontSize: 13,
    color: colors.muted,
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
  contadores: {
    flexDirection: 'row',
    gap: 16,
  },
  contadorTexto: {
    fontSize: 13,
    color: colors.foreground,
    fontWeight: '600',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  rowLabel: {
    fontSize: 13,
    color: colors.foreground,
  },
  rowSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.foreground,
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
