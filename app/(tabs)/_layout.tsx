// app/(tabs)/_layout.tsx
import React, { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";

export default function TabsLayout() {
  const { user } = useAuth();

  // State to manage tab screens dynamically
  const [activityTabs, setActivityTabs] = useState<string[]>([]);

  // Redirect to login if not authenticated
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  const isAdmin = user.role === "admin";
  const activities = user.activities || [];

  // Update activity tabs when user.activities changes
  useEffect(() => {
    setActivityTabs(activities);
    console.log(activities);
  }, [activities]);

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
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />

      {activityTabs.map((activity, index) => {
        // Map activity to a corresponding route name
        const routeName = activity.toLowerCase().replace(" ", "-");

        // Ensure the route exists in your file structure
        const validRoutes = ["music", "drawing", "books", "journal", "community-sharing", "games"];
        if (!validRoutes.includes(routeName)) {
          return null; // Skip if the route doesn't exist
        }

        return (
          <Tabs.Screen
            key={`${activity}-${index}`} // Unique key to force re-render
            name={routeName}
            options={{
              title: activity,
              tabBarIcon: ({ color, size }) => (
                <Ionicons
                  name={
                    activity === "Music"
                      ? "musical-notes"
                      : activity === "Drawing"
                      ? "brush"
                      : activity === "Books"
                      ? "book"
                      : activity === "Journal"
                      ? "journal"
                      : activity === "Community Sharing"
                      ? "share-social"
                      : "game-controller"
                  }
                  color={color}
                  size={size}
                />
              ),
            }}
          />
        );
      })}

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