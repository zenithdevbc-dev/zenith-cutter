import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { listOrdensCorte } from '../lib/ordensCorte';
import { listRelatorioPerdas, listRelatorioProducao } from '../lib/relatorios';
import { listClientes } from '../lib/clientes';
import { listProdutos } from '../lib/produtos';
import { listTecidos } from '../lib/tecidos';
import { listBancas } from '../lib/bancas';
import { mesclarHistoricoOrdens } from '../lib/historicoOrdens';
import type { Banca, Cliente, OrdemCorteResumo, Produto, RelatorioPerdaLinha, RelatorioProducaoLinha, Tecido } from '../models';
import { colors } from '../theme';
import { RelatorioProducaoTab } from './relatorios/RelatorioProducaoTab';
import { HistoricoOrdensTab } from './relatorios/HistoricoOrdensTab';
import { MateriaisTab } from './relatorios/MateriaisTab';
import { ClientesTab } from './relatorios/ClientesTab';
import { OperadoresTab } from './relatorios/OperadoresTab';
import { BancasRelatorioTab } from './relatorios/BancasRelatorioTab';

type SubTab = 'producao' | 'historico' | 'materiais' | 'clientes' | 'operadores' | 'bancas';

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'producao', label: 'Produção' },
  { id: 'historico', label: 'Histórico' },
  { id: 'materiais', label: 'Materiais' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'operadores', label: 'Operadores' },
  { id: 'bancas', label: 'Terceiros' },
];

/**
 * Relatórios mobile (admin/supervisor) — porta as 6 abas de
 * `RelatoriosPage.tsx`, view-only (sem exportar CSV/Excel/PDF — as
 * libs de export do desktop são DOM/Node-only, não portam pro RN).
 * Dados compartilhados são buscados uma única vez aqui, cada aba só
 * filtra/agrega/renderiza — mesmo desenho do desktop.
 */
export function RelatoriosScreen() {
  const [subTab, setSubTab] = useState<SubTab>('producao');

  const [ordens, setOrdens] = useState<OrdemCorteResumo[] | null>(null);
  const [producao, setProducao] = useState<RelatorioProducaoLinha[] | null>(null);
  const [perdas, setPerdas] = useState<RelatorioPerdaLinha[] | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [tecidos, setTecidos] = useState<Tecido[]>([]);
  const [bancas, setBancas] = useState<Banca[]>([]);

  const reload = useCallback(async () => {
    try {
      const [o, p, perd, c, prod, t, b] = await Promise.all([
        listOrdensCorte(),
        listRelatorioProducao(),
        listRelatorioPerdas(),
        listClientes(),
        listProdutos(),
        listTecidos(),
        listBancas(),
      ]);
      setOrdens(o);
      setProducao(p);
      setPerdas(perd);
      setClientes(c.filter((x) => x.ativo));
      setProdutos(prod.filter((x) => x.ativo));
      setTecidos(t.filter((x) => x.ativo));
      setBancas(b);
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível carregar os relatórios.');
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const historico = useMemo(
    () => (ordens && producao ? mesclarHistoricoOrdens(ordens, producao) : null),
    [ordens, producao],
  );

  return (
    <View style={styles.screen}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabsScroll}>
        <View style={styles.subTabs}>
          {SUB_TABS.map((tab) => (
            <TouchableOpacity key={tab.id} style={styles.subTabCell} onPress={() => setSubTab(tab.id)}>
              <Text style={[styles.subTabLabel, subTab === tab.id && styles.subTabLabelAtiva]}>{tab.label}</Text>
              {subTab === tab.id && <View style={styles.subTabAccent} />}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {subTab === 'producao' && (
        <RelatorioProducaoTab linhas={producao} clientes={clientes} tecidos={tecidos} />
      )}
      {subTab === 'historico' && (
        <HistoricoOrdensTab linhas={historico} clientes={clientes} produtos={produtos} tecidos={tecidos} />
      )}
      {subTab === 'materiais' && <MateriaisTab ordens={ordens} perdas={perdas} clientes={clientes} tecidos={tecidos} />}
      {subTab === 'clientes' && <ClientesTab linhas={producao} clientes={clientes} tecidos={tecidos} />}
      {subTab === 'operadores' && <OperadoresTab linhas={producao} />}
      {subTab === 'bancas' && <BancasRelatorioTab linhas={producao} bancas={bancas} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  subTabsScroll: {
    flexGrow: 0,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subTabs: {
    flexDirection: 'row',
  },
  subTabCell: {
    alignItems: 'center',
    paddingHorizontal: 14,
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
    width: 20,
    borderRadius: 1,
    backgroundColor: colors.primary,
  },
});
