import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  listProducaoObservacoes,
  listProducaoPerdas,
  listProdutoTamanhos,
  registrarProducaoObservacao,
  registrarProducaoPerda,
} from '../lib/producao';
import { useAuth } from '../lib/auth-context';
import type { ProducaoObservacao, ProducaoPerda, ProdutoTamanho, SessaoProducaoResumo } from '../models';

interface PerdasObservacoesModalProps {
  visible: boolean;
  sessao: SessaoProducaoResumo;
  onClose: () => void;
}

type Aba = 'perdas' | 'observacoes';

/**
 * Registro de perdas e observações da sessão — log cronológico, sem
 * PIN (não é transição de estado listada em 3.1), mas rastreável por
 * usuário+timestamp (3.5). Mesmo par de abas de
 * `Desktop_Stance/.../PerdasObservacoesDialog.tsx`.
 */
export function PerdasObservacoesModal({ visible, sessao, onClose }: PerdasObservacoesModalProps) {
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();
  const [aba, setAba] = useState<Aba>('perdas');
  const [grade, setGrade] = useState<ProdutoTamanho[]>([]);
  const [perdas, setPerdas] = useState<ProducaoPerda[] | null>(null);
  const [observacoes, setObservacoes] = useState<ProducaoObservacao[] | null>(null);
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});
  const [motivo, setMotivo] = useState('');
  const [texto, setTexto] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    listProdutoTamanhos(sessao.produto_id)
      .then((tamanhos) => setGrade(tamanhos.filter((t) => t.ativo)))
      .catch(() => Alert.alert('Erro', 'Não foi possível carregar a grade do produto.'));
    listProducaoPerdas(sessao.id)
      .then(setPerdas)
      .catch(() => Alert.alert('Erro', 'Não foi possível carregar as perdas registradas.'));
    listProducaoObservacoes(sessao.id)
      .then(setObservacoes)
      .catch(() => Alert.alert('Erro', 'Não foi possível carregar as observações.'));
  }, [visible, sessao.id, sessao.produto_id]);

  async function handleRegistrarPerda() {
    if (!usuario) return;
    const itens = grade
      .map((t) => ({ produto_tamanho_id: t.id, quantidade: Number(quantidades[t.id] || 0) }))
      .filter((i) => i.quantidade > 0);
    if (itens.length === 0) return;

    setSubmitting(true);
    try {
      for (const item of itens) {
        await registrarProducaoPerda(
          {
            sessao_id: sessao.id,
            produto_tamanho_id: item.produto_tamanho_id,
            quantidade: item.quantidade,
            motivo: motivo || null,
          },
          usuario.id,
        );
      }
      const atualizadas = await listProducaoPerdas(sessao.id);
      setPerdas(atualizadas);
      setQuantidades({});
      setMotivo('');
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar a perda.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdicionarObservacao() {
    if (!usuario || !texto.trim()) return;
    setSubmitting(true);
    try {
      await registrarProducaoObservacao({ sessao_id: sessao.id, texto: texto.trim() }, usuario.id);
      const atualizadas = await listProducaoObservacoes(sessao.id);
      setObservacoes(atualizadas);
      setTexto('');
    } catch {
      Alert.alert('Erro', 'Não foi possível adicionar a observação.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { paddingBottom: 16 + insets.bottom }]}>
          <Text style={styles.title}>
            Ordem Nº {sessao.ordem_numero} — Perdas e Observações
          </Text>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, aba === 'perdas' && styles.tabActive]}
              onPress={() => setAba('perdas')}>
              <Text style={[styles.tabText, aba === 'perdas' && styles.tabTextActive]}>Perdas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, aba === 'observacoes' && styles.tabActive]}
              onPress={() => setAba('observacoes')}>
              <Text style={[styles.tabText, aba === 'observacoes' && styles.tabTextActive]}>
                Observações
              </Text>
            </TouchableOpacity>
          </View>

          {aba === 'perdas' ? (
            <View style={styles.tabContent}>
              {grade.length === 0 ? (
                <Text style={styles.empty}>Este produto ainda não tem grade de tamanhos.</Text>
              ) : (
                <ScrollView horizontal>
                  <View style={styles.grade}>
                    {grade.map((t) => (
                      <View key={t.id} style={styles.gradeItem}>
                        <Text style={styles.gradeLabel}>{t.tamanho}</Text>
                        <TextInput
                          style={styles.gradeInput}
                          keyboardType="numeric"
                          value={quantidades[t.id] ?? ''}
                          onChangeText={(v) => setQuantidades((prev) => ({ ...prev, [t.id]: v }))}
                        />
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.flex1]}
                  placeholder="Motivo (opcional)"
                  value={motivo}
                  onChangeText={setMotivo}
                />
                <TouchableOpacity
                  style={[styles.button, submitting && styles.buttonDisabled]}
                  disabled={submitting}
                  onPress={handleRegistrarPerda}>
                  <Text style={styles.buttonText}>Registrar</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                style={styles.list}
                data={perdas ?? []}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  <Text style={styles.empty}>
                    {perdas === null ? 'Carregando...' : 'Nenhuma perda registrada.'}
                  </Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.listItem}>
                    <View style={styles.listItemHeader}>
                      <Text style={styles.listItemTitle}>
                        {item.tamanho ? `${item.tamanho} — ${item.quantidade}` : item.quantidade}
                      </Text>
                      <Text style={styles.listItemDate}>
                        {new Date(item.criado_em).toLocaleString('pt-BR')}
                      </Text>
                    </View>
                    {item.motivo && <Text style={styles.listItemBody}>{item.motivo}</Text>}
                    <Text style={styles.listItemUser}>{item.usuario_nome}</Text>
                  </View>
                )}
              />
            </View>
          ) : (
            <View style={styles.tabContent}>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.flex1]}
                  placeholder="Nova observação"
                  value={texto}
                  onChangeText={setTexto}
                />
                <TouchableOpacity
                  style={[styles.button, (submitting || !texto.trim()) && styles.buttonDisabled]}
                  disabled={submitting || !texto.trim()}
                  onPress={handleAdicionarObservacao}>
                  <Text style={styles.buttonText}>Adicionar</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                style={styles.list}
                data={observacoes ?? []}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  <Text style={styles.empty}>
                    {observacoes === null ? 'Carregando...' : 'Nenhuma observação registrada.'}
                  </Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.listItem}>
                    <View style={styles.listItemHeader}>
                      <Text style={styles.listItemDate}>{item.usuario_nome}</Text>
                      <Text style={styles.listItemDate}>
                        {new Date(item.criado_em).toLocaleString('pt-BR')}
                      </Text>
                    </View>
                    <Text style={styles.listItemBody}>{item.texto}</Text>
                  </View>
                )}
              />
            </View>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#0f172a',
  },
  tabText: {
    color: '#6b7280',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#0f172a',
  },
  tabContent: {
    gap: 12,
  },
  grade: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  gradeItem: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    width: 64,
  },
  gradeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  gradeInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    width: '100%',
    textAlign: 'center',
    paddingVertical: 4,
    fontSize: 14,
    color: '#0f172a',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  flex1: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
  },
  button: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  list: {
    maxHeight: 220,
  },
  listItem: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listItemTitle: {
    fontWeight: '600',
    color: '#0f172a',
  },
  listItemDate: {
    fontSize: 11,
    color: '#6b7280',
  },
  listItemBody: {
    color: '#374151',
    marginTop: 4,
  },
  listItemUser: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  empty: {
    fontSize: 13,
    color: '#6b7280',
    paddingVertical: 8,
  },
  closeButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#6b7280',
    fontWeight: '600',
  },
});
