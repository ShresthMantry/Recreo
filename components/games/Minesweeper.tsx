// components/games/Minesweeper.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  onBackToMenu: () => void;
}

interface Cell {
  hasMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
}

type Difficulty = "easy" | "medium" | "hard";
type GameStatus = "waiting" | "playing" | "won" | "lost";

const Minesweeper: React.FC<Props> = ({ onBackToMenu }) => {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [board, setBoard] = useState<Cell[][]>([[]]);
  const [gameStatus, setGameStatus] = useState<GameStatus>("waiting");
  const [flagMode, setFlagMode] = useState<boolean>(false);
  const [flagsRemaining, setFlagsRemaining] = useState<number>(0);
  const [timer, setTimer] = useState<number>(0);
  
  const getDifficultySettings = () => {
    switch (difficulty) {
      case "easy":
        return { rows: 8, cols: 8, mines: 10 };
      case "medium":
        return { rows: 10, cols: 10, mines: 20 };
      case "hard":
        return { rows: 12, cols: 12, mines: 40 };
      default:
        return { rows: 10, cols: 10, mines: 20 };
    }
  };
  
  useEffect(() => {
    initializeGame();
  }, [difficulty]);
  
  useEffect(() => {
    if (gameStatus === "playing") {
      const interval = setInterval(() => {
        setTimer(timer => timer + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameStatus]);
  
  const initializeGame = () => {
    const { rows, cols, mines } = getDifficultySettings();
    
    // Create empty board
    const newBoard: Cell[][] = Array(rows).fill(null).map(() => 
      Array(cols).fill(null).map(() => ({
        hasMine: false,
        isRevealed: false,
        isFlagged: false,
        adjacentMines: 0
      }))
    );
    
    // Place mines randomly
    let minesPlaced = 0;
    while (minesPlaced < mines) {
      const row = Math.floor(Math.random() * rows);
      const col = Math.floor(Math.random() * cols);
      
      if (!newBoard[row][col].hasMine) {
        newBoard[row][col].hasMine = true;
        minesPlaced++;
      }
    }
    
    // Calculate adjacent mines
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (!newBoard[row][col].hasMine) {
          let count = 0;
          // Check all 8 adjacent cells
          for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
              if (!(r === row && c === col) && newBoard[r][c].hasMine) {
                count++;
              }
            }
          }
          newBoard[row][col].adjacentMines = count;
        }
      }
    }
    
    setBoard(newBoard);
    setGameStatus("waiting");
    setFlagMode(false);
    setFlagsRemaining(mines);
    setTimer(0);
  };
  
  const handleCellPress = (row: number, col: number) => {
    if (gameStatus === "won" || gameStatus === "lost") return;
    
    // First click starts the game
    if (gameStatus === "waiting") {
      setGameStatus("playing");
    }
    
    const cell = board[row][col];
    
    // If the cell is already revealed or flagged, do nothing
    if (cell.isRevealed || cell.isFlagged) return;
    
    // Handle flag mode
    if (flagMode) {
      toggleFlag(row, col);
      return;
    }
    
    // Create a new board to avoid mutating state directly
    const newBoard = [...board.map(row => [...row])];
    
    // If the cell has a mine, game over
    if (cell.hasMine) {
      // Reveal all mines
      for (let r = 0; r < newBoard.length; r++) {
        for (let c = 0; c < newBoard[0].length; c++) {
          if (newBoard[r][c].hasMine) {
            newBoard[r][c].isRevealed = true;
          }
        }
      }
      setBoard(newBoard);
      setGameStatus("lost");
      Alert.alert("Game Over", "You hit a mine!", [{ text: "OK" }]);
      return;
    }
    
    // Reveal the cell
    revealCell(newBoard, row, col);
    
    // Check if the game is won
    if (checkWinCondition(newBoard)) {
      setGameStatus("won");
      Alert.alert("Congratulations!", "You cleared all mines!", [{ text: "OK" }]);
    }
    
    setBoard(newBoard);
  };
  
  const revealCell = (board: Cell[][], row: number, col: number) => {
    // If out of bounds, or already revealed, or flagged, do nothing
    if (
      row < 0 || 
      row >= board.length || 
      col < 0 || 
      col >= board[0].length || 
      board[row][col].isRevealed || 
      board[row][col].isFlagged
    ) {
      return;
    }
    
    // Reveal the cell
    board[row][col].isRevealed = true;
    
    // If the cell has no adjacent mines, reveal all adjacent cells
    if (board[row][col].adjacentMines === 0) {
      for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
          if (r !== row || c !== col) {
            revealCell(board, r, c);
          }
        }
      }
    }
  };
  
  const toggleFlag = (row: number, col: number) => {
    const newBoard = [...board.map(r => [...r])];
    const cell = newBoard[row][col];
    
    // Can't flag revealed cells
    if (cell.isRevealed) return;
    
    // Toggle flag
    if (cell.isFlagged) {
      cell.isFlagged = false;
      setFlagsRemaining(flagsRemaining + 1);
    } else if (flagsRemaining > 0) {
      cell.isFlagged = true;
      setFlagsRemaining(flagsRemaining - 1);
    }
    
    setBoard(newBoard);
  };
  
  const checkWinCondition = (board: Cell[][]) => {
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[0].length; col++) {
        // If there's a cell that's not a mine and not revealed, the game is not won yet
        if (!board[row][col].hasMine && !board[row][col].isRevealed) {
          return false;
        }
      }
    }
    return true;
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getCellContent = (cell: Cell) => {
    if (!cell.isRevealed) {
      if (cell.isFlagged) {
        return <Ionicons name="flag" size={14} color="#FF5252" />;
      }
      return null;
    }
    
    if (cell.hasMine) {
      return <Ionicons name="close-circle" size={14} color="#FF5252" />;
    }
    
    if (cell.adjacentMines === 0) {
      return null;
    }
    
    const colors = [
      "#448AFF", // 1 - Blue
      "#4CAF50", // 2 - Green
      "#FF5252", // 3 - Red
      "#673AB7", // 4 - Purple
      "#FF9800", // 5 - Orange
      "#00BCD4", // 6 - Cyan
      "#000000", // 7 - Black
      "#9E9E9E"  // 8 - Grey
    ];
    
    return (
      <Text style={[styles.cellText, { color: colors[cell.adjacentMines - 1] }]}>
        {cell.adjacentMines}
      </Text>
    );
  };
  
  const renderBoard = () => {
    return (
      <View style={styles.board}>
        {board.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((cell, colIndex) => (
              <TouchableOpacity
                key={`cell-${rowIndex}-${colIndex}`}
                style={[
                  styles.cell,
                  cell.isRevealed && styles.revealedCell
                ]}
                onPress={() => handleCellPress(rowIndex, colIndex)}
              >
                {getCellContent(cell)}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackToMenu}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Minesweeper</Text>
      </View>
      
      <View style={styles.controlBar}>
        <View style={styles.infoSection}>
          <Ionicons name="flag" size={18} color="#FF5252" />
          <Text style={styles.infoText}>{flagsRemaining}</Text>
        </View>
        
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
        
        <View style={styles.infoSection}>
          <Ionicons name="time-outline" size={18} color="#ffffff" />
          <Text style={styles.infoText}>{formatTime(timer)}</Text>
        </View>
      </View>
      
      {renderBoard()}
      
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.controlButton, flagMode && styles.activeControlButton]}
          onPress={() => setFlagMode(!flagMode)}
        >
          <Ionicons name="flag" size={24} color={flagMode ? "#ffffff" : "#FF5252"} />
          <Text style={[styles.controlText, flagMode && styles.activeControlText]}>
            {flagMode ? "Flag Mode ON" : "Flag Mode"}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={initializeGame}
        >
          <Ionicons name="refresh" size={24} color="#ffffff" />
          <Text style={styles.controlText}>New Game</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    marginBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
  },
  controlBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  infoSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  infoText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 4,
  },
  difficultyButtons: {
    flexDirection: "row",
  },
  difficultyButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 6,
    backgroundColor: "#2a2a2a",
  },
  activeDifficulty: {
    backgroundColor: "#66BB6A",
  },
  difficultyText: {
    color: "#9ca3af",
    fontSize: 12,
  },
  activeDifficultyText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  board: {
    alignSelf: "center",
    borderWidth: 2,
    borderColor: "#444444",
    borderRadius: 4,
    marginVertical: 20,
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    borderWidth: 1,
    borderColor: "#444444",
  },
  revealedCell: {
    backgroundColor: "#1a1a1a",
  },
  cellText: {
    fontWeight: "bold",
    fontSize: 12,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  controlButton: {
    backgroundColor: "#2a2a2a",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 140,
    justifyContent: "center",
  },
  activeControlButton: {
    backgroundColor: "#66BB6A",
  },
  controlText: {
    color: "#ffffff",
    marginLeft: 8,
    fontWeight: "500",
  },
  activeControlText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});

export default Minesweeper;