import { useState, useMemo } from "react";
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { COUNTRIES } from "@/constants/countries";

type Props = { label?: string; value: string; onChange: (value: string) => void };

export function CountrySelect({ label, value, onChange }: Props) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={value ? styles.value : styles.placeholder}>{value || "Select country"}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.row}
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                >
                  <Text style={item === value ? styles.rowTextSelected : styles.rowText}>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  value: { fontSize: 15, color: colors.text },
  placeholder: { fontSize: 15, color: colors.textMuted },
  backdrop: { flex: 1, backgroundColor: "#00000055", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: "70%" },
  row: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowText: { fontSize: 15, color: colors.text },
  rowTextSelected: { fontSize: 15, color: colors.primary, fontWeight: "700" },
});
