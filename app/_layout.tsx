import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Stack>
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
  );
}