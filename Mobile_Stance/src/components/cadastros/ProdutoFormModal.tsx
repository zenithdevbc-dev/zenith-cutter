import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createProduto, updateProduto } from '../../lib/produtos';
import type { Produto } from '../../models';
import { FormField, FormModalHeader, formStyles } from './FormModalChrome';

interface ProdutoFormModalProps {
  visible: boolean;
  produto: Produto | null;
  empresaId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ProdutoFormModal({ visible, produto, empresaId, onClose, onSaved }: ProdutoFormModalProps) {
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNome(produto?.nome ?? '');
    setCodigo(produto?.codigo ?? '');
    setDescricao(produto?.descricao ?? '');
    setAtivo(produto?.ativo ?? true);
  }, [visible, produto]);

  async function handleSalvar() {
    if (!nome.trim()) {
      Alert.alert('Erro', 'Informe o nome do produto.');
      return;
    }
    setSalvando(true);
    try {
      if (produto) {
        await updateProduto(produto.id, {
          nome: nome.trim(),
          codigo: codigo.trim() || null,
          descricao: descricao.trim() || null,
          ativo,
        });
      } else {
        await createProduto({
          empresa_id: empresaId,
          nome: nome.trim(),
          codigo: codigo.trim() || null,
          descricao: descricao.trim() || null,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível salvar o produto.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={formStyles.screen}>
        <FormModalHeader title={produto ? 'Editar Produto' : 'Novo Produto'} onClose={onClose} />
        <ScrollView contentContainerStyle={formStyles.content}>
          <FormField label="Nome">
            <TextInput style={formStyles.input} value={nome} onChangeText={setNome} />
          </FormField>
          <FormField label="Código/Referência">
            <TextInput style={formStyles.input} value={codigo} onChangeText={setCodigo} />
          </FormField>
          <FormField label="Descrição">
            <TextInput style={formStyles.input} value={descricao} onChangeText={setDescricao} multiline />
          </FormField>
          {produto && (
            <View style={formStyles.switchRow}>
              <Text style={formStyles.label}>Ativo</Text>
              <Switch value={ativo} onValueChange={setAtivo} />
            </View>
          )}
          <TouchableOpacity
            style={[formStyles.button, salvando && formStyles.buttonDisabled]}
            disabled={salvando}
            onPress={handleSalvar}>
            {salvando ? <ActivityIndicator color="#fff" /> : <Text style={formStyles.buttonText}>Salvar</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}
