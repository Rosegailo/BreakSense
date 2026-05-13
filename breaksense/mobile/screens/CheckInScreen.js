import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';
import Header from './components/Header'; 
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';

const FATIGUE_OPTIONS = [
  { label: 'Energized', emoji: '😁', value: 1 },
  { label: 'Good', emoji: '🙂', value: 2 },
  { label: 'Neutral', emoji: '😐', value: 3 },
  { label: 'Tired', emoji: '😫', value: 4 },
  { label: 'Exhausted', emoji: '🥱', value: 5 },
];

const STRESS_OPTIONS = [
  { label: 'Low', emoji: '😌', value: 1 },
  { label: 'Mild', emoji: '😰', value: 2 },
  { label: 'High', emoji: '🤯', value: 3 },
];

const TIME_OPTIONS = [
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '20 min', value: 20 },
  { label: '25 min', value: 25 },
  { label: '30 min', value: 30 },
];

export default function CheckInScreen({ navigation, route }) {
  const { colors } = useTheme();
  const [fatigue, setFatigue] = useState(null);
  const [stress, setStress] = useState(null);
  const [time, setTime] = useState(10);

  // If we come from Study Timer, we might have session info
  useEffect(() => {
    if (route.params?.fatigue) setFatigue(route.params.fatigue);
    if (route.params?.stress) setStress(route.params.stress);
  }, [route.params]);

  // Handle resetting the form when a session is finished elsewhere
  useFocusEffect(
    useCallback(() => {
      if (route.params?.reset) {
        setFatigue(null);
        setStress(null);
        setTime(10);
        // Clear the reset param so it doesn't keep resetting
        navigation.setParams({ reset: false });
      }
    }, [route.params])
  );

  const handleAnalyze = () => {
    if (fatigue && stress) {
      // Navigate to the Recommendation screen in the drawer
      navigation.navigate('Recommendation', {
        checkin: { 
          stress, 
          fatigue, 
          time: time || 10 
        },
        sessionInfo: route.params 
      });
    } else {
      Alert.alert("Selection Required", "Please select fatigue and stress levels.");
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <Header />
        <ScrollView style={styles.container}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: 'Syne-ExtraBold' }]}>
            Mood <Text style={{ color: colors.accent }}>Check-in</Text>
          </Text>
          <Text style={styles.subtitle}>Tell KNN how you feel to get a break recommendation.</Text>
        </View>

        <View style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Fatigue Level</Text>
            <View style={styles.chipContainer}>
              {FATIGUE_OPTIONS.map((opt) => (
                <TouchableOpacity 
                  key={opt.value} 
                  onPress={() => setFatigue(opt.value)}
                  style={[styles.chip, { backgroundColor: colors.background }, fatigue === opt.value && { backgroundColor: colors.accent }]}
                >
                  <Text style={[styles.chipText, { color: colors.textSecondary }, fatigue === opt.value && { color: '#000', fontWeight: 'bold' }]}>
                    {opt.emoji} {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Stress Level</Text>
            <View style={styles.chipContainer}>
              {STRESS_OPTIONS.map((opt) => (
                <TouchableOpacity 
                  key={opt.value} 
                  onPress={() => setStress(opt.value)}
                  style={[styles.chip, { backgroundColor: colors.background }, stress === opt.value && { backgroundColor: colors.accent }]}
                >
                  <Text style={[styles.chipText, { color: colors.textSecondary }, stress === opt.value && { color: '#000', fontWeight: 'bold' }]}>
                    {opt.emoji} {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Available Time</Text>
            <View style={styles.chipContainer}>
              {TIME_OPTIONS.map((opt) => (
                <TouchableOpacity 
                  key={opt.value} 
                  onPress={() => setTime(opt.value)}
                  style={[styles.chip, { backgroundColor: colors.background }, time === opt.value && { backgroundColor: colors.accent }]}
                >
                  <Text style={[styles.chipText, { color: colors.textSecondary }, time === opt.value && { color: '#000', fontWeight: 'bold' }]}>
                    🕒 {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={[styles.analyzeBtn, { backgroundColor: colors.accent }]} onPress={handleAnalyze}>
            <Text style={styles.analyzeBtnText}>Analyze & Recommend</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },
  titleContainer: { marginTop: 20, marginBottom: 25 },
  title: { fontSize: 25, fontWeight: '900' },
  subtitle: { color: '#888', fontSize: 13, marginTop: 5 },
  mainCard: { borderRadius: 20, padding: 20, marginTop: 10, borderWidth: 1 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 15 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  chipText: { fontSize: 13 },
  analyzeBtn: { paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginTop: 10 },
  analyzeBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' }
});
