import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NavItem, PageId } from '../navigation';
import { colors } from '../theme';

/**
 * Barra de abas inferior, só texto (sem lib de ícones) — decisão de não
 * adicionar `react-navigation` (ver plano da expansão mobile): os pares
 * nativos que ele exigiria (`react-native-screens`,
 * `react-native-gesture-handler`) somam mais superfície de codegen sem
 * necessidade real pra um app interno de ~6 destinos fixos, sem deep
 * link. Troca de tela é só `useState` em `App.tsx`.
 */
export function BottomTabBar({
  items,
  active,
  onSelect,
}: {
  items: NavItem[];
  active: PageId;
  onSelect: (id: PageId) => void;
}) {
  return (
    <View style={styles.bar}>
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.cell}
            onPress={() => onSelect(item.id)}
            activeOpacity={0.7}>
            <View style={[styles.accent, isActive && styles.accentActive]} />
            <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 10,
  },
  accent: {
    height: 2,
    width: 28,
    borderRadius: 1,
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  accentActive: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  labelActive: {
    color: colors.primary,
  },
});
