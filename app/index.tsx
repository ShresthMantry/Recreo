import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext"; // Assuming you have an AuthContext

export default function Index() {
  const { user } = useAuth(); // Replace with your actual authentication logic
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true); // Ensure the component is mounted before navigating
  }, []);

  useEffect(() => {
    if (isMounted && !user) {
      router.replace("/(auth)/login"); // Redirect to login if not logged in
    }
  }, [isMounted, user, router]);

  if (!isMounted || !user) {
    return null; // Render nothing while redirecting or before mounting
  }

  return (
    <>"hello"</> // Render your default content here if needed
  );
}