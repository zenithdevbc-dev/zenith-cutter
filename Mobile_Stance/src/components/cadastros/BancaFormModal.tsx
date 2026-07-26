import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createBanca, updateBanca } from '../../lib/bancas';
import type { Banca } from '../../models';
import { FormField, FormModalHeader, formStyles } from './FormModalChrome';

interface BancaFormModalProps {
  visible: boolean;
  banca: Banca | null;
  empresaId: string;
  onClose: () => void;
  onSaved: () => void;
}

/** Formulário de Terceiro — nome interno de tabela/tipo continua "banca" (só o rótulo virou "Terceiro"). */
export function BancaFormModal({ visible, banca, empresaId, onClose, onSaved }: BancaFormModalProps) {
  const [nome, setNome] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [endereco, setEndereco] = useState('');
  const [tipoServico, setTipoServico] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNome(banca?.nome ?? '');
    setResponsavel(banca?.responsavel ?? '');
    setTelefone(banca?.telefone ?? '');
    setWhatsapp(banca?.whatsapp ?? '');
    setEmail(banca?.email ?? '');
    setEndereco(banca?.endereco ?? '');
    setTipoServico(banca?.tipo_servico ?? '');
    setObservacoes(banca?.observacoes ?? '');
    setAtivo(banca?.ativo ?? true);
  }, [visible, banca]);

  async function handleSalvar() {
    if (!nome.trim()) {
      Alert.alert('Erro', 'Informe o nome do terceiro.');
      return;
    }
    setSalvando(true);
    try {
      const campos = {
        nome: nome.trim(),
        responsavel: responsavel.trim() || null,
        telefone: telefone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        email: email.trim() || null,
        endereco: endereco.trim() || null,
        tipo_servico: tipoServico.trim() || null,
        observacoes: observacoes.trim() || null,
      };
      if (banca) {
        await updateBanca(banca.id, { ...campos, ativo });
      } else {
        await createBanca({ empresa_id: empresaId, ...campos });
      }
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível salvar o terceiro.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={formStyles.screen}>
        <FormModalHeader title={banca ? 'Editar Terceiro' : 'Novo Terceiro'} onClose={onClose} />
        <ScrollView contentContainerStyle={formStyles.content}>
          <FormField label="Nome">
            <TextInput style={formStyles.input} value={nome} onChangeText={setNome} />
          </FormField>
          <FormField label="Responsável">
            <TextInput style={formStyles.input} value={responsavel} onChangeText={setResponsavel} />
          </FormField>
          <FormField label="Telefone">
            <TextInput style={formStyles.input} value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
          </FormField>
          <FormField label="WhatsApp">
            <TextInput style={formStyles.input} value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />
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
          <FormField label="Endereço">
            <TextInput style={formStyles.input} value={endereco} onChangeText={setEndereco} />
          </FormField>
          <FormField label="Tipo de serviço">
            <TextInput style={formStyles.input} value={tipoServico} onChangeText={setTipoServico} />
          </FormField>
          <FormField label="Observações">
            <TextInput style={formStyles.input} value={observacoes} onChangeText={setObservacoes} multiline />
          </FormField>
          {banca && (
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
