import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, Alert
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
  const [loading, setLoading] = useState(true);
  const [nudgeMessage, setNudgeMessage] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        try {
          console.log("Home: Fetching data...");
          let storedUserId = user?.id || await AsyncStorage.getItem('currentUserId');

          if (!storedUserId) {
            console.warn("Home: No User ID, stopping.");
            setLoading(false);
            return;
          }

          // Check for nudge setting
          const nudgeSetting = await AsyncStorage.getItem('settings_nudge');
          if (nudgeSetting === 'true') {
            setNudgeMessage("Ready to start another session? Focus deep!");
          } else {
            setNudgeMessage(null);
          }

          const urlSuffix = `?user_id=${storedUserId}`;
          const config = { timeout: 5000 }; // 5 second timeout

          // Fetch unified stats (including category counts)
          try {
            console.log("Home: Calling unified stats...");
            const res = await axios.get(`${API_BASE_URL}/breaks/stats${urlSuffix}`, config);
            if (res.data) {
                setStats(res.data);
                setSessionsToday(res.data.SessionsToday || 0);
                setTotalStudyTime(res.data.TotalStudyTimeToday || 0);
                if (res.data.categoryCounts) {
                    setCounts(res.data.categoryCounts);
                }
            }
          } catch (e) {
            console.error("Home stats fetch failed:", e.message);
          }

          console.log("Home: Fetch complete.");
        } catch (e) {
          console.error("Home Main Error:", e);
        } finally {
          setLoading(false);
        }
      };

      setLoading(true);
      fetchData();
    }, [user])
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ color: colors.textPrimary, marginTop: 15, fontSize: 16 }}>Syncing Data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: 'Syne-Bold' }]}>
            Your Break <Text style={[styles.titleHighlight, { color: colors.accent, fontFamily: 'Syne-Bold' }]}>Analytics</Text>
          </Text>
          <Text style={[styles.subtitle, { fontFamily: 'Outfit' }]}>Track your cognitive recovery.</Text>
        </View>

        {nudgeMessage && (
          <View style={[styles.notificationBox, { backgroundColor: colors.card, borderColor: colors.accent }]}>
             <Ionicons name="notifications" size={16} color={colors.accent} style={{marginRight: 10}} />
             <Text style={[styles.notificationText, { color: colors.textPrimary }]}>{nudgeMessage}</Text>
          </View>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.row}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statLabel, { fontFamily: 'Inter'}]}>Total Breaks</Text>
              <Text style={[styles.statValue, { color: colors.accent, fontFamily: 'Inter-Bold' }]}>{stats.totalBreaks || 0}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statLabel, { fontFamily: 'Inter'}]}>Ave Score</Text>
              <Text style={[styles.statValue, { color: '#7F00FF', fontFamily: 'Inter-Bold' }]}>{Number(stats.avgScore || 0).toFixed(1)}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statLabel, { fontFamily: 'Inter'}]}>Best Score</Text>
              <Text style={[styles.statValue, { color: '#FACC15', fontFamily: 'Inter-Bold' }]}>{stats.bestScore || 0}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statLabel, { fontFamily: 'Inter'}]}>Top Category</Text>
              <Text style={[styles.statValue, {
                color: (stats.topCategory && stats.topCategory !== 'None') ? '#FACC15' : colors.textSecondary,
                fontSize: 13,
                fontFamily: 'Inter-Bold'
              }]}>
                {(!stats.topCategory || stats.topCategory === 'None') ? 'No Breaks Yet' : stats.topCategory}
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statLabel, { fontFamily: 'Inter'}]}>Study Sessions Today</Text>
              <Text style={[styles.statValue, { color: '#FF8C42', fontFamily: 'Inter-Bold' }]}>{sessionsToday}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statLabel, { fontFamily: 'Inter'}]}>Total Study Time</Text>
              <Text style={[styles.statValue, { color: '#FF5C8D', fontSize: 16, fontFamily: 'Inter-Bold' }]}>{totalStudyTime}m</Text>
            </View>
          </View>
        </View>

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

        {/* WORKINGS SECTION */}
        <View style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 20 }]}>
          <Text style={[styles.cardHeader, { color: '#64748b', marginBottom: 15 }]}>HOW BREAKSENSE WORKS</Text>
          <View style={[styles.divider, { backgroundColor: colors.border, marginBottom: 20 }]} />
          {[
            {
              num: 1,
              title: 'Study Session',
              desc: 'Set your Promodoro timer and focus deep.'
            },
            {
              num: 2,
              title: 'Check In',
              desc: 'Rate fatigue, stress & available break time.'
            },
            {
              num: 3,
              title: 'KNN Predicts',
              desc: 'Nearest past sessions vote on best break category.'
            },
            {
              num: 4,
              title: 'Rate & Repeat',
              desc: 'Your score trains the model. Resume studying refreshed.'
            }
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
  container: { flex: 1, backgroundColor: '#0f141e' },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  titleContainer: { marginBottom: 25 },
  title: { color: '#fff', fontSize: 25 },
  titleHighlight: { color: '#39ef8d' },
  subtitle: { color: '#888', fontSize: 14 },
  statsGrid: { gap: 12, marginBottom: 15, fontFamily: 'Inter' },
  row: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#1b222d', padding: 15, borderRadius: 16, height: 90, justifyContent: 'center' },
  statLabel: { color: '#64748b', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 24 },
  mainCard: { backgroundColor: '#1b222d', borderRadius: 20, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: '#2a3342' },
  cardHeader: { color: '#39ef8d', fontSize: 13, letterSpacing: 1.5, marginBottom: 5, fontFamily: 'JetBrains' },
  divider: { height: 1, backgroundColor: '#2a3342', marginVertical: 12 },
  barItem: { marginBottom: 16 },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  barLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
  barCount: { color: '#39ef8d', fontWeight: 'bold' },
  barBg: { height: 6, backgroundColor: '#0f141e', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%' },
  workingsSection: { marginBottom: 30 },
  stepCard: {
    flexDirection: 'row',
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  stepAccent: {
      width: 4,                   // thickness of the green line
      alignSelf: 'stretch',       // stretches full height of the card
      backgroundColor: '#39ef8d',
    },
  stepContent: {
    flex: 1,
   padding: 16,
    paddingLeft: 16
  },
  stepNumberLarge: {
    fontSize: 32,
    marginBottom: 5
  },
  stepTitleBold: {
    fontSize: 15,
    marginBottom: 5
  },
  stepDescSubtle: {
    fontSize: 12,
    lineHeight: 20
  },
  notificationBox: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20
  },
  notificationText: {
    fontSize: 13,
    fontWeight: 'bold'
  }
});