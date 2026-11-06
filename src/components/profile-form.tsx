import { TAB_BAR_SPACE } from "@/components/ui/floating-tab-bar";
import { useCallback, useRef, useState, useMemo } from "react";
import { View, Text, ScrollView, Pressable, Animated, ActivityIndicator, StyleSheet, Platform, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { fetchProfile, updateProfile, uploadAvatarPhoto } from "@/lib/profile";
import { spacing, radius, cardShadow } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Reveal } from "@/components/ui/reveal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { CountrySelect } from "@/components/ui/country-select";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { useIsDesktop } from "@/hooks/use-desktop";
import { uploadIdDocument, ID_STATUS_LABEL } from "@/lib/verification";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

// One row of a settings group: icon, label, optional trailing text / chevron.
function SettingsRow({ icon, label, value, onPress, danger, chevron = "chevron-forward", first, last, styles, colors }: {
  icon: IconName; label: string; value?: string; onPress?: () => void; danger?: boolean;
  chevron?: IconName | null; first?: boolean; last?: boolean;
  styles: ReturnType<typeof makeStyles>; colors: Theme["colors"];
}) {
  const tint = danger ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, first && styles.rowFirst, last && styles.rowLast]}
    >
      <Ionicons name={icon} size={22} color={tint} />
      <Text style={[styles.rowLabel, { color: tint }]}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {onPress && chevron ? <Ionicons name={chevron} size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

function ChangePasswordButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = (value: number) => Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40 }).start();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animateTo(0.96)}
        onPressOut={() => animateTo(1)}
        style={styles.changePasswordButton}
      >
        <Ionicons name="key-outline" size={16} color={colors.primary} />
        <Text style={styles.changePasswordLabel}>Change Password</Text>
      </Pressable>
    </Animated.View>
  );
}

