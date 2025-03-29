// components/games/TicTacToe.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  onBackToMenu: () => void;
}

type Player = "X" | "O";
type BoardState = (Player | null)[];

const TicTacToe: React.FC<Props> = ({ onBackToMenu }) => {
  const [board, setBoard] = useState<BoardState>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState<boolean>(true);
  const [winner, setWinner] = useState<Player | "Draw" | null>(null);
  const [xWins, setXWins] = useState<number>(0);
  const [oWins, setOWins] = useState<number>(0);
  const [draws, setDraws] = useState<number>(0);

  useEffect(() => {
    checkWinner();
  }, [board]);

  const handlePress = (index: number) => {
    if (board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = isXNext ? "X" : "O";
    setBoard(newBoard);
    setIsXNext(!isXNext);
  };

  const checkWinner = () => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        setWinner(board[a] as Player);
        if (board[a] === "X") {
          setXWins(xWins + 1);
        } else {
          setOWins(oWins + 1);
        }
        return;
      }
    }

    // Check for draw
    if (!board.includes(null) && !winner) {
      setWinner("Draw");
      setDraws(draws + 1);
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
  };

  const renderSquare = (index: number) => {
    return (
      <TouchableOpacity
        style={styles.square}
        onPress={() => handlePress(index)}
        disabled={!!winner}
      >
        {board[index] && (
          <Text style={[
            styles.squareText,
            board[index] === "X" ? styles.xText : styles.oText
          ]}>
            {board[index]}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackToMenu}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Tic Tac Toe</Text>
      </View>

      <View style={styles.scoreContainer}>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>X Wins</Text>
          <Text style={styles.scoreValue}>{xWins}</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>O Wins</Text>
          <Text style={styles.scoreValue}>{oWins}</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Draws</Text>
          <Text style={styles.scoreValue}>{draws}</Text>
        </View>
      </View>

      <View style={styles.statusContainer}>
        {winner ? (
          <Text style={styles.statusText}>
            {winner === "Draw" ? "Game Ended in Draw!" : `Player ${winner} wins!`}
          </Text>
        ) : (
          <Text style={styles.statusText}>Player {isXNext ? "X" : "O"}'s turn</Text>
        )}
      </View>

      <View style={styles.board}>
        <View style={styles.row}>
          {renderSquare(0)}
          {renderSquare(1)}
          {renderSquare(2)}
        </View>
        <View style={styles.row}>
          {renderSquare(3)}
          {renderSquare(4)}
          {renderSquare(5)}
        </View>
        <View style={styles.row}>
          {renderSquare(6)}
          {renderSquare(7)}
          {renderSquare(8)}
        </View>
      </View>

      <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
        <Text style={styles.resetButtonText}>New Game</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#121212",
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
  statusContainer: {
    marginVertical: 16,
    alignItems: "center",
  },
  statusText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
  scoreContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 12,
  },
  scoreItem: {
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 14,
    color: "#9ca3af",
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
  },
  board: {
    alignSelf: "center",
    marginVertical: 20,
  },
  row: {
    flexDirection: "row",
  },
  square: {
    width: 90,
    height: 90,
    borderWidth: 2,
    borderColor: "#333333",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#222222",
  },
  squareText: {
    fontSize: 48,
    fontWeight: "bold",
  },
  xText: {
    color: "#FF5252",
  },
  oText: {
    color: "#448AFF",
  },
  resetButton: {
    backgroundColor: "#3e3e3e",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
    alignSelf: "center",
  },
  resetButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default TicTacToe;