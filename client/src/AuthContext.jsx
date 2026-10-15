import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, storage } from './api.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(storage.getUser());
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authModal, setAuthModal] = useState({ isOpen: false, tab: 'login', onSuccess: null });

  // Mode: 'client' (Contratante) vs 'provider' (Prestador de Serviços)
  const [userMode, setUserModeState] = useState(() => {
    const saved = localStorage.getItem('trevia_user_mode');
    if (saved === 'client' || saved === 'provider') return saved;
    const initialUser = storage.getUser();
    return initialUser?.role === 'provider' ? 'provider' : 'client';
  });

  const setMode = (mode) => {
    if (mode !== 'client' && mode !== 'provider') return;
    setUserModeState(mode);
    localStorage.setItem('trevia_user_mode', mode);
  };

  const toggleMode = () => {
    const nextMode = userMode === 'client' ? 'provider' : 'client';
    setMode(nextMode);
    return nextMode;
  };

  const refreshMe = async () => {
    const token = storage.getToken();
    if (!token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.auth.me();
      setUser(data.user);
      setProfile(data.profile);
      storage.setUser(data.user);

      // If no mode is explicitly set in localStorage, respect user's registered role
      if (!localStorage.getItem('trevia_user_mode')) {
        if (data.user.role === 'provider') {
          setMode('provider');
        } else {
          setMode('client');
        }
      }
    } catch (err) {
      console.warn('Sessão expirada ou inválida:', err.message);
      storage.removeToken();
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMe();
  }, []);

  const login = async (email, password) => {
    const data = await api.auth.login(email, password);
    storage.setToken(data.token);
    storage.setUser(data.user);
    setUser(data.user);
    if (data.user.role === 'provider') {
      setMode('provider');
    } else {
      setMode('client');
    }
    await refreshMe();
    if (authModal.onSuccess) authModal.onSuccess(data.user);
    setAuthModal({ isOpen: false, tab: 'login', onSuccess: null });
    return data;
  };

  const register = async (formData) => {
    const data = await api.auth.register(formData);
    storage.setToken(data.token);
    storage.setUser(data.user);
    setUser(data.user);
    if (formData.role === 'provider') {
      setMode('provider');
    } else {
      setMode('client');
    }
    await refreshMe();
    if (authModal.onSuccess) authModal.onSuccess(data.user);
    setAuthModal({ isOpen: false, tab: 'login', onSuccess: null });
    return data;
  };

  const loginWithGoogle = async (credential, role = 'client') => {
    const data = await api.auth.loginWithGoogle(credential, role);
    storage.setToken(data.token);
    storage.setUser(data.user);
    setUser(data.user);
    if (role === 'provider' || data.user.role === 'provider') {
      setMode('provider');
    } else {
      setMode('client');
    }
    await refreshMe();
    if (authModal.onSuccess) authModal.onSuccess(data.user);
    setAuthModal({ isOpen: false, tab: 'login', onSuccess: null });
    return data;
  };

  const loginWithToken = (token, userObj) => {
    storage.setToken(token);
    storage.setUser(userObj);
    setUser(userObj);
    if (userObj?.role === 'provider') {
      setMode('provider');
    }
    refreshMe();
  };

  const logout = () => {
    storage.removeToken();
    setUser(null);
    setProfile(null);
  };

  const openAuthModal = (tab = 'login', onSuccess = null, message = null) => {
    setAuthModal({ isOpen: true, tab, onSuccess, message });
  };

  const closeAuthModal = () => {
    setAuthModal({ isOpen: false, tab: 'login', onSuccess: null, message: null });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        userMode,
        setMode,
        toggleMode,
        login,
        register,
        loginWithGoogle,
        loginWithToken,
        logout,
        refreshMe,
        authModal,
        openAuthModal,
        closeAuthModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
