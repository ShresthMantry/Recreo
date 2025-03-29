import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

type Theme = {
  background: string;
  text: string;
  primary: string;
  secondary: string;
  accent: string;
  error: string;
  surface: string;
  surfaceHover: string;
};

const darkTheme: Theme = {
  background: '#121212',
  text: '#FFFFFF',
  primary: '#BB86FC',
  secondary: '#03DAC6',
  accent: '#CF6679',
  error: '#CF6679',
  surface: '#1E1E1E',
  surfaceHover: '#2C2C2C',
};

const ThemeContext = createContext<{
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}>({
  theme: darkTheme,
  isDark: true,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const theme = darkTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};