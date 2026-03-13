import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type Profile = {
  id: string;
  display_name: string | null;
  birth_date: string | null;
  avatar_path: string | null;
};

type CoupleState = {
  couple_id: string;
  couple_name: string | null;
  relationship_start_date: string;
  invite_code: string;
  active_members_count: number;
  my_role: 'owner' | 'member';
} | null;

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  coupleState: CoupleState;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshBootstrap: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadBootstrap(userId: string) {
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, display_name, birth_date, avatar_path')
    .eq('id', userId)
    .single();

  const { data: coupleData } = await supabase.rpc('get_my_couple_state');

  return {
    profile: (profileData as Profile | null) ?? null,
    coupleState: (Array.isArray(coupleData) ? coupleData[0] : coupleData) ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [coupleState, setCoupleState] = useState<CoupleState>(null);
  const [loading, setLoading] = useState(true);

  const refreshBootstrap = async () => {
    const user = session?.user;
    if (!user) {
      setProfile(null);
      setCoupleState(null);
      return;
    }

    const data = await loadBootstrap(user.id);
    setProfile(data.profile);
    setCoupleState(data.coupleState);
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;

      setSession(data.session ?? null);

      if (data.session?.user) {
        const boot = await loadBootstrap(data.session.user.id);
        if (!mounted) return;
        setProfile(boot.profile);
        setCoupleState(boot.coupleState);
      }

      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession ?? null);

      if (nextSession?.user) {
        const boot = await loadBootstrap(nextSession.user.id);
        setProfile(boot.profile);
        setCoupleState(boot.coupleState);
      } else {
        setProfile(null);
        setCoupleState(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!coupleState?.couple_id) return;

    const channel = supabase
      .channel(`couple-members-${coupleState.couple_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couple_members',
          filter: `couple_id=eq.${coupleState.couple_id}`,
        },
        async () => {
          await refreshBootstrap();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleState?.couple_id, session?.user?.id]);

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      loading,
      profile,
      coupleState,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        return { error: error?.message ?? null };
      },
      signUp: async (email, password, displayName) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
            },
          },
        });

        return { error: error?.message ?? null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshBootstrap,
    }),
    [session, loading, profile, coupleState]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return ctx;
}