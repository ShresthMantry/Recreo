// app/(tabs)/drawing.tsx
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
  Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createClient } from "@supabase/supabase-js";
import { Canvas, Path, useCanvasRef } from "@shopify/react-native-skia";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Replace with your Supabase credentials
const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseKey = "YOUR_SUPABASE_KEY";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Drawing() {
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPaths, setCurrentPaths] = useState([]);
  const [currentDrawing, setCurrentDrawing] = useState(null);
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
        .from("drawings")
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

  const handleEditDrawing = (drawing) => {
    setCurrentDrawing(drawing);
    setCurrentPaths(JSON.parse(drawing.paths));
    setEditMode(true);
    setModalVisible(true);
  };

  const handleDeleteDrawing = async (id) => {
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
                .from("drawings")
                .delete()
                .eq("id", id);

              if (error) throw error;
              
              // Update local state
              setDrawings(drawings.filter(drawing => drawing.id !== id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error("Error deleting drawing:", error);
              Alert.alert("Error", "Failed to delete drawing");
            } finally {
              setLoading(false);
            }
          }
        }
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
      
      // Take a snapshot of the canvas
      const snapshot = await canvasRef.current?.makeImageSnapshot();
      const base64 = snapshot ? await snapshot.encodeToBase64() : null;
      
      const pathsString = JSON.stringify(currentPaths);
      const timestamp = new Date().toISOString();
      
      if (editMode && currentDrawing) {
        // Update existing drawing
        const { error } = await supabase
          .from("drawings")
          .update({
            paths: pathsString,
            thumbnail: base64,
            updated_at: timestamp
          })
          .eq("id", currentDrawing.id);

        if (error) throw error;
        
        // Update local state
        setDrawings(drawings.map(drawing => 
          drawing.id === currentDrawing.id 
            ? { ...drawing, paths: pathsString, thumbnail: base64, updated_at: timestamp }
            : drawing
        ));
      } else {
        // Create new drawing
        const { data, error } = await supabase
          .from("drawings")
          .insert({
            paths: pathsString,
            thumbnail: base64,
            created_at: timestamp,
            updated_at: timestamp
          })
          .select();

        if (error) throw error;
        
        // Update local state
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

  const onTouchStart = (event) => {
    const { x, y } = event.nativeEvent;
    const newPath = {
      path: `M ${x} ${y}`,
      color,
      strokeWidth
    };
    setCurrentPaths([...currentPaths, newPath]);
  };

  const onTouchMove = (event) => {
    const { x, y } = event.nativeEvent;
    
    if (currentPaths.length === 0) return;
    
    const lastIndex = currentPaths.length - 1;
    const lastPath = currentPaths[lastIndex];
    const newPath = {
      ...lastPath,
      path: `${lastPath.path} L ${x} ${y}`
    };
    
    const updatedPaths = [...currentPaths];
    updatedPaths[lastIndex] = newPath;
    setCurrentPaths(updatedPaths);
  };

  const clearCanvas = () => {
    setCurrentPaths([]);
  };

  const renderDrawingItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.drawingItem}
      onPress={() => handleEditDrawing(item)}
      activeOpacity={0.7}
    >
      {item.thumbnail ? (
        <View style={styles.thumbnailContainer}>
          <View style={styles.thumbnail}>
            {item.thumbnail && (
              <img 
                src={`data:image/png;base64,${item.thumbnail}`} 
                style={{ width: '100%', height: '100%', borderRadius: 8 }}
                alt="Drawing thumbnail"
              />
            )}
          </View>
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
                {currentPaths.map((path, index) => (
                  <Path
                    key={index}
                    path={path.path}
                    color={path.color}
                    style="stroke"
                    strokeWidth={path.strokeWidth}
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
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
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
  subtitle: {
    fontSize: 16,
    color: "#9ca3af",
  },
});