export function ProfileForm({ hint, showLogout }: { hint: string; showLogout?: boolean }) {
  const theme = useTheme();
  const { colors, typography } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { session, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [country, setCountry] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const loadProfile = useCallback(() => {
    if (!session) return;
    fetchProfile(session.user.id).then((data) => {
      setFullName(data.full_name ?? "");
      setWhatsappNumber(data.whatsapp_number ?? "");
      setAvatarUrl(data.avatar_url ?? null);
      setCountry(data.country ?? "");
    });
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  async function handleUploadPhoto() {
    if (!session) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadAvatarPhoto(session.user.id);
      if (url) setAvatarUrl(url);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmitId() {
    if (!session) return;
    try {
      if (await uploadIdDocument(session.user.id)) {
        Alert.alert("Submitted", "Your ID is under review. You'll get the Verified landlord mark once it's approved.");
        await refreshProfile?.();
      }
    } catch {
      Alert.alert("Couldn't submit", "Please try again.");
    }
  }

  async function handleSave() {
    if (!session) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile(session.user.id, {
        full_name: fullName,
        whatsapp_number: whatsappNumber,
        avatar_url: avatarUrl,
        country,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const isDesktop = useIsDesktop();
  const [editOpen, setEditOpen] = useState(false);

  // Phone layout: settings-style page (avatar header + grouped rows). Desktop keeps the card form.
  if (!isDesktop) {
    const row = { styles, colors };
    return (
      <ScrollView contentContainerStyle={styles.sContainer}>
        <View style={styles.sHeader}>
          <Pressable onPress={handleUploadPhoto} disabled={uploadingPhoto} accessibilityLabel="Change photo">
            <Avatar uri={avatarUrl} name={fullName} size={96} />
            <View style={styles.cameraBadge}>
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Ionicons name="camera" size={14} color={colors.onPrimary} />
              )}
            </View>
          </Pressable>
          <Text style={styles.sName}>{fullName || "Your name"}</Text>
          <Text style={styles.hint}>{session?.user.email}</Text>
        </View>

        <Text style={styles.groupLabel}>Account</Text>
        <View style={styles.group}>
          <SettingsRow {...row} first icon="person-circle" label="Personal info" chevron={editOpen ? "chevron-up" : "chevron-down"} onPress={() => setEditOpen((o) => !o)} />
          {editOpen && (
            <View style={styles.editBlock}>
              <Input label="Full name" value={fullName} onChangeText={setFullName} />
              <Input label="WhatsApp number" placeholder="+2348012345678" value={whatsappNumber} onChangeText={setWhatsappNumber} keyboardType="phone-pad" />
              <CountrySelect label="Country" value={country} onChange={setCountry} />
              {saved && <Text style={styles.saved}>Saved.</Text>}
              <View style={styles.headerButtons}>
                <Button label="Cancel" variant="outline" onPress={() => { loadProfile(); setEditOpen(false); }} style={styles.headerButton} />
                <Button label="Save" loading={saving} loadingLabel="Saving..." onPress={handleSave} style={styles.headerButton} />
              </View>
            </View>
          )}
          <SettingsRow
            {...row}
            icon="id-card"
            label="ID verification"
            value={ID_STATUS_LABEL[profile?.id_status ?? "none"].replace(" - tap to resubmit", "")}
            onPress={
              profile?.id_status === "pending" || profile?.id_status === "verified"
                ? undefined
                : handleSubmitId
            }
          />
          <SettingsRow {...row} icon="shield-checkmark" label="Role" value={profile?.role ?? ""} />
          <SettingsRow {...row} last icon="lock-closed" label="Change password" onPress={() => setChangePasswordOpen(true)} />
        </View>

        <Text style={styles.groupLabel}>App</Text>
        <View style={styles.group}>
          <View style={[styles.row, styles.rowFirst, styles.rowLast, styles.rowStack]}>
            <View style={styles.rowTop}>
              <Ionicons name="contrast" size={22} color={colors.text} />
              <Text style={styles.rowLabel}>Appearance</Text>
            </View>
            <ThemeToggle />
          </View>
        </View>

        <View style={[styles.group, { marginTop: spacing.xl }]}>
          <SettingsRow {...row} first last danger icon="log-out" label="Log out" chevron={null} onPress={() => supabase.auth.signOut()} />
        </View>

        <ChangePasswordModal
          visible={changePasswordOpen}
          onClose={() => setChangePasswordOpen(false)}
          email={session?.user.email ?? ""}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Reveal style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={typography.subheading}>Personal Info</Text>
            <Text style={styles.hint}>{hint}</Text>
          </View>
          <View style={styles.headerButtons}>
            <Button label="Cancel" variant="outline" onPress={loadProfile} style={styles.headerButton} />
            <Button label="Save Changes" loading={saving} loadingLabel="Saving..." onPress={handleSave} style={styles.headerButton} />
          </View>
        </View>

        {saved && <Text style={styles.saved}>Saved.</Text>}

        <Input label="Full name" value={fullName} onChangeText={setFullName} />
        <Input label="Email" value={session?.user.email ?? ""} editable={false} style={styles.readOnly} />
        <Input
          label="WhatsApp number"
          placeholder="+2348012345678"
          value={whatsappNumber}
          onChangeText={setWhatsappNumber}
          keyboardType="phone-pad"
        />

        <View style={styles.wrap}>
          <Text style={styles.label}>Your Photo</Text>
          <View style={styles.photoRow}>
            <Avatar uri={avatarUrl} name={fullName} />
            <Pressable style={styles.dropzone} onPress={handleUploadPhoto} disabled={uploadingPhoto}>
              {uploadingPhoto ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={22} color={colors.textMuted} />
                  <Text style={styles.dropzoneText}>
                    {Platform.OS === "web" ? (
                      <><Text style={styles.dropzoneLink}>Click to upload</Text> or drag and drop</>
                    ) : (
                      <Text style={styles.dropzoneLink}>Tap to upload a photo</Text>
                    )}
                  </Text>
                  <Text style={styles.caption}>SVG, PNG or JPG (max. 800x400px)</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        <Input label="Role" value={profile?.role ?? ""} editable={false} style={styles.readOnly} />
        <CountrySelect label="Country" value={country} onChange={setCountry} />

        <Text style={styles.sectionLabel}>Appearance</Text>
        <ThemeToggle />

        <Text style={styles.sectionLabel}>Security</Text>
        <ChangePasswordButton onPress={() => setChangePasswordOpen(true)} />
        <ChangePasswordModal
          visible={changePasswordOpen}
          onClose={() => setChangePasswordOpen(false)}
          email={session?.user.email ?? ""}
        />

        {showLogout && (
          <Button
            label="Log out"
            variant="text"
            color={colors.danger}
            onPress={() => supabase.auth.signOut()}
            style={styles.logout}
          />
        )}
      </Reveal>
    </ScrollView>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  // settings-style phone layout
  sContainer: { flexGrow: 1, padding: spacing.lg, paddingBottom: TAB_BAR_SPACE, backgroundColor: colors.background },
  sHeader: { alignItems: "center", gap: spacing.xs, marginVertical: spacing.xl },
  sName: { fontSize: 22, fontWeight: "700", color: colors.text, marginTop: spacing.sm },
  cameraBadge: {
    position: "absolute", right: 0, bottom: 0, width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: colors.background,
  },
  groupLabel: { fontSize: 13, color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.sm, marginLeft: spacing.xs },
  group: { gap: 2 },
  row: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: 6, paddingVertical: 16, paddingHorizontal: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  rowFirst: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  rowLast: { borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  rowStack: { flexDirection: "column", alignItems: "stretch" },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: "500", color: colors.text },
  rowValue: { fontSize: 14, color: colors.textMuted, textTransform: "capitalize" },
  editBlock: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: spacing.lg, gap: spacing.md },
  container: { flexGrow: 1, padding: spacing.xl, paddingBottom: TAB_BAR_SPACE, backgroundColor: colors.surfaceMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
    ...cardShadow,
  },
  // ponytail: stacked on phones, side-by-side on web
  cardHeader: { flexDirection: Platform.OS === "web" ? "row" : "column", alignItems: Platform.OS === "web" ? "flex-start" : "stretch", gap: spacing.md },
  headerButtons: { flexDirection: "row", gap: spacing.sm },
  headerButton: { paddingHorizontal: spacing.lg, flex: Platform.OS === "web" ? 0 : 1 },
  hint: { ...typography.caption, marginTop: 2 },
  saved: { color: colors.success, fontWeight: "600" },
  error: { color: colors.danger },
  sectionLabel: { ...typography.subheading, marginTop: spacing.lg },
  logout: { marginTop: spacing.lg, alignItems: "center" },
  wrap: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  photoRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dropzone: {
    flex: 1,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dropzoneText: { fontSize: 13, color: colors.textMuted },
  dropzoneLink: { color: colors.primary, fontWeight: "600" },
  caption: { ...typography.caption },
  readOnly: { color: colors.textMuted, backgroundColor: colors.surfaceMuted },
  changePasswordButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
  },
  changePasswordLabel: { color: colors.primary, fontWeight: "600", fontSize: 15 },
});
