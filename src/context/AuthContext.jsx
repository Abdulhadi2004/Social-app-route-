import { createContext, useContext, useState, useEffect } from 'react';
import { signIn as apiSignIn, getProfile, getUserProfile } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await getProfile();
        if (data?.success && data?.data) {
          const profileData = data.data?.user ?? data.data;
          let fullUser = profileData;
          const uid = profileData?._id ?? profileData?.id;
          if (uid) {
            try {
              const full = await getUserProfile(uid);
              if (full?.data?.success && full.data.data) {
                const u = full.data.data.user ?? full.data.data;
                fullUser = { ...fullUser, ...u };
              }
            } catch {}
          }
          setUser(fullUser);
          localStorage.setItem('user', JSON.stringify(fullUser));
          setToken(storedToken);
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const signIn = async (credentials) => {
    const { data } = await apiSignIn(credentials);
    if (data?.success && data?.data) {
      const { token: newToken, user: userData } = data.data;
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      return data;
    }
    throw new Error(data?.message || 'Login failed');
  };

  const signOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    loading,
    signIn,
    signOut,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
