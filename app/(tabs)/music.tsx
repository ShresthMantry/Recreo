import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import Slider from "@react-native-community/slider";
import * as SecureStore from "expo-secure-store";
import YoutubePlayer from "react-native-youtube-iframe";
import { useFocusEffect } from "@react-navigation/native";

// Environment variables - In a real app, use expo-constants or .env file
const YOUTUBE_API_KEY = "AIzaSyAWUBzgPnvzvMjBi-IjeW-YCfTE97Cm4Nc";
const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";

// Types
interface YouTubeSearchResponse {
  items: Track[];
  nextPageToken?: string;
}

interface Track {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      medium: {
        url: string;
      };
    };
  };
  favorite?: boolean;
}

export default function YouTubeMusicPlayer() {
  // State variables
  const [tracks, setTracks] = useState<Track[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("relaxing music");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [position, setPosition] = useState<number>(0);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<'discover' | 'favorites'>('discover');
  const [playerReady, setPlayerReady] = useState(false);

  // Refs
  const playerRef = useRef<YoutubePlayer>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Constants
  const { width } = Dimensions.get("window");

  // Memoized filtered tracks
  const filteredTracks = useMemo(() => {
    return activeTab === 'favorites' ? favorites : tracks;
  }, [activeTab, favorites, tracks]);

  // Load favorites from storage
  const loadFavorites = useCallback(async () => {
    try {
      const storedFavorites = await SecureStore.getItemAsync("favorites");
      if (storedFavorites) {
        const parsedFavorites = JSON.parse(storedFavorites) as Track[];
        setFavorites(parsedFavorites);
        
        // Update favorite status in tracks
        setTracks(prevTracks => 
          prevTracks.map(track => ({
            ...track,
            favorite: parsedFavorites.some(fav => fav.id.videoId === track.id.videoId)
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load favorites", error);
    }
  }, []);

  // Save favorites to storage
  const saveFavorites = useCallback(async (updatedFavorites: Track[]) => {
    try {
      await SecureStore.setItemAsync("favorites", JSON.stringify(updatedFavorites));
    } catch (error) {
      console.error("Failed to save favorites", error);
    }
  }, []);

  // Focus effect to load favorites when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadFavorites();
      return () => {};
    }, [loadFavorites])
  );

  // Search YouTube API for tracks
  const searchTracks = useCallback(async (query: string, pageToken?: string) => {
    if (!query.trim()) return;

    setIsLoading(true);

    try {
      const response = await axios.get<YouTubeSearchResponse>(
        `${YOUTUBE_API_BASE_URL}/search`,
        {
          params: {
            part: "snippet",
            q: query,
            type: "video",
            videoCategoryId: "10", // Music category
            maxResults: 15,
            key: YOUTUBE_API_KEY,
            pageToken: pageToken,
          },
        }
      );

      const newTracks = response.data.items.map(track => ({
        ...track,
        favorite: favorites.some(fav => fav.id.videoId === track.id.videoId)
      }));

      setTracks(prev => pageToken ? [...prev, ...newTracks] : newTracks);
      setNextPageToken(response.data.nextPageToken);
    } catch (error) {
      console.error("Error searching tracks:", error);
      Alert.alert("Error", "Failed to search tracks. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [favorites]);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchTracks(searchQuery);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchTracks]);

  // Player state handler
  const onPlayerStateChange = useCallback((state: string) => {
    console.log("Player state changed:", state);
    switch (state) {
      case "playing":
        setIsBuffering(false);
        setIsPlaying(true);
        startProgressTimer();
        break;
      case "paused":
        setIsPlaying(false);
        stopProgressTimer();
        break;
      case "buffering":
        setIsBuffering(true);
        break;
      case "ended":
        setIsPlaying(false);
        stopProgressTimer();
        setPosition(0);
        if (isRepeat) {
          playerRef.current?.seekTo(0, true);
          setIsPlaying(true);
        } else {
          playNextTrack();
        }
        break;
      default:
        break;
    }
  }, [isRepeat]);

  // Progress timer functions
  const startProgressTimer = useCallback(() => {
    stopProgressTimer();
    progressIntervalRef.current = setInterval(async () => {
      if (playerRef.current) {
        try {
          const currentTime = await playerRef.current.getCurrentTime();
          setPosition(Math.floor(currentTime * 1000));
        } catch (error) {
          console.error("Error getting current time:", error);
        }
      }
    }, 1000);
  }, []);

  const stopProgressTimer = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Play track
  const playTrack = useCallback((track: Track) => {
    setCurrentTrack(track);
    setIsBuffering(true);
    setIsPlaying(true);
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    try {
      setIsPlaying(prev => !prev);
    } catch (error) {
      console.error("Error toggling play/pause:", error);
    }
  }, []);

  // Play next track
  const playNextTrack = useCallback(() => {
    if (!currentTrack || filteredTracks.length === 0) return;

    const currentIndex = filteredTracks.findIndex(
      (track) => track.id.videoId === currentTrack.id.videoId
    );

    let nextIndex = isShuffle 
      ? Math.floor(Math.random() * filteredTracks.length)
      : (currentIndex + 1) % filteredTracks.length;

    playTrack(filteredTracks[nextIndex]);
  }, [currentTrack, filteredTracks, isShuffle, playTrack]);

  // Play previous track
  const playPreviousTrack = useCallback(() => {
    if (!currentTrack || filteredTracks.length === 0) return;

    const currentIndex = filteredTracks.findIndex(
      (track) => track.id.videoId === currentTrack.id.videoId
    );

    let prevIndex = isShuffle
      ? Math.floor(Math.random() * filteredTracks.length)
      : (currentIndex - 1 + filteredTracks.length) % filteredTracks.length;

    playTrack(filteredTracks[prevIndex]);
  }, [currentTrack, filteredTracks, isShuffle, playTrack]);

  // Toggle favorite
  const toggleFavorite = useCallback((track: Track) => {
    const isFavorite = favorites.some(fav => fav.id.videoId === track.id.videoId);
    let updatedFavorites: Track[];

    if (isFavorite) {
      updatedFavorites = favorites.filter(fav => fav.id.videoId !== track.id.videoId);
    } else {
      updatedFavorites = [...favorites, { ...track, favorite: true }];
    }

    setFavorites(updatedFavorites);
    saveFavorites(updatedFavorites);
    
    // Update tracks with new favorite status
    setTracks(prevTracks => 
      prevTracks.map(t => 
        t.id.videoId === track.id.videoId 
          ? { ...t, favorite: !isFavorite } 
          : t
      )
    );

    // Update current track if it's the one being toggled
    if (currentTrack?.id.videoId === track.id.videoId) {
      setCurrentTrack(prev => prev ? { ...prev, favorite: !isFavorite } : null);
    }
  }, [currentTrack, favorites, saveFavorites]);

  // Format time
  const formatTime = useCallback((millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, []);

  // Seek to position
  const seekTo = useCallback(async (value: number) => {
    if (!currentTrack) return;
    try {
      await playerRef.current?.seekTo(Math.round(value / 1000), true);
    } catch (error) {
      console.error("Error seeking:", error);
    }
  }, [currentTrack]);

  // Memoized track item renderer
  const renderTrackItem = useCallback(({ item }: { item: Track }) => {
    const isActive = currentTrack?.id.videoId === item.id.videoId;
    const isFavorite = favorites.some(fav => fav.id.videoId === item.id.videoId);

    return (
      <TouchableOpacity
        style={[
          styles.trackItem,
          isActive && styles.activeTrackItem
        ]}
        onPress={() => playTrack(item)}
      >
        <Image
          source={{ uri: item.snippet.thumbnails.medium.url }}
          style={styles.thumbnail}
        />
        <View style={styles.trackInfo}>
          <Text 
            numberOfLines={1} 
            style={[
              styles.trackTitle, 
              isActive && styles.activeText
            ]}
          >
            {item.snippet.title}
          </Text>
          <Text style={styles.artistName}>{item.snippet.channelTitle}</Text>
        </View>
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(item)}
        >
          <MaterialIcons
            name={isFavorite ? "favorite" : "favorite-border"}
            size={24}
            color={isFavorite ? "#ff3b5c" : "#888"}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [currentTrack, favorites, playTrack, toggleFavorite]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* YouTube Player */}
      {currentTrack && (
        <YoutubePlayer
          ref={playerRef}
          height={0}
          width={0}
          play={isPlaying}
          videoId={currentTrack.id.videoId}
          onChangeState={onPlayerStateChange}
          onReady={() => {
            setPlayerReady(true);
            setIsBuffering(false);
            playerRef.current?.getDuration().then((dur: number) => {
              setDuration(dur * 1000);
            });
          }}
          onError={(error) => {
            console.error("YouTube player error:", error);
            Alert.alert("Playback Error", "Could not play this video");
            setIsBuffering(false);
          }}
          webViewProps={{
            allowsFullscreenVideo: false,
            allowsInlineMediaPlayback: true,
          }}
          webViewStyle={styles.hiddenPlayer}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Music Player</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for music..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'discover' && styles.activeTabButton
          ]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'discover' && styles.activeTabText
          ]}>
            Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'favorites' && styles.activeTabButton
          ]}
          onPress={() => setActiveTab('favorites')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'favorites' && styles.activeTabText
          ]}>
            Favorites ({favorites.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Track List */}
      {isLoading && filteredTracks.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#ff3b5c" />
        </View>
      ) : filteredTracks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons 
            name={activeTab === 'favorites' ? "favorite" : "music-note"} 
            size={50} 
            color="#ddd" 
          />
          <Text style={styles.emptyText}>
            {activeTab === 'favorites' 
              ? "No favorites yet" 
              : "No tracks found"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTracks}
          keyExtractor={(item) => item.id.videoId}
          renderItem={renderTrackItem}
          contentContainerStyle={styles.trackList}
          onEndReached={activeTab === 'discover' ? () => nextPageToken && searchTracks(searchQuery, nextPageToken) : undefined}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoading && filteredTracks.length > 0 ? (
              <ActivityIndicator size="small" color="#ff3b5c" />
            ) : null
          }
        />
      )}

      {/* Player Controls */}
      {currentTrack && (
        <View style={styles.playerContainer}>
          <View style={styles.nowPlayingBar}>
            <Image
              source={{ uri: currentTrack.snippet.thumbnails.medium.url }}
              style={styles.playerThumbnail}
            />
            <View style={styles.nowPlayingInfo}>
              <Text numberOfLines={1} style={styles.nowPlayingTitle}>
                {currentTrack.snippet.title}
              </Text>
              <Text style={styles.nowPlayingArtist}>
                {currentTrack.snippet.channelTitle}
              </Text>
            </View>
            <TouchableOpacity onPress={() => toggleFavorite(currentTrack)}>
              <MaterialIcons
                name={currentTrack.favorite ? "favorite" : "favorite-border"}
                size={24}
                color={currentTrack.favorite ? "#ff3b5c" : "#888"}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Slider
              style={styles.progressBar}
              minimumValue={0}
              maximumValue={duration}
              value={position}
              onSlidingComplete={seekTo}
              minimumTrackTintColor="#ff3b5c"
              maximumTrackTintColor="#d3d3d3"
              thumbTintColor="#ff3b5c"
            />
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity onPress={() => setIsShuffle(!isShuffle)}>
              <Ionicons
                name="shuffle"
                size={22}
                color={isShuffle ? "#ff3b5c" : "#888"}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={playPreviousTrack}>
              <Ionicons name="play-skip-back" size={30} color="#333" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.playButton}
              onPress={togglePlayPause}
            >
              {isBuffering ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={30}
                  color="#fff"
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={playNextTrack}>
              <Ionicons name="play-skip-forward" size={30} color="#333" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsRepeat(!isRepeat)}>
              <Ionicons
                name="repeat"
                size={22}
                color={isRepeat ? "#ff3b5c" : "#888"}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  hiddenPlayer: {
    opacity: 0,
    height: 0,
    width: 0,
  },
  header: {
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ff3b5c",
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTabButton: {
    borderBottomColor: "#ff3b5c",
  },
  tabText: {
    fontSize: 16,
    color: "#888",
  },
  activeTabText: {
    color: "#ff3b5c",
    fontWeight: "bold",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: "#888",
  },
  trackList: {
    paddingBottom: 150,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  activeTrackItem: {
    backgroundColor: "rgba(255, 59, 92, 0.1)",
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 5,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 10,
  },
  trackTitle: {
    fontSize: 16,
    color: "#333",
  },
  activeText: {
    color: "#ff3b5c",
    fontWeight: "bold",
  },
  artistName: {
    fontSize: 14,
    color: "#888",
  },
  favoriteButton: {
    padding: 5,
  },
  playerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  nowPlayingBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  playerThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 5,
  },
  nowPlayingInfo: {
    flex: 1,
    marginLeft: 10,
  },
  nowPlayingTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  nowPlayingArtist: {
    fontSize: 14,
    color: "#666",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  progressBar: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  timeText: {
    fontSize: 12,
    color: "#888",
    width: 40,
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ff3b5c",
    justifyContent: "center",
    alignItems: "center",
  },
});
