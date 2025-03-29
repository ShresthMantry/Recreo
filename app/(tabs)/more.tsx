import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "expo-router";

const allActivities = [
  "Music",
  "Drawing",
  "Books",
  "Journal",
  "Community Sharing",
  "Games",
];

export default function More() {
  const { user } = useAuth();
  const router = useRouter();
  const selectedActivities = user?.activities || [];

  const otherActivities = allActivities.filter(
    (activity) => !selectedActivities.includes(activity)
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>More Activities</Text>
      <FlatList
        data={otherActivities}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.activityItem}
            onPress={() => router.push(`/app/tabs/${item.toLowerCase().replace(" ", "-")}`)}
          >
            <Text>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: "center" },
  activityItem: { padding: 15, borderWidth: 1, marginBottom: 10, borderRadius: 5 },
});