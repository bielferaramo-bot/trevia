import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, storage } from './api.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(storage.getUser());
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authModal, setAuthModal] = useState({ isOpen: false, tab: 'login', onSuccess: null });

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
    await refreshMe();
    if (authModal.onSuccess) authModal.onSuccess(data.user);
    setAuthModal({ isOpen: false, tab: 'login', onSuccess: null });
    return data;
  };

  const loginWithToken = (token, userObj) => {
    storage.setToken(token);
    storage.setUser(userObj);
    setUser(userObj);
    refreshMe();
  };

  const logout = () => {
    storage.removeToken();
    setUser(null);
    setProfile(null);
  };

  const openAuthModal = (tab = 'login', onSuccess = null) => {
    setAuthModal({ isOpen: true, tab, onSuccess });
  };

  const closeAuthModal = () => {
    setAuthModal({ isOpen: false, tab: 'login', onSuccess: null });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        register,
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
