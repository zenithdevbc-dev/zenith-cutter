import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { usePinConfirm } from '../usePinConfirm';
import { SelectModal, type SelectOption } from '../SelectModal';
import { GradeQuantidadeInput } from './GradeQuantidadeInput';
import { listClientes } from '../../lib/clientes';
import { listProdutos } from '../../lib/produtos';
import { listTecidos } from '../../lib/tecidos';
import { listBancas } from '../../lib/bancas';
import { listProdutoTamanhos } from '../../lib/produtoTamanhos';
import { createOrdemCorte, getNextOrdemCorteNumero, listOrdemCorteItens, updateOrdemCorte } from '../../lib/ordensCorte';
import {
  STATUS_ORDEM_CORTE_LABEL,
  type Cliente,
  type OrdemCorteResumo,
  type Produto,
  type ProdutoTamanho,
  type StatusOrdemCorte,
  type Tecido,
  type Banca,
} from '../../models';
import { FormField, FormModalHeader, formStyles } from '../cadastros/FormModalChrome';
import { colors } from '../../theme';

const STATUS_EDITAVEIS: StatusOrdemCorte[] = ['planejado', 'em_fila', 'cancelada'];

interface OrdemCorteFormModalProps {
  visible: boolean;
  ordem: OrdemCorteResumo | null;
  empresaId: string;
  usuarioId: string;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Criar/editar Ordem de Corte — um único componente pras duas ações
 * (mobile não precisa de 2 diálogos separados como o desktop). `numero`
 * só é editável/sugerido em criação; `status` só é editável quando a
 * ordem ainda não entrou no pipeline de produção (planejado/em_fila/
 * cancelada) — nas demais etapas fica só leitura e é sempre reenviado
 * sem mudança (a trava real fica no repositório, replicada aqui pra
 * não ficar mostrando um seletor que sempre vai falhar ao salvar).
 */
export function OrdemCorteFormModal({
  visible,
  ordem,
  empresaId,
  usuarioId,
  onClose,
  onSaved,
}: OrdemCorteFormModalProps) {
  const { confirm: confirmPin, dialog: pinDialog } = usePinConfirm();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [tecidos, setTecidos] = useState<Tecido[]>([]);
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [grade, setGrade] = useState<ProdutoTamanho[]>([]);

  const [numero, setNumero] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const [tecidoId, setTecidoId] = useState('');
  const [bancaId, setBancaId] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [prazo, setPrazo] = useState('');
  const [status, setStatus] = useState<StatusOrdemCorte>('planejado');
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});

  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [pickerAberto, setPickerAberto] = useState<
    'cliente' | 'produto' | 'tecido' | 'banca' | 'status' | null
  >(null);

  const produtoCarregadoRef = useRef<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelado = false;
    setCarregando(true);
    (async () => {
      try {
        const [cs, ps, ts, bs] = await Promise.all([listClientes(), listProdutos(), listTecidos(), listBancas()]);
        if (cancelado) return;
        setClientes(cs.filter((c) => c.ativo));
        setProdutos(ps.filter((p) => p.ativo));
        setTecidos(ts.filter((t) => t.ativo));
        setBancas(bs.filter((b) => b.ativo));

        if (ordem) {
          setNumero(String(ordem.numero));
          setClienteId(ordem.cliente_id);
          setProdutoId(ordem.produto_id);
          setTecidoId(ordem.tecido_id);
          setBancaId(ordem.banca_id ?? '');
          setObservacoes(ordem.observacoes ?? '');
          setPrazo(ordem.prazo ?? '');
          setStatus(ordem.status);
          const [g, itens] = await Promise.all([
            listProdutoTamanhos(ordem.produto_id),
            listOrdemCorteItens(ordem.id),
          ]);
          if (cancelado) return;
          produtoCarregadoRef.current = ordem.produto_id;
          setGrade(g);
          const q: Record<string, string> = {};
          for (const item of itens) q[item.produto_tamanho_id] = String(item.quantidade);
          setQuantidades(q);
        } else {
          const sugestao = await getNextOrdemCorteNumero(empresaId);
          if (cancelado) return;
          produtoCarregadoRef.current = null;
          setNumero(String(sugestao));
          setClienteId('');
          setProdutoId('');
          setTecidoId('');
          setBancaId('');
          setObservacoes('');
          setPrazo('');
          setStatus('planejado');
          setGrade([]);
          setQuantidades({});
        }
      } catch (err) {
        Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível carregar o formulário.');
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [visible, ordem, empresaId]);

  useEffect(() => {
    if (!visible || !produtoId) return;
    if (produtoCarregadoRef.current === produtoId) return;
    produtoCarregadoRef.current = produtoId;
    (async () => {
      try {
        const g = await listProdutoTamanhos(produtoId);
        setGrade(g);
        setQuantidades({});
      } catch (err) {
        Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível carregar a grade do produto.');
      }
    })();
  }, [visible, produtoId]);

  async function handleSalvar() {
    if (!clienteId || !produtoId || !tecidoId) {
      Alert.alert('Erro', 'Selecione cliente, produto e material.');
      return;
    }
    const numeroInt = parseInt(numero, 10);
    if (!ordem && (!Number.isInteger(numeroInt) || numeroInt <= 0)) {
      Alert.alert('Erro', 'Informe um número de ordem válido.');
      return;
    }
    const itens = grade
      .map((t) => ({ produto_tamanho_id: t.id, quantidade: parseInt(quantidades[t.id] ?? '0', 10) || 0 }))
      .filter((i) => i.quantidade > 0);
    if (itens.length === 0) {
      Alert.alert('Erro', 'Informe a quantidade de ao menos um tamanho da grade.');
      return;
    }

    if (!(await confirmPin())) return;

    setSalvando(true);
    try {
      const camposComuns = {
        cliente_id: clienteId,
        produto_id: produtoId,
        tecido_id: tecidoId,
        observacoes: observacoes.trim() || null,
        prazo: prazo.trim() || null,
        banca_id: bancaId || null,
      };
      if (ordem) {
        await updateOrdemCorte(ordem.id, { ...camposComuns, status, itens }, usuarioId);
      } else {
        await createOrdemCorte({ empresa_id: empresaId, numero: numeroInt, ...camposComuns, itens }, usuarioId);
      }
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível salvar a ordem de corte.');
    } finally {
      setSalvando(false);
    }
  }

  const statusEditavel = STATUS_EDITAVEIS.includes(status) || !ordem;
  const opcoesCliente: SelectOption[] = clientes.map((c) => ({ value: c.id, label: c.nome }));
  const opcoesProduto: SelectOption[] = produtos.map((p) => ({ value: p.id, label: p.nome }));
  const opcoesTecido: SelectOption[] = tecidos.map((t) => ({ value: t.id, label: t.nome }));
  const opcoesBanca: SelectOption[] = [
    { value: '', label: 'Produção interna' },
    ...bancas.map((b) => ({ value: b.id, label: b.nome })),
  ];
  const opcoesStatus: SelectOption[] = STATUS_EDITAVEIS.map((s) => ({ value: s, label: STATUS_ORDEM_CORTE_LABEL[s] }));

  function nomeSelecionado(opcoes: SelectOption[], value: string, vazio = 'Selecionar...') {
    return opcoes.find((o) => o.value === value)?.label ?? vazio;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={formStyles.screen}>
        <FormModalHeader title={ordem ? `Editar Ordem Nº ${ordem.numero}` : 'Nova Ordem de Corte'} onClose={onClose} />
        {carregando ? (
          <View style={formStyles.content}>
            <ActivityIndicator />
          </View>
        ) : (
          <ScrollView contentContainerStyle={formStyles.content}>
            {!ordem && (
              <FormField label="Número">
                <TextInput style={formStyles.input} value={numero} onChangeText={setNumero} keyboardType="number-pad" />
              </FormField>
            )}

            <FormField label="Cliente">
              <TouchableOpacity style={formStyles.input} onPress={() => setPickerAberto('cliente')}>
                <Text>{nomeSelecionado(opcoesCliente, clienteId)}</Text>
              </TouchableOpacity>
            </FormField>

            <FormField label="Produto">
              <TouchableOpacity style={formStyles.input} onPress={() => setPickerAberto('produto')}>
                <Text>{nomeSelecionado(opcoesProduto, produtoId)}</Text>
              </TouchableOpacity>
            </FormField>

            <FormField label="Material">
              <TouchableOpacity style={formStyles.input} onPress={() => setPickerAberto('tecido')}>
                <Text>{nomeSelecionado(opcoesTecido, tecidoId)}</Text>
              </TouchableOpacity>
            </FormField>

            <FormField label="Banca responsável (opcional)">
              <TouchableOpacity style={formStyles.input} onPress={() => setPickerAberto('banca')}>
                <Text>{nomeSelecionado(opcoesBanca, bancaId, 'Produção interna')}</Text>
              </TouchableOpacity>
            </FormField>

            <FormField label="Observações">
              <TextInput style={formStyles.input} value={observacoes} onChangeText={setObservacoes} multiline />
            </FormField>

            <FormField label="Prazo (opcional, AAAA-MM-DD)">
              <TextInput
                style={formStyles.input}
                value={prazo}
                onChangeText={setPrazo}
                placeholder="2026-08-01"
                placeholderTextColor={colors.muted}
              />
            </FormField>

            {ordem && (
              <FormField label="Status">
                {statusEditavel ? (
                  <TouchableOpacity style={formStyles.input} onPress={() => setPickerAberto('status')}>
                    <Text>{STATUS_ORDEM_CORTE_LABEL[status]}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={formStyles.input}>
                    {STATUS_ORDEM_CORTE_LABEL[status]} — em produção, avance pela tela Produção
                  </Text>
                )}
              </FormField>
            )}

            <FormField label="Grade de quantidade">
              <GradeQuantidadeInput
                grade={grade}
                quantidades={quantidades}
                onChange={(id, valor) => setQuantidades((prev) => ({ ...prev, [id]: valor }))}
              />
            </FormField>

            <TouchableOpacity
              style={[formStyles.button, salvando && formStyles.buttonDisabled]}
              disabled={salvando}
              onPress={handleSalvar}>
              {salvando ? <ActivityIndicator color="#fff" /> : <Text style={formStyles.buttonText}>Salvar</Text>}
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      <SelectModal
        visible={pickerAberto === 'cliente'}
        title="Cliente"
        options={opcoesCliente}
        onSelect={(v) => {
          setClienteId(v);
          setPickerAberto(null);
        }}
        onClose={() => setPickerAberto(null)}
      />
      <SelectModal
        visible={pickerAberto === 'produto'}
        title="Produto"
        options={opcoesProduto}
        onSelect={(v) => {
          setProdutoId(v);
          setPickerAberto(null);
        }}
        onClose={() => setPickerAberto(null)}
      />
      <SelectModal
        visible={pickerAberto === 'tecido'}
        title="Material"
        options={opcoesTecido}
        onSelect={(v) => {
          setTecidoId(v);
          setPickerAberto(null);
        }}
        onClose={() => setPickerAberto(null)}
      />
      <SelectModal
        visible={pickerAberto === 'banca'}
        title="Banca responsável"
        options={opcoesBanca}
        onSelect={(v) => {
          setBancaId(v);
          setPickerAberto(null);
        }}
        onClose={() => setPickerAberto(null)}
      />
      <SelectModal
        visible={pickerAberto === 'status'}
        title="Status"
        options={opcoesStatus}
        onSelect={(v) => {
          setStatus(v as StatusOrdemCorte);
          setPickerAberto(null);
        }}
        onClose={() => setPickerAberto(null)}
      />
      {pinDialog}
    </Modal>
  );
}

