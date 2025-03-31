import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, PanResponder, TouchableOpacity, Text, Dimensions, ScrollView, Animated, Alert } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

// Extend WebGLRenderingContext for Expo
declare global {
  interface WebGLRenderingContext {
    endFrameEXP(): void;
  }
}

// Define brush types
enum BrushType {
  PEN = 'pen',
  MARKER = 'marker',
  PENCIL = 'pencil',
  CRAYON = 'crayon',
  SPRAY = 'spray',
  CALLIGRAPHY = 'calligraphy',
  ERASER = 'eraser'
}

// Brush configurations
const BRUSHES = {
  [BrushType.PEN]: {
    icon: 'pen',
    label: 'Pen',
    lineJoin: 'round',
    lineCap: 'round'
  },
  [BrushType.MARKER]: {
    icon: 'marker',
    label: 'Marker',
    lineJoin: 'miter',
    lineCap: 'square'
  },
  [BrushType.PENCIL]: {
    icon: 'pencil',
    label: 'Pencil',
    lineJoin: 'round',
    lineCap: 'round',
    // Pencil has texture
  },
  [BrushType.CRAYON]: {
    icon: 'triangle-outline',
    label: 'Crayon',
    lineJoin: 'bevel',
    lineCap: 'round'
  },
  [BrushType.SPRAY]: {
    icon: 'spray',
    label: 'Spray',
    // Special rendering for spray brush
  },
  [BrushType.CALLIGRAPHY]: {
    icon: 'fountain-pen-tip',
    label: 'Calligraphy',
    lineJoin: 'bevel',
    lineCap: 'round'
  },
  [BrushType.ERASER]: {
    icon: 'eraser',
    label: 'Eraser',
    lineJoin: 'round',
    lineCap: 'round'
  }
};

// Available stroke sizes
const STROKE_SIZES = [2, 5, 10, 15, 25, 40];

// Available eraser sizes
const ERASER_SIZES = [10, 20, 40, 60, 100];

// Color palettes
const COLOR_PALETTES = [
  // Primary palette
  [
    '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'
  ],
  // Pastel palette
  [
    '#FFB6C1', '#FFC0CB', '#FFD700', '#98FB98', '#ADD8E6', 
    '#DDA0DD', '#FFDAB9', '#E6E6FA', '#F0FFF0', '#F5F5DC'
  ],
  // Earth tones
  [
    '#8B4513', '#A0522D', '#CD853F', '#D2B48C', '#F5DEB3', 
    '#DEB887', '#D2691E', '#B8860B', '#DAA520', '#F4A460'
  ],
  // Neon palette
  [
    '#FF00FF', '#00FFFF', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FE019A', '#7FFF00', '#FF4500', '#00FFFF'
  ]
];

// Custom line for storing stroke data
interface CustomLine extends THREE.Line {
  brushType: BrushType;
  color: string;
  width: number;
}

// Action type for history
interface DrawAction {
  type: 'add' | 'remove';
  line?: CustomLine;
  lines?: CustomLine[];
}

// Structure for storing Draw and Brush state
interface DrawState {
  activeBrush: BrushType;
  color: string;
  strokeWidth: number;
  eraserWidth: number;
  activePaletteIndex: number;
}

export default function EnhancedDrawingScreen() {
  // Screen dimensions
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  // State for canvas and UI
  const [canvasLayout, setCanvasLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [showBrushPanel, setShowBrushPanel] = useState(false);
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [showSizePanel, setShowSizePanel] = useState(false);
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  
  // Draw state
  const [drawState, setDrawState] = useState<DrawState>({
    activeBrush: BrushType.PEN,
    color: '#FFFFFF',
    strokeWidth: 5,
    eraserWidth: 20,
    activePaletteIndex: 0
  });

  // Animation values for UI
  const colorPanelAnim = useRef(new Animated.Value(0)).current;
  const brushPanelAnim = useRef(new Animated.Value(0)).current;
  const sizePanelAnim = useRef(new Animated.Value(0)).current;
  const saveOptionsAnim = useRef(new Animated.Value(0)).current;

  // References for WebGL and Three.js
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const linesRef = useRef<CustomLine[]>([]);
  const currentLineRef = useRef<CustomLine | null>(null);
  const pointsRef = useRef<THREE.Vector3[]>([]);
  const canvasRef = useRef<View>(null);

  // History for undo/redo
  const historyRef = useRef<DrawAction[]>([]);
  const redoHistoryRef = useRef<DrawAction[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Request permissions for saving images
  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Media Library permission not granted');
      }
    })();
  }, []);

  // Update undo/redo status
  useEffect(() => {
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(redoHistoryRef.current.length > 0);
  }, [linesRef.current.length]);

  // Initialize GL context
  const onGLContextCreate = async (gl: WebGLRenderingContext) => {
    glRef.current = gl;

    // Create renderer
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x1a1a1a); // Dark background
    rendererRef.current = renderer;

    // Create camera
    const camera = new THREE.OrthographicCamera(
      -screenWidth / 2,  // left
      screenWidth / 2,   // right
      screenHeight / 2,  // top
      -screenHeight / 2, // bottom
      0.1,
      1000
    );
    camera.position.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Initial render
    renderer.render(scene, camera);
    gl.endFrameEXP();
  };

  // Create particles for spray brush
  const createSprayParticles = (x: number, y: number, color: string, size: number) => {
    if (!sceneRef.current) return;

    const particleCount = size * 2;
    const radius = size;

    for (let i = 0; i < particleCount; i++) {
      // Random position within a circle
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      const particleX = x + Math.cos(angle) * distance;
      const particleY = y + Math.sin(angle) * distance;

      // Create dot geometry
      const geometry = new THREE.CircleGeometry(Math.random() * 1 + 0.5, 8);
      const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
      const particle = new THREE.Mesh(geometry, material);
      particle.position.set(particleX, particleY, 0);

      sceneRef.current.add(particle);
    }
  };

  // Create material based on brush type
  const createMaterial = (brushType: BrushType, color: string, width: number): THREE.Material => {
    const isEraser = brushType === BrushType.ERASER;
    const brushColor = isEraser ? '#1a1a1a' : color;
    const lineWidth = isEraser ? drawState.eraserWidth : width;

    const brushConfig = BRUSHES[brushType];
    
    // Create material based on brush type
    switch (brushType) {
      case BrushType.PENCIL:
        // Simulate pencil texture
        return new THREE.LineDashedMaterial({
          color: new THREE.Color(brushColor),
          linewidth: lineWidth,
          scale: 1,
          dashSize: 1,
          gapSize: 0.1
        });
      case BrushType.CRAYON:
        // Crayon has a special appearance
        return new THREE.LineBasicMaterial({
          color: new THREE.Color(brushColor),
          linewidth: lineWidth * 1.2,
          linecap: brushConfig.lineCap as THREE.LineCapStyle,
          linejoin: brushConfig.lineJoin as THREE.LineJoinStyle
        });
      case BrushType.CALLIGRAPHY:
        // Calligraphy pen - varies width based on angle
        return new THREE.LineBasicMaterial({
          color: new THREE.Color(brushColor),
          linewidth: lineWidth * 1.5,
          linecap: brushConfig.lineCap as THREE.LineCapStyle,
          linejoin: brushConfig.lineJoin as THREE.LineJoinStyle
        });
      default:
        // Default brush material
        return new THREE.LineBasicMaterial({
          color: new THREE.Color(brushColor),
          linewidth: lineWidth,
          linecap: (brushConfig.lineCap || 'round') as THREE.LineCapStyle,
          linejoin: (brushConfig.lineJoin || 'round') as THREE.LineJoinStyle
        });
    }
  };

  // Pan responder for touch interaction
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      if (!glRef.current || !sceneRef.current || !canvasLayout) return;

      // Close all panels when drawing starts
      closeAllPanels();

      const { locationX: x, locationY: y } = e.nativeEvent;

      // Convert touch coordinates to Three.js world coordinates
      const worldX = x - (canvasLayout.width / 2);
      const worldY = (canvasLayout.height / 2) - y; // Flip Y axis

      // Special case for spray brush
      if (drawState.activeBrush === BrushType.SPRAY) {
        createSprayParticles(worldX, worldY, drawState.color, drawState.strokeWidth);
        rendererRef.current?.render(sceneRef.current, cameraRef.current!);
        glRef.current.endFrameEXP();
        return;
      }

      // Create new points array for this line
      pointsRef.current = [new THREE.Vector3(worldX, worldY, 0)];

      // Create geometry
      const geometry = new THREE.BufferGeometry().setFromPoints(pointsRef.current);

      // Create material
      const material = createMaterial(
        drawState.activeBrush, 
        drawState.color,
        drawState.strokeWidth
      );

      // Create line
      const line = new THREE.Line(geometry, material) as CustomLine;
      line.brushType = drawState.activeBrush;
      line.color = drawState.color;
      line.width = drawState.activeBrush === BrushType.ERASER ? drawState.eraserWidth : drawState.strokeWidth;
      
      currentLineRef.current = line;
      sceneRef.current.add(line);

      // Provide haptic feedback when starting to draw
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onPanResponderMove: (e) => {
      if (!glRef.current || !sceneRef.current || !canvasLayout) return;

      const { locationX: x, locationY: y } = e.nativeEvent;

      // Convert touch coordinates to Three.js world coordinates
      const worldX = x - (canvasLayout.width / 2);
      const worldY = (canvasLayout.height / 2) - y; // Flip Y axis

      // Special case for spray brush
      if (drawState.activeBrush === BrushType.SPRAY) {
        createSprayParticles(worldX, worldY, drawState.color, drawState.strokeWidth);
        rendererRef.current?.render(sceneRef.current, cameraRef.current!);
        glRef.current.endFrameEXP();
        return;
      }

      if (!currentLineRef.current) return;

      // Add new point
      pointsRef.current.push(new THREE.Vector3(worldX, worldY, 0));

      // Update geometry
      currentLineRef.current.geometry.setFromPoints(pointsRef.current);
      currentLineRef.current.geometry.attributes.position.needsUpdate = true;

      // Render
      rendererRef.current?.render(sceneRef.current, cameraRef.current!);
      glRef.current.endFrameEXP();
    },
    onPanResponderRelease: () => {
      if (currentLineRef.current) {
        // Add line to the lines array
        linesRef.current.push(currentLineRef.current);
        
        // Add to history
        historyRef.current.push({
          type: 'add',
          line: currentLineRef.current
        });
        
        // Clear redo history after new drawing
        redoHistoryRef.current = [];
        
        currentLineRef.current = null;
        
        // Update undo/redo status
        setCanUndo(true);
        setCanRedo(false);
      }
    }
  });

  // Clear canvas
  const clearCanvas = () => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current || !glRef.current) return;

    // Add current lines to history before clearing
    if (linesRef.current.length > 0) {
      historyRef.current.push({
        type: 'remove',
        lines: [...linesRef.current]
      });
      
      // Remove all lines
      linesRef.current.forEach(line => {
        sceneRef.current?.remove(line);
      });
      linesRef.current = [];

      // Render empty scene
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      glRef.current.endFrameEXP();
      
      // Update undo/redo status
      setCanUndo(true);
      setCanRedo(false);
      
      // Provide haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // Undo last action
  const undo = () => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current || !glRef.current) return;
    if (historyRef.current.length === 0) return;

    const lastAction = historyRef.current.pop()!;
    
    // Add to redo history
    redoHistoryRef.current.push(lastAction);
    
    if (lastAction.type === 'add' && lastAction.line) {
      // Remove the last added line
      sceneRef.current.remove(lastAction.line);
      linesRef.current = linesRef.current.filter(line => line !== lastAction.line);
    } else if (lastAction.type === 'remove' && lastAction.lines) {
      // Add back removed lines
      lastAction.lines.forEach(line => {
        sceneRef.current?.add(line);
        linesRef.current.push(line);
      });
    }
    
    // Render scene
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    glRef.current.endFrameEXP();
    
    // Update undo/redo status
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(true);
    
    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Redo last undone action
  const redo = () => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current || !glRef.current) return;
    if (redoHistoryRef.current.length === 0) return;

    const lastRedoAction = redoHistoryRef.current.pop()!;
    
    // Add to history
    historyRef.current.push(lastRedoAction);
    
    if (lastRedoAction.type === 'add' && lastRedoAction.line) {
      // Add back the removed line
      sceneRef.current.add(lastRedoAction.line);
      linesRef.current.push(lastRedoAction.line);
    } else if (lastRedoAction.type === 'remove' && lastRedoAction.lines) {
      // Remove lines
      lastRedoAction.lines.forEach(line => {
        sceneRef.current?.remove(line);
        linesRef.current = linesRef.current.filter(l => l !== line);
      });
    }
    
    // Render scene
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    glRef.current.endFrameEXP();
    
    // Update undo/redo status
    setCanUndo(true);
    setCanRedo(redoHistoryRef.current.length > 0);
    
    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Save drawing to gallery
  const saveToGallery = async () => {
    try {
      if (canvasRef.current) {
        // Capture canvas as image
        const uri = await captureRef(canvasRef.current, {
          format: 'png',
          quality: 1
        });
        
        // Save to gallery
        const asset = await MediaLibrary.createAssetAsync(uri);
        await MediaLibrary.createAlbumAsync('DrawingApp', asset, false);
        
        Alert.alert('Success', 'Drawing saved to gallery!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Error', 'Failed to save drawing');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    
    setShowSaveOptions(false);
  };

  // Share drawing
  const shareDrawing = async () => {
    try {
      if (canvasRef.current) {
        // Capture canvas as image
        const uri = await captureRef(canvasRef.current, {
          format: 'png',
          quality: 1
        });
        
        // Share image
        await Sharing.shareAsync(uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share drawing');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    
    setShowSaveOptions(false);
  };

  // Close all panels
  const closeAllPanels = () => {
    setShowBrushPanel(false);
    setShowColorPanel(false);
    setShowSizePanel(false);
    setShowSaveOptions(false);
    
    // Animate panels out
    Animated.parallel([
      Animated.timing(brushPanelAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(colorPanelAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(sizePanelAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(saveOptionsAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
  };

  // Toggle brush panel
  const toggleBrushPanel = () => {
    const newShowBrushPanel = !showBrushPanel;
    setShowBrushPanel(newShowBrushPanel);
    setShowColorPanel(false);
    setShowSizePanel(false);
    setShowSaveOptions(false);
    
    // Animate panels
    Animated.parallel([
      Animated.timing(brushPanelAnim, {
        toValue: newShowBrushPanel ? 1 : 0,
        duration: 250,
        useNativeDriver: true
      }),
      Animated.timing(colorPanelAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(sizePanelAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(saveOptionsAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Toggle color panel
  const toggleColorPanel = () => {
    const newShowColorPanel = !showColorPanel;
    setShowColorPanel(newShowColorPanel);
    setShowBrushPanel(false);
    setShowSizePanel(false);
    setShowSaveOptions(false);
    
    // Animate panels
    Animated.parallel([
      Animated.timing(colorPanelAnim, {
        toValue: newShowColorPanel ? 1 : 0,
        duration: 250,
        useNativeDriver: true
      }),
      Animated.timing(brushPanelAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(sizePanelAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(saveOptionsAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Toggle size panel
  const toggleSizePanel = () => {
    const newShowSizePanel = !showSizePanel;
    setShowSizePanel(newShowSizePanel);
    setShowBrushPanel(false);
    setShowColorPanel(false);
    setShowSaveOptions(false);
    
    // Animate panels
    Animated.parallel([
      Animated.timing(sizePanelAnim, {
        toValue: newShowSizePanel ? 1 : 0,
        duration: 250,
        useNativeDriver: true
      }),
      Animated.timing(brushPanelAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(colorPanelAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(saveOptionsAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Toggle save options
  const toggleSaveOptions = () => {
    const newShowSaveOptions = !showSaveOptions;
    setShowSaveOptions(newShowSaveOptions);
    setShowBrushPanel(false);
    setShowColorPanel(false);
    setShowSizePanel(false);
    
    // Animate panels
    Animated.parallel([
      Animated.timing(saveOptionsAnim, {
        toValue: newShowSaveOptions ? 1 : 0,
        duration: 250,
        useNativeDriver: true
      }),
      Animated.timing(brushPanelAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(colorPanelAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(sizePanelAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Select brush
  const selectBrush = (brush: BrushType) => {
    setDrawState(prev => ({
      ...prev,
      activeBrush: brush
    }));
    
    setShowBrushPanel(false);
    
    // Animate brush panel out
    Animated.timing(brushPanelAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start();
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Select color
  const selectColor = (color: string) => {
    setDrawState(prev => ({
      ...prev,
      color: color
    }));
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Select stroke size
  const selectStrokeSize = (size: number) => {
    setDrawState(prev => ({
      ...prev,
      strokeWidth: size
    }));
    
    setShowSizePanel(false);
    
    // Animate size panel out
    Animated.timing(sizePanelAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start();
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Select eraser size
  const selectEraserSize = (size: number) => {
    setDrawState(prev => ({
      ...prev,
      eraserWidth: size
    }));
    
    setShowSizePanel(false);
    
    // Animate size panel out
    Animated.timing(sizePanelAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start();
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Switch palette
  const switchPalette = () => {
    setDrawState(prev => ({
      ...prev,
      activePaletteIndex: (prev.activePaletteIndex + 1) % COLOR_PALETTES.length
    }));
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Canvas */}
      <View ref={canvasRef} style={styles.canvas}>
        <GLView
          style={styles.glView}
          onContextCreate={onGLContextCreate}
          onLayout={(event) => {
            const { x, y, width, height } = event.nativeEvent.layout;
            setCanvasLayout({ x, y, width, height });
          }}
          {...panResponder.panHandlers}
        />
      </View>
      
      {/* Top toolbar */}
      <View style={styles.topToolbar}>
        <TouchableOpacity 
          style={styles.topToolbarButton} 
          onPress={undo}
          disabled={!canUndo}
        >
          <Feather 
            name="corner-up-left" 
            size={24} 
            color={canUndo ? "#fff" : "#888"} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.topToolbarButton} 
          onPress={redo}
          disabled={!canRedo}
        >
          <Feather 
            name="corner-up-right" 
            size={24} 
            color={canRedo ? "#fff" : "#888"} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.topToolbarButton} 
          onPress={toggleSaveOptions}
        >
          <Feather name="save" size={24} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.clearButton} 
          onPress={clearCanvas}
        >
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>
      {/* Bottom toolbar */}
      <View style={styles.bottomToolbar}>
        <TouchableOpacity
          style={[
            styles.toolbarButton, 
            drawState.activeBrush !== BrushType.ERASER && styles.activeToolbarButton
          ]}
          onPress={toggleBrushPanel}
        >
          <MaterialCommunityIcons 
            name={(drawState.activeBrush !== BrushType.ERASER) 
              ? BRUSHES[drawState.activeBrush].icon as any 
              : 'brush'} 
            size={28} 
            color="#fff" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.toolbarButton,
            { backgroundColor: drawState.color }
          ]}
          onPress={toggleColorPanel}
        >
          <View style={styles.colorButtonInner} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={toggleSizePanel}
        >
          <Feather name="edit-2" size={24} color="#fff" />
          <View 
            style={[
              styles.sizeIndicator, 
              { 
                width: drawState.activeBrush === BrushType.ERASER 
                  ? Math.min(drawState.eraserWidth, 24) 
                  : Math.min(drawState.strokeWidth, 24) 
              }
            ]} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.toolbarButton,
            drawState.activeBrush === BrushType.ERASER && styles.activeToolbarButton
          ]}
          onPress={() => selectBrush(BrushType.ERASER)}
        >
          <MaterialCommunityIcons name="eraser" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Brush Panel */}
      <Animated.View 
        style={[
          styles.panel, 
          styles.brushPanel,
          {
            transform: [
              { translateY: brushPanelAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [200, 0]
                })
              }
            ],
            opacity: brushPanelAnim
          }
        ]}
      >
        <Text style={styles.panelTitle}>Brush Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {Object.entries(BRUSHES)
            .filter(([brushKey]) => brushKey !== BrushType.ERASER)
            .map(([brushKey, brush]) => (
              <TouchableOpacity
                key={brushKey}
                style={[
                  styles.brushOption,
                  drawState.activeBrush === brushKey && styles.activeBrushOption
                ]}
                onPress={() => selectBrush(brushKey as BrushType)}
              >
                <MaterialCommunityIcons name={brush.icon as any} size={24} color="#fff" />
                <Text style={styles.brushOptionText}>{brush.label}</Text>
              </TouchableOpacity>
            ))
          }
        </ScrollView>
      </Animated.View>
      
      {/* Color Panel */}
      <Animated.View 
        style={[
          styles.panel, 
          styles.colorPanel,
          {
            transform: [
              { translateY: colorPanelAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [200, 0]
                })
              }
            ],
            opacity: colorPanelAnim
          }
        ]}
      >
        <View style={styles.colorPanelHeader}>
          <Text style={styles.panelTitle}>Colors</Text>
          <TouchableOpacity style={styles.switchPaletteButton} onPress={switchPalette}>
            <Feather name="refresh-cw" size={18} color="#fff" />
            <Text style={styles.switchPaletteText}>Switch Palette</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.colorGrid}>
          {COLOR_PALETTES[drawState.activePaletteIndex].map(color => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                drawState.color === color && styles.activeColorOption
              ]}
              onPress={() => selectColor(color)}
            />
          ))}
        </View>
      </Animated.View>
      
      {/* Size Panel */}
      <Animated.View 
        style={[
          styles.panel, 
          styles.sizePanel,
          {
            transform: [
              { translateY: sizePanelAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [200, 0]
                })
              }
            ],
            opacity: sizePanelAnim
          }
        ]}
      >
        <Text style={styles.panelTitle}>
          {drawState.activeBrush === BrushType.ERASER ? 'Eraser Size' : 'Stroke Size'}
        </Text>
        <View style={styles.sizeOptions}>
          {(drawState.activeBrush === BrushType.ERASER ? ERASER_SIZES : STROKE_SIZES).map(size => (
            <TouchableOpacity
              key={size}
              style={[
                styles.sizeOption,
                drawState.activeBrush === BrushType.ERASER
                  ? drawState.eraserWidth === size && styles.activeSizeOption
                  : drawState.strokeWidth === size && styles.activeSizeOption
              ]}
              onPress={() => 
                drawState.activeBrush === BrushType.ERASER 
                  ? selectEraserSize(size) 
                  : selectStrokeSize(size)
              }
            >
              <View 
                style={[
                  styles.sizeCircle, 
                  { width: size, height: size }
                ]} 
              />
              <Text style={styles.sizeValue}>{size}px</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
      
      {/* Save Options Panel */}
      <Animated.View 
        style={[
          styles.panel, 
          styles.savePanel,
          {
            transform: [
              { translateY: saveOptionsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [200, 0]
                })
              }
            ],
            opacity: saveOptionsAnim
          }
        ]}
      >
        <Text style={styles.panelTitle}>Save Options</Text>
        <View style={styles.saveOptions}>
          <TouchableOpacity style={styles.saveOption} onPress={saveToGallery}>
            <MaterialCommunityIcons name="content-save-all" size={32} color="#fff" />
            <Text style={styles.saveOptionText}>Save to Gallery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.saveOption} onPress={shareDrawing}>
            <Feather name="share-2" size={32} color="#fff" />
            <Text style={styles.saveOptionText}>Share Drawing</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a', // Dark background
    position: 'relative'
  },
  canvas: {
    flex: 1,
    backgroundColor: '#1a1a1a' // Dark background
  },
  glView: {
    flex: 1
  },
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10
  },
  topToolbarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(50,50,50,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5
  },
  clearButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e53935', // Red
    alignItems: 'center',
    justifyContent: 'center'
  },
  clearButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  bottomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10
  },
  toolbarButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(50,50,50,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5
  },
  activeToolbarButton: {
    borderWidth: 2,
    borderColor: '#4fc3f7' // Highlight color
  },
  colorButtonInner: {
    width: '80%',
    height: '80%',
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#fff'
  },
  sizeIndicator: {
    height: 4,
    backgroundColor: '#fff',
    borderRadius: 2,
    position: 'absolute',
    bottom: 10
  },
  panel: {
    position: 'absolute',
    bottom: 90,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(32,32,32,0.9)',
    borderRadius: 15,
    padding: 15,
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 10
  },
  brushPanel: {
    height: 130
  },
  colorPanel: {
    height: 160
  },
  sizePanel: {
    height: 130
  },
  savePanel: {
    height: 130
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10
  },
  brushOption: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(50,50,50,0.8)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  activeBrushOption: {
    backgroundColor: '#4fc3f7', // Highlight color
  },
  brushOptionText: {
    color: '#fff',
    marginTop: 5,
    fontSize: 12
  },
  colorPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  switchPaletteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(70,70,70,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15
  },
  switchPaletteText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 12
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  colorOption: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  activeColorOption: {
    borderWidth: 3,
    borderColor: '#fff'
  },
  sizeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  sizeOption: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5
  },
  activeSizeOption: {
    backgroundColor: 'rgba(79,195,247,0.3)', // Light blue background
    borderRadius: 10
  },
  sizeCircle: {
    backgroundColor: '#fff',
    borderRadius: 100
  },
  sizeValue: {
    color: '#fff',
    marginTop: 5,
    fontSize: 12
  },
  saveOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  saveOption: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(60,60,60,0.8)',
    padding: 15,
    borderRadius: 10,
    width: '45%'
  },
  saveOptionText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14
  }
});