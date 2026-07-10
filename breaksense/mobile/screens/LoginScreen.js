import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, Image, Platform, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../Config';
import AuthToggle from './components/AuthToggle';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { colors } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: email.trim(),
        password,
      }, { timeout: 10000 });

      if (response.data && response.data.success) {
        const { user } = response.data;
        await AsyncStorage.setItem('user', JSON.stringify(user));
        await AsyncStorage.setItem('currentUserId', user.id.toString());

        // Sync settings from backend to local storage
        if (user.pomodoro_duration) {
          await AsyncStorage.setItem('settings_pomodoro', user.pomodoro_duration);
        }
        if (user.sessions_per_cycle) {
          await AsyncStorage.setItem('settings_sessions', user.sessions_per_cycle.toString());
        }

        onLogin(user);
      } else {
        const msg = response.data.message || 'Invalid credentials';
        Alert.alert('Login Failed', msg);
      }
    } catch (error) {
      console.error("Login Error Detail:", error.message);
      Alert.alert('Login Failed', 'Something went wrong. Please check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../img/logo.png')}
            style={styles.mainIcon}
            resizeMode="contain"
          />
          <Text style={[styles.mainBrandName, { color: colors.textPrimary, fontFamily: 'Syne-Bold' }]}>
            Break<Text style={{ color: colors.accent }}>Sense</Text>
          </Text>
        </View>
        <View style={styles.tagRow}>
          <Text style={styles.tagText}>KNN</Text>
          <Text style={styles.tagText}>STUDY</Text>
          <Text style={styles.tagText}>RECOVERY</Text>
        </View>
        
        <AuthToggle activeTab="Login" onTabChange={(tab) => navigation.navigate(tab)} />

        <View style={styles.welcomeContainer}>
          <Text style={[styles.headerWhite, { color: colors.textPrimary, fontFamily: 'Syne-Bold' }]}>Welcome</Text>
          <Text style={[styles.headerGreen, { color: colors.accent, fontFamily: 'Syne-Bold'}]}>back.</Text>
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
            editable={!isSubmitting}
          />
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput, { backgroundColor: colors.card, color: colors.textPrimary }]}
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!isSubmitting}
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

        <TouchableOpacity
          style={[styles.loginBtn, { backgroundColor: colors.accent, opacity: isSubmitting ? 0.7 : 1 }]}
          onPress={handleLogin}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#0f141e" />
          ) : (
            <Text style={[styles.loginText, { color: '#0f141e' }]}>Continue with email</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.signUpPrompt} onPress={() => navigation.navigate('SignUp')} disabled={isSubmitting}>
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
  },
  logo: { fontSize: 24, fontFamily: 'Michroma_400Regular', textAlign: 'center', marginBottom: 5 },
  tagRow: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginBottom: 30 },
  tagText: { color: '#64748b', fontSize: 10, letterSpacing: 2 },
  welcomeContainer: { marginBottom: 5 },
  headerWhite: { fontSize: 32, fontFamily: 'Michroma' },
  headerGreen: { fontSize: 32, fontFamily: 'Michroma' },
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