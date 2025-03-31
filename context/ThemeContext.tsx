import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Theme = {
  background: string;
  cardBackground: string;
  text: string;
  secondaryText: string;
  primary: string;
  secondary: string;
  accent: string;
  error: string;
  success: string;
  surface: string;
  surfaceHover: string;
  inputBackground: string;
  inputBorder: string;
  elevation1: string;
  elevation2: string;
  divider: string;
};

export const lightTheme: Theme = {
  background: '#F8F9FA',
  cardBackground: '#FFFFFF',
  text: '#212529',
  secondaryText: '#6C757D',
  primary: '#4361EE',
  secondary: '#3F37C9',
  accent: '#F72585',
  error: '#DC3545',
  success: '#28A745',
  surface: '#FFFFFF',
  surfaceHover: '#E9ECEF',
  inputBackground: '#FFFFFF',
  inputBorder: '#CED4DA',
  elevation1: '#FFFFFF',
  elevation2: '#F8F9FA',
  divider: '#DEE2E6',
};

export const darkTheme: Theme = {
  background: '#121212',
  cardBackground: '#1E1E1E',
  text: '#FFFFFF',
  secondaryText: '#ADB5BD',
  primary: '#4CC9F0',
  secondary: '#4895EF',
  accent: '#F72585',
  error: '#E63946',
  success: '#4CAF50',
  surface: '#1E1E1E',
  surfaceHover: '#2C2C2C',
  inputBackground: '#2C2C2C',
  inputBorder: '#3E3E3E',
  elevation1: '#1E1E1E',
  elevation2: '#2C2C2C',
  divider: '#3E3E3E',
};

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  themeMode: 'light' | 'dark' | 'system';
};

const ThemeContext = createContext<ThemeContextType>({
  theme: darkTheme,
  isDark: true,
  toggleTheme: () => {},
  setThemeMode: () => {},
  themeMode: 'system',
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');
  const [isDark, setIsDark] = useState(deviceColorScheme === 'dark');

  // Load saved theme preference
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedThemeMode = await AsyncStorage.getItem('themeMode');
        if (savedThemeMode) {
          setThemeMode(savedThemeMode as 'light' | 'dark' | 'system');
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };
    
    loadThemePreference();
  }, []);

  // Update isDark state based on themeMode and device scheme
  useEffect(() => {
    if (themeMode === 'system') {
      setIsDark(deviceColorScheme === 'dark');
    } else {
      setIsDark(themeMode === 'dark');
    }
  }, [themeMode, deviceColorScheme]);

  // Save theme preference when changed
  useEffect(() => {
    const saveThemePreference = async () => {
      try {
        await AsyncStorage.setItem('themeMode', themeMode);
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    };
    
    saveThemePreference();
  }, [themeMode]);

  const toggleTheme = () => {
    const newMode = isDark ? 'light' : 'dark';
    setThemeMode(newMode);
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      isDark, 
      toggleTheme, 
      setThemeMode,
      themeMode 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};