import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../lib/auth-context';
import { usePinConfirm } from '../components/usePinConfirm';
import { SelectModal, type SelectOption } from '../components/SelectModal';
import { PerdasObservacoesModal } from '../components/PerdasObservacoesModal';
import {
  avancarEtapaOrdem,
  iniciarProducao,
  listEmProducao,
  listFilaProducao,
  listMesasComStatus,
  listSessoesAtivas,
  pausarProducao,
  retomarProducao,
} from '../lib/producao';
import { STATUS_ORDEM_CORTE_LABEL, type MesaCorteComStatus, type OrdemCorteResumo, type SessaoProducaoResumo } from '../models';

/**
 * Tempo de produção efetivo (cálculo estático no momento do reload,
 * não é cronômetro ao vivo) — mesma fórmula de
 * `Desktop_Stance/.../ProducaoPage.tsx`.
 */
function formatTempoProducao(sessao: SessaoProducaoResumo): string {
  const inicio = new Date(sessao.iniciado_em).getTime();
  const agora = Date.now();
  let pausadoMs = sessao.tempo_pausado_segundos * 1000;
  if (sessao.status === 'pausada' && sessao.pausado_em) {
    pausadoMs += agora - new Date(sessao.pausado_em).getTime();
  }
  const efetivoMs = Math.max(0, agora - inicio - pausadoMs);
  const totalMin = Math.floor(efetivoMs / 60000);
  const horas = Math.floor(totalMin / 60);
  const minutos = totalMin % 60;
  return horas > 0 ? `${horas}h${String(minutos).padStart(2, '0')}min` : `${minutos}min`;
}

/**
 * Execução da produção no celular — mesmo recorte que o Operador já
 * vê no desktop (sem reordenar fila, sem atribuir mesa: exclusivo de
 * admin/supervisor lá também). Fila com "Iniciar", mesas com status,
 * pipeline pós-corte (avançar etapa) e sessões ativas
 * (pausar/retomar/perdas/observações).
 */
