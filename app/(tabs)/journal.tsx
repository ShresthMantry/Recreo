// app/(tabs)/drawing.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Journal() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Drawing</Text>
      <Text style={styles.subtitle}>Explore drawing activities here!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#9ca3af",
  },
});