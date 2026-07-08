import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, Image, StyleSheet } from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { fetchListings, type Listing } from "@/lib/listings";

export default function Dashboard() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      fetchListings()
        .then((data) => !cancelled && setListings(data))
        .finally(() => !cancelled && setLoading(false));
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Link href="/(dashboard)/listing/new" style={styles.newButton}>
          + New listing
        </Link>
        <Pressable onPress={() => supabase.auth.signOut()}>
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </View>

      {!loading && listings.length === 0 && (
        <Text style={styles.empty}>No listings yet. Add your first one.</Text>
      )}

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Link href={`/(dashboard)/listing/${item.id}`} asChild>
            <Pressable style={styles.card}>
              {item.photos[0] && <Image source={{ uri: item.photos[0] }} style={styles.thumb} />}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>
                  {item.city ?? "—"} · ${item.price}/mo
                </Text>
              </View>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  newButton: { color: "#208AEF", fontWeight: "600", fontSize: 16 },
  logout: { color: "#d33", fontSize: 16 },
  empty: { textAlign: "center", color: "#888", marginTop: 40 },
  list: { padding: 16, gap: 12 },
  card: { flexDirection: "row", gap: 12, borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 10 },
  thumb: { width: 64, height: 64, borderRadius: 8 },
  cardInfo: { justifyContent: "center" },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardSubtitle: { color: "#666", marginTop: 4 },
});
