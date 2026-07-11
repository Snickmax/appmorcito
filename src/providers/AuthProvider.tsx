import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { VisualGender } from '../types/countdown';

type Profile = {
  id: string;
  display_name: string | null;
  birth_date: string | null;
  avatar_path: string | null;
  visual_gender: VisualGender;
};

type CoupleState = {
  couple_id: string;
  couple_name: string | null;
  relationship_start_date: string;
  invite_code: string;
  active_members_count: number;
  my_role: 'owner' | 'member';
} | null;

export type ActiveCoupleMember = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_path: string | null;
  nickname: string | null;
  role: 'owner' | 'member';
  joined_at: string;
  is_me: boolean;
};

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  coupleState: CoupleState;
  coupleMembers: ActiveCoupleMember[];
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshBootstrap: () => Promise<void>;
  retryInit: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadBootstrap(userId: string) {
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name, birth_date, avatar_path, visual_gender')
    .eq('id', userId)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    throw profileError;
  }

  const { data: coupleData, error: coupleError } = await supabase.rpc(
    'get_my_couple_state'
  );

  if (coupleError) {
    throw coupleError;
  }

  const normalizedCouple =
    (Array.isArray(coupleData) ? coupleData[0] : coupleData) ?? null;

  let coupleMembers: ActiveCoupleMember[] = [];

  if (normalizedCouple?.couple_id) {
    const { data: membersData, error: membersError } = await supabase.rpc(
      'get_my_active_couple_members'
    );

    if (membersError) {
      throw membersError;
    }

    coupleMembers = (membersData ?? []) as ActiveCoupleMember[];
  }

  return {
    profile: (profileData as Profile | null) ?? null,
    coupleState: normalizedCouple as CoupleState,
    coupleMembers,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [coupleState, setCoupleState] = useState<CoupleState>(null);
  const [coupleMembers, setCoupleMembers] = useState<ActiveCoupleMember[]>([]);
  const [loading, setLoading] = useState(true);

  const initializingRef = useRef(true);
  const isMountedRef = useRef(true);

  const clearBootstrap = () => {
    setProfile(null);
    setCoupleState(null);
    setCoupleMembers([]);
  };

  const applyBootstrapFromSession = async (nextSession: Session | null) => {
    if (!nextSession?.user) {
      setSession(null);
      clearBootstrap();
      return;
    }

    const data = await loadBootstrap(nextSession.user.id);
    setSession(nextSession);
    setProfile(data.profile);
    setCoupleState(data.coupleState);
    setCoupleMembers(data.coupleMembers);
  };

  const refreshBootstrap = async () => {
    const user = session?.user;

    if (!user) {
      clearBootstrap();
      return;
    }

    try {
      const data = await loadBootstrap(user.id);
      setProfile(data.profile);
      setCoupleState(data.coupleState);
      setCoupleMembers(data.coupleMembers);
    } catch (error) {
      console.error('refreshBootstrap error:', error);
    }
  };

  const initialize = async () => {
    setLoading(true);

    try {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (!isMountedRef.current) return;

      await applyBootstrapFromSession(initialSession ?? null);
    } catch (error) {
      console.error('Initial auth bootstrap error:', error);
      if (isMountedRef.current) {
        setSession(null);
        clearBootstrap();
      }
    } finally {
      if (isMountedRef.current) {
        initializingRef.current = false;
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    void initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (event === 'INITIAL_SESSION' && initializingRef.current) {
          return;
        }

        // No hacer await de llamadas a Supabase dentro de este callback:
        // se ejecuta con el lock de auth tomado y provoca deadlock (app
        // colgada en el arranque). setTimeout difiere el trabajo fuera
        // del lock.
        setTimeout(async () => {
          if (!isMountedRef.current) return;

          if (event === 'TOKEN_REFRESHED') {
            setSession(nextSession ?? null);
            return;
          }

          setLoading(true);

          try {
            await applyBootstrapFromSession(nextSession ?? null);
          } catch (error) {
            console.error('onAuthStateChange bootstrap error:', error);
            if (isMountedRef.current) {
              setSession(null);
              clearBootstrap();
            }
          } finally {
            if (isMountedRef.current) {
              setLoading(false);
            }
          }
        }, 0);
      }
    );

    return () => {
      isMountedRef.current = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    const channel = supabase
      .channel(`my-membership-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couple_members',
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          await refreshBootstrap();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    const coupleId = coupleState?.couple_id;
    if (!coupleId) return;

    const channel = supabase
      .channel(`couple-live-${coupleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couples',
          filter: `id=eq.${coupleId}`,
        },
        async () => {
          await refreshBootstrap();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couple_members',
          filter: `couple_id=eq.${coupleId}`,
        },
        async () => {
          await refreshBootstrap();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleState?.couple_id]);

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      loading,
      profile,
      coupleState,
      coupleMembers,
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
        const { error } = await supabase.auth.signOut();

        if (error) {
          console.error('signOut error:', error);
        }
      },
      refreshBootstrap,
      retryInit: () => {
        void initialize();
      },
    }),
    [session, loading, profile, coupleState, coupleMembers]
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