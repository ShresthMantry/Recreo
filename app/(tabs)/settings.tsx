import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, StatusBar } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "expo-router";

const activitiesList = [
  "Music",
  "Drawing",
  "Books",
  "Journal",
  "Community Sharing",
  "Games",
];

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [selectedActivities, setSelectedActivities] = useState<string[]>(user?.activities || []);
  const router = useRouter();

  const toggleActivity = (activity: string) => {
    if (selectedActivities.includes(activity)) {
      setSelectedActivities(selectedActivities.filter((item) => item !== activity));
    } else if (selectedActivities.length < 3) {
      setSelectedActivities([...selectedActivities, activity]);
    }
  };

  const handleSave = async () => {
    await updateUser({ name, activities: selectedActivities });
    alert("Settings updated!");
    router.replace("/settings");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.inner}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.emailText}>{user?.email}</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#6b7280"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.activitiesSection}>
          <Text style={styles.subtitle}>Preferred Activities</Text>
          <FlatList
            data={activitiesList}
            keyExtractor={(item) => item}
            numColumns={2}
            columnWrapperStyle={styles.row}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.activityItem,
                  selectedActivities.includes(item) && styles.selectedActivity
                ]}
                onPress={() => toggleActivity(item)}
              >
                <Text style={styles.activityText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  headerContainer: {
    marginBottom: 36,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  emailText: {
    color: '#9ca3af',
    fontSize: 16,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  activitiesSection: {
    flex: 1,
  },
  subtitle: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  activityItem: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '48%',
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  selectedActivity: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  activityText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});