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
  brain_snack: { title: 'Brain Snack', category: 'NUTRITION', icon: '🥜', duration: 10, steps: ['Grab a handful of nuts or seeds', 'Avoid sugary snacks', 'Focus on the energy boost', 'Notice your hunger levels'], subtitle: 'Fuel your brain with healthy fats.' },
  meal_prep: { title: 'Balanced Meal Prep', category: 'NUTRITION', icon: '🥗', duration: 20, steps: ['Combine protein, healthy fats, and fiber', 'Prep your next meal mindfully', 'Avoid distractions while prepping', 'Clean as you go'], subtitle: 'Support long-term focus with nutrition.' },
  visualization: { title: 'Visualization', category: 'MINDFULNESS', icon: '🌈', duration: 10, steps: ['Close your eyes', 'Imagine a peaceful place in detail', 'Focus on the sights and sounds', 'Take 5 deep breaths in this space'], subtitle: 'A mental escape to reduce stress.' },
  quiet_sitting: { title: 'Quiet Sitting', category: 'REST & RECOVERY', icon: '🪑', duration: 10, steps: ['Sit comfortably with eyes closed', 'Hands resting on your lap', 'Notice your breath without changing it', 'Simply exist for a few minutes'], subtitle: 'Reset your mind through stillness.' },
  digital_detox: { title: 'Digital Detox', category: 'REST & RECOVERY', icon: '📵', duration: 15, steps: ['Put phone in another room', 'Turn off your monitor', 'Look out a window or go outside', 'Let your brain idle'], subtitle: 'Completely disconnect from screens.' },
  lofi_rest: { title: 'Lo-fi Music Rest', category: 'REST & RECOVERY', icon: '🎧', duration: 10, steps: ['Put on noise-canceling headphones', 'Play a lo-fi or ambient track', 'Close your eyes', 'Let the rhythm steady your heart'], subtitle: 'Auditory relaxation.' },
  progressive_relax: { title: 'Progressive Relaxation', category: 'REST & RECOVERY', icon: '🛌', duration: 15, steps: ['Tense your feet for 5s, then release', 'Move to calves, thighs, glutes', 'Continue up to hands and face', 'Feel the total body heaviness'], subtitle: 'Systematic tension release.' }
};

const RATINGS = [
  { label: '😫', value: 1 }, { label: '😐', value: 2 }, { label: '🙂', value: 3 }, { label: '😊', value: 4 }, { label: '🤩', value: 5 }
];

