import React, { createContext, useContext, useState } from 'react';

export interface User {
  uid: number;
  username: string;
  avatar?: string;
  cookie: string;
  gender?: string;
  groupId?: string;
  postsCount?: number;
  joinDate?: string;
  onlineTime?: number;
  cashPoints?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginWithCookie: (cookie: string, fallbackUsername?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loginWithCookie = async (cookie: string, fallbackUsername?: string) => {
    setIsLoading(true);
    try {
      console.log('[Auth] Fetching user info...');
      const response = await fetch('https://huaren.us/api/user/GetLoginInfo', {
        method: 'POST',
        headers: {
          'Cookie': cookie,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('[Auth] GetLoginInfo:', JSON.stringify(data).slice(0, 200));

      if (data?.success && data?.data?.user) {
        const u = data.data.user;
        setUser({
          uid: u.uid,
          username: u.userName,
          avatar: u.avatar,
          cookie,
          gender: u.gender,
          groupId: u.groupId,
          postsCount: u.postsCount,
          joinDate: u.joinDate,
          onlineTime: u.onlineTime,
          cashPoints: u.cashPoints,
        });
      } else if (fallbackUsername) {
        // If GetLoginInfo fails but we have a username, still mark as logged in
        setUser({ uid: 0, username: fallbackUsername, cookie });
      } else {
        throw new Error('Failed to get user info');
      }
    } catch (error) {
      if (fallbackUsername) {
        setUser({ uid: 0, username: fallbackUsername, cookie });
      } else {
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, isLoading, loginWithCookie, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}