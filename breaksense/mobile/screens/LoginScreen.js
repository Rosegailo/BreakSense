import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, Image, Platform } from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../Config';
import AuthToggle from './components/AuthToggle';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { colors } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: email.trim(),
        password,
      });

      if (response.data && response.data.success) {
        // 1. Save user data to AsyncStorage for persistence
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        await AsyncStorage.setItem('currentUserId', response.data.user.id.toString());

        // 2. Call the onLogin function passed from App.js
        onLogin(response.data.user); 
      } else {
        // Fallback for success: false even with 200 status
        const msg = response.data.message || 'Invalid credentials';
        if (Platform.OS === 'web') {
          window.alert(`Login Failed: ${msg}`);
        } else {
          Alert.alert('Login Failed', msg);
        }
      }
    } catch (error) {
      console.error("Login Error Detail:", error.response?.data || error.message);

      let errorMessage = 'Something went wrong. Please check your internet connection.';

      if (error.response) {
        // Server responded with a status code outside the 2xx range
        errorMessage = error.response.data.message || `Server Error: ${error.response.status}`;
      } else if (error.request) {
        // Request was made but no response was received
        errorMessage = "Cannot connect to server. Please check if your Render backend is awake or if your URL in Config.js is correct.";
      } else {
        // Something happened in setting up the request
        errorMessage = error.message;
      }

      if (Platform.OS === 'web') {
        window.alert(`Login Failed: ${errorMessage}`);
      } else {
        Alert.alert('Login Failed', errorMessage);
      }
    }
  };

  // if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../img/logo.png')}
            style={styles.mainIcon}
            resizeMode="contain"
          />
          <Text style={[styles.mainBrandName, { color: colors.textPrimary }, { fontFamily: 'Syne_800ExtraBold' }]}>
            Break<Text style={{ color: colors.accent }}>Sense</Text>
          </Text>
        </View>
        <View style={styles.tagRow}>
          <Text style={styles.tagText}>KNN</Text>
          <Text style={styles.tagText}>STUDY</Text>
          <Text style={styles.tagText}>RECOVERY</Text>
        </View>
        
        <AuthToggle activeTab activeTab="Login" onTabChange={(tab) => navigation.navigate(tab)} />

        <View style={styles.welcomeContainer}>
          <Text style={[styles.headerWhite, { color: colors.textPrimary, fontFamily: 'Syne_800ExtraBold' }]}>Welcome</Text>
          <Text style={[styles.headerGreen, { color: colors.accent, fontFamily: 'Syne_800ExtraBold'}]}>back.</Text>
        </View>

        <Text style={styles.subtitle}>Continue your study streak where you left off.</Text>

        <View style={styles.inputGroup}>
          <TextInput 
            style={[styles.input, { backgroundColor: colors.card, color: colors.textPrimary }]}
            placeholder="Email address" 
            placeholderTextColor={colors.textSecondary}
            value={email} 
            onChangeText={setEmail} 
            autoCapitalize="none" 
            keyboardType="email-address"
          />
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput, { backgroundColor: colors.card, color: colors.textPrimary }]}
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={22}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Updated: Changed handleEmailLogin to handleLogin */}
        <TouchableOpacity style={[styles.loginBtn, { backgroundColor: colors.accent }]} onPress={handleLogin}>
          <Text style={[styles.loginText, { color: '#0f141e' }]}>Continue with email</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signUpPrompt} onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.signUpText}>Don't have an account? <Text style={[styles.signUpGreen, { color: colors.accent }]}>Sign up free</Text></Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 30, justifyContent: 'center' },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  mainIcon: {
    width: 120,
    height: 120,
    marginBottom: -20,
    marginTop: -50,
  },
  mainBrandName: {
    fontSize: 28,
    fontWeight: 'normal',
  },
  logo: { fontSize: 24, fontFamily: 'Michroma_400Regular', textAlign: 'center', marginBottom: 5 },
  tagRow: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginBottom: 30 },
  tagText: { color: '#64748b', fontSize: 10, letterSpacing: 2 },
  welcomeContainer: { marginBottom: 5 },
  headerWhite: { fontSize: 32, fontFamily: 'Michroma_400Regular' },
  headerGreen: { fontSize: 32, fontFamily: 'Michroma_400Regular' },
  subtitle: { color: '#64748b', fontSize: 14, marginBottom: 30 },
  inputGroup: { gap: 15 },
  input: { padding: 18, borderRadius: 12 },
  passwordContainer: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 50 },
  eyeIcon: { position: 'absolute', right: 15 },
  loginBtn: { padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 25 },
  loginText: { fontWeight: 'bold' },
  signUpPrompt: { marginTop: 20, alignItems: 'center' },
  signUpText: { color: '#64748b', fontSize: 14 },
  signUpGreen: { }
});