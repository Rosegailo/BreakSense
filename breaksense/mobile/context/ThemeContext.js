import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const ACCENT_COLORS = {
  Green: '#39ef8d',
  Blue: '#3b82f6',
  Purple: '#a855f7',
  Orange: '#f97316',
  Pink: '#ec4899'
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState('Dark');
  const [accentName, setAccentName] = useState('Green');

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('user_theme');
      const savedAccent = await AsyncStorage.getItem('user_accent');
      if (savedTheme) setThemeState(savedTheme);
      if (savedAccent && ACCENT_COLORS[savedAccent]) setAccentName(savedAccent);
    };
    loadTheme();
  }, []);

  const setTheme = async (newTheme) => {
    setThemeState(newTheme);
    await AsyncStorage.setItem('user_theme', newTheme);
  };

  const setAccent = async (name) => {
    if (ACCENT_COLORS[name]) {
      setAccentName(name);
      await AsyncStorage.setItem('user_accent', name);
    }
  };

  const isDark = theme === 'Dark';
  
  const colors = {
    background: isDark ? '#0f141e' : '#f1f5f9',
    card: isDark ? '#1b222d' : '#ffffff',
    border: isDark ? '#2a3342' : '#e2e8f0',
    textPrimary: isDark ? '#ffffff' : '#0f141e',
    textSecondary: '#64748b',
    accent: ACCENT_COLORS[accentName],
    segmentBg: isDark ? '#0f141e' : '#f8fafc',
    danger: '#ef4444',
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accentName, setAccent, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
