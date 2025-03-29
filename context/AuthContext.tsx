import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  "https://ysavghvmswenmddlnshr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzYXZnaHZtc3dlbm1kZGxuc2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5OTY4MzIsImV4cCI6MjA1ODU3MjgzMn0.GCQ0xl7wJKI_YB8d3PP1jBDcs-aRJLRLjk9-NdB1_bs"
);

interface User {
  name: string;
  email: string;
  password?: string;
  role: "user" | "admin";
  activities?: string[];
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userData = {
          name: session.user.user_metadata?.name || "",
          email: session.user.email || "",
          role: (session.user.user_metadata?.role === "admin" || session.user.user_metadata?.role === "user") 
            ? session.user.user_metadata.role 
            : "user",
          activities: session.user.user_metadata?.activities || []
        };
        setUser(userData);
      }
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const userData = {
          name: session.user.user_metadata?.name || "",
          email: session.user.email || "",
          role: session.user.user_metadata?.role || "user",
          activities: session.user.user_metadata?.activities || []
        };
        setUser(userData);
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);
    if (data.user) {
      const userData: User = {
        name: data.user.user_metadata?.name || "",
        role: (data.user.user_metadata?.role === "admin" || data.user.user_metadata?.role === "user") 
          ? data.user.user_metadata.role as "admin" | "user"
          : "user",
        email: data.user.email || "",
        activities: data.user.user_metadata?.activities || []
      };
      setUser(userData);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const role = email.endsWith("@admin.com") ? "admin" : "user";
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    });

    if (error) throw new Error(error.message);
    if (data.user) {
      const userData: User = {
        name,
        email,
        role: role as "user" | "admin",
        activities: []
      };
      setUser(userData);
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    setUser(null);
  };

  const updateUser = async (updatedUser: Partial<User>) => {
    // Check if there's an active session first
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !user) {
      throw new Error("No active session. Please log in first.");
    }

    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...user,
        ...updatedUser,
      },
    });

    if (error) throw new Error(error.message);
    if (data.user) {
      const updatedUserData: User = {
        name: data.user.user_metadata?.name || user.name,
        email: data.user.email || user.email,
        role: (data.user.user_metadata?.role === "admin" || data.user.user_metadata?.role === "user")
          ? data.user.user_metadata.role as "admin" | "user"
          : user.role,
        activities: data.user.user_metadata?.activities || user.activities || []
      };
      setUser(updatedUserData);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};