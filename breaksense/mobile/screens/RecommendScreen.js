import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView, Alert, ActivityIndicator, Vibration
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../Config';
import Header from './components/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../UserContext';
import { useTheme } from '../context/ThemeContext';
import { useTimer } from '../context/TimerContext';

const BREAK_DATA = {
  sun_salutation: { title: 'Sun Salutation', category: 'PHYSICAL MOVEMENT', icon: '🧘', duration: 10, steps: ['Stand palms together at chest', 'Inhale arms up, exhale fold', 'Plank - upward dog', 'Downward dog & breath 3x'], subtitle: 'Yoga sequence linking breath and movement.' },
  five_min_walk: { title: '5-Min Walk', category: 'PHYSICAL MOVEMENT', icon: '🏃', duration: 5, steps: ['Step outside', 'Walk at a steady pace', 'Focus on your stride', 'Return refreshed'], subtitle: 'A brisk walk to clear your head.' },
  jumping_jacks: { title: 'Jumping Jacks', category: 'PHYSICAL MOVEMENT', icon: '⚡', duration: 5, steps: ['Stand with feet together', 'Jump and spread legs', 'Clap hands overhead', 'Repeat for 60 seconds'], subtitle: 'Quick cardio to wake up.' },
  box_breathing: { title: 'Box Breathing', category: 'MINDFULNESS', icon: '🌬️', duration: 5, steps: ['Inhale 4 counts', 'Hold 4 counts', 'Exhale 4 counts', 'Hold 4 counts'], subtitle: 'Calm the nervous system.' },
  grounding: { title: '5-4-3-2-1 Grounding', category: 'MINDFULNESS', icon: '🌿', duration: 5, steps: ['Acknowledge 5 things you see', '4 things you can touch', '3 things you hear', '2 things you smell', '1 thing you can taste'], subtitle: 'Reconnect with the present moment.' },
  eye_rest: { title: 'Eye Rest 20-20-20', category: 'REST & RECOVERY', icon: '👁️', duration: 5, steps: ['Look at something 20 feet away', 'Keep focus for 20 seconds', 'Blink slowly 10 times'], subtitle: 'Reduce digital eye strain.' },
  hydration: { title: 'Hydration Reset', category: 'NUTRITION', icon: '💧', duration: 5, steps: ['Get a glass of water', 'Sip slowly', 'Focus on the cold sensation', 'Finish the glass'], subtitle: 'Rehydrate for better focus.' },
  power_nap: { title: 'Power Nap', category: 'REST & RECOVERY', icon: '😴', duration: 20, steps: ['Find a dark, quiet spot', 'Set an alarm for 20 mins', 'Close your eyes', 'Wake up slowly'], subtitle: 'Deep rest for high fatigue.' },
  stretching: { title: 'Neck & Shoulder Stretch', category: 'PHYSICAL MOVEMENT', icon: '🧘‍♂️', duration: 5, steps: ['Slowly tilt head to right shoulder', 'Hold for 15s, then left side', 'Roll shoulders backward 10 times', 'Gently drop chin to chest'], subtitle: 'Release tension from long sitting.' },
  standing_stretches: { title: 'Standing Desk Stretches', category: 'PHYSICAL MOVEMENT', icon: '🧍', duration: 5, steps: ['Rise up on tip-to-tips 15 times', 'Do 10 air squats', 'Stretch each calf against a wall', 'Shake out your legs'], subtitle: 'Activate lower body while working.' },
  chest_stretch: { title: 'Doorway Chest Stretch', category: 'PHYSICAL MOVEMENT', icon: '🚪', duration: 5, steps: ['Place forearms on door frame', 'Lean forward gently', 'Hold for 30 seconds', 'Repeat 3 times'], subtitle: 'Counteract the "computer slouch".' },
  gratitude: { title: 'Gratitude Journaling', category: 'MINDFULNESS', icon: '✍️', duration: 5, steps: ['Grab a pen and paper', 'Write 3 things you are grateful for', 'Think about why they matter', 'Take a deep breath'], subtitle: 'Shift focus to the positive.' },
  body_scan: { title: 'Body Scan', category: 'MINDFULNESS', icon: '🔍', duration: 10, steps: ['Sit or lie down comfortably', 'Focus on your toes and move up', 'Notice any tension or comfort', 'Release tension with each exhale'], subtitle: 'Check in with physical sensations.' },
  single_tasking: { title: 'Single-Tasking Focus', category: 'MINDFULNESS', icon: '🎯', duration: 10, steps: ['Pick one small, non-work task', 'Give it 100% of your attention', 'When mind wanders, bring it back', 'Complete the task fully'], subtitle: 'Practice deep concentration.' },
  herbal_tea: { title: 'Herbal Tea Break', category: 'NUTRITION', icon: '🍵', duration: 10, steps: ['Boil fresh water', 'Choose a caffeine-free tea', 'Savor the aroma while steeping', 'Sip slowly without screens'], subtitle: 'A warm, soothing hydration ritual.' },
  mindful_chewing: { title: 'Mindful Chewing', category: 'NUTRITION', icon: '🥜', duration: 5, steps: ['Take a small bite of your snack', 'Chew slowly, noticing texture', 'Notice the flavors changing', 'Swallow before the next bite'], subtitle: 'Improve digestion and awareness.' },
  infused_water: { title: 'Fruit Infused Water', category: 'NUTRITION', icon: '🍓', duration: 5, steps: ['Slice lemon, berries or cucumber', 'Add to a large water bottle', 'Let it infuse for a few minutes', 'Enjoy the refreshing taste'], subtitle: 'Elevate your hydration game.' },
  digital_detox: { title: 'Digital Detox', category: 'REST & RECOVERY', icon: '📵', duration: 15, steps: ['Put phone in another room', 'Turn off your monitor', 'Look out a window or go outside', 'Let your brain idle'], subtitle: 'Completely disconnect from screens.' },
  lofi_rest: { title: 'Lo-fi Music Rest', category: 'REST & RECOVERY', icon: '🎧', duration: 10, steps: ['Put on noise-canceling headphones', 'Play a lo-fi or ambient track', 'Close your eyes', 'Let the rhythm steady your heart'], subtitle: 'Auditory relaxation.' },
  progressive_relax: { title: 'Progressive Relaxation', category: 'REST & RECOVERY', icon: '🛌', duration: 15, steps: ['Tense your feet for 5s, then release', 'Move to calves, thighs, glutes', 'Continue up to hands and face', 'Feel the total body heaviness'], subtitle: 'Systematic tension release.' }
};

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

