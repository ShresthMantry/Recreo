import React, { useState, useEffect } from "react";
import { View, Text, FlatList, Button, StyleSheet } from "react-native";
import axios from "axios";
import { Audio } from "expo-av";

const YOUTUBE_BASE_URL = process.env.YOUTUBE_BASE_URL;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export default function Music() {
  const [tracks, setTracks] = useState<any[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    const fetchTracks = async () => {
      try {
        const response = await axios.get(
          `${YOUTUBE_BASE_URL}search?part=snippet&q=relaxing+music&type=video&key=${YOUTUBE_API_KEY}`
        );
        setTracks(response.data.items);
      } catch (error) {
        console.error("Error fetching YouTube tracks:", error);
      }
    };
    fetchTracks();
  }, []);

  const playTrack = async (videoId: string) => {
    if (sound) {
      await sound.unloadAsync();
    }
    const { sound: newSound } = await Audio.Sound.createAsync({
      uri: `https://www.youtube.com/watch?v=${videoId}`,
    });
    setSound(newSound);
    await newSound.playAsync();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Music</Text>
      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id.videoId}
        renderItem={({ item }) => (
          <View style={styles.trackItem}>
            <Text>{item.snippet.title}</Text>
            <Button
              title="Play"
              onPress={() => playTrack(item.id.videoId)}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: "center" },
  trackItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#ccc" },
});