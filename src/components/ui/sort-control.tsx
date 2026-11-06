import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import type { SortOption } from "@/lib/listings";
import { spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Button } from "@/components/ui/button";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
];

export function SortControl({ value, onChange }: { value: SortOption; onChange: (sort: SortOption) => void }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.row}>
      {SORT_OPTIONS.map((option) => (
        <Button
          key={option.value}
          label={option.label}
          variant={value === option.value ? "primary" : "outline"}
          onPress={() => onChange(option.value)}
          style={styles.button}
        />
      ))}
    </View>
  );
}

const makeStyles = ({  }: Theme) => StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm },
  button: { flex: 1, paddingVertical: 8 },
});
