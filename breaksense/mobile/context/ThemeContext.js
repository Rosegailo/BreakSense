import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('Dark');

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('user_theme');
      if (savedTheme) setTheme(savedTheme);
    };
    loadTheme();
  }, []);

  const updateTheme = async (newTheme) => {
    setTheme(newTheme);
    await AsyncStorage.setItem('user_theme', newTheme);
  };

  const isDark = theme === 'Dark';
  
  const colors = {
    background: isDark ? '#0f141e' : '#f1f5f9',
    card: isDark ? '#1b222d' : '#ffffff',
    border: isDark ? '#2a3342' : '#e2e8f0',
    textPrimary: isDark ? '#ffffff' : '#0f141e',
    textSecondary: '#64748b',
    accent: '#39ef8d',
    segmentBg: isDark ? '#0f141e' : '#f8fafc',
    danger: '#ef4444',
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);