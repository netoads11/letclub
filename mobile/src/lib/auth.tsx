import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  peso_inicial: number | null;
  peso_atual: number | null;
  altura: number | null;
  meta_peso: number | null;
  principal_dificuldade: string | null;
  restricoes_alimentares: string[];
  onboarding_completed: boolean;
  challenge_start_date: string | null;
  xp_total: number;
  streak_atual: number;
  streak_recorde: number;
  ultimo_checkin: string | null;
  bloqueado: boolean;
  notificacoes_ativas: boolean;
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfileAndRole = async (uid: string) => {
    try {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
      ]);
      let prof = p.data as Profile | null;
      if (!prof) {
        const { data: u } = await supabase.auth.getUser();
        const meta = (u.user?.user_metadata ?? {}) as Record<string, any>;
        const today = new Date().toISOString().slice(0, 10);
        const { data: inserted } = await supabase
          .from("profiles")
          .upsert(
            {
              id: uid,
              full_name: meta.full_name ?? meta.name ?? "",
              email: u.user?.email ?? "",
              challenge_start_date: today,
            },
            { onConflict: "id" },
          )
          .select("*")
          .maybeSingle();
        prof = (inserted as Profile) ?? null;
      }
      setProfile(prof);
      setIsAdmin(!!r.data);
    } catch (e) {
      console.error("loadProfileAndRole failed", e);
    }
  };

  const refreshProfile = async () => {
    if (user) await loadProfileAndRole(user.id);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadProfileAndRole(sess.user.id), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) await loadProfileAndRole(s.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <Ctx.Provider value={{ user, session, profile, isAdmin, loading, refreshProfile, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
