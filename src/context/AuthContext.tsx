import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, userApi } from '../services/api';
import * as mockDb from '../services/mockDb';

interface AuthContextType {
  user: mockDb.User | null;
  loading: boolean;
  login: (credentials: any, remember: boolean) => Promise<{ success: boolean; msg: string }>;
  register: (data: any) => Promise<{ success: boolean; msg: string }>;
  logout: () => void;
  updateProfile: (data: any) => Promise<boolean>;
  sendPasswordOtp: (email: string) => Promise<{ success: boolean; msg: string }>;
  changePassword: (data: any) => Promise<{ success: boolean; msg: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<mockDb.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session on mount
    const loadSession = () => {
      mockDb.initMockDb();
      const rememberedUser = localStorage.getItem('cs_current_user');
      if (rememberedUser) {
        setUser(JSON.parse(rememberedUser));
      }
      setLoading(false);
    };
    loadSession();
  }, []);

  const login = async (credentials: any, remember: boolean) => {
    setLoading(true);
    try {
      const res = await authApi.login(credentials);
      if (res.success && res.user) {
        const fullUser: mockDb.User = {
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          role: res.user.role,
        };
        setUser(fullUser);
        if (remember) {
          localStorage.setItem('cs_current_user', JSON.stringify(fullUser));
        }
        return { success: true, msg: res.msg };
      }
      return { success: false, msg: res.msg || 'Invalid email or password.' };
    } catch (err) {
      console.error(err);
      return { success: false, msg: 'An error occurred during login.' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: any) => {
    setLoading(true);
    try {
      const res = await authApi.register(data);
      if (res.success) {
        return { success: true, msg: res.msg };
      }
      return { success: false, msg: res.msg || 'Registration failed.' };
    } catch (err) {
      console.error(err);
      return { success: false, msg: 'An error occurred during registration.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cs_current_user');
    localStorage.removeItem('cs_auth_token');
  };

  const updateProfile = async (data: any) => {
    if (!user) return false;
    try {
      const res = await userApi.updateProfile(user.id, data);
      if (res.success && res.user) {
        setUser(res.user);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const sendPasswordOtp = async (email: string) => {
    try {
      const res = await authApi.sendOtp({ email });
      return { success: res.success, msg: res.msg };
    } catch (err) {
      console.error(err);
      return { success: false, msg: 'Failed to send OTP.' };
    }
  };

  const changePassword = async (data: any) => {
    try {
      const res = await authApi.changePassword(data);
      return { success: res.success, msg: res.msg };
    } catch (err) {
      console.error(err);
      return { success: false, msg: 'Failed to reset password.' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      updateProfile,
      sendPasswordOtp,
      changePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
