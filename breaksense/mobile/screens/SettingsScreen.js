import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, SafeAreaView, Alert, Platform, Modal, TextInput, ActivityIndicator,
  Animated, PanResponder, Dimensions, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../UserContext'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../Config';
import { useFonts, Michroma_400Regular } from '@expo-google-fonts/michroma';
import { Syne_800ExtraBold } from '@expo-google-fonts/syne';
import { useTheme } from '../context/ThemeContext';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function SettingsScreen({ navigation }) {
  const { user, setUser } = useUser();
  const { theme, setTheme, colors } = useTheme();

  const panY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 150) {
          Animated.timing(panY, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
          }).start(() => navigation.goBack());
        } else {
          Animated.spring(panY, {
            toValue: 0,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const [fontsLoaded] = useFonts({
    Michroma_400Regular,
    'Syne-ExtraBold': Syne_800ExtraBold
  });
  
  // Pomodoro state
  const [pomodoro, setPomodoro] = useState('25 min');
  const [sessions, setSessions] = useState(4);
  
  // Notification states
  const [studyAlerts, setStudyAlerts] = useState(true);
  const [breakAlerts, setBreakAlerts] = useState(true);
  const [nudge, setNudge] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedPomodoro = await AsyncStorage.getItem('settings_pomodoro');
        const savedSessions = await AsyncStorage.getItem('settings_sessions');
        const savedStudyAlerts = await AsyncStorage.getItem('settings_studyAlerts');
        const savedBreakAlerts = await AsyncStorage.getItem('settings_breakAlerts');
        const savedNudge = await AsyncStorage.getItem('settings_nudge');

        if (savedPomodoro) setPomodoro(savedPomodoro);
        if (savedSessions) setSessions(parseInt(savedSessions));
        if (savedStudyAlerts) setStudyAlerts(savedStudyAlerts === 'true');
        if (savedBreakAlerts) setBreakAlerts(savedBreakAlerts === 'true');
        if (savedNudge) setNudge(savedNudge === 'true');
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    };
    loadSettings();
  }, []);

  // Save settings helper
  const saveSetting = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch (e) {
      console.error("Failed to save setting", e);
    }
  };

  const handlePomodoroChange = async (val) => {
    setPomodoro(val);
    await saveSetting('settings_pomodoro', val);
    // Sync to backend if logged in
    if (user?.id) {
      try {
        const dur = parseInt(val.split(' ')[0]);
        await axios.put(`${API_BASE_URL}/auth/update-profile`, {
          userId: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          pomodoroDuration: val,
          sessionsPerCycle: sessions
        });
      } catch (e) { console.log("Sync error", e); }
    }
  };

  const handleSessionsChange = async (val) => {
    setSessions(val);
    await saveSetting('settings_sessions', val);
    // Sync to backend if logged in
    if (user?.id) {
      try {
        await axios.put(`${API_BASE_URL}/auth/update-profile`, {
          userId: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          pomodoroDuration: pomodoro,
          sessionsPerCycle: val
        });
      } catch (e) { console.log("Sync error", e); }
    }
  };

  const handleStudyAlertsChange = (val) => {
    setStudyAlerts(val);
    saveSetting('settings_studyAlerts', val);
  };

  const handleBreakAlertsChange = (val) => {
    setBreakAlerts(val);
    saveSetting('settings_breakAlerts', val);
  };

  const handleNudgeChange = (val) => {
    setNudge(val);
    saveSetting('settings_nudge', val);
  };

  // Edit Name State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!fontsLoaded) return null;

  const performReset = async () => {
    try {
      console.log("--- RESET PROCESS STARTED ---");
      let userId = user?.id;
      if (!userId) {
        const storedId = await AsyncStorage.getItem('currentUserId');
        userId = storedId;
      }

      if (!userId) {
        console.log("No UserID found, logging out locally.");
        await AsyncStorage.clear();
        setUser(null);
        return;
      }

      console.log(`Deleting data for User ID: ${userId} at ${API_BASE_URL}/auth/reset-account/${userId}`);

      const response = await axios.delete(`${API_BASE_URL}/auth/reset-account/${userId}`, { timeout: 10000 });
      console.log("Server response:", response.data);

      if (response.data.success) {
        await AsyncStorage.clear();
        setUser(null);
        if (Platform.OS === 'web') {
          window.alert('Account data has been wiped successfully.');
        } else {
          Alert.alert('Success', 'Account data has been wiped.');
        }
      } else {
        throw new Error(response.data.message || 'Failed to reset data');
      }
    } catch (error) {
      console.error('CRITICAL RESET ERROR:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || error.message || 'Connection error';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMsg}\n\nCheck if your backend server is running.`);
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
  };

  const handleReset = () => {
    const title = 'Clear All Data & Reset';
    const message = 'This will permanently delete your break history and study stats. This cannot be undone.';
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) performReset();
    } else {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Everything', style: 'destructive', onPress: performReset }
      ]);
    }
  };

  const handleSaveName = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Validation Error', 'First and Last name are required.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await axios.put(`${API_BASE_URL}/auth/update-profile`, {
        userId: user.id,
        firstName,
        lastName,
        pomodoroDuration: pomodoro,
        sessionsPerCycle: sessions
      });

      if (response.data.success) {
        const updatedUser = { ...user, first_name: firstName, last_name: lastName };
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setIsEditModalVisible(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Error', response.data.message || 'Update failed');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      Alert.alert('Error', 'Could not update profile. Try again later.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDecrement = () => { if (sessions > 1) setSessions(sessions - 1); };
  const handleIncrement = () => { setSessions(sessions + 1); };

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            transform: [{ translateY: panY }]
          }
        ]}
      >

      <View style={styles.handleBarContainer} {...panResponder.panHandlers}>
        <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
      </View>

      <View style={styles.header}>
        <Text style={[styles.mainTitle, { color: colors.accent, fontFamily: 'Syne-Bold' }]}>Settings</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody}
      showsVerticalScrollIndicator={false}
      >
        {/* Removed duplicate title from here */}

        {/* POMODORO Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: '#f97316' }]}>POMODORO</Text>
          <View style={styles.itemRow}>
            <View>
              <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>Default Duration ⏱️</Text>
              <Text style={styles.itemSub}>Session length when app opens</Text>
            </View>
          </View>

          <View style={styles.durationContainer}>
            {['15 min', '25 min', '45 min', '60 min'].map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.durationBtn,
                  { backgroundColor: colors.card },
                  pomodoro === item && { borderColor: colors.accent }
                ]}
                onPress={() => handlePomodoroChange(item)}
              >
                <Text style={[
                  styles.durationBtnText,
                  pomodoro === item && { color: colors.accent }
                ]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.itemRow, { marginTop: 25 }]}>
            <View>
              <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>Sessions Per Cycle</Text>
              <Text style={styles.itemSub}>Before a long break is suggested</Text>
            </View>
            <View style={styles.stepper}>
               <TouchableOpacity onPress={() => handleSessionsChange(Math.max(1, sessions - 1))} style={[styles.stepperBtn, { backgroundColor: colors.card }]}>
                 <Text style={styles.stepperBtnText}>-</Text>
               </TouchableOpacity>
               <Text style={[styles.stepperValue, { color: colors.accent }]}>{sessions}</Text>
               <TouchableOpacity onPress={() => handleSessionsChange(sessions + 1)} style={[styles.stepperBtn, { backgroundColor: colors.card }]}>
                 <Text style={styles.stepperBtnText}>+</Text>
               </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* NOTIFICATION Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: '#ec4899' }]}>NOTIFICATION</Text>
          <View style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>Study Session Alerts</Text>
              <Text style={styles.itemSub}>Notify when Promodoro ends</Text>
            </View>
            <Switch value={studyAlerts} onValueChange={handleStudyAlertsChange} trackColor={{ false: '#334155', true: colors.accent }} thumbColor="#fff" />
          </View>

          <View style={[styles.itemRow, { marginTop: 20 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>Break End Alerts</Text>
              <Text style={styles.itemSub}>Remind when break timer finishes</Text>
            </View>
            <Switch value={breakAlerts} onValueChange={handleBreakAlertsChange} trackColor={{ false: '#334155', true: colors.accent }} thumbColor="#fff" />
          </View>

          <View style={[styles.itemRow, { marginTop: 20 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>Next Session Nudge</Text>
              <Text style={styles.itemSub}>Prompt to start after long break</Text>
            </View>
            <Switch value={nudge} onValueChange={handleNudgeChange} trackColor={{ false: '#334155', true: colors.accent }} thumbColor="#fff" />
          </View>
        </View>
        
        {/* APPEARANCE Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: '#3b82f6' }]}>APPEARANCE</Text>
          <View style={styles.itemRow}>
            <View>
              <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>Accent Colour</Text>
              <Text style={styles.itemSub}>Main highlight colour</Text>
            </View>
            <View style={styles.themeSelector}>
              <View style={styles.themeOption}>
                <TouchableOpacity style={[styles.radioCircle, { backgroundColor: colors.card }, theme === 'Dark' && { backgroundColor: colors.accent }]} onPress={() => setTheme('Dark')}>
                  {theme === 'Dark' && <Ionicons name="checkmark" size={12} color="#fff" />}
                </TouchableOpacity>
                <Text style={styles.themeLabel}>Dark</Text>
              </View>
              <View style={styles.themeOption}>
                <TouchableOpacity style={[styles.radioCircle, { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border }, theme === 'Light' && { backgroundColor: colors.accent, borderColor: colors.accent }]} onPress={() => setTheme('Light')}>
                  {theme === 'Light' && <Ionicons name="checkmark" size={12} color="#fff" />}
                </TouchableOpacity>
                <Text style={styles.themeLabel}>Light</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ACCOUNT Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: '#facc15' }]}>ACCOUNT</Text>
          <TouchableOpacity style={styles.itemRow} onPress={() => setIsEditModalVisible(true)}>
            <View>
              <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>Display Name</Text>
              <Text style={styles.itemSub}>{user?.first_name} {user?.last_name}</Text>
              <Text style={[styles.itemSub, { color: colors.accent, fontSize: 10 }]}>Tap to edit</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.resetBtn, { backgroundColor: theme === 'Dark' ? '#3b1620' : '#fee2e2' }]} onPress={handleReset}>
          <Text style={styles.resetBtnText}>Clear All Data & Reset</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Edit Name Modal */}
      <Modal visible={isEditModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.editCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Update Name</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]} placeholder="First Name" placeholderTextColor={colors.textSecondary} value={firstName} onChangeText={setFirstName} />
            <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]} placeholder="Last Name" placeholderTextColor={colors.textSecondary} value={lastName} onChangeText={setLastName} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.border }]} onPress={() => setIsEditModalVisible(false)}>
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.accent }]} onPress={handleSaveName} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#000" size="small" /> : <Text style={[styles.modalBtnText, { color: '#000' }]}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  container: { height: '90%', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 25 },
  handleBarContainer: { alignItems: 'center', paddingVertical: 15, position: 'relative' },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  logo: {
    width: 35,
    height: 35
  },
  brandText: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  closeBtn: { padding: 5 },
  mainTitle: { fontSize: 20, marginBottom: 25 },
  subtitle: { color: '#64748b', fontSize: 14, marginTop: 4 },
  scrollBody: { paddingBottom: 100 },
  section: { marginBottom: 35 },
  sectionHeader: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLabel: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  itemSub: { color: '#64748b', fontSize: 12, marginTop: 4 },
  durationContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  durationBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#2d323c', marginHorizontal: 4, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  durationBtnActive: { borderColor: '#39ef8d' },
  durationBtnText: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },
  durationBtnTextActive: { color: '#39ef8d' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  stepperBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#2d323c', justifyContent: 'center', alignItems: 'center' },
  stepperBtnText: { color: '#64748b', fontSize: 18 },
  stepperValue: { color: '#39ef8d', fontSize: 14, fontWeight: 'bold' },
  themeSelector: { flexDirection: 'row', gap: 20 },
  themeOption: { alignItems: 'center', gap: 5 },
  radioCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#2d323c', justifyContent: 'center', alignItems: 'center' },
  radioActive: { backgroundColor: '#39ef8d' },
  themeLabel: { color: '#64748b', fontSize: 11 },
  resetBtn: { backgroundColor: '#3b1620', borderWidth: 1, borderColor: '#ef4444', borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginTop: 20 },
  resetBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 30 },
  editCard: { backgroundColor: '#1b222d', borderRadius: 20, padding: 25, borderWidth: 1, borderColor: '#2a3342' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  input: { backgroundColor: '#0f141e', color: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#2a3342' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  modalBtnText: { color: '#fff', fontWeight: 'bold' }
});