// HEXY.PRO App - /app/src/contexts/AuthContext.jsx - Context used to manage authentication state.
 

import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import PropTypes from 'prop-types';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setSessionAndLoading = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error fetching session:', error);
      } else {
        setSession(data.session);
      }
      setLoading(false);
    };

    setSessionAndLoading();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (data) => {
    try {
      const { data: userData, error } = await supabase.auth.signUp(data);
      if (error) {
        if (error.status === 429) {
          const waitTime = error.message.match(/\d+/)[0];
          return { error: new Error(`Please wait ${waitTime} seconds before trying again.`) };
        }
        return { error };
      }
      return { user: userData.user };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const signIn = async (data) => {
    try {
      const { data: userData, error } = await supabase.auth.signInWithPassword(data);
      if (error) return { error };
      setSession(userData.session);
      return { user: userData.user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const refreshToken = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
    setSession(data.session);
    return data.session?.access_token;
  };

  const getAccessToken = async () => {
    if (!session) return null;
    const { expires_at } = session;
    if (expires_at && expires_at < Math.floor(Date.now() / 1000)) {
      return refreshToken();
    }
    return session.access_token;
  };

  const value = {
    session,
    signUp,
    signIn,
    signOut,
    getAccessToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;