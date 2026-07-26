import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { listOrdemCorteHistorico, listOrdemCorteItens } from '../../lib/ordensCorte';
import { STATUS_ORDEM_CORTE_LABEL, type OrdemCorteHistoricoEntry, type OrdemCorteItem, type OrdemCorteResumo } from '../../models';
import { colors } from '../../theme';
import { FormModalHeader, formStyles } from '../cadastros/FormModalChrome';

type Aba = 'detalhes' | 'historico';

interface InfoOrdemCorteModalProps {
  visible: boolean;
  ordem: OrdemCorteResumo | null;
  onClose: () => void;
}

/** Detalhe read-only de uma Ordem de Corte — grade de itens + histórico de auditoria. */
export function InfoOrdemCorteModal({ visible, ordem, onClose }: InfoOrdemCorteModalProps) {
  const [aba, setAba] = useState<Aba>('detalhes');
  const [itens, setItens] = useState<OrdemCorteItem[] | null>(null);
  const [historico, setHistorico] = useState<OrdemCorteHistoricoEntry[] | null>(null);

  useEffect(() => {
    if (!visible || !ordem) {
      setItens(null);
      setHistorico(null);
      return;
    }
    setAba('detalhes');
    listOrdemCorteItens(ordem.id)
      .then(setItens)
      .catch((err) => Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível carregar os itens.'));
    listOrdemCorteHistorico(ordem.id)
      .then(setHistorico)
      .catch((err) => Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível carregar o histórico.'));
  }, [visible, ordem]);

  if (!ordem) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={formStyles.screen}>
        <FormModalHeader title={`Ordem Nº ${ordem.numero}`} onClose={onClose} />

        <View style={styles.tabs}>
          <TouchableOpacity style={styles.tab} onPress={() => setAba('detalhes')}>
            <Text style={[styles.tabText, aba === 'detalhes' && styles.tabTextAtivo]}>Detalhes</Text>
            {aba === 'detalhes' && <View style={styles.tabAccent} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab} onPress={() => setAba('historico')}>
            <Text style={[styles.tabText, aba === 'historico' && styles.tabTextAtivo]}>Histórico</Text>
            {aba === 'historico' && <View style={styles.tabAccent} />}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={formStyles.content}>
          {aba === 'detalhes' ? (
            <>
              <InfoLinha label="Cliente" valor={ordem.cliente_nome} />
              <InfoLinha label="Produto" valor={ordem.produto_nome} />
              <InfoLinha label="Material" valor={ordem.tecido_nome} />
              <InfoLinha label="Status" valor={STATUS_ORDEM_CORTE_LABEL[ordem.status]} />
              <InfoLinha label="Banca responsável" valor={ordem.banca_nome ?? 'Produção interna'} />
              <InfoLinha label="Mesa atribuída" valor={ordem.mesa_atribuida_nome ?? '—'} />
              <InfoLinha label="Prazo" valor={ordem.prazo ?? '—'} />
              <InfoLinha label="Observações" valor={ordem.observacoes ?? '—'} />
              <InfoLinha label="Criada em" valor={new Date(ordem.criado_em).toLocaleString('pt-BR')} />

              <Text style={styles.subtitulo}>Grade de quantidade</Text>
              {itens === null ? (
                <ActivityIndicator />
              ) : itens.length === 0 ? (
                <Text style={styles.empty}>Nenhum item registrado.</Text>
              ) : (
                itens.map((item) => (
                  <View key={item.id} style={styles.rowBetween}>
                    <Text style={styles.rowLabel}>{item.tamanho}</Text>
                    <Text style={styles.rowValor}>{item.quantidade} peça(s)</Text>
                  </View>
                ))
              )}
            </>
          ) : historico === null ? (
            <ActivityIndicator />
          ) : historico.length === 0 ? (
            <Text style={styles.empty}>Nenhum registro de histórico.</Text>
          ) : (
            historico.map((entrada) => (
              <View key={entrada.id} style={styles.historicoItem}>
                <Text style={styles.historicoDescricao}>{entrada.descricao}</Text>
                <Text style={styles.historicoMeta}>
                  {entrada.usuario_nome} · {new Date(entrada.criado_em).toLocaleString('pt-BR')}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function InfoLinha({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.infoLinha}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  tabTextAtivo: {
    color: colors.primary,
  },
  tabAccent: {
    marginTop: 6,
    height: 2,
    width: 24,
    borderRadius: 1,
    backgroundColor: colors.primary,
  },
  infoLinha: {
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  infoValor: {
    fontSize: 14,
    color: colors.foreground,
  },
  subtitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: 8,
  },
  empty: {
    fontSize: 13,
    color: colors.muted,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rowLabel: {
    fontSize: 13,
    color: colors.foreground,
  },
  rowValor: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
  },
  historicoItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
    gap: 2,
  },
  historicoDescricao: {
    fontSize: 13,
    color: colors.foreground,
  },
  historicoMeta: {
    fontSize: 11,
    color: colors.muted,
  },
});
