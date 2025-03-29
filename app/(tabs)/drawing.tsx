import React, { useState, useEffect } from "react";
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
  GestureResponderEvent
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createClient } from "@supabase/supabase-js";
import { Canvas, Path, useCanvasRef, Skia, ImageFormat, SkPath } from "@shopify/react-native-skia";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Supabase credentials
const supabaseUrl = "https://ysavghvmswenmddlnshr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzYXZnaHZtc3dlbm1kZGxuc2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5OTY4MzIsImV4cCI6MjA1ODU3MjgzMn0.GCQ0xl7wJKI_YB8d3PP1jBDcs-aRJLRLjk9-NdB1_bs";
const supabase = createClient(supabaseUrl, supabaseKey);

// Define the interface for Drawing
interface Drawing {
  id: number;
  paths: string;
  thumbnail: string | null | undefined;
  created_at: string;
  updated_at?: string;
}

// Define the interface for Path
interface PathData {
  path: SkPath;
  color: string;
  strokeWidth: number;
}

export default function Drawing() {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPaths, setCurrentPaths] = useState<PathData[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [color, setColor] = useState("#ffffff");
  const [strokeWidth, setStrokeWidth] = useState(5);
  const insets = useSafeAreaInsets();
  const canvasRef = useCanvasRef();
  const { width, height } = Dimensions.get("window");
  const canvasHeight = height * 0.65;

  const colorOptions = ["#ffffff", "#ff5252", "#4fc3f7", "#9ccc65", "#ffb74d", "#ba68c8"];

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
      setDrawings(data || []);
    } catch (error) {
      console.error("Error fetching drawings:", error);
      Alert.alert("Error", "Failed to load drawings");
    } finally {
      setLoading(false);
    }
  };

  const handleNewDrawing = () => {
    setCurrentPaths([]);
    setCurrentDrawing(null);
    setEditMode(false);
    setModalVisible(true);
  };

  const handleEditDrawing = (drawing: Drawing): void => {
    setCurrentDrawing(drawing);
    try {
      // Parse the paths and create valid Skia paths
      const parsedPaths = JSON.parse(drawing.paths).map((p: any) => {
        const skPath = Skia.Path.Make();
        
        if (p.path) {
          // Try to create from SVG string if possible
          const svgPath = Skia.Path.MakeFromSVGString(p.path);
          if (svgPath) {
            return {
              path: svgPath,
              color: p.color,
              strokeWidth: p.strokeWidth
            };
          }
        }
        
        // Return default path if SVG parsing fails
        return {
          path: skPath,
          color: p.color,
          strokeWidth: p.strokeWidth
        };
      });
      
      setCurrentPaths(parsedPaths);
      setEditMode(true);
      setModalVisible(true);
    } catch (error) {
      console.error("Error parsing paths:", error);
      Alert.alert("Error", "Failed to load drawing");
    }
  };

  const handleDeleteDrawing = async (id: number): Promise<void> => {
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
              
              setDrawings(drawings.filter((drawing) => drawing.id !== id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  const saveDrawing = async () => {
    try {
      if (currentPaths.length === 0) {
        Alert.alert("Error", "Cannot save an empty drawing");
        return;
      }

      setLoading(true);
      
      // Generate a thumbnail from the canvas
      const snapshot = canvasRef.current?.makeImageSnapshot();
      let base64 = null;
      
      if (snapshot) {
        const image = snapshot.encodeToBase64(ImageFormat.PNG, 100);
        if (image) {
          base64 = image;
        }
      }
      
      // Convert paths to a format that can be stored
      const pathsString = JSON.stringify(currentPaths.map(p => ({
        path: p.path.toSVGString(),
        color: p.color,
        strokeWidth: p.strokeWidth
      })));
      
      const timestamp = new Date().toISOString();
      
      if (editMode && currentDrawing) {
        const { error } = await supabase
          .from("drawings1")
          .update({
            paths: pathsString,
            thumbnail: base64,
            updated_at: timestamp
          })
          .eq("id", currentDrawing.id);

        if (error) throw error;
        
        setDrawings(drawings.map(drawing => 
          drawing.id === currentDrawing.id 
            ? { ...drawing, paths: pathsString, thumbnail: base64, updated_at: timestamp }
            : drawing
        ));
      } else {
        const { data, error } = await supabase
          .from("drawings1")
          .insert({
            paths: pathsString,
            thumbnail: base64,
            created_at: timestamp,
            updated_at: timestamp
          })
          .select();

        if (error) throw error;
        
        if (data && data.length > 0) {
          setDrawings([data[0], ...drawings]);
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
    } catch (error) {
      console.error("Error saving drawing:", error);
      Alert.alert("Error", "Failed to save drawing");
    } finally {
      setLoading(false);
    }
  };

  const onTouchStart = (event: GestureResponderEvent): void => {
    const { locationX: x, locationY: y } = event.nativeEvent;
    const newPath = Skia.Path.Make();
    newPath.moveTo(x, y);
    setCurrentPaths([...currentPaths, { path: newPath, color, strokeWidth }]);
  };

  const onTouchMove = (event: GestureResponderEvent): void => {
    const { locationX: x, locationY: y } = event.nativeEvent;
    
    if (currentPaths.length === 0) return;
    
    const lastIndex = currentPaths.length - 1;
    const newPaths = [...currentPaths];
    const currentPath = newPaths[lastIndex].path;
    currentPath.lineTo(x, y);
    setCurrentPaths(newPaths);
  };

  const clearCanvas = () => {
    setCurrentPaths([]);
  };

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
            onPress={() => handleDeleteDrawing(item.id)}
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

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Text style={styles.title}>My Drawings</Text>
      
      {loading && drawings.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Loading your artwork...</Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
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
                  Create your first masterpiece
                </Text>
              </View>
            }
          />
        </View>
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
              style={[styles.canvasContainer, { height: canvasHeight }]}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
            >
              <Canvas style={styles.canvas} ref={canvasRef}>
                {currentPaths.map((item, index) => (
                  <Path
                    key={index}
                    path={item.path}
                    color={item.color}
                    style="stroke"
                    strokeWidth={item.strokeWidth}
                  />
                ))}
              </Canvas>
            </View>

            <View style={styles.toolsContainer}>
              <View style={styles.colorPicker}>
                {colorOptions.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorOption,
                      { backgroundColor: c },
                      color === c && styles.selectedColor,
                    ]}
                    onPress={() => {
                      setColor(c);
                      Haptics.selectionAsync();
                    }}
                  />
                ))}
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
                      Haptics.selectionAsync();
                    }}
                  >
                    <View
                      style={[
                        styles.strokeSample,
                        { 
                          height: width, 
                          backgroundColor: color 
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
              >
                <Ionicons name="save-outline" size={20} color="#ffffff" />
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 16,
    marginTop: 8,
  },
  contentContainer: {
    flex: 1,
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
  canvas: {
    width: "100%",
    height: "100%",
  },
  toolsContainer: {
    padding: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    margin: 8,
  },
  colorPicker: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
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
    width: "60%",
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