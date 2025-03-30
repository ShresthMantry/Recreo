import React, { useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, TouchableOpacity, Text, Dimensions } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

// Extend WebGLRenderingContext for Expo
declare global {
  interface WebGLRenderingContext {
    endFrameEXP(): void;
  }
}

const COLORS = [
  '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', 
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#A52A2A'
];

const ERASER_SIZES = [
  { size: 5, label: 'Small' },
  { size: 10, label: 'Medium' },
  { size: 20, label: 'Large' }
];

export default function DrawingScreen() {
  const [color, setColor] = useState('#ffffff');
  const [isEraser, setIsEraser] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [eraserWidth, setEraserWidth] = useState(10);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showEraserSizes, setShowEraserSizes] = useState(false);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const [canvasLayout, setCanvasLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const glRef = useRef<WebGLRenderingContext | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const linesRef = useRef<THREE.Line[]>([]);
  const currentLineRef = useRef<THREE.Line | null>(null);
  const pointsRef = useRef<THREE.Vector3[]>([]);

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

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      if (!glRef.current || !sceneRef.current || !canvasLayout) return;

      const { locationX: x, locationY: y } = e.nativeEvent;

      // Convert touch coordinates to Three.js world coordinates
      const worldX = x - (canvasLayout.width / 2);
      const worldY = (canvasLayout.height / 2) - y; // Flip Y axis

      // Create new points array for this line
      pointsRef.current = [new THREE.Vector3(worldX, worldY, 0)];

      // Create geometry
      const geometry = new THREE.BufferGeometry().setFromPoints(pointsRef.current);

      // Create material
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(isEraser ? '#1a1a1a' : color),
        linewidth: isEraser ? eraserWidth : strokeWidth,
        linecap: 'round',
        linejoin: 'round'
      });

      // Create line
      currentLineRef.current = new THREE.Line(geometry, material);
      sceneRef.current.add(currentLineRef.current);
    },
    onPanResponderMove: (e) => {
      if (!glRef.current || !sceneRef.current || !currentLineRef.current || !canvasLayout) return;

      const { locationX: x, locationY: y } = e.nativeEvent;

      // Convert touch coordinates to Three.js world coordinates
      const worldX = x - (canvasLayout.width / 2);
      const worldY = (canvasLayout.height / 2) - y; // Flip Y axis

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
        linesRef.current.push(currentLineRef.current);
        currentLineRef.current = null;
      }
    }
  });

  const clearCanvas = () => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current || !glRef.current) return;

    // Remove all lines
    linesRef.current.forEach(line => {
      sceneRef.current?.remove(line);
    });
    linesRef.current = [];

    // Render empty scene
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    glRef.current.endFrameEXP();
  };

  const toggleColorPalette = () => {
    setShowColorPalette(!showColorPalette);
    setShowEraserSizes(false);
    setIsEraser(false);
  };

  const toggleEraserSizes = () => {
    setShowEraserSizes(!showEraserSizes);
    setShowColorPalette(false);
    setIsEraser(true);
  };

  return (
    <View style={styles.container}>
      <GLView
        style={styles.canvas}
        onContextCreate={onGLContextCreate}
        onLayout={(event) => {
          const { x, y, width, height } = event.nativeEvent.layout;
          setCanvasLayout({ x, y, width, height });
        }}
        {...panResponder.panHandlers}
      />

      {/* Color Palette */}
      {showColorPalette && (
        <View style={styles.paletteContainer}>
          {COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorButton, { backgroundColor: c }]}
              onPress={() => {
                setColor(c);
                setShowColorPalette(false);
              }}
            />
          ))}
        </View>
      )}

      {/* Eraser Sizes */}
      {showEraserSizes && (
        <View style={styles.eraserContainer}>
          {ERASER_SIZES.map((eraser) => (
            <TouchableOpacity
              key={eraser.size}
              style={[
                styles.eraserButton,
                { width: eraser.size * 2, height: eraser.size * 2 },
                eraserWidth === eraser.size && styles.selectedEraser
              ]}
              onPress={() => {
                setEraserWidth(eraser.size);
                setShowEraserSizes(false);
              }}
            >
              <Text style={styles.eraserText}>{eraser.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, !isEraser && styles.activeControl]}
          onPress={toggleColorPalette}
        >
          <Text style={styles.buttonText}>Color</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isEraser && styles.activeControl]}
          onPress={toggleEraserSizes}
        >
          <Text style={styles.buttonText}>Eraser</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            setStrokeWidth(prev => (prev === 5 ? 10 : 5));
            setShowColorPalette(false);
            setShowEraserSizes(false);
            setIsEraser(false);
          }}
        >
          <Text style={styles.buttonText}>Size: {strokeWidth}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.clearButton]}
          onPress={clearCanvas}
        >
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  canvas: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  controlButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  activeControl: {
    backgroundColor: '#555',
    borderWidth: 1,
    borderColor: '#fff',
  },
  clearButton: {
    backgroundColor: '#ff4444',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  paletteContainer: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 5,
    borderWidth: 2,
    borderColor: '#333',
  },
  eraserContainer: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  eraserButton: {
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedEraser: {
    borderColor: '#ff4444',
    borderWidth: 2,
  },
  eraserText: {
    fontSize: 10,
    color: '#000',
  },
});