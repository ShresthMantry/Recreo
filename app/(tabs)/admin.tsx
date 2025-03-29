import React, { useState } from "react";
import { View, Text, TextInput, Button, FlatList, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Admin() {
  const [newGame, setNewGame] = useState("");
  const [games, setGames] = useState<string[]>(["Sudoku", "Minesweeper", "Tic-Tac-Toe"]);

  const addGame = async () => {
    if (newGame) {
      const updatedGames = [...games, newGame];
      setGames(updatedGames);
      await AsyncStorage.setItem("games", JSON.stringify(updatedGames));
      setNewGame("");
    }
  };

  // Add logic for removing users and community posts (requires backend integration)

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Panel</Text>
      <Text style={styles.subtitle}>Add New Game</Text>
      <TextInput
        style={styles.input}
        placeholder="New Game Name"
        value={newGame}
        onChangeText={setNewGame}
      />
      <Button title="Add Game" onPress={addGame} />
      <Text style={styles.subtitle}>Available Games</Text>
      <FlatList
        data={games}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.gameItem}>
            <Text>{item}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: "center" },
  subtitle: { fontSize: 18, marginVertical: 10 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
  gameItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#ccc" },
});