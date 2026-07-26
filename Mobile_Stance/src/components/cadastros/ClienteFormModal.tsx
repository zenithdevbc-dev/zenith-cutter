import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createCliente, updateCliente } from '../../lib/clientes';
import type { Cliente } from '../../models';
import { FormField, FormModalHeader, formStyles } from './FormModalChrome';

interface ClienteFormModalProps {
  visible: boolean;
  cliente: Cliente | null;
  empresaId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ClienteFormModal({ visible, cliente, empresaId, onClose, onSaved }: ClienteFormModalProps) {
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNome(cliente?.nome ?? '');
    setDocumento(cliente?.documento ?? '');
    setTelefone(cliente?.telefone ?? '');
    setEmail(cliente?.email ?? '');
    setAtivo(cliente?.ativo ?? true);
  }, [visible, cliente]);

  async function handleSalvar() {
    if (!nome.trim()) {
      Alert.alert('Erro', 'Informe o nome do cliente.');
      return;
    }
    setSalvando(true);
    try {
      if (cliente) {
        await updateCliente(cliente.id, {
          nome: nome.trim(),
          documento: documento.trim() || null,
          telefone: telefone.trim() || null,
          email: email.trim() || null,
          ativo,
        });
      } else {
        await createCliente({
          empresa_id: empresaId,
          nome: nome.trim(),
          documento: documento.trim() || null,
          telefone: telefone.trim() || null,
          email: email.trim() || null,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível salvar o cliente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={formStyles.screen}>
        <FormModalHeader title={cliente ? 'Editar Cliente' : 'Novo Cliente'} onClose={onClose} />
        <ScrollView contentContainerStyle={formStyles.content}>
          <FormField label="Nome">
            <TextInput style={formStyles.input} value={nome} onChangeText={setNome} />
          </FormField>
          <FormField label="Documento (CPF/CNPJ)">
            <TextInput style={formStyles.input} value={documento} onChangeText={setDocumento} />
          </FormField>
          <FormField label="Telefone">
            <TextInput style={formStyles.input} value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
          </FormField>
          <FormField label="E-mail">
            <TextInput
              style={formStyles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </FormField>
          {cliente && (
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
