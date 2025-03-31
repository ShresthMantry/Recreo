import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { SafeAreaView, StyleSheet } from "react-native";

export default function RootLayout() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthProvider>
        <ThemeProvider>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Define the (auth) group for login/register/select-activities */}
            <Stack.Screen name="(auth)/index" options={{ headerShown: false }} redirect={true} />
            <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)/select-activities" options={{ headerShown: false }} />

            {/* Define the (tabs) group for the main app */}
            <Stack.Screen name="(tabs)/index" options={{ headerShown: false }} />

            {/* Fallback for not-found routes */}
            <Stack.Screen name="+not-found" options={{ title: "Not Found" }} />
          </Stack>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff", // Adjust the background color as needed
  },
});