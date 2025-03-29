import React, { useState } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, StatusBar } from "react-native";
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

export default function SelectActivities() {
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const { updateUser } = useAuth();
  const router = useRouter();

  const toggleActivity = (activity: string) => {
    if (selectedActivities.includes(activity)) {
      setSelectedActivities(selectedActivities.filter((item) => item !== activity));
    } else if (selectedActivities.length < 3) {
      setSelectedActivities([...selectedActivities, activity]);
    }
  };

  const handleContinue = async () => {
    if (selectedActivities.length === 3) {
      await updateUser({ activities: selectedActivities });
      router.replace("/settings");
    } else {
      alert("Please select exactly 3 activities.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.inner}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Choose Your Interests</Text>
          <Text style={styles.subtitle}>Select 3 activities you love</Text>
        </View>

        <View style={styles.activitiesContainer}>
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

        <TouchableOpacity 
          style={[
            styles.continueButton, 
            selectedActivities.length !== 3 && styles.disabledButton
          ]}
          onPress={handleContinue}
          disabled={selectedActivities.length !== 3}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  activitiesContainer: {
    flex: 1,
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
  continueButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});