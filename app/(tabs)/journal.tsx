import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../../context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

const supabase = createClient(
  "https://ysavghvmswenmddlnshr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzYXZnaHZtc3dlbm1kZGxuc2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5OTY4MzIsImV4cCI6MjA1ODU3MjgzMn0.GCQ0xl7wJKI_YB8d3PP1jBDcs-aRJLRLjk9-NdB1_bs",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

interface JournalEntry {
  id?: number;
  user_id: string;
  date: string;
  content: string;
  mood?: string;
  created_at?: string;
  updated_at?: string;
}

export default function Journal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("neutral");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const contentScrollRef = useRef<ScrollView>(null);

  const moods = [
    { label: "Great", value: "great", icon: "sunny-outline" },
    { label: "Good", value: "good", icon: "partly-sunny-outline" },
    { label: "Neutral", value: "neutral", icon: "contrast-outline" },
    { label: "Bad", value: "bad", icon: "rainy-outline" },
    { label: "Terrible", value: "terrible", icon: "thunderstorm-outline" },
  ];

  const getPastDays = (count = 7) => {
    const days = [];
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(format(date, "yyyy-MM-dd"));
    }
    return days;
  };

  useEffect(() => {
    if (user) {
      fetchEntries();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedDate) {
      fetchEntriesForDate(selectedDate);
    }
  }, [selectedDate, user]);

  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoading, fadeAnim, scaleAnim]);

  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      if (!user) return;

      const { data, error } = await supabase
        .from("journal_")
        .select("*")
        .eq("user_id", user.email)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setEntries(data || []);
      if (data && data.length > 0) {
        setSelectedDate(data[0].date);
        setSelectedEntryId(data[0].id || null);
      }
    } catch (error) {
      console.error("Error fetching entries:", error);
      Alert.alert("Error", "Failed to load journal entries");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEntriesForDate = async (date: string) => {
    try {
      setIsLoading(true);
      if (!user) return;

      const { data, error } = await supabase
        .from("journal_")
        .select("*")
        .eq("user_id", user.email)
        .eq("date", date)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Select the most recent entry by default
        setCurrentEntry(data[0]);
        setContent(data[0].content);
        setMood(data[0].mood || "neutral");
        setSelectedEntryId(data[0].id || null);
      } else {
        setCurrentEntry(null);
        setContent("");
        setMood("neutral");
        setSelectedEntryId(null);
      }
      setIsEditing(false);
    } catch (error) {
      console.error("Error fetching entries:", error);
      Alert.alert("Error", "Failed to load journal entries");
    } finally {
      setIsLoading(false);
    }
  };

  const saveEntry = async () => {
    try {
      if (!user) {
        Alert.alert("Error", "You must be logged in to save entries");
        return;
      }

      setIsSaving(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const entryData: JournalEntry = {
        user_id: user.email,
        date: selectedDate,
        content,
        mood,
        updated_at: new Date().toISOString(),
      };

      let result;
      
      if (selectedEntryId) {
        // Update existing entry
        result = await supabase
          .from("journal_")
          .update(entryData)
          .eq("id", selectedEntryId);
      } else {
        // Create new entry
        entryData.created_at = new Date().toISOString();
        result = await supabase
          .from("journal_")
          .insert(entryData);
      }

      if (result.error) throw result.error;

      // Refresh entries and scroll to top
      await fetchEntries();
      await fetchEntriesForDate(selectedDate);
      setIsEditing(false);
      if (contentScrollRef.current) {
        contentScrollRef.current.scrollTo({ y: 0, animated: true });
      }
    } catch (error) {
      console.error("Error saving entry:", error);
      Alert.alert("Error", "Failed to save journal entry");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteEntry = async () => {
    try {
      if (!selectedEntryId) return;

      Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete this journal entry?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              setIsLoading(true);
              
              const { error } = await supabase
                .from("journal_")
                .delete()
                .eq("id", selectedEntryId);

              if (error) throw error;
              
              // After deleting, refresh entries
              await fetchEntries();
              await fetchEntriesForDate(selectedDate);
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error deleting entry:", error);
      Alert.alert("Error", "Failed to delete journal entry");
      setIsLoading(false);
    }
  };

  const formatDateForDisplay = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, "EEEE, MMMM d, yyyy");
  };

  const createNewEntry = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    setSelectedDate(today);
    setContent("");
    setMood("neutral");
    setCurrentEntry(null);
    setSelectedEntryId(null);
    setIsEditing(true);
  };

  const selectEntry = (entry: JournalEntry) => {
    setCurrentEntry(entry);
    setContent(entry.content);
    setMood(entry.mood || "neutral");
    setSelectedEntryId(entry.id || null);
    setIsEditing(false);
  };

  const getEntriesForSelectedDate = () => {
    return entries.filter(entry => entry.date === selectedDate);
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Journal</Text>
        <Text style={styles.subtitle}>Please log in to access your journal</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Daily Journal</Text>
        
        <TouchableOpacity 
          style={styles.newButton}
          onPress={createNewEntry}
        >
          <Ionicons name="add-circle" size={24} color="#8B5CF6" />
          <Text style={styles.newButtonText}>New Entry</Text>
        </TouchableOpacity>
      </View>
      
      {/* Date selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.dateSelector}
        contentContainerStyle={styles.dateSelectorContent}
      >
        {getPastDays(14).map((date) => (
          <TouchableOpacity
            key={date}
            style={[
              styles.dateButton,
              selectedDate === date && styles.selectedDateButton,
            ]}
            onPress={() => setSelectedDate(date)}
          >
            <Text style={[
              styles.dateButtonText,
              selectedDate === date && styles.selectedDateText,
            ]}>
              {format(parseISO(date), "MMM d")}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Entry selector for the selected date */}
      {getEntriesForSelectedDate().length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.entrySelector}
          contentContainerStyle={styles.entrySelectorContent}
        >
          {getEntriesForSelectedDate().map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={[
                styles.entryButton,
                selectedEntryId === entry.id && styles.selectedEntryButton,
              ]}
              onPress={() => selectEntry(entry)}
            >
              <Text style={[
                styles.entryButtonText,
                selectedEntryId === entry.id && styles.selectedEntryText,
              ]}>
                {format(parseISO(entry.created_at || entry.date), "h:mm a")}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.contentContainer}
      >
        <Animated.View
          style={[
            styles.journalContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color="#8B5CF6" />
          ) : (
            <>
              <View style={styles.journalHeader}>
                <Text style={styles.journalDate}>
                  {formatDateForDisplay(selectedDate)}
                </Text>
                
                <View style={styles.moodContainer}>
                  <TouchableOpacity
                    onPress={() => setShowMoodSelector(!showMoodSelector)}
                    style={styles.moodButton}
                  >
                    <Ionicons
                      name={(moods.find(m => m.value === mood)?.icon as any)}
                      size={24}
                      color="#8B5CF6"
                    />
                    <Text style={styles.moodText}>
                      {moods.find(m => m.value === mood)?.label || "Mood"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showMoodSelector && (
                <View style={styles.moodSelector}>
                  {moods.map((m) => (
                    <TouchableOpacity
                      key={m.value}
                      style={[
                        styles.moodOption,
                        mood === m.value && styles.selectedMoodOption,
                      ]}
                      onPress={() => {
                        setMood(m.value);
                        setShowMoodSelector(false);
                        if (isEditing) {
                          Haptics.selectionAsync();
                        }
                      }}
                      disabled={!isEditing}
                    >
                      <Ionicons
                        name={m.icon as any}
                        size={24}
                        color={mood === m.value ? "#8B5CF6" : "#9ca3af"}
                      />
                      <Text style={[
                        styles.moodOptionText,
                        mood === m.value && styles.selectedMoodOptionText,
                      ]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {isEditing ? (
                <TextInput
                  style={styles.editor}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  placeholder="Write your thoughts for today..."
                  placeholderTextColor="#6b7280"
                  autoFocus
                />
              ) : (
                <ScrollView 
                  ref={contentScrollRef}
                  style={styles.contentScroll}
                  contentContainerStyle={styles.contentScrollContainer}
                >
                  {currentEntry ? (
                    <Text style={styles.journalContent}>{content}</Text>
                  ) : (
                    <Text style={styles.emptyState}>
                      No entry for this date. Tap 'New Entry' to create one.
                    </Text>
                  )}
                </ScrollView>
              )}

              <View style={styles.actionButtons}>
                {isEditing ? (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => {
                        setIsEditing(false);
                        if (currentEntry) {
                          setContent(currentEntry.content);
                          setMood(currentEntry.mood || "neutral");
                        } else {
                          setContent("");
                          setMood("neutral");
                        }
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.saveButton]}
                      onPress={saveEntry}
                      disabled={isSaving || content.trim() === ""}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {currentEntry && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={deleteEntry}
                      >
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.actionButton, styles.editButton]}
                      onPress={() => setIsEditing(true)}
                    >
                      <Ionicons name="pencil-outline" size={20} color="#8B5CF6" />
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 16,
    color: "#9ca3af",
    marginTop: 8,
  },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newButtonText: {
    color: "#8B5CF6",
    fontWeight: "600",
    marginLeft: 4,
  },
  dateSelector: {
    marginBottom: 8,
    maxHeight: 40,
  },
  dateSelectorContent: {
    paddingRight: 16,
  },
  dateButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: "#1e1e1e",
  },
  selectedDateButton: {
    backgroundColor: "#8B5CF6",
  },
  dateButtonText: {
    color: "#d1d5db",
    fontWeight: "500",
    fontSize: 14,
  },
  selectedDateText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  entrySelector: {
    marginBottom: 8,
    maxHeight: 40,
  },
  entrySelectorContent: {
    paddingRight: 16,
  },
  entryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: "#1e1e1e",
  },
  selectedEntryButton: {
    backgroundColor: "#8B5CF6",
  },
  entryButtonText: {
    color: "#d1d5db",
    fontWeight: "500",
    fontSize: 14,
  },
  selectedEntryText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  contentContainer: {
    flex: 1,
  },
  journalContainer: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  journalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2d2d2d",
    paddingBottom: 12,
  },
  journalDate: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
  moodContainer: {
    flexDirection: "row",
  },
  moodButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  moodText: {
    color: "#8B5CF6",
    marginLeft: 4,
    fontWeight: "500",
  },
  moodSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    padding: 10,
    backgroundColor: "#2d2d2d",
    borderRadius: 8,
  },
  moodOption: {
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
  },
  selectedMoodOption: {
    backgroundColor: "rgba(139, 92, 246, 0.2)",
  },
  moodOptionText: {
    color: "#9ca3af",
    marginTop: 4,
    fontSize: 12,
  },
  selectedMoodOptionText: {
    color: "#8B5CF6",
    fontWeight: "600",
  },
  editor: {
    flex: 1,
    color: "#ffffff",
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: "top",
    minHeight: 200,
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollContainer: {
    flexGrow: 1,
  },
  journalContent: {
    color: "#ffffff",
    fontSize: 16,
    lineHeight: 24,
    paddingBottom: 20,
  },
  emptyState: {
    color: "#6b7280",
    fontSize: 16,
    textAlign: "center",
    marginTop: 32,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#2d2d2d",
    paddingTop: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },
  saveButton: {
    backgroundColor: "#8B5CF6",
  },
  cancelButton: {
    backgroundColor: "#2d2d2d",
  },
  deleteButton: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  editButtonText: {
    color: "#8B5CF6",
    fontWeight: "600",
    marginLeft: 4,
  },
  saveButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  cancelButtonText: {
    color: "#9ca3af",
    fontWeight: "600",
  },
  deleteButtonText: {
    color: "#ef4444",
    fontWeight: "600",
    marginLeft: 4,
  },
});