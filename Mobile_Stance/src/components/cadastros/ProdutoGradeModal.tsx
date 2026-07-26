import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  createProdutoTamanho,
  listProdutoTamanhos,
  reorderProdutoTamanhos,
  updateProdutoTamanho,
} from '../../lib/produtoTamanhos';
import type { Produto, ProdutoTamanho } from '../../models';
import { colors } from '../../theme';
import { FormModalHeader, formStyles } from './FormModalChrome';

interface ProdutoGradeModalProps {
  visible: boolean;
  produto: Produto | null;
  empresaId: string;
  onClose: () => void;
}

/**
 * Grade de tamanhos de um produto — porta `ProdutoGradeDialog.tsx`.
 * Tamanho é texto livre (não um enum — cada produto pode ter uma grade
 * diferente); reordenar é feito com botões cima/baixo (sem
 * drag-and-drop, mesmo padrão do desktop), resequenciando `ordem`
 * inteira a cada movimento.
 */
export function ProdutoGradeModal({ visible, produto, empresaId, onClose }: ProdutoGradeModalProps) {
  const [grade, setGrade] = useState<ProdutoTamanho[] | null>(null);
  const [novoTamanho, setNovoTamanho] = useState('');
  const [adicionando, setAdicionando] = useState(false);

  const reload = useCallback(async () => {
    if (!produto) return;
    try {
      setGrade(await listProdutoTamanhos(produto.id));
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível carregar a grade.');
    }
  }, [produto]);

  useEffect(() => {
    if (visible && produto) {
      reload();
    } else {
      setGrade(null);
      setNovoTamanho('');
    }
  }, [visible, produto, reload]);

  async function handleAdicionar() {
    if (!novoTamanho.trim() || !produto) return;
    setAdicionando(true);
    try {
      await createProdutoTamanho({ empresa_id: empresaId, produto_id: produto.id, tamanho: novoTamanho.trim() });
      setNovoTamanho('');
      await reload();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível adicionar o tamanho.');
    } finally {
      setAdicionando(false);
    }
  }

  async function handleRenomear(item: ProdutoTamanho, novoNome: string) {
    const nome = novoNome.trim();
    if (!nome || nome === item.tamanho) return;
    try {
      await updateProdutoTamanho(item.id, { tamanho: nome });
      await reload();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível renomear o tamanho.');
    }
  }

  async function handleToggleAtivo(item: ProdutoTamanho, ativo: boolean) {
    try {
      await updateProdutoTamanho(item.id, { ativo });
      await reload();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível atualizar o tamanho.');
    }
  }

  async function handleMover(index: number, direcao: -1 | 1) {
    if (!grade) return;
    const novoIndex = index + direcao;
    if (novoIndex < 0 || novoIndex >= grade.length) return;
    const copia = [...grade];
    [copia[index], copia[novoIndex]] = [copia[novoIndex], copia[index]];
    setGrade(copia);
    try {
      await reorderProdutoTamanhos(copia.map((t) => t.id));
      await reload();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível reordenar a grade.');
      await reload();
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={formStyles.screen}>
        <FormModalHeader title={`Grade — ${produto?.nome ?? ''}`} onClose={onClose} />
        <ScrollView contentContainerStyle={formStyles.content}>
          <View style={styles.addRow}>
            <TextInput
              style={[formStyles.input, styles.addInput]}
              placeholder="Novo tamanho (P, M, 38, Único...)"
              placeholderTextColor={colors.muted}
              value={novoTamanho}
              onChangeText={setNovoTamanho}
            />
            <TouchableOpacity
              style={[formStyles.button, styles.addButton, adicionando && formStyles.buttonDisabled]}
              disabled={adicionando}
              onPress={handleAdicionar}>
              {adicionando ? <ActivityIndicator color="#fff" /> : <Text style={formStyles.buttonText}>+</Text>}
            </TouchableOpacity>
          </View>

          {grade === null ? (
            <ActivityIndicator />
          ) : grade.length === 0 ? (
            <Text style={styles.empty}>Nenhum tamanho na grade ainda.</Text>
          ) : (
            grade.map((item, index) => (
              <GradeRow
                key={item.id}
                item={item}
                podeSubir={index > 0}
                podeDescer={index < grade.length - 1}
                onRenomear={(nome) => handleRenomear(item, nome)}
                onToggleAtivo={(ativo) => handleToggleAtivo(item, ativo)}
                onMoverCima={() => handleMover(index, -1)}
                onMoverBaixo={() => handleMover(index, 1)}
              />
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function GradeRow({
  item,
  podeSubir,
  podeDescer,
  onRenomear,
  onToggleAtivo,
  onMoverCima,
  onMoverBaixo,
}: {
  item: ProdutoTamanho;
  podeSubir: boolean;
  podeDescer: boolean;
  onRenomear: (nome: string) => void;
  onToggleAtivo: (ativo: boolean) => void;
  onMoverCima: () => void;
  onMoverBaixo: () => void;
}) {
  const [texto, setTexto] = useState(item.tamanho);

  useEffect(() => {
    setTexto(item.tamanho);
  }, [item.tamanho]);

  return (
    <View style={styles.row}>
      <View style={styles.setas}>
        <TouchableOpacity disabled={!podeSubir} onPress={onMoverCima}>
          <Text style={[styles.seta, !podeSubir && styles.setaDesabilitada]}>▲</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={!podeDescer} onPress={onMoverBaixo}>
          <Text style={[styles.seta, !podeDescer && styles.setaDesabilitada]}>▼</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={[formStyles.input, styles.rowInput]}
        value={texto}
        onChangeText={setTexto}
        onBlur={() => onRenomear(texto)}
      />
      <Switch value={item.ativo} onValueChange={onToggleAtivo} />
    </View>
  );
}

const styles = StyleSheet.create({
  addRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  addInput: {
    flex: 1,
  },
  addButton: {
    marginTop: 0,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  empty: {
    fontSize: 13,
    color: colors.muted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  setas: {
    gap: 2,
  },
  seta: {
    fontSize: 12,
    color: colors.foreground,
    paddingHorizontal: 4,
  },
  setaDesabilitada: {
    color: colors.border,
  },
  rowInput: {
    flex: 1,
  },
});