export function ProducaoScreen() {
  const { usuario, empresa, signOut } = useAuth();
  const { confirm: confirmPin, dialog: pinDialog } = usePinConfirm();

  const [fila, setFila] = useState<OrdemCorteResumo[] | null>(null);
  const [mesas, setMesas] = useState<MesaCorteComStatus[] | null>(null);
  const [emProducao, setEmProducao] = useState<OrdemCorteResumo[] | null>(null);
  const [sessoes, setSessoes] = useState<SessaoProducaoResumo[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [ordemParaIniciar, setOrdemParaIniciar] = useState<OrdemCorteResumo | null>(null);
  const [sessaoPerdasObs, setSessaoPerdasObs] = useState<SessaoProducaoResumo | null>(null);

  const reload = useCallback(async () => {
    try {
      const [f, m, p, s] = await Promise.all([
        listFilaProducao(),
        listMesasComStatus(),
        listEmProducao(),
        listSessoesAtivas(),
      ]);
      setFila(f);
      setMesas(m);
      setEmProducao(p);
      setSessoes(s);
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível carregar a produção.');
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleRefresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  async function handleConfirmarIniciar(mesaId: string) {
    if (!usuario || !ordemParaIniciar) return;
    const ordem = ordemParaIniciar;
    setOrdemParaIniciar(null);
    if (!(await confirmPin())) return;
    try {
      await iniciarProducao({ ordem_id: ordem.id, mesa_id: mesaId }, usuario.id);
      Alert.alert('Produção iniciada', `Ordem Nº ${ordem.numero}`);
      reload();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível iniciar a produção.');
    }
  }

  async function handleAvancar(ordem: OrdemCorteResumo) {
    if (!usuario) return;
    if (!(await confirmPin())) return;
    try {
      await avancarEtapaOrdem(ordem.id, usuario.id);
      Alert.alert('Etapa avançada', `Ordem Nº ${ordem.numero}`);
      reload();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível avançar a etapa.');
    }
  }

  async function handlePausar(sessao: SessaoProducaoResumo) {
    if (!usuario) return;
    if (!(await confirmPin())) return;
    try {
      await pausarProducao(sessao.ordem_id, usuario.id);
      reload();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível pausar a produção.');
    }
  }

  async function handleRetomar(sessao: SessaoProducaoResumo) {
    if (!usuario) return;
    if (!(await confirmPin())) return;
    try {
      await retomarProducao(sessao.ordem_id, usuario.id);
      reload();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível retomar a produção.');
    }
  }

  const mesasLivres = (mesas ?? []).filter((m) => m.ativo && !m.ocupada);
  const opcoesMesa: SelectOption[] = mesasLivres.map((m) => ({ value: m.id, label: m.nome }));

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Zenith Cutter</Text>
          <Text style={styles.headerSubtitle}>
            {empresa?.nome ?? '...'} · {usuario?.nome ?? '...'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => signOut()}>
          <Text style={styles.signOut}>Sair</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <Section title="Fila de Produção">
          {fila === null ? (
            <ActivityIndicator />
          ) : fila.length === 0 ? (
            <Text style={styles.empty}>Nenhuma ordem na fila de produção.</Text>
          ) : (
            fila.map((ordem) => (
              <View key={ordem.id} style={styles.card}>
                <Text style={styles.cardTitle}>
                  Nº {ordem.numero} — {ordem.cliente_nome}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {ordem.produto_nome} · {ordem.tecido_nome} · {ordem.quantidade_total} peça(s)
                </Text>
                {ordem.mesa_atribuida_nome && (
                  <Text style={styles.cardSubtitle}>Mesa atribuída: {ordem.mesa_atribuida_nome}</Text>
                )}
                <TouchableOpacity
                  style={[styles.button, mesasLivres.length === 0 && styles.buttonDisabled]}
                  disabled={mesasLivres.length === 0}
                  onPress={() => setOrdemParaIniciar(ordem)}>
                  <Text style={styles.buttonText}>
                    {mesasLivres.length === 0 ? 'Nenhuma mesa livre' : 'Iniciar'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </Section>

        <Section title="Mesas de Corte">
          {mesas === null ? (
            <ActivityIndicator />
          ) : mesas.length === 0 ? (
            <Text style={styles.empty}>Nenhuma mesa de corte cadastrada.</Text>
          ) : (
            mesas.map((mesa) => (
              <View key={mesa.id} style={styles.rowBetween}>
                <Text style={styles.rowLabel}>
                  {mesa.nome}
                  {mesa.ocupada && mesa.ordem_numero !== null ? ` — Ordem Nº ${mesa.ordem_numero}` : ''}
                </Text>
                <Text style={[styles.badge, mesa.ocupada ? styles.badgeDanger : styles.badgeSecondary]}>
                  {mesa.ocupada ? 'Ocupada' : 'Livre'}
                </Text>
              </View>
            ))
          )}
        </Section>

        <Section title="Pipeline de Produção">
          {emProducao === null ? (
            <ActivityIndicator />
          ) : emProducao.length === 0 ? (
            <Text style={styles.empty}>Nenhuma ordem em produção no momento.</Text>
          ) : (
            emProducao.map((ordem) => (
              <View key={ordem.id} style={styles.card}>
                <Text style={styles.cardTitle}>
                  Nº {ordem.numero} — {ordem.cliente_nome}
                </Text>
                <Text style={styles.cardSubtitle}>{STATUS_ORDEM_CORTE_LABEL[ordem.status]}</Text>
                <TouchableOpacity style={styles.buttonOutline} onPress={() => handleAvancar(ordem)}>
                  <Text style={styles.buttonOutlineText}>Avançar etapa</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </Section>

        <Section title="Em andamento (mesas)">
          {sessoes === null ? (
            <ActivityIndicator />
          ) : sessoes.length === 0 ? (
            <Text style={styles.empty}>Nenhuma sessão de produção ativa.</Text>
          ) : (
            sessoes.map((sessao) => (
              <View key={sessao.id} style={styles.card}>
                <Text style={styles.cardTitle}>
                  Ordem Nº {sessao.ordem_numero} — {sessao.mesa_nome}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {sessao.status === 'pausada' ? 'Pausada' : 'Em Andamento'} ·{' '}
                  {formatTempoProducao(sessao)} · {sessao.iniciado_por_nome}
                </Text>
                <View style={styles.rowGap}>
                  <TouchableOpacity
                    style={styles.buttonOutlineSmall}
                    onPress={() => setSessaoPerdasObs(sessao)}>
                    <Text style={styles.buttonOutlineText}>Perdas / Observações</Text>
                  </TouchableOpacity>
                  {sessao.status === 'em_andamento' ? (
                    <TouchableOpacity style={styles.buttonOutlineSmall} onPress={() => handlePausar(sessao)}>
                      <Text style={styles.buttonOutlineText}>Pausar</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.buttonOutlineSmall} onPress={() => handleRetomar(sessao)}>
                      <Text style={styles.buttonOutlineText}>Retomar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </Section>
      </ScrollView>

      <SelectModal
        visible={ordemParaIniciar !== null}
        title={ordemParaIniciar ? `Iniciar — Ordem Nº ${ordemParaIniciar.numero}` : ''}
        options={opcoesMesa}
        onSelect={handleConfirmarIniciar}
        onClose={() => setOrdemParaIniciar(null)}
        emptyMessage="Nenhuma mesa de corte livre no momento."
      />

      {sessaoPerdasObs && (
        <PerdasObservacoesModal
          visible={sessaoPerdasObs !== null}
          sessao={sessaoPerdasObs}
          onClose={() => setSessaoPerdasObs(null)}
        />
      )}

      {pinDialog}
    </View>
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
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#cbd5e1',
    fontSize: 12,
    marginTop: 2,
  },
  signOut: {
    color: '#f87171',
    fontWeight: '600',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  empty: {
    fontSize: 13,
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    fontWeight: '700',
    color: '#0f172a',
    fontSize: 14,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowLabel: {
    fontSize: 13,
    color: '#0f172a',
  },
  rowGap: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  badgeSecondary: {
    backgroundColor: '#e2e8f0',
    color: '#0f172a',
  },
  badgeDanger: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
  },
  button: {
    marginTop: 6,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  buttonOutline: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#0f172a',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  buttonOutlineSmall: {
    borderWidth: 1,
    borderColor: '#0f172a',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  buttonOutlineText: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 12,
  },
});
