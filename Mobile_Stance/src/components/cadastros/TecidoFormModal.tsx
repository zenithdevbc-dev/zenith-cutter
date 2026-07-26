import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createTecido, updateTecido } from '../../lib/tecidos';
import type { Tecido } from '../../models';
import { FormField, FormModalHeader, formStyles } from './FormModalChrome';

interface TecidoFormModalProps {
  visible: boolean;
  tecido: Tecido | null;
  empresaId: string;
  onClose: () => void;
  onSaved: () => void;
}

/** Formulário de Material — nome interno de tabela/tipo continua "tecido" (só o rótulo virou "Material"). */
export function TecidoFormModal({ visible, tecido, empresaId, onClose, onSaved }: TecidoFormModalProps) {
  const [nome, setNome] = useState('');
  const [composicao, setComposicao] = useState('');
  const [cor, setCor] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNome(tecido?.nome ?? '');
    setComposicao(tecido?.composicao ?? '');
    setCor(tecido?.cor ?? '');
    setAtivo(tecido?.ativo ?? true);
  }, [visible, tecido]);

  async function handleSalvar() {
    if (!nome.trim()) {
      Alert.alert('Erro', 'Informe o nome do material.');
      return;
    }
    setSalvando(true);
    try {
      if (tecido) {
        await updateTecido(tecido.id, {
          nome: nome.trim(),
          composicao: composicao.trim() || null,
          cor: cor.trim() || null,
          ativo,
        });
      } else {
        await createTecido({
          empresa_id: empresaId,
          nome: nome.trim(),
          composicao: composicao.trim() || null,
          cor: cor.trim() || null,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível salvar o material.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={formStyles.screen}>
        <FormModalHeader title={tecido ? 'Editar Material' : 'Novo Material'} onClose={onClose} />
        <ScrollView contentContainerStyle={formStyles.content}>
          <FormField label="Nome">
            <TextInput style={formStyles.input} value={nome} onChangeText={setNome} />
          </FormField>
          <FormField label="Composição">
            <TextInput style={formStyles.input} value={composicao} onChangeText={setComposicao} />
          </FormField>
          <FormField label="Cor">
            <TextInput style={formStyles.input} value={cor} onChangeText={setCor} />
          </FormField>
          {tecido && (
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
