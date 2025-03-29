import React, { useState, useEffect, useRef } from "react";
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

// Environment variables
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
    publishedAt: string;
    description: string;
    thumbnails: {
      default: Thumbnail;
      medium: Thumbnail;
      high: Thumbnail;
    };
  };
  favorite?: boolean;
}

interface Thumbnail {
  url: string;
  width: number;
  height: number;
}

export default function YouTubeMusicPlayer() {
  // State variables
  const [tracks, setTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("relaxing music");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [position, setPosition] = useState<number>(0);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'discover' | 'favorites'>('discover');
  const [playerReady, setPlayerReady] = useState(false);

  // Refs
  const playerRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flatListRef = useRef<FlatList<Track> | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Constants
  const { width } = Dimensions.get("window");

  // Load favorites from storage
  useEffect(() => {
    loadFavorites();
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Search effect
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
  }, [searchQuery]);

  // Filter tracks when showing favorites
  useEffect(() => {
    if (activeTab === 'favorites') {
      setFilteredTracks(favorites);
    } else {
      setFilteredTracks(tracks);
    }
  }, [activeTab, tracks, favorites]);

  // Handle player state changes
  const onPlayerStateChange = (state: string) => {
    console.log("Player state:", state);
    
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
          playerRef.current?.playVideo();
        } else {
          playNextTrack();
        }
        break;
      default:
        break;
    }
  };

  // Progress timer functions
  const startProgressTimer = () => {
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
  };

  const stopProgressTimer = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  // Load favorites from storage
  const loadFavorites = async () => {
    try {
      const storedFavorites = await SecureStore.getItemAsync("favorites");
      if (storedFavorites) {
        const parsedFavorites = JSON.parse(storedFavorites) as Track[];
        setFavorites(parsedFavorites);
      }
    } catch (error) {
      console.error("Failed to load favorites", error);
    }
  };

  // Save favorites to storage
  const saveFavorites = async (updatedFavorites: Track[]) => {
    try {
      await SecureStore.setItemAsync(
        "favorites",
        JSON.stringify(updatedFavorites)
      );
    } catch (error) {
      console.error("Failed to save favorites", error);
    }
  };

  // Search YouTube API for tracks
  const searchTracks = async (query: string, pageToken?: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setIsSearching(true);

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

      // Update tracks list
      const newTracks = response.data.items.map(track => ({
        ...track,
        favorite: favorites.some(fav => fav.id.videoId === track.id.videoId)
      }));

      if (pageToken) {
        setTracks(prev => [...prev, ...newTracks]);
      } else {
        setTracks(newTracks);
      }

      setNextPageToken(response.data.nextPageToken);
    } catch (error) {
      console.error("Error searching tracks:", error);
      Alert.alert("Error", "Failed to search tracks. Please try again later.");
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };

  // Load more tracks when reaching end of list
  const loadMoreTracks = () => {
    if (!isLoading && nextPageToken) {
      searchTracks(searchQuery, nextPageToken);
    }
  };

  // Play track
  const playTrack = async (track: Track) => {
    try {
      setCurrentTrack(track);
      setIsBuffering(true);
      
      // If player is ready, seek to start and play
      if (playerRef.current) {
        await playerRef.current.seekTo(0, true);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Error playing track:", error);
      Alert.alert("Playback Error", "Could not play this track");
      setIsBuffering(false);
    }
  };

  // Toggle play/pause
  const togglePlayPause = async () => {
    if (!currentTrack) return;
    
    try {
      if (isPlaying) {
        await playerRef.current?.pauseVideo();
        setIsPlaying(false);
      } else {
        await playerRef.current?.playVideo();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Error toggling play/pause:", error);
    }
  };

  // Play next track
  const playNextTrack = () => {
    if (!currentTrack || filteredTracks.length === 0) return;

    const currentIndex = filteredTracks.findIndex(
      (track) => track.id.videoId === currentTrack.id.videoId
    );

    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * filteredTracks.length);
    } else {
      nextIndex = (currentIndex + 1) % filteredTracks.length;
    }

    playTrack(filteredTracks[nextIndex]);
    scrollToTrack(nextIndex);
  };

  // Play previous track
  const playPreviousTrack = () => {
    if (!currentTrack || filteredTracks.length === 0) return;

    const currentIndex = filteredTracks.findIndex(
      (track) => track.id.videoId === currentTrack.id.videoId
    );

    let prevIndex;
    if (isShuffle) {
      prevIndex = Math.floor(Math.random() * filteredTracks.length);
    } else {
      prevIndex = (currentIndex - 1 + filteredTracks.length) % filteredTracks.length;
    }

    playTrack(filteredTracks[prevIndex]);
    scrollToTrack(prevIndex);
  };

  // Scroll to track in list
  const scrollToTrack = (index: number) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
    }
  };

  // Seek to position
  const seekTo = async (value: number) => {
    if (!currentTrack) return;
    try {
      await playerRef.current?.seekTo(Math.round(value / 1000), true);
    } catch (error) {
      console.error("Error seeking:", error);
    }
  };

  // Toggle repeat mode
  const toggleRepeat = () => {
    setIsRepeat(!isRepeat);
  };

  // Toggle favorite status for a track
  const toggleFavorite = (track: Track) => {
    const isFavorite = favorites.some(
      (fav) => fav.id.videoId === track.id.videoId
    );

    let updatedFavorites: Track[];
    let updatedTracks: Track[] = [...tracks];

    if (isFavorite) {
      updatedFavorites = favorites.filter(
        (fav) => fav.id.videoId !== track.id.videoId
      );
      
      // Update favorite status in tracks list
      updatedTracks = updatedTracks.map(t => 
        t.id.videoId === track.id.videoId 
          ? { ...t, favorite: false } 
          : t
      );
    } else {
      updatedFavorites = [...favorites, { ...track, favorite: true }];
      
      // Update favorite status in tracks list
      updatedTracks = updatedTracks.map(t => 
        t.id.videoId === track.id.videoId 
          ? { ...t, favorite: true } 
          : t
      );
    }

    setFavorites(updatedFavorites);
    setTracks(updatedTracks);
    saveFavorites(updatedFavorites);

    // If current track is toggled, update its status
    if (currentTrack?.id.videoId === track.id.videoId) {
      setCurrentTrack({ ...currentTrack, favorite: !isFavorite });
    }
  };

  // Format time (milliseconds to MM:SS)
  const formatTime = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Render track item
  const renderTrackItem = ({ item, index }: { item: Track; index: number }) => {
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
  };

  // Main render
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* YouTube Player (hidden) */}
      {currentTrack && (
        <View style={styles.videoContainer}>
          <YoutubePlayer
            ref={playerRef}
            height={0}
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
        </View>
      )}

      {/* Header with search */}
      <View style={styles.header}>
        <Text style={styles.title}>YTMusic</Text>
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

      {/* Tab buttons */}
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

      {/* Track list */}
      {isLoading && filteredTracks.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#ff3b5c" />
          <Text style={styles.loaderText}>Loading tracks...</Text>
        </View>
      ) : filteredTracks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name={activeTab === 'favorites' ? "favorite" : "music-note"} size={50} color="#ddd" />
          <Text style={styles.emptyText}>
            {activeTab === 'favorites' ? "No favorites yet" : "No tracks found"}
          </Text>
          {activeTab === 'favorites' && (
            <Text style={styles.emptySubtext}>
              Tap the heart icon to add tracks to your favorites
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredTracks}
          keyExtractor={(item) => item.id.videoId}
          renderItem={renderTrackItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.trackList}
          onEndReached={activeTab === 'discover' ? loadMoreTracks : undefined}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoading && filteredTracks.length > 0 ? (
              <ActivityIndicator 
                size="small" 
                color="#ff3b5c" 
                style={styles.footerLoader}
              />
            ) : null
          }
        />
      )}

      {/* Player controls */}
      {currentTrack && (
        <View style={styles.playerContainer}>
          {/* Current track info */}
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
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => toggleFavorite(currentTrack)}
            >
              <MaterialIcons
                name={currentTrack.favorite ? "favorite" : "favorite-border"}
                size={24}
                color={currentTrack.favorite ? "#ff3b5c" : "#888"}
              />
            </TouchableOpacity>
          </View>

          {/* Progress bar */}
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

          {/* Playback controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setIsShuffle(!isShuffle)}
            >
              <Ionicons
                name="shuffle"
                size={22}
                color={isShuffle ? "#ff3b5c" : "#888"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={playPreviousTrack}
            >
              <Ionicons name="play-skip-back" size={30} color="#333" />
            </TouchableOpacity>

            {isBuffering ? (
              <ActivityIndicator size="large" color="#ff3b5c" style={styles.playButton} />
            ) : (
              <TouchableOpacity
                style={styles.playButton}
                onPress={togglePlayPause}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={30}
                  color="#fff"
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.controlButton}
              onPress={playNextTrack}
            >
              <Ionicons name="play-skip-forward" size={30} color="#333" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleRepeat}
            >
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
  videoContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'hidden',
  },
  hiddenPlayer: {
    opacity: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 28,
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
    justifyContent: "center",
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTabButton: {
    borderBottomColor: "#ff3b5c",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#888",
  },
  activeTabText: {
    color: "#ff3b5c",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: "#888",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: "#888",
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#aaa",
    marginTop: 5,
    textAlign: "center",
  },
  trackList: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 130 : 150,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  activeTrackItem: {
    backgroundColor: "rgba(255, 59, 92, 0.05)",
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  thumbnail: {
    width: 55,
    height: 55,
    borderRadius: 6,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: "center",
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  activeText: {
    color: "#ff3b5c",
    fontWeight: "bold",
  },
  artistName: {
    fontSize: 14,
    color: "#888",
    marginTop: 2,
  },
  favoriteButton: {
    padding: 8,
  },
  footerLoader: {
    marginVertical: 20,
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
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  nowPlayingBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  playerThumbnail: {
    width: 55,
    height: 55,
    borderRadius: 6,
  },
  nowPlayingInfo: {
    flex: 1,
    marginLeft: 15,
  },
  nowPlayingTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  nowPlayingArtist: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  progressBar: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  timeText: {
    fontSize: 12,
    color: "#888",
    width: 35,
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  controlButton: {
    padding: 10,
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