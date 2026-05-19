import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, Image, Platform } from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../Config';
import AuthToggle from './components/AuthToggle';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function SignUpScreen({ navigation, onLogin }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { colors } = useTheme();

  const handleEmailSignUp = async () => {
    try {
      if (!form.firstName || !form.lastName || !form.email || !form.password) {
        const msg = 'Please fill in all fields.';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Error', msg);
        return;
      }

      // Client-side Password Validation
      const minLength = 8;
      const hasNumber = /\d/.test(form.password);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(form.password);
      const hasUpper = /[A-Z]/.test(form.password);

      if (form.password.length < minLength || !hasNumber || !hasSpecial || !hasUpper) {
        const msg = 'Your password must have:\n• At least 8 characters\n• At least one uppercase letter\n• At least one number\n• At least one special character';
        if (Platform.OS === 'web') window.alert(`Weak Password: ${msg}`);
        else Alert.alert('Weak Password', msg);
        return;
      }

      if (!agreed) {
        const msg = 'Please agree to the Terms of Service and Privacy Policy.';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Error', msg);
        return;
      }

      const userData = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password
      };

      await axios.post(`${API_BASE_URL}/auth/signup`, userData);

      const successMsg = 'Account created!';
      if (Platform.OS === 'web') window.alert(successMsg);
      else Alert.alert('Success', successMsg);

      if (onLogin) {
        onLogin({
          firstName: form.firstName,
          lastName: form.lastName,
        });
      } else {
        navigation.navigate('Login');
      }
    } catch (error) {
      console.log("Signup error detail:", error.response?.data || error.message);

      let errorMessage = 'Registration failed. Please check your internet connection.';

      if (error.response) {
        errorMessage = error.response.data.message || `Server Error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = "Cannot connect to server. Please check if your Render backend is awake.";
      } else {
        errorMessage = error.message;
      }

      if (Platform.OS === 'web') {
        window.alert(`Registration Issue: ${errorMessage}`);
      } else {
        Alert.alert('Registration Issue', errorMessage);
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
                
        <AuthToggle activeTab="SignUp" onTabChange={(tab) => navigation.navigate(tab)} />

        <View style={styles.headerContainer}>
                  <Text style={[styles.headerWhite, { color: colors.textPrimary, fontFamily: 'Syne_800ExtraBold' }]}>Start your</Text>
                  <Text style={[styles.headerGreen, { color: colors.accent, fontFamily: 'Syne_800ExtraBold'}]}>study journey.</Text>
                </View>

        <Text style={styles.subtitle}>Create your free account and let KNN personalize your breaks.</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.detailsTitle}>fill up your details</Text>

          <Text style={styles.label}>FULL NAME</Text>
          <View style={styles.row}>
            <TextInput 
              style={[styles.input, { flex: 1, backgroundColor: colors.card, color: colors.textPrimary }]}
              placeholder="First" 
              placeholderTextColor={colors.textSecondary}
              value={form.firstName}
              onChangeText={(v) => setForm({...form, firstName: v})} 
            />
            <TextInput 
              style={[styles.input, { flex: 1, backgroundColor: colors.card, color: colors.textPrimary }]}
              placeholder="Last" 
              placeholderTextColor={colors.textSecondary}
              value={form.lastName}
              onChangeText={(v) => setForm({...form, lastName: v})} 
            />
          </View>

          <TextInput 
            style={[styles.input, { backgroundColor: colors.card, color: colors.textPrimary }]}
            placeholder="Email address" 
            placeholderTextColor={colors.textSecondary}
            value={form.email}
            onChangeText={(v) => setForm({...form, email: v})} 
            autoCapitalize="none" 
            keyboardType="email-address"
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput, { backgroundColor: colors.card, color: colors.textPrimary }]}
              placeholder="Password"
              secureTextEntry={!showPassword}
              placeholderTextColor={colors.textSecondary}
              value={form.password}
              onChangeText={(v) => setForm({...form, password: v})}
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
          <Text style={[styles.passwordHint, { color: colors.textSecondary }]}>
            • 8+ characters, 1 uppercase, 1 number, & 1 special char
          </Text>
        </View>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity 
            style={[styles.checkbox, agreed && { backgroundColor: colors.accent, borderColor: colors.accent }]}
            onPress={() => setAgreed(!agreed)}
          >
            {agreed && <Text style={[styles.checkmark, { color: '#0f141e' }]}>✓</Text>}
          </TouchableOpacity>
          <Text style={styles.termsText}>I agree to the Terms of Service and Privacy Policy</Text>
        </View>

        <TouchableOpacity style={[styles.signUpBtn, { backgroundColor: colors.accent }]} onPress={handleEmailSignUp}>
          <Text style={[styles.btnText, { color: '#0f141e' }]}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginPrompt} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginText}>Already have an account? <Text style={[styles.loginGreen, { color: colors.accent }]}>Log In</Text></Text>
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
    marginBottom: 5,
  },
  mainIcon: {
    width: 120,
    height: 120,
    marginBottom: -20,
  },
  mainBrandName: {
    fontSize: 24,
    fontWeight: 'normal',
  },
  logo: { fontSize: 24, fontFamily: 'Michroma_400Regular', textAlign: 'center', marginBottom: 20 },
  tagRow: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginBottom: 20 },
  tagText: { color: '#64748b', fontSize: 10, letterSpacing: 2 },
  headerContainer: { marginBottom: 5 },
  headerWhite: { fontSize: 30, fontFamily: 'Syne_800ExtraBold', lineHeight: 36 },
  headerGreen: { fontSize: 30, fontFamily: 'Syne_800ExtraBold', lineHeight: 36 },
  subtitle: { color: '#64748b', fontSize: 13, marginBottom: 20 },
  detailsTitle: { color: '#64748b', fontSize: 12, textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' },
  label: { color: '#64748b', fontSize: 12, fontWeight: 'bold', marginBottom: 5 },
  inputGroup: { gap: 12 },
  row: { flexDirection: 'row', gap: 10 },
  input: { padding: 15, borderRadius: 10 },
  passwordContainer: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 50 },
  eyeIcon: { position: 'absolute', right: 15 },
  passwordHint: { fontSize: 11, marginTop: 4, marginLeft: 5, fontStyle: 'italic' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 15, gap: 10 },
  checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: '#64748b', borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  checkmark: { fontSize: 12, fontWeight: 'bold' },
  termsText: { color: '#64748b', fontSize: 12, flex: 1 },
  signUpBtn: { padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  btnText: { fontWeight: 'bold' },
  loginPrompt: { marginTop: 15, alignItems: 'center' },
  loginText: { color: '#64748b', fontSize: 14 },
  loginGreen: { }
});