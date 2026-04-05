import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { toast } from 'sonner';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [college, setCollege] = useState(null); // Store college info for college admins
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = localStorage.getItem('user');
      const storedAccessToken = localStorage.getItem('access_token');
      const storedRefreshToken = localStorage.getItem('refresh_token');

      if (storedUser && storedAccessToken && storedRefreshToken) {
        try {
          // Fetch latest user data from server instead of relying on localStorage
          const meRes = await api.get('/auth/me');
          const userData = meRes.data;
          
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData)); // Sync local storage

          // Attempt to fetch college data if admin or teacher
          if (userData.role === 'college_admin' || userData.role === 'teacher') {
            const res = await api.get('/colleges/my');
            setCollege(res.data);
          }
        } catch (error) {
          console.error("Failed to fetch current user or college data:", error);
          // If we fail to fetch, still try to use stored data but log the error
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, refresh_token, user: userData } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      if (userData.role === 'college_admin' || userData.role === 'teacher') {
        try {
          const res = await api.get('/colleges/my');
          setCollege(res.data);
        } catch (error) {
          console.error("Failed to fetch college data on login:", error);
        }
      }
      toast.success('Logged in successfully!');
      return userData;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
    setCollege(null);
    toast.info('Logged out.');
  };

  return (
    <AuthContext.Provider value={{ user, college, setUser, setCollege, login, logout, loading }}>
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