// components/games/Sudoku.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  onBackToMenu: () => void;
}

type SudokuBoard = (number | null)[][];
type Difficulty = "easy" | "medium" | "hard";

const Sudoku: React.FC<Props> = ({ onBackToMenu }) => {
  const [originalBoard, setOriginalBoard] = useState<SudokuBoard>([]);
  const [board, setBoard] = useState<SudokuBoard>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [timer, setTimer] = useState<number>(0);
  const [isGameActive, setIsGameActive] = useState<boolean>(false);
  const [isGameWon, setIsGameWon] = useState<boolean>(false);

  useEffect(() => {
    if (isGameActive && !isGameWon) {
      const interval = setInterval(() => {
        setTimer(prevTimer => prevTimer + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isGameActive, isGameWon]);

  const generateNewGame = () => {
    const newBoard = generateSudokuPuzzle(difficulty);
    setOriginalBoard(cloneBoard(newBoard));
    setBoard(cloneBoard(newBoard));
    setSelectedCell(null);
    setTimer(0);
    setIsGameActive(true);
    setIsGameWon(false);
  };

  const cloneBoard = (board: SudokuBoard): SudokuBoard => {
    return board.map(row => [...row]);
  };

  useEffect(() => {
    generateNewGame();
  }, [difficulty]);

  const handleCellPress = (row: number, col: number) => {
    if (originalBoard[row][col] !== null) return; // Can't select pre-filled cells
    setSelectedCell([row, col]);
  };

  const handleNumberInput = (num: number) => {
    if (!selectedCell || isGameWon) return;
    
    const [row, col] = selectedCell;
    const newBoard = [...board];
    newBoard[row][col] = num;
    setBoard(newBoard);
    
    // Check if the game is won
    if (isBoardComplete(newBoard) && isBoardValid(newBoard)) {
      setIsGameWon(true);
      Alert.alert("Congratulations!", "You've solved the puzzle!", [
        { text: "OK" }
      ]);
    }
  };

  const handleClearCell = () => {
    if (!selectedCell || isGameWon) return;
    
    const [row, col] = selectedCell;
    if (originalBoard[row][col] !== null) return; // Can't clear pre-filled cells
    
    const newBoard = [...board];
    newBoard[row][col] = null;
    setBoard(newBoard);
  };

  const isBoardComplete = (board: SudokuBoard): boolean => {
    return board.every(row => row.every(cell => cell !== null));
  };

  const isBoardValid = (board: SudokuBoard): boolean => {
    // This is a simplified validation - a complete validation would need to check
    // all rows, columns and 3x3 blocks for duplicates
    return true;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderCell = (value: number | null, row: number, col: number) => {
    const isSelected = selectedCell && selectedCell[0] === row && selectedCell[1] === col;
    const isPrefilled = originalBoard[row][col] !== null;
    
    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[
          styles.cell,
          isSelected && styles.selectedCell,
          isPrefilled && styles.prefilledCell,
          col % 3 === 2 && col < 8 && styles.rightBorder,
          row % 3 === 2 && row < 8 && styles.bottomBorder,
        ]}
        onPress={() => handleCellPress(row, col)}
        disabled={isPrefilled}
      >
        <Text style={[
          styles.cellText,
          isPrefilled && styles.prefilledText
        ]}>
          {value !== null ? value.toString() : ""}
        </Text>
      </TouchableOpacity>
    );
  };

  const generateSudokuPuzzle = (difficulty: Difficulty): SudokuBoard => {
    // In a real app, you would implement a proper Sudoku generator
    // This is a simple example with a fixed puzzle
    
    const solvedPuzzle: SudokuBoard = [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9]
    ];
    
    const puzzle = cloneBoard(solvedPuzzle);
    
    // Define how many cells to remove based on difficulty
    let cellsToRemove;
    switch (difficulty) {
      case "easy":
        cellsToRemove = 30;
        break;
      case "medium":
        cellsToRemove = 45;
        break;
      case "hard":
        cellsToRemove = 55;
        break;
      default:
        cellsToRemove = 45;
    }
    
    // Remove cells to create the puzzle
    let removedCells = 0;
    while (removedCells < cellsToRemove) {
      const row = Math.floor(Math.random() * 9);
      const col = Math.floor(Math.random() * 9);
      
      if (puzzle[row][col] !== null) {
        puzzle[row][col] = null;
        removedCells++;
      }
    }
    
    return puzzle;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackToMenu}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Sudoku</Text>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.difficultyContainer}>
          <Text style={styles.infoLabel}>Difficulty:</Text>
          <View style={styles.difficultyButtons}>
            <TouchableOpacity 
              style={[styles.difficultyButton, difficulty === "easy" && styles.activeDifficulty]}
              onPress={() => setDifficulty("easy")}
            >
              <Text style={[styles.difficultyText, difficulty === "easy" && styles.activeDifficultyText]}>Easy</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.difficultyButton, difficulty === "medium" && styles.activeDifficulty]}
              onPress={() => setDifficulty("medium")}
            >
              <Text style={[styles.difficultyText, difficulty === "medium" && styles.activeDifficultyText]}>Medium</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.difficultyButton, difficulty === "hard" && styles.activeDifficulty]}
              onPress={() => setDifficulty("hard")}
            >
              <Text style={[styles.difficultyText, difficulty === "hard" && styles.activeDifficultyText]}>Hard</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.timerContainer}>
          <Text style={styles.infoLabel}>Time:</Text>
          <Text style={styles.timerText}>{formatTime(timer)}</Text>
        </View>
      </View>

      <View style={styles.board}>
        {board.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))}
          </View>
        ))}
      </View>

      <View style={styles.numPadContainer}>
        <View style={styles.numPadRow}>
          {[1, 2, 3, 4, 5].map(num => (
            <TouchableOpacity 
              key={`num-${num}`} 
              style={styles.numPadButton}
              onPress={() => handleNumberInput(num)}
            >
              <Text style={styles.numPadText}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.numPadRow}>
          {[6, 7, 8, 9].map(num => (
            <TouchableOpacity 
              key={`num-${num}`} 
              style={styles.numPadButton}
              onPress={() => handleNumberInput(num)}
            >
              <Text style={styles.numPadText}>{num}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity 
            style={[styles.numPadButton, styles.clearButton]}
            onPress={handleClearCell}
          >
            <Ionicons name="backspace-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.newGameButton} 
        onPress={generateNewGame}
      >
        <Text style={styles.newGameButtonText}>New Game</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
  },
  infoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  difficultyContainer: {
    flex: 2,
  },
  timerContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  infoLabel: {
    fontSize: 14,
    color: "#9ca3af",
    marginBottom: 4,
  },
  difficultyButtons: {
    flexDirection: "row",
  },
  difficultyButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
    borderRadius: 4,
    backgroundColor: "#2a2a2a",
  },
  activeDifficulty: {
    backgroundColor: "#448AFF",
  },
  difficultyText: {
    color: "#9ca3af",
    fontSize: 12,
  },
  activeDifficultyText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  timerText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
  board: {
    alignSelf: "center",
    borderWidth: 2,
    borderColor: "#555555",
    marginVertical: 20,
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#333333",
    backgroundColor: "#222222",
  },
  selectedCell: {
    backgroundColor: "#1e3a5f",
  },
  prefilledCell: {
    backgroundColor: "#2c2c2c",
  },
  rightBorder: {
    borderRightWidth: 2,
    borderRightColor: "#555555",
  },
  bottomBorder: {
    borderBottomWidth: 2,
    borderBottomColor: "#555555",
  },
  cellText: {
    fontSize: 16,
    color: "#ffffff",
  },
  prefilledText: {
    fontWeight: "700",
    color: "#a0a0a0",
  },
  numPadContainer: {
    marginTop: 16,
  },
  numPadRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
  },
  numPadButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    margin: 4,
  },
  clearButton: {
    backgroundColor: "#3e3e3e",
  },
  numPadText: {
    fontSize: 20,
    color: "#ffffff",
    fontWeight: "600",
  },
  newGameButton: {
    backgroundColor: "#448AFF",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  newGameButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Sudoku;