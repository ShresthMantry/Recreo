import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  PanResponder,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createClient } from "@supabase/supabase-js";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import * as FileSystem from "expo-file-system";
import Svg, { Path } from "react-native-svg";

// Supabase configuration
const supabaseUrl = "https://ysavghvmswenmddlnshr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzYXZnaHZtc3dlbm1kZGxuc2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5OTY4MzIsImV4cCI6MjA1ODU3MjgzMn0.GCQ0xl7wJKI_YB8d3PP1jBDcs-aRJLRLjk9-NdB1_bs";
const supabase = createClient(supabaseUrl, supabaseKey);

// Type definitions
interface Drawing {
  id: number;
  paths: PathData[];
  thumbnail: string | null;
  created_at: string;
  updated_at?: string;
}

interface PathData {
  path: string;
  color: string;
  strokeWidth: number;
  isEraser?: boolean;
}

interface CurrentPath {
  path: string;
  color: string;
  strokeWidth: number;
  isEraser?: boolean;
}

export default function DrawingApp() {
  // State management
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPaths, setCurrentPaths] = useState<PathData[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [color, setColor] = useState("#ffffff");
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  
  // Refs
  const canvasRef = useRef<View>(null);
  const pathsRef = useRef<CurrentPath[]>([]);
  const currentPathRef = useRef<CurrentPath | null>(null);
  
  // UI measurements
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get("window");
  const canvasHeight = height * 0.65;

  // Color options for the palette
  const colorOptions = ["#ffffff", "#ff5252", "#4fc3f7", "#9ccc65", "#ffb74d", "#ba68c8"];

  // PanResponder for drawing
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        currentPathRef.current = {
          path: `M${x},${y}`,
          color: isEraser ? "#1a1a1a" : color,
          strokeWidth: isEraser ? strokeWidth * 2 : strokeWidth,
          isEraser
        };
      },
      onPanResponderMove: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        if (!currentPathRef.current) return;
        
        currentPathRef.current.path += ` L${x},${y}`;
        
        // Update the display with the current path
        setCurrentPaths([
          ...pathsRef.current,
          {
            ...currentPathRef.current,
            path: currentPathRef.current.path
          }
        ]);
      },
      onPanResponderRelease: () => {
        if (!currentPathRef.current) return;
        
        pathsRef.current = [
          ...pathsRef.current,
          {
            ...currentPathRef.current
          }
        ];
        setCurrentPaths(pathsRef.current);
        currentPathRef.current = null;
      },
    })
  ).current;

  // Fetch drawings on component mount
  useEffect(() => {
    fetchDrawings();
  }, []);

  const fetchDrawings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("drawings1")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Parse the paths data
      const parsedData = (data || []).map(drawing => ({
        ...drawing,
        paths: JSON.parse(drawing.paths)
      }));
      
      setDrawings(parsedData);
    } catch (error) {
      console.error("Error fetching drawings:", error);
      Alert.alert("Error", "Failed to load drawings");
    } finally {
      setLoading(false);
    }
  };

  const handleNewDrawing = () => {
    pathsRef.current = [];
    currentPathRef.current = null;
    setCurrentPaths([]);
    setCurrentDrawing(null);
    setEditMode(false);
    setIsEraser(false);
    setModalVisible(true);
    vibrate();
  };

  const handleEditDrawing = (drawing: Drawing) => {
    try {
      setCurrentDrawing(drawing);
      pathsRef.current = [...drawing.paths];
      setCurrentPaths(drawing.paths);
      setEditMode(true);
      setIsEraser(false);
      setModalVisible(true);
      vibrate();
    } catch (error) {
      console.error("Error loading drawing:", error);
      Alert.alert("Error", "Failed to load drawing");
    }
  };

  const handleDeleteDrawing = async (id: number) => {
    Alert.alert(
      "Delete Drawing",
      "Are you sure you want to delete this drawing?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from("drawings1")
                .delete()
                .eq("id", id);

              if (error) throw error;
              
              setDrawings(drawings.filter(drawing => drawing.id !== id));
              notifySuccess();
            } catch (error) {
              console.error("Error deleting drawing:", error);
              Alert.alert("Error", "Failed to delete drawing");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const captureCanvas = async (): Promise<string | null> => {
    try {
      if (!canvasRef.current) return null;
      
      const uri = await captureRef(canvasRef, {
        format: "png",
        quality: 0.8,
      });
      
      return uri;
    } catch (error) {
      console.error("Error capturing canvas:", error);
      return null;
    }
  };

  const saveDrawing = async () => {
    try {
      if (pathsRef.current.length === 0) {
        Alert.alert("Error", "Cannot save an empty drawing");
        return;
      }

      setLoading(true);
      
      // Capture the canvas as an image
      const thumbnailUri = await captureCanvas();
      let thumbnailBase64 = null;
      
      if (thumbnailUri) {
        const base64 = await FileSystem.readAsStringAsync(thumbnailUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        thumbnailBase64 = base64;
      }
      
      const pathsToSave = pathsRef.current;
      const timestamp = new Date().toISOString();
      
      if (editMode && currentDrawing) {
        // Update existing drawing
        const { error } = await supabase
          .from("drawings1")
          .update({
            paths: JSON.stringify(pathsToSave),
            thumbnail: thumbnailBase64,
            updated_at: timestamp
          })
          .eq("id", currentDrawing.id);

        if (error) throw error;
        
        setDrawings(drawings.map(drawing => 
          drawing.id === currentDrawing.id 
            ? { 
                ...drawing, 
                paths: pathsToSave, 
                thumbnail: thumbnailBase64, 
                updated_at: timestamp 
              }
            : drawing
        ));
      } else {
        // Create new drawing
        const { data, error } = await supabase
          .from("drawings1")
          .insert({
            paths: JSON.stringify(pathsToSave),
            thumbnail: thumbnailBase64,
            created_at: timestamp,
            updated_at: timestamp
          })
          .select();

        if (error) throw error;
        
        if (data?.[0]) {
          const newDrawing = {
            ...data[0],
            paths: pathsToSave
          };
          setDrawings([newDrawing, ...drawings]);
        }
      }

      notifySuccess();
      setModalVisible(false);
    } catch (error) {
      console.error("Error saving drawing:", error);
      Alert.alert("Error", "Failed to save drawing");
    } finally {
      setLoading(false);
    }
  };

  const clearCanvas = () => {
    pathsRef.current = [];
    currentPathRef.current = null;
    setCurrentPaths([]);
    vibrate();
  };

  const toggleEraser = () => {
    setIsEraser(!isEraser);
    vibrate();
  };

  // Helper functions for haptic feedback
  const vibrate = () => {
    if (Platform.OS === "android") {
      Haptics.selectionAsync();
    }
  };

  const notifySuccess = () => {
    if (Platform.OS === "android") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // Render functions
  const renderDrawingItem = ({ item }: { item: Drawing }) => (
    <TouchableOpacity 
      style={styles.drawingItem}
      onPress={() => handleEditDrawing(item)}
      activeOpacity={0.7}
    >
      {item.thumbnail ? (
        <View style={styles.thumbnailContainer}>
          <Image 
            source={{ uri: `data:image/png;base64,${item.thumbnail}` }}
            style={styles.thumbnail}
          />
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteDrawing(item.id);
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyThumbnail}>
          <Ionicons name="image-outline" size={24} color="#9ca3af" />
        </View>
      )}
      <Text style={styles.drawingDate}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  const renderPath = ({ path, color, strokeWidth, isEraser }: PathData, index: number) => (
    <Path
      key={index}
      d={path}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Text style={styles.title}>My Drawings</Text>
      
      {loading && drawings.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Loading your artwork...</Text>
        </View>
      ) : (
        <FlatList
          data={drawings}
          renderItem={renderDrawingItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.drawingsList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="brush-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No drawings yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap the + button to create your first masterpiece
              </Text>
            </View>
          }
        />
      )}
      
      <TouchableOpacity 
        style={styles.fab}
        onPress={handleNewDrawing}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color="#ffffff" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editMode ? "Edit Drawing" : "New Drawing"}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View 
              ref={canvasRef}
              style={[styles.canvasContainer, { height: canvasHeight }]}
              {...panResponder.panHandlers}
            >
              <Svg style={styles.canvasBackground}>
                {currentPaths.map(renderPath)}
              </Svg>
            </View>

            <View style={styles.toolsContainer}>
              <View style={styles.toolRow}>
                <View style={styles.colorPicker}>
                  {colorOptions.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorOption,
                        { backgroundColor: c },
                        color === c && !isEraser && styles.selectedColor,
                      ]}
                      onPress={() => {
                        setColor(c);
                        setIsEraser(false);
                        vibrate();
                      }}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.eraserButton,
                    isEraser && styles.eraserButtonActive
                  ]}
                  onPress={toggleEraser}
                >
                  <Ionicons name="trash-outline" size={20} color={isEraser ? "#7c3aed" : "#ffffff"} />
                  <Text style={[styles.buttonText, isEraser && { color: "#7c3aed" }]}>Eraser</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.strokePicker}>
                {[2, 5, 10, 15].map((width) => (
                  <TouchableOpacity
                    key={width}
                    style={[
                      styles.strokeOption,
                      strokeWidth === width && styles.selectedStroke,
                    ]}
                    onPress={() => {
                      setStrokeWidth(width);
                      vibrate();
                    }}
                  >
                    <View
                      style={[
                        styles.strokeSample,
                        { 
                          height: width, 
                          backgroundColor: isEraser ? "#7c3aed" : color,
                          width: width * 2,
                        },
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearCanvas}
              >
                <Ionicons name="trash-outline" size={20} color="#ffffff" />
                <Text style={styles.buttonText}>Clear</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveDrawing}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="#ffffff" />
                    <Text style={styles.buttonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 16,
    marginTop: 8,
  },
  drawingsList: {
    paddingBottom: 80,
  },
  drawingItem: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#1e1e1e",
    maxWidth: "46%",
  },
  thumbnailContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  emptyThumbnail: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
  },
  drawingDate: {
    fontSize: 12,
    color: "#9ca3af",
    padding: 8,
  },
  deleteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7c3aed",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#121212",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    height: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
  },
  closeButton: {
    padding: 4,
  },
  canvasContainer: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    margin: 8,
    overflow: "hidden",
  },
  canvasBackground: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  toolsContainer: {
    padding: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    margin: 8,
  },
  toolRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  colorPicker: {
    flexDirection: "row",
    justifyContent: "space-around",
    flex: 1,
    marginRight: 16,
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#2a2a2a",
  },
  selectedColor: {
    borderColor: "#7c3aed",
    transform: [{ scale: 1.2 }],
  },
  eraserButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#2a2a2a",
  },
  eraserButtonActive: {
    backgroundColor: "#3a3a3a",
    borderWidth: 2,
    borderColor: "#7c3aed",
  },
  strokePicker: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  strokeOption: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#2a2a2a",
  },
  selectedStroke: {
    backgroundColor: "#3a3a3a",
    borderWidth: 2,
    borderColor: "#7c3aed",
  },
  strokeSample: {
    borderRadius: 4,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  clearButton: {
    backgroundColor: "#ef4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: "#7c3aed",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#9ca3af",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#9ca3af",
  },
});