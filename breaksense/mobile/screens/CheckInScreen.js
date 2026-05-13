import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';
import Header from './components/Header'; 
import { useTheme } from '../context/ThemeContext';

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
  const { sessionDuration, sessionNumber } = route.params || {};
  const [fatigue, setFatigue] = useState(null);
  const [stress, setStress] = useState(null);
  const [time, setTime] = useState(null);

  const handleAnalyze = () => {
    if (fatigue && stress) {
      navigation.navigate('Recommend', { 
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

  const getLabel = (val, options) => options.find(o => o.value === val)?.label || "...";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <Header />
        <ScrollView style={styles.container}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: 'Syne-ExtraBold' }]}>
          Mood <Text style={[styles.titleHighlight, { color: colors.accent, fontFamily: 'Syne-ExtraBold' }]}>Check-in</Text></Text>
          <Text style={styles.subtitle}>How are you feeling right now?</Text>
        </View>

        <View style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Fatigue Level</Text>
            <Text style={styles.sectionSubtitle}>How mentally tired do you feel?</Text>
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
            <Text style={styles.sectionSubtitle}>How anxious or overwhelmed do you feel?</Text>
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
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Break Time</Text>
            <Text style={styles.sectionSubtitle}>Minutes available for break?</Text>
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
  safeArea: { flex: 1, backgroundColor: '#0f141e' },
  container: { flex: 1, paddingHorizontal: 20 },
  titleContainer: { marginTop: 20, marginBottom: 25 },
  title: { color: '#fff', fontSize: 25, fontWeight: '900' },
  titleHighlight: { color: '#39ef8d' },
  subtitle: { color: '#aaa', fontSize: 14, marginTop: 5 },
  mainCard: { backgroundColor: '#1b222d', borderRadius: 20, padding: 20, marginTop: 10, borderWidth: 1, borderColor: '#2a3342' },
  section: { marginBottom: 25 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sectionSubtitle: { color: '#888', fontSize: 12, marginBottom: 15 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { backgroundColor: '#252d3a', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  chipSelected: { backgroundColor: '#39ef8d' },
  chipText: { color: '#94a3b8', fontSize: 13 },
  chipTextSelected: { color: '#000', fontWeight: 'bold' },
  analyzeBtn: { backgroundColor: '#39ef8d', paddingVertical: 18, borderRadius: 30, alignItems: 'center', marginTop: 10 },
  analyzeBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  vectorCard: { backgroundColor: '#1b222d', borderRadius: 20, padding: 20, marginVertical: 25, borderWidth: 1, borderColor: '#2a3342' },
  vectorTitle: { color: '#64748b', fontSize: 14, fontWeight: 'bold', marginBottom: 15 },
  vectorContent: { backgroundColor: '#131924', padding: 15, borderRadius: 12 },
  vectorLabel: { color: '#64748b', fontSize: 12, marginBottom: 8 },
  vectorValue: { color: '#39ef8d', fontSize: 14 },
  highlightText: { color: '#fff' },
  notificationBox: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    justifyContent: 'center',
  },
  notificationText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  notificationSub: {
    fontSize: 11,
    marginTop: 2,
  }
});