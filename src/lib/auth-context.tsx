import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { fetchProfile, type Profile } from "./profile";

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile?: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({ session: null, profile: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSession(newSession: Session | null) {
      if (cancelled) return;
      setSession(newSession);
      if (newSession) {
        const data = await fetchProfile(newSession.user.id);
        if (!cancelled) setProfile(data);
      } else {
        setProfile(null);
      }
      if (!cancelled) setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => loadSession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      loadSession(newSession);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (session) setProfile(await fetchProfile(session.user.id));
  };

  return <AuthContext.Provider value={{ session, profile, loading, refreshProfile }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
