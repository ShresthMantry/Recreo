import React, { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";

export default function TabsLayout() {
  const { user } = useAuth();
  const [activityTabs, setActivityTabs] = useState<string[]>([]);

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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#1e1e1e",
          borderTopColor: "#2c2c2c",
        },
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#9ca3af",
      }}
    >
      {/* Core tabs that always appear */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />

      {/* Dynamically show selected activities */}
      {activityTabs.map((activity) => {
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
              tabBarIcon: ({ color, size }) => {
                let iconName;
                switch (activity) {
                  case "music":
                    iconName = "musical-notes";
                    break;
                  case "drawing":
                    iconName = "brush";
                    break;
                  case "books":
                    iconName = "book";
                    break;
                  case "journal":
                    iconName = "journal";
                    break;
                  case "community-sharing":
                    iconName = "share-social";
                    break;
                  case "games":
                    iconName = "game-controller";
                    break;
                  default:
                    iconName = "help";
                }
                return <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} color={color} size={size} />;
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" color={color} size={size} />
          ),
        }}
      />

      {/* Admin tab (conditional) */}
      {isAdmin && (
        <Tabs.Screen
          name="admin"
          options={{
            title: "Admin",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="shield" color={color} size={size} />
            ),
          }}
        />
      )}
    </Tabs>
  );
}