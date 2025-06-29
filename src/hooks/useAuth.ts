import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session, AuthError } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const handleSupabaseError = async (error: any) => {
    if (error?.message?.includes('JWT expired') || 
        error?.code === 'PGRST301' || 
        (error?.status === 401 && error?.body?.includes('JWT expired'))) {
      await signOut();
      return true; // Indicates this was a JWT expiry error
    }
    return false; // Not a JWT expiry error
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    handleSupabaseError,
  };
}