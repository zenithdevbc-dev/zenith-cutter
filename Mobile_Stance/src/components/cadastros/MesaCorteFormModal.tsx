import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createMesaCorte, updateMesaCorte } from '../../lib/mesasCorte';
import type { MesaCorte } from '../../models';
import { FormField, FormModalHeader, formStyles } from './FormModalChrome';

interface MesaCorteFormModalProps {
  visible: boolean;
  mesa: MesaCorte | null;
  empresaId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function MesaCorteFormModal({ visible, mesa, empresaId, onClose, onSaved }: MesaCorteFormModalProps) {
  const [nome, setNome] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNome(mesa?.nome ?? '');
    setObservacoes(mesa?.observacoes ?? '');
    setAtivo(mesa?.ativo ?? true);
  }, [visible, mesa]);

  async function handleSalvar() {
    if (!nome.trim()) {
      Alert.alert('Erro', 'Informe o nome/identificação da mesa.');
      return;
    }
    setSalvando(true);
    try {
      if (mesa) {
        await updateMesaCorte(mesa.id, {
          nome: nome.trim(),
          observacoes: observacoes.trim() || null,
          ativo,
        });
      } else {
        await createMesaCorte({
          empresa_id: empresaId,
          nome: nome.trim(),
          observacoes: observacoes.trim() || null,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível salvar a mesa de corte.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={formStyles.screen}>
        <FormModalHeader title={mesa ? 'Editar Mesa de Corte' : 'Nova Mesa de Corte'} onClose={onClose} />
        <ScrollView contentContainerStyle={formStyles.content}>
          <FormField label="Nome/Identificação">
            <TextInput style={formStyles.input} value={nome} onChangeText={setNome} />
          </FormField>
          <FormField label="Observações">
            <TextInput style={formStyles.input} value={observacoes} onChangeText={setObservacoes} multiline />
          </FormField>
          {mesa && (
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