const RATINGS = [
  { label: '😫', value: 1 }, { label: '😐', value: 2 }, { label: '🙂', value: 3 }, { label: '😊', value: 4 }, { label: '🤩', value: 5 }
];

export default function RecommendScreen({ navigation, route }) {
  const { user } = useUser();
  const { colors } = useTheme();
  const { playRingtone, stopRingtone } = useTimer();

  // Inputs from navigation
  const { checkin, sessionInfo } = route.params || {};

  // Local State to keep the recommendation visible even if params change or screen blurred
  const [selected, setSelected] = useState(null);
  const [finalDuration, setFinalDuration] = useState(5);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [rating, setRating] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mlLog, setMlLog] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch recommendation when checkin params arrive
  useEffect(() => {
    if (checkin) {
      fetchRecommendation();
    }
  }, [checkin]);

  const fetchRecommendation = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/breaks/recommend`, {
        fatigue: checkin.fatigue,
        stress: checkin.stress,
        time: checkin.time
      });

      const mlTitle = response.data.break_type;
      let activityData = Object.values(BREAK_DATA).find(act => act.title === mlTitle) || BREAK_DATA['eye_rest'];

      setSelected(activityData);
      setFinalDuration(response.data.duration_minutes || activityData.duration);
      setSecondsLeft((response.data.duration_minutes || activityData.duration) * 60);
      setMlLog(`ML Result: ${mlTitle}`);
      setIsFinished(false);
      setTimerRunning(false);
      setRating(null);
    } catch (error) {
      console.error(error);
      setSelected(BREAK_DATA['eye_rest']);
      setSecondsLeft(300);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timerRunning && secondsLeft > 0) {
      const interval = setInterval(() => setSecondsLeft(prev => prev - 1), 1000);
      return () => clearInterval(interval);
    } else if (secondsLeft === 0 && timerRunning) {
      handleFinish();
    }
  }, [timerRunning, secondsLeft]);

  const handleFinish = async () => {
    setTimerRunning(false);
    setIsFinished(true);
    Vibration.vibrate(500);
    await playRingtone();

    Alert.alert(
      "Break Finished!",
      "Time to stop the alarm and log your progress.",
      [{ text: "STOP ALARM", onPress: () => stopRingtone() }]
    );
  };

  const handleLogSession = async () => {
    setSaving(true);
    try {
      await stopRingtone();
      const storedUserId = user?.id || await AsyncStorage.getItem('currentUserId');

      const payload = {
        user_id: storedUserId,
        break_type: selected.title,
        category: selected.category,
        duration_taken: finalDuration,
        fatigue_before: checkin?.fatigue || 1,
        stress_before: checkin?.stress || 1,
        rating: rating || 5,
        session_number: sessionInfo?.sessionNumber || null
      };

      await axios.post(`${API_BASE_URL}/breaks/save`, payload);
      Alert.alert('Success', 'Session saved!');

      // Reset for next time
      setSelected(null);
      setIsFinished(false);

      // Reset the Check-in form and go Home
      navigation.navigate('Check-in', { reset: true });
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Error', 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const getLabel = (val, options) => options.find(o => o.value === val)?.label || "...";

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ color: colors.textPrimary, marginTop: 20 }}>Analyzing mood vector...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

        {!selected ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 60, marginBottom: 20 }}>🔍</Text>
            <Text style={{ color: colors.textPrimary, fontSize: 32, fontWeight: '900', textAlign: 'center'}}>
              No Recommendation Yet
            </Text>
            <Text style={styles.subtitle}>Complete your Mood Check-in first to get started.</Text>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.accent, marginTop: 30 }]}
              onPress={() => navigation.navigate('Check-in')}
            >
              <Text style={styles.actionBtnText}>Go to Check-in</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: colors.textPrimary, fontFamily: 'Syne-ExtraBold' }]}>
                Your <Text style={{ color: colors.accent }}>Break</Text>
              </Text>
              <Text style={styles.subtitle}>KNN matched this activity for you.</Text>
            </View>

            <View style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.categoryLabel}>{selected.category}</Text>
              <Text style={[styles.activityTitle, { color: colors.textPrimary }]}>{selected.icon} {selected.title}</Text>
              <Text style={styles.activitySubtitle}>{selected.subtitle}</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              {selected.steps.map((step, index) => (
                <View key={index} style={styles.stepRow}>
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                  <Text style={[styles.stepText, { color: colors.textSecondary }]}>{step}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.vectorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.vectorTitle}>LIVE INPUT VECTOR</Text>
              <Text style={[styles.vectorValue, { color: colors.accent }]}>
                [F:{getLabel(checkin?.fatigue, FATIGUE_OPTIONS)}, S:{getLabel(checkin?.stress, STRESS_OPTIONS)}, T:{checkin?.time}m]
              </Text>
              <Text style={[styles.vectorLog, { color: colors.textSecondary }]}>{mlLog}</Text>
            </View>

            <View style={[styles.timerCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.timerValue, { color: colors.accent }]}>
                {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
              </Text>
              {!timerRunning && !isFinished && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.accent }]} onPress={() => setTimerRunning(true)}>
                  <Text style={styles.actionBtnText}>Start Break Activity</Text>
                </TouchableOpacity>
              )}
              {timerRunning && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.danger }]} onPress={() => setTimerRunning(false)}>
                  <Text style={[styles.actionBtnText, { color: '#fff' }]}>Pause</Text>
                </TouchableOpacity>
              )}
              {isFinished && (
                <View style={{ width: '100%', alignItems: 'center' }}>
                  <Text style={{ color: colors.textPrimary, marginBottom: 15, fontWeight: 'bold' }}>How was it?</Text>
                  <View style={styles.emojiRow}>
                    {RATINGS.map(r => (
                      <TouchableOpacity key={r.value} onPress={() => setRating(r.value)}>
                        <Text style={[styles.emoji, rating === r.value && { transform: [{scale: 1.4}] }]}>{r.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.accent }]} onPress={handleLogSession} disabled={saving}>
                    {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.actionBtnText}>Save & Done</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  titleContainer: { marginBottom: 20 },
  title: { fontSize: 25, fontWeight: '900' },
  subtitle: { color: '#888', fontSize: 13, marginTop: 5, textAlign: 'center' },
  mainCard: { borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 15 },
  categoryLabel: { color: '#a855f7', fontSize: 10, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase' },
  activityTitle: { fontSize: 26, fontWeight: 'bold' },
  activitySubtitle: { color: '#888', fontSize: 13, marginTop: 5 },
  divider: { height: 1, marginVertical: 15 },
  stepRow: { flexDirection: 'row', marginBottom: 10 },
  stepNumber: { color: '#a855f7', fontWeight: 'bold', marginRight: 10 },
  stepText: { fontSize: 13, flex: 1, lineHeight: 18 },
  actionBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', width: '100%', marginTop: 10 },
  actionBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  vectorCard: { borderRadius: 20, padding: 18, marginBottom: 15, borderWidth: 1 },
  vectorTitle: { color: '#64748b', fontSize: 10, fontWeight: 'bold', marginBottom: 5 },
  vectorValue: { fontSize: 13, fontFamily: 'monospace' },
  vectorLog: { fontSize: 11, marginTop: 5, fontStyle: 'italic' },
  timerCard: { borderRadius: 20, padding: 20, alignItems: 'center' },
  timerValue: { fontSize: 52, fontWeight: '900', marginBottom: 15 },
  emojiRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  emoji: { fontSize: 30 }
});
