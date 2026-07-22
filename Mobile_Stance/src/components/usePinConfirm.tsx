import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { verifyPin, pinBloqueadoRestanteMs } from '../lib/pin';

/**
 * Confirmação de PIN antes de iniciar/pausar/retomar/avançar etapa —
 * reforça "operador sempre no controle" (CLAUDE.md 3.1), mesmo padrão
 * de `Desktop_Stance/src/renderer/components/usePinConfirm.tsx`.
 * `confirm()` devolve uma Promise<boolean>: true se o PIN bateu, false
 * se cancelado.
 */
export function usePinConfirm() {
  const [visible, setVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  function confirm(): Promise<boolean> {
    setPin('');
    setError(null);
    setVisible(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }

  function resolveAndClose(confirmed: boolean) {
    setVisible(false);
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
  }

  function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const ok = verifyPin(pin);
    setSubmitting(false);
    if (ok) {
      resolveAndClose(true);
      return;
    }
    const restanteMs = pinBloqueadoRestanteMs();
    if (restanteMs > 0) {
      setError(`Muitas tentativas erradas. Aguarde ${Math.ceil(restanteMs / 1000)}s e tente de novo.`);
    } else {
      setError('PIN incorreto.');
    }
  }

  const dialog = (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => resolveAndClose(false)}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Confirme seu PIN</Text>
          <Text style={styles.label}>PIN (sua senha de login)</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            autoFocus
            value={pin}
            onChangeText={setPin}
            onSubmitEditing={handleSubmit}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.buttonOutline]}
              onPress={() => resolveAndClose(false)}>
              <Text style={styles.buttonOutlineText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, submitting && styles.buttonDisabled]}
              disabled={submitting}
              onPress={handleSubmit}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonPrimaryText}>Confirmar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return { confirm, dialog };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
    marginTop: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 18,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 96,
    alignItems: 'center',
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  buttonOutlineText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  buttonPrimary: {
    backgroundColor: '#0f172a',
  },
  buttonPrimaryText: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
