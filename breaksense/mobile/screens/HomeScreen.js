import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../Config';
import Header from './components/Header';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useUser } from '../UserContext';
import { useTheme } from '../context/ThemeContext';

const CATEGORY_COLORS = {
  'Physical Movement': '#00FF66',
  'Mindfulness': '#8a2be2',
  'Nutrition': '#FFD700',
  'Rest & Recovery': '#3B82F6',
};

export default function HomeScreen() {
  const { user } = useUser();
  const { colors } = useTheme();

  const [stats, setStats] = useState({
    totalBreaks: 0, 
    avgScore: 0, 
    bestScore: 0, 
    topCategory: 'None',
  });
  const [counts, setCounts] = useState({ 
    'Physical Movement': 0, 
    'Mindfulness': 0, 
    'Nutrition': 0, 
    'Rest & Recovery': 0 
  });
  const [sessionsToday, setSessionsToday] = useState(0);
  const [totalStudyTime, setTotalStudyTime] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nudgeMessage, setNudgeMessage] = useState(null);

  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const lastVisit = await AsyncStorage.getItem('last_visit_date');
        const lastSessionDate = await AsyncStorage.getItem('last_session_date');
        const cachedStreak = await AsyncStorage.getItem('user_streak');

        if (cachedStreak) {
          const s = parseInt(cachedStreak);
          setStreak(lastSessionDate === today ? Math.max(0, s - 1) : s);
        }

        if (lastVisit === today) {
          const cachedStats = await AsyncStorage.getItem('cached_stats');
          if (cachedStats) {
            const data = JSON.parse(cachedStats);
            setStats(data);

            // Check if we actually did a session today
            if (lastSessionDate === today) {
              setSessionsToday(data.SessionsToday || 0);
              setTotalStudyTime(data.TotalStudyTimeToday || 0);
            } else {
              setSessionsToday(0);
              setTotalStudyTime(0);
            }

            if (data.categoryCounts) setCounts(data.categoryCounts);
            // Don't return early - allow useFocusEffect to fetch fresh data
          }
        }

        setSessionsToday(0);
        setTotalStudyTime(0);
        setStats({ totalBreaks: 0, avgScore: 0, bestScore: 0, topCategory: 'None' });
        setCounts({ 'Physical Movement': 0, 'Mindfulness': 0, 'Nutrition': 0, 'Rest & Recovery': 0 });
      } catch (e) {}
    };
    loadCachedData();
  }, []);

  const fetchData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);

      let storedUserId = user?.id || await AsyncStorage.getItem('currentUserId');
      if (!storedUserId) {
        setLoading(false);
        return;
      }

      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const lastSessionDate = await AsyncStorage.getItem('last_session_date');
      const lastVisit = await AsyncStorage.getItem('last_visit_date');
      let currentStreak = parseInt(await AsyncStorage.getItem('user_streak') || '0');

      // 1. Check for Daily Reset (app open on new day)
      if (lastVisit !== today) {
        // Reset streak to 0 IF they missed yesterday
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

        if (lastSessionDate !== yesterdayStr && lastSessionDate !== today) {
          currentStreak = 0;
          await AsyncStorage.setItem('user_streak', '0');
        }

        await AsyncStorage.setItem('last_visit_date', today);
        await AsyncStorage.removeItem('cached_stats');
      }

      // STREAK DISPLAY: Show "Completed Days"
      // If we studied today, show (Streak - 1). If not, show full Streak.
      if (lastSessionDate === today) {
        setStreak(Math.max(0, currentStreak - 1));
      } else {
        setStreak(currentStreak);
      }

      // 2. Fetch from server
      const nudgeSetting = await AsyncStorage.getItem('settings_nudge');
      setNudgeMessage(nudgeSetting === 'true' ? "Ready to start another session? Focus deep!" : null);

      const urlSuffix = `?user_id=${storedUserId}&date=${today}`;
      console.log(`[Home] Fetching stats for user: ${storedUserId} at ${API_BASE_URL}/breaks/stats${urlSuffix}`);
      const res = await axios.get(`${API_BASE_URL}/breaks/stats${urlSuffix}`, { timeout: 15000 });

      if (res.data) {
        console.log("[Home] Stats received:", res.data);
        setStats(res.data);

        // Trust server data for today's progress
        setSessionsToday(res.data.SessionsToday || 0);
        setTotalStudyTime(res.data.TotalStudyTimeToday || 0);

        if (res.data.categoryCounts) setCounts(res.data.categoryCounts);
        await AsyncStorage.setItem('cached_stats', JSON.stringify(res.data));
      } else {
        console.warn("[Home] No data in response");
      }
    } catch (e) {
      console.error("Home stats fetch failed:", e.message);
      Alert.alert("Sync Error", "Could not connect to the server. Please check your internet connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [user])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [user]);

  if (loading && !refreshing && !stats.totalBreaks && sessionsToday === 0) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ color: colors.textPrimary, marginTop: 15, fontSize: 16 }}>Syncing your progress...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <View style={styles.titleContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary, fontFamily: 'Syne-Bold', fontSize: 20 }]}>
                Your Break <Text style={{ color: colors.accent }}>Analytics</Text>
              </Text>
              <Text style={[styles.subtitle, { fontFamily: 'Outfit', color: colors.textSecondary, marginTop: 5 }]}>
                Track your cognitive recovery.
              </Text>
            </View>
            <View style={[styles.streakBadge, { backgroundColor: colors.card, borderColor: colors.accent }]}>
              <Ionicons name="flame" size={20} color={colors.accent} />
              <Text style={[styles.streakText, { color: colors.textPrimary }]}>{streak}d</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {/* Row 1 */}
          <View style={styles.row}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={styles.statLabel}>Total Breaks</Text>
              <Text style={[styles.statValue, { color: colors.accent, fontFamily: 'Michroma' }]}>
                {stats.totalBreaks || 0}
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={styles.statLabel}>Ave Score</Text>
              <Text style={[styles.statValue, { color: '#a855f7', fontFamily: 'Michroma' }]}>
                {Number(stats.avgScore || 0).toFixed(1)}
              </Text>
            </View>
          </View>

          {/* Row 2 */}
          <View style={styles.row}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={styles.statLabel}>Best Score</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.statValue, { color: '#fbbf24', fontFamily: 'Michroma' }]}>
                  {stats.bestScore || 0}
                </Text>
                <Text style={{ fontSize: 18, color: '#fbbf24', marginLeft: 8 }}>⭐</Text>
              </View>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={styles.statLabel}>Top Category</Text>
              <Text style={[styles.statValue, { color: '#fbbf24', fontFamily: 'Michroma', fontSize: 13 }]} numberOfLines={1}>
                {(!stats.topCategory || stats.topCategory === 'None') ? 'None' : stats.topCategory}
              </Text>
            </View>
          </View>

          {/* Row 3 */}
          <View style={styles.row}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={styles.statLabel}>Sessions Today</Text>
              <Text style={[styles.statValue, { color: '#f97316', fontFamily: 'Michroma' }]}>
                {sessionsToday}
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={styles.statLabel}>Total Study Time</Text>
              <Text style={[styles.statValue, { color: '#ec4899', fontFamily: 'Michroma' }]}>
                {totalStudyTime}m
              </Text>
            </View>
          </View>
        </View>

        {nudgeMessage && (
          <View style={[styles.notificationBox, { backgroundColor: colors.card, borderColor: colors.accent }]}>
             <Ionicons name="notifications" size={16} color={colors.accent} style={{marginRight: 10}} />
             <Text style={[styles.notificationText, { color: colors.textPrimary }]}>{nudgeMessage}</Text>
          </View>
        )}

        <View style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardHeader, { color: '#64748b' }]}>CATEGORY DISTRIBUTION</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {Object.entries(counts).map(([category, count]) => (
            <View key={category} style={styles.barItem}>
              <View style={styles.barRow}>
                <Text style={[styles.barLabel, { color: colors.textPrimary }]}>{category}</Text>
                <Text style={[styles.barCount, { color: colors.accent }]}>{count}</Text>
              </View>
              <View style={[styles.barBg, { backgroundColor: colors.background }]}>
                <View 
                  style={[
                    styles.barFill, 
                    { 
                      width: `${Math.min((count / (parseInt(stats.totalBreaks) || 1)) * 100, 100)}%`,
                      backgroundColor: CATEGORY_COLORS[category] || colors.accent
                    }
                  ]} 
                />
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 20 }]}>
          <Text style={[styles.cardHeader, { color: '#64748b', marginBottom: 15 }]}>HOW BREAKSENSE WORKS</Text>
          <View style={[styles.divider, { backgroundColor: colors.border, marginBottom: 20 }]} />
          {[
            { num: 1, title: 'Study Session', desc: 'Set your Pomodoro timer and focus deep.' },
            { num: 2, title: 'Check In', desc: 'Rate fatigue, stress & available break time.' },
            { num: 3, title: 'KNN Predicts', desc: 'Nearest past sessions vote on best break category.' },
            { num: 4, title: 'Rate & Repeat', desc: 'Your score trains the model. Resume studying refreshed.' }
          ].map((step) => (
            <View key={step.num} style={[styles.stepCard, { backgroundColor: colors.background }]}>
              <View style={[styles.stepAccent, { backgroundColor: colors.accent }]} />
              <View style={styles.stepContent}>
                <Text style={[styles.stepNumberLarge, { color: colors.accent, fontFamily: 'Syne-Bold' }]}>{step.num}</Text>
                <Text style={[styles.stepTitleBold, { color: colors.textPrimary, fontFamily: 'Inter-Bold' }]}>{step.title}</Text>
                <Text style={[styles.stepDescSubtle, { color: '#94a3b8', fontFamily: 'Inter' }]}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  titleContainer: { marginBottom: 25 },
  title: { fontSize: 22 },
  titleHighlight: { },
  subtitle: { color: '#888', fontSize: 14 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  streakText: { marginLeft: 4, fontWeight: 'bold', fontSize: 14 },
  statsGrid: { gap: 12, marginBottom: 20 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, padding: 18, borderRadius: 20, height: 110, justifyContent: 'center' },
  statLabel: { color: '#64748b', fontSize: 11, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'Inter' },
  statValue: { fontSize: 26 },
  mainCard: { borderRadius: 20, padding: 20, marginBottom: 30, borderWidth: 1 },
  cardHeader: { fontSize: 13, letterSpacing: 1.5, marginBottom: 5, fontFamily: 'JetBrains' },
  divider: { height: 1, marginVertical: 12 },
  barItem: { marginBottom: 16 },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  barLabel: { fontSize: 13, fontWeight: '600' },
  barCount: { fontWeight: 'bold' },
  barBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%' },
  stepCard: { flexDirection: 'row', borderRadius: 20, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  stepAccent: { width: 4, alignSelf: 'stretch' },
  stepContent: { flex: 1, padding: 16 },
  stepNumberLarge: { fontSize: 32, marginBottom: 5 },
  stepTitleBold: { fontSize: 15, marginBottom: 5 },
  stepDescSubtle: { fontSize: 12, lineHeight: 20 },
  notificationBox: { flexDirection: 'row', padding: 15, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginBottom: 20 },
  notificationText: { fontSize: 13, fontWeight: 'bold' }
});