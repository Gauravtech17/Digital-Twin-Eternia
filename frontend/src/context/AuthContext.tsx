import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../api/types';
import { api } from '../api/client';

interface AuthContextType {
  currentUser: User | null;
  availableUsers: User[];
  switchUser: (username: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    try {
      setIsLoading(true);
      const demoUsers = await api.getDemoUsers();
      setAvailableUsers(demoUsers);

      const savedUsername = localStorage.getItem('polypulse_current_username') || 'dr_sarah';
      const match = demoUsers.find((u) => u.username === savedUsername) || demoUsers[0];
      if (match) {
        await switchUser(match.username);
      }
    } catch (e) {
      console.error('Failed to load demo users:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const switchUser = async (username: string) => {
    try {
      const res = await api.loginDemo(username);
      localStorage.setItem('polypulse_token', res.access_token);
      localStorage.setItem('polypulse_current_username', username);
      setCurrentUser(res.user);
    } catch (e) {
      console.error(`Failed to switch to user ${username}:`, e);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, availableUsers, switchUser, isLoading }}>
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
