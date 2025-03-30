import React, { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { StyleSheet, Animated, View, Dimensions, Pressable, ViewProps } from "react-native";
import type { PressableProps } from "react-native";

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#121212",
    borderTopColor: "transparent", // Remove the white line
    height: 65,
    paddingBottom: 5,
    elevation: 8,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    opacity: 0.9,
    color: "#ffffff",
  },
  tabIcon: {
    marginBottom: -2,
  },
  tabItem: {
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  indicator: {
    position: "absolute",
    height: 4,
    width: 40,
    borderRadius: 2,
    backgroundColor: "#8B5CF6",
    bottom: 5, // Adjusted for better placement
    transform: [{ translateX: -20 }],
  },
  activeTabBackground: {
    position: "absolute",
    height: 32,
    borderRadius: 12,
    backgroundColor: "rgba(139, 92, 246, 0.25)", // Softer shade
    top: 5,
    alignSelf: "center", // Ensure it's centered properly
  },
  glow: {
    position: "absolute",
    width: 40, // Reduced to fit better
    height: 20, // Adjusted for a subtle effect
    backgroundColor: "rgba(139, 92, 246, 0.3)",
    borderRadius: 25,
    top: -10, // Lowered to fit well
    opacity: 0.7,
  }
});

interface TabBarButtonProps extends PressableProps {
  children: React.ReactNode;
}

export default function TabsLayout() {
  const { user } = useAuth();
  const [activityTabs, setActivityTabs] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const translateX = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(1))[0];

  // Redirect to login if not authenticated
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  const isAdmin = user.role === "admin";
  const activities = user.activities || [];

  // Update activity tabs and remove duplicates
  useEffect(() => {
    // Normalize activity names and remove duplicates
    const normalizedActivities = activities.map(activity => 
      activity.toLowerCase().replace(" ", "-")
    );
    const uniqueActivities = [...new Set(normalizedActivities)];
    setActivityTabs(uniqueActivities);
  }, [activities]);

  // All possible activity routes that exist in the app
  const allPossibleActivities = [
    "music",
    "drawing",
    "books",
    "journal",
    "community-sharing",
    "games"
  ];

  // Animation for tab change
  const animateTab = (index: number) => {
    // Calculate tab width based on total visible tabs
    const tabWidth = width / (2 + activityTabs.filter(a => allPossibleActivities.includes(a)).length + (isAdmin ? 1 : 0));
    const offsetX = index * tabWidth + (tabWidth / 2 - 20);

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: offsetX,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    setActiveIndex(index);
  };

  return (
    <Tabs
      screenOptions={({ route }) => {
        // Find the index of the current tab
        const tabRoutes = ["index", ...activityTabs.filter(a => allPossibleActivities.includes(a)), "more", "settings", ...(isAdmin ? ["admin"] : [])];
        const indexOfRoute = tabRoutes.indexOf(route.name);
        
        return {
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: "#8B5CF6",
          tabBarInactiveTintColor: "#9ca3af",
          tabBarLabelStyle: styles.tabLabel,
          tabBarIconStyle: styles.tabIcon,
          tabBarItemStyle: styles.tabItem,
          tabBarButton: (props: TabBarButtonProps) => {
            const { onPress, children, ...otherProps } = props;
            return (
              <View style={{ position: 'relative', flex: 1 }}>
                {activeIndex === indexOfRoute && (
                  <Animated.View
                    style={[
                      styles.activeTabBackground,
                      {
                        transform: [{ scale: scaleAnim }],
                      },
                    ]}
                  />
                )}
                <Pressable 
                  {...otherProps}
                  onPress={(e) => {
                    onPress?.(e);
                    animateTab(indexOfRoute);
                  }}
                  style={({ pressed }) => [
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  {children}
                </Pressable>
              </View>
            );
          },
        };
      }}
    >
      {/* Animated indicator */}
      <Animated.View 
        style={[
          styles.indicator, 
          { transform: [{ translateX }] }
        ]} 
      />
      <Animated.View 
        style={[
          styles.glow, 
          { transform: [{ translateX }] }
        ]} 
      />

      {/* Core tabs that always appear */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              color={color} 
              size={size} 
            />
          ),
        }}
      />

      {/* Dynamically show selected activities */}
      {activityTabs.map((activity, idx) => {
        // Skip if activity isn't in our valid routes
        if (!allPossibleActivities.includes(activity)) {
          return null;
        }

        return (
          <Tabs.Screen
            key={activity}
            name={activity}
            options={{
              title: activity.charAt(0).toUpperCase() + activity.slice(1).replace("-", " "),
              tabBarIcon: ({ color, size, focused }) => {
                let iconName: keyof typeof Ionicons.glyphMap;
                let outlineName: keyof typeof Ionicons.glyphMap;
                switch (activity) {
                  case "music":
                    iconName = "musical-notes";
                    outlineName = "musical-notes-outline";
                    break;
                  case "drawing":
                    iconName = "brush";
                    outlineName = "brush-outline";
                    break;
                  case "books":
                    iconName = "book";
                    outlineName = "book-outline";
                    break;
                  case "journal":
                    iconName = "journal";
                    outlineName = "journal-outline";
                    break;
                  case "community-sharing":
                    iconName = "share-social";
                    outlineName = "share-social-outline";
                    break;
                  case "games":
                    iconName = "game-controller";
                    outlineName = "game-controller-outline";
                    break;
                  default:
                    iconName = "help";
                    outlineName = "help-outline";
                }
                return (
                  <Ionicons 
                    name={focused ? iconName : outlineName} 
                    color={color} 
                    size={size} 
                  />
                );
              },
            }}
          />
        );
      })}

      {/* Hide unselected activities */}
      {allPossibleActivities
        .filter(activity => !activityTabs.includes(activity))
        .map(activity => (
          <Tabs.Screen
            key={`hidden-${activity}`}
            name={activity}
            options={{ href: null }} // Hide from tab bar
          />
        ))}

      {/* More and Settings tabs */}
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "ellipsis-horizontal" : "ellipsis-horizontal-outline"} 
              color={color} 
              size={size} 
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "settings" : "settings-outline"} 
              color={color} 
              size={size} 
            />
          ),
        }}
      />

      {/* Admin tab (conditional) */}
      {isAdmin && (
        <Tabs.Screen
          name="admin"
          options={{
            title: "Admin",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons 
                name={focused ? "shield" : "shield-outline"} 
                color={color} 
                size={size} 
              />
            ),
          }}
        />
      )}
    </Tabs>
  );
}