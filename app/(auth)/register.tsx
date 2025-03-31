import React, { useState, useRef, useEffect } from "react";
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar,
  Animated,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from "expo-secure-store";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const { register } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Password strength indicators
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState("");
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);
  
  // Check password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      setPasswordFeedback("");
      return;
    }
    
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 1;
    
    // Uppercase check
    if (/[A-Z]/.test(password)) strength += 1;
    
    // Lowercase check
    if (/[a-z]/.test(password)) strength += 1;
    
    // Number check
    if (/[0-9]/.test(password)) strength += 1;
    
    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
    
    // Set feedback based on strength
    if (strength === 0) setPasswordFeedback("Insecure");
    else if (strength <= 2) setPasswordFeedback("Weak");
    else if (strength <= 3) setPasswordFeedback("Good");
    else if (strength <= 4) setPasswordFeedback("Strong");
    else setPasswordFeedback("Very Strong");
    
  }, [password]);

  const handleRegister = async () => {
    // Validate inputs
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    
    if (!password) {
      setError("Please enter your password");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    try {
      setError("");
      await register(name, email, password);

      // Store session token (after successful registration)
      const session = await SecureStore.getItemAsync("session"); 
      if (session) {
        await SecureStore.setItemAsync("session", session); 
      }

      router.push("/(auth)/select-activities");
    } catch (err) {
      setError("Registration failed. Email may already be in use.");
    }
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };
  
  const toggleConfirmPasswordVisibility = () => {
    setIsConfirmPasswordVisible(!isConfirmPasswordVisible);
  };
  
  const getStrengthColor = () => {
    if (passwordStrength === 0) return theme.secondaryText;
    if (passwordStrength <= 2) return "#FFC107"; // Warning yellow
    if (passwordStrength <= 3) return "#4CAF50"; // Success green
    return "#2196F3"; // Info blue
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.text === '#FFFFFF' ? "light-content" : "dark-content"} />
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Animated.View 
              style={[
                styles.inner, 
                { 
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }] 
                }
              ]}
            >
              <View style={styles.headerContainer}>
                <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
                <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
                  Join our community and start exploring
                </Text>
              </View>
              
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={18} color={theme.error} />
                  <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
                </View>
              )}
              
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color={theme.secondaryText} style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.input, 
                      { 
                        backgroundColor: theme.inputBackground,
                        borderColor: theme.inputBorder,
                        color: theme.text 
                      }
                    ]}
                    placeholder="Full Name"
                    placeholderTextColor={theme.secondaryText}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoComplete="name"
                  />
                </View>
                
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color={theme.secondaryText} style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.input, 
                      { 
                        backgroundColor: theme.inputBackground,
                        borderColor: theme.inputBorder,
                        color: theme.text 
                      }
                    ]}
                    placeholder="Email Address"
                    placeholderTextColor={theme.secondaryText}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
                
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={theme.secondaryText} style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.input, 
                      styles.passwordInput,
                      { 
                        backgroundColor: theme.inputBackground,
                        borderColor: theme.inputBorder,
                        color: theme.text 
                      }
                    ]}
                    placeholder="Password"
                    placeholderTextColor={theme.secondaryText}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!isPasswordVisible}
                    autoCapitalize="none"
                    autoComplete="password-new"
                  />
                  <TouchableOpacity 
                    style={styles.passwordToggle}
                    onPress={togglePasswordVisibility}
                  >
                    <Ionicons 
                      name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={theme.secondaryText} 
                    />
                  </TouchableOpacity>
                </View>
                
                {password.length > 0 && (
                  <View style={styles.passwordStrengthContainer}>
                    <View style={styles.strengthBarContainer}>
                      {[1, 2, 3, 4, 5].map((index) => (
                        <View 
                          key={index}
                          style={[
                            styles.strengthBar,
                            { 
                              backgroundColor: passwordStrength >= index 
                                ? getStrengthColor()
                                : theme.inputBorder
                            }
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.passwordFeedback, { color: getStrengthColor() }]}>
                      {passwordFeedback}
                    </Text>
                  </View>
                )}
                
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={theme.secondaryText} style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.input, 
                      styles.passwordInput,
                      { 
                        backgroundColor: theme.inputBackground,
                        borderColor: theme.inputBorder,
                        color: theme.text 
                      }
                    ]}
                    placeholder="Confirm Password"
                    placeholderTextColor={theme.secondaryText}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!isConfirmPasswordVisible}
                    autoCapitalize="none"
                    autoComplete="password-new"
                  />
                  <TouchableOpacity 
                    style={styles.passwordToggle}
                    onPress={toggleConfirmPasswordVisibility}
                  >
                    <Ionicons 
                      name={isConfirmPasswordVisible ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={theme.secondaryText} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.registerButton, { backgroundColor: theme.primary }]} 
                onPress={handleRegister}
                activeOpacity={0.8}
              >
                <Text style={styles.registerButtonText}>Create Account</Text>
              </TouchableOpacity>

              <View style={styles.loginContainer}>
                <Text style={[styles.loginText, { color: theme.secondaryText }]}>
                  Already have an account?
                </Text>
                <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                  <Text style={[styles.loginLink, { color: theme.primary }]}>
                    {" Sign In"}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* <Text style={[styles.termsText, { color: theme.secondaryText }]}>
                By signing up, you agree to our{" "}
                <Text style={{ color: theme.primary, fontWeight: '500' }}>Terms of Service</Text>{" "}
                and{" "}
                <Text style={{ color: theme.primary, fontWeight: '500' }}>Privacy Policy</Text>
              </Text> */}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    marginBottom: 16,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingLeft: 48,
    paddingVertical: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  passwordInput: {
    paddingRight: 48,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    zIndex: 1,
  },
  passwordStrengthContainer: {
    marginBottom: 16,
    marginTop: -8,
  },
  strengthBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  passwordFeedback: {
    fontSize: 12,
    textAlign: 'right',
  },
  registerButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 24,
  },
  registerButtonText:{
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  loginText: {
    fontSize: 15,
  },
  loginLink: {
    fontSize: 15,
    fontWeight: "600",
  },


});
