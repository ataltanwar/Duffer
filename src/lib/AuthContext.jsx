import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { generateUsername } from './usernames';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchOrCreateProfile(session.user);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        // Clean up hash fragment left by OAuth redirect
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname || '/home');
        }
        if (session) await fetchOrCreateProfile(session.user);
        else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchOrCreateProfile(user) {
    try {
      // Check if user profile exists
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);
      } else {
        // Generate fun anonymous username
        const anonUsername = generateUsername();
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({ id: user.id, anon_username: anonUsername })
          .select()
          .single();

        if (insertError) throw insertError;
        setProfile(newUser);
      }
    } catch (err) {
      console.error('Profile error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) console.error('Sign in error:', error);
  }

  async function updateUsername(newName) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed.length < 3 || trimmed.length > 24) {
      return { error: 'Username must be 3–24 characters' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return { error: 'Letters, numbers, and underscores only' };
    }
    const { data, error } = await supabase
      .from('users')
      .update({ anon_username: trimmed })
      .eq('id', profile.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return { error: 'Username already taken' };
      return { error: error.message };
    }
    setProfile(data);
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  const value = {
    session,
    profile,
    loading,
    signInWithGoogle,
    signOut,
    updateUsername,
    isAdmin: profile?.is_admin ?? false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
