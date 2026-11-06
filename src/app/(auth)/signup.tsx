import { useState, useMemo } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useIsDesktop } from "@/hooks/use-desktop";
import { AuthFormFrame } from "@/components/auth/auth-form-frame";
import { HeroBackground } from "@/components/hero-background";
import { DividerOnPhoto } from "@/components/auth/divider-on-photo";
import { SocialSignInRow } from "@/components/auth/social-sign-in-row";
import { Reveal } from "@/components/ui/reveal";

export default function Signup() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignup() {
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setSubmitting(false);
    if (error) setError(error.message);
  }

  if (isDesktop) {
    return (
      <AuthFormFrame
        title="Create an account"
        subtitle="Access your tasks, notes, and projects anytime, anywhere."
        footer={
          <Link href="/(auth)/login" style={styles.link}>
            Already have an account? Log in
          </Link>
        }
      >
        <Input placeholder="Full name" value={fullName} onChangeText={setFullName} />
        <Input placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Input
          placeholder="Password"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          rightSlot={
            <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
            </Pressable>
          }
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <Button label="Sign up" loading={submitting} loadingLabel="Signing up..." onPress={handleSignup} style={styles.button} />
      </AuthFormFrame>
    );
  }

  return (
    <HeroBackground>
      <SafeAreaView style={styles.safe}>
        <Pressable
          style={styles.backButton}
          hitSlop={8}
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(auth)/welcome"))}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>

        <Reveal delay={150} style={styles.bottom}>
          <Text style={styles.title}>Landlord sign up</Text>

          <Input placeholder="Full name" value={fullName} onChangeText={setFullName} />
          <Input placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Input placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.submitButton} onPress={handleSignup} disabled={submitting}>
            {submitting ? <ActivityIndicator color={colors.text} /> : <Text style={styles.submitButtonText}>Sign up</Text>}
          </Pressable>

          <DividerOnPhoto label="or continue with" />
          <SocialSignInRow />

          <Link href="/(auth)/login" style={styles.linkOnPhoto}>
            Already have an account? Log in
          </Link>
        </Reveal>
      </SafeAreaView>
    </HeroBackground>
  );
}

const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  safe: { flex: 1, justifyContent: "space-between", padding: spacing.xl },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottom: { gap: spacing.md },
  title: { fontSize: 30, fontWeight: "800", color: "#fff", marginBottom: spacing.xs },
  button: { marginTop: spacing.xs },
  error: { color: colors.danger },
  submitButton: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  submitButtonText: { fontSize: 16, fontWeight: "700", color: colors.text },
  link: { textAlign: "center", marginTop: spacing.lg, color: colors.primary, fontWeight: "600" },
  linkOnPhoto: { textAlign: "center", marginTop: spacing.sm, color: "#fff", fontWeight: "600" },
});