export default function RecommendScreen({ navigation, route }) {
  const { user } = useUser();
  const { colors } = useTheme();
  const { playRingtone, stopRingtone } = useTimer();

  const { checkin, sessionInfo } = route.params || {};

  const [selected, setSelected] = useState(null);
  const [finalDuration, setFinalDuration] = useState(5);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [rating, setRating] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mlLog, setMlLog] = useState("Initializing...");
  const [saving, setSaving] = useState(false);

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

      // Prioritize user's selected time from Check-in
      const duration = checkin.time || response.data.duration_minutes || activityData.duration;

      setSelected(activityData);
      setFinalDuration(duration);
      setSecondsLeft(duration * 60);
      setMlLog(`ML Result: ${mlTitle}`);
      setIsFinished(false);
      setTimerRunning(false);
      setRating(null);
    } catch (error) {
      setMlLog("ML Error: Using local fallback.");
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

    // Only play ringtone if the timer actually hit zero
    if (secondsLeft <= 0) {
      await playRingtone();
      Alert.alert(
        "Break Finished!",
        "Time to stop the alarm and log your progress.",
        [{ text: "STOP ALARM", onPress: () => stopRingtone() }]
      );
    } else {
      // If user clicked "Stop Alarm" (Stop Early)
      await stopRingtone();
    }
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

      setSelected(null);
      setIsFinished(false);

      navigation.navigate('Check-in', { reset: true });
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Error', 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}>

        {!selected ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 60, marginBottom: 20 }}>🔍</Text>
            <Text style={{ color: colors.textPrimary, fontSize: 24, fontFamily: 'Syne-ExtraBold', textAlign: 'center', marginBottom: 10 }}>
              No Recommendation Yet
            </Text>
            <Text style={styles.headerSubtitle}>Complete your Mood Check-in first.</Text>
            <TouchableOpacity style={[styles.emptyLogBtn, { borderColor: colors.accent, paddingHorizontal: 40, paddingVertical: 15, borderRadius: 15, borderWidth: 2, marginTop: 30 }]} onPress={() => navigation.navigate('Check-in')}>
              <Text style={[styles.emptyLogBtnText, { color: colors.accent, fontWeight: 'bold' }]}>Go to Check-in</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.headerContainer}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary, fontWeight: '900', fontFamily: 'Syne-ExtraBold' }]}>
                Break <Text style={{ color: colors.accent }}>Rec</Text>
              </Text>
              <Text style={styles.headerSubtitle}>Personalized via Python ML.</Text>
            </View>

            <View style={[styles.mainActivityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

            <View style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.cardLabel}>PYTHON ML SERVICE LOG</Text>
              <View style={styles.logDetailRow}><View style={styles.dot} /><Text style={[styles.logText, { color: colors.textSecondary }]}>In: [F:{checkin?.fatigue}, S:{checkin?.stress}, T:{checkin?.time}]</Text></View>
              <View style={styles.logDetailRow}><View style={[styles.dot, {backgroundColor: colors.accent}]} /><Text style={[styles.logText, { color: colors.textSecondary }]}>{mlLog}</Text></View>
            </View>

            <View style={[styles.timerCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.timerValue, { color: colors.accent }]}>
                {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
              </Text>
              {!timerRunning && !isFinished && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.accent }]} onPress={() => setTimerRunning(true)}>
                  <Text style={styles.actionBtnText}>Start Break</Text>
                </TouchableOpacity>
              )}
              {timerRunning && (
                <View style={styles.row}>
                  <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]} onPress={() => setTimerRunning(false)}>
                    <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>Pause</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: '#ff3b30', marginLeft: 10 }]} onPress={handleFinish}>
                    <Text style={[styles.actionBtnText, { color: '#fff' }]}>Stop Alarm</Text>
                  </TouchableOpacity>
                </View>
              )}
              {isFinished && (
                <View style={{ width: '100%', alignItems: 'center' }}>
                  <Text style={{ color: colors.textPrimary, marginBottom: 15, fontWeight: 'bold' }}>How refreshed do you feel?</Text>
                  <View style={styles.emojiRow}>
                    {RATINGS.map(r => (
                      <TouchableOpacity key={r.value} onPress={() => setRating(r.value)}>
                        <Text style={[styles.emoji, rating === r.value && { transform: [{scale: 1.4}] }]}>{r.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.accent }]} onPress={handleLogSession} disabled={saving}>
                    {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.actionBtnText}>Save & Return</Text>}
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
  emptyContainer: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', padding: 40, paddingTop: 180},
  headerContainer: { marginTop: 20, marginBottom: 25 },
  headerTitle: { fontSize: 25, fontWeight: '900'},
  headerSubtitle: { color: '#888', fontSize: 14 },
  emptyLogBtn: { borderWidth: 1, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10, marginTop: 10 },
  emptyLogBtnText: { fontWeight: '600' },
  mainActivityCard: { borderRadius: 20, padding: 25, borderWidth: 1, marginBottom: 15 },
  categoryLabel: { color: '#a855f7', fontSize: 11, fontWeight: 'bold', marginBottom: 15, textTransform: 'uppercase' },
  activityTitle: { fontSize: 28, fontWeight: 'bold' },
  activitySubtitle: { color: '#888', fontSize: 13, marginTop: 10 },
  divider: { height: 1, marginVertical: 20 },
  stepRow: { flexDirection: 'row', marginBottom: 12 },
  stepNumber: { color: '#a855f7', fontWeight: 'bold', marginRight: 15, width: 15 },
  stepText: { fontSize: 14, flex: 1 },
  logCard: { borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1 },
  cardLabel: { color: '#64748b', fontSize: 11, fontWeight: 'bold', marginBottom: 15 },
  logDetailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#facc15', marginRight: 12 },
  logText: { fontSize: 13, fontFamily: 'monospace' },
  timerCard: { borderRadius: 20, padding: 25, alignItems: 'center' },
  timerValue: { fontSize: 60, fontWeight: '900', marginBottom: 20 },
  row: { flexDirection: 'row', width: '100%' },
  actionBtn: { paddingVertical: 15, borderRadius: 15, alignItems: 'center', width: '100%' },
  actionBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  emojiRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  emoji: { fontSize: 30 }
});
