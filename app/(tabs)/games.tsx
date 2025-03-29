// app/(tabs)/drawing.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import TicTacToe from "../../components/games/TicTacToe";
import Sudoku from "../../components/games/Sudoku";
import Minesweeper from "../../components/games/Minesweeper";

type GameType = "menu" | "tictactoe" | "sudoku" | "minesweeper";

export default function Drawing() {
  const [currentGame, setCurrentGame] = useState<GameType>("menu");

  const handleBackToMenu = () => {
    setCurrentGame("menu");
  };

  const renderCurrentScreen = () => {
    switch (currentGame) {
      case "tictactoe":
        return <TicTacToe onBackToMenu={handleBackToMenu} />;
      case "sudoku":
        return <Sudoku onBackToMenu={handleBackToMenu} />;
      case "minesweeper":
        return <Minesweeper onBackToMenu={handleBackToMenu} />;
      default:
        return (
          <ScrollView style={styles.menuContainer}>
            <Text style={styles.title}>Classic Games</Text>
            <Text style={styles.subtitle}>Select a game to play</Text>

            <View style={styles.gameButtonsContainer}>
              <GameButton 
                title="Tic Tac Toe" 
                description="Classic X and O game" 
                onPress={() => setCurrentGame("tictactoe")} 
                color="#FF5252" 
              />
              <GameButton 
                title="Sudoku" 
                description="Logic-based number puzzle" 
                onPress={() => setCurrentGame("sudoku")} 
                color="#448AFF" 
              />
              <GameButton 
                title="Minesweeper" 
                description="Find hidden mines" 
                onPress={() => setCurrentGame("minesweeper")} 
                color="#66BB6A" 
              />
            </View>
          </ScrollView>
        );
    }
  };

  return (
    <View style={styles.container}>
      {renderCurrentScreen()}
    </View>
  );
}

interface GameButtonProps {
  title: string;
  description: string;
  onPress: () => void;
  color: string;
}

const GameButton: React.FC<GameButtonProps> = ({ title, description, onPress, color }) => {
  return (
    <TouchableOpacity
      style={[styles.gameButton, { backgroundColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.gameButtonTitle}>{title}</Text>
      <Text style={styles.gameButtonDescription}>{description}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  menuContainer: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#9ca3af",
    marginBottom: 24,
  },
  gameButtonsContainer: {
    gap: 16,
  },
  gameButton: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 4,
  },
  gameButtonTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  gameButtonDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
});