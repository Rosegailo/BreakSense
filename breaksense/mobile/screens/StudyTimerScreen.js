import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from './components/Header';
import axios from 'axios';
import { API_BASE_URL } from '../Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useTimer } from '../context/TimerContext';

export default function StudyTimerScreen({ navigation }) { 
  const { colors } = useTheme();
  const {
    minutes, seconds, isRunning, sessionDuration,
    setSessionDuration,
    currentSession, setCurrentSession,
    totalSessions, setTotalSessions,
    startTimer, pauseTimer, stopTimer, resetTimer,
    timerComplete, setTimerComplete,
    stopRingtone, advanceSession, reloadSettings, timeLeft
  } = useTimer();
  
  const [sessionsCount, setSessionsCount] = useState(0);
  const [totalStudyTime, setTotalStudyTime] = useState(0);
  const [dayStreak, setDayStreak] = useState(0);
  
  const [notificationState, setNotificationState] = useState({
    message: null,
    type: 'success'
  });

  useEffect(() => {
    if (timerComplete) {
      const finishedSession = currentSession;
      const isLast = currentSession === totalSessions;

      Alert.alert(
        "Study Session Complete!",
        `Great job completing Session ${finishedSession}! Click OK to stop the alarm and head to your break check-in.`,
        [{
          text: "OK",
          onPress: async () => {
            await stopRingtone();
            setTimerComplete(false);

            // Advance to next session for the UI
            advanceSession();

            navigation.navigate('Check-in', {
              sessionDuration: sessionDuration,
              sessionNumber: finishedSession,
              isLastSession: isLast
            });
          }
        }]
      );

      // Optimistically update local counters
      setSessionsCount(prev => (parseInt(prev) || 0) + 1);
      setTotalStudyTime(prev => {
        const currentNum = parseInt(prev) || 0;
        return currentNum + sessionDuration;
      });
    }
  }, [timerComplete]);

  // Load settings only once when the screen is first visited
  useEffect(() => {
    reloadSettings();
  }, []);

  // Fetch user stats with Daily Reset logic
  useFocusEffect(
    useCallback(() => {
      const fetchStats = async () => {
        try {
          const userId = await AsyncStorage.getItem('currentUserId');
          if (!userId) return;

          const now = new Date();
          const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

          const lastVisit = await AsyncStorage.getItem('last_visit_date');
          const lastSessionDate = await AsyncStorage.getItem('last_session_date');
          let currentStreak = parseInt(await AsyncStorage.getItem('user_streak') || '0');

          if (lastVisit !== today) {
            setSessionsCount(0);
            setTotalStudyTime(0);
            setCurrentSession(1); // Reset to session 1 at start of new day
            await AsyncStorage.setItem('timer_current_session', '1');

            const yesterdayDate = new Date();
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

            if (lastSessionDate !== yesterdayStr && lastSessionDate !== today) {
              currentStreak = 0;
              await AsyncStorage.setItem('user_streak', '0');
            }

            await AsyncStorage.setItem('last_visit_date', today);
          }

          if (lastSessionDate === today) {
            setDayStreak(Math.max(0, currentStreak - 1));
          } else {
            setDayStreak(currentStreak);
          }

          const response = await axios.get(`${API_BASE_URL}/breaks/stats?user_id=${userId}&date=${today}`, { timeout: 15000 });
          if (response.data) {
            // Trust server data for today's progress
            const completed = response.data.SessionsToday || 0;
            setSessionsCount(completed);
            setTotalStudyTime(response.data.TotalStudyTimeToday || 0);

            // SYNC TIMER SESSION: If not running, set to next session after what's completed today
            if (!isRunning) {
              const nextSess = (completed % totalSessions) + 1;
              setCurrentSession(nextSess);
              await AsyncStorage.setItem('timer_current_session', nextSess.toString());
            }
          }
        } catch (error) {
          console.error('Failed to fetch user stats:', error);
        }
      };
      fetchStats();
    }, [isRunning]) // Added dependency
  );

  const handleDurationChange = (duration) => {
    if (isRunning) return;
    setSessionDuration(duration);
    setNotificationState({ message: null, type: 'success' });
  };

  const handleStart = () => {
    setNotificationState({ message: null, type: 'success' });
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  const handleReset = async () => {
    // If we have started (even if paused), this is "Done" (Stop early)
    if (timeLeft < sessionDuration * 60) {
      const finishedSession = currentSession;
      const isLast = currentSession === totalSessions;
      const timeSpentMinutes = await stopTimer();

      setSessionsCount(prev => (parseInt(prev) || 0) + 1);
      setTotalStudyTime(prev => {
        const currentNum = parseInt(prev) || 0;
        return currentNum + timeSpentMinutes;
      });

      // Go DIRECTLY to Check-in
      navigation.navigate('Check-in', {
        sessionDuration: timeSpentMinutes,
        sessionNumber: finishedSession,
        isLastSession: isLast
      });

    } else {
      resetTimer();
      setNotificationState({ message: null, type: 'success' });
    }
  };

  const formatTime = (time) => {
    return time < 10 ? `0${time}` : `${time}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: 'Syne-Bold' }]}>
            Study <Text style={[styles.titleHighlight, { color: colors.accent }]}>Timer</Text>
          </Text>
          <Text style={styles.subtitle}>POMODORO focus sessions.</Text>
        </View>

        {notificationState.message && (
          <View style={[
            styles.notificationBox, 
            notificationState.type === 'danger' ? styles.dangerBox : [styles.successBox, { borderColor: colors.accent, backgroundColor: colors.accent + '26' }]
          ]}>
            <Text style={[
              styles.notificationText, 
              notificationState.type === 'danger' ? styles.dangerText : [styles.successText, { color: colors.accent }]
            ]}>
              {notificationState.message}
            </Text>
          </View>
        )}

        <View style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardHeader, { color: '#64748b' }]}>SESSION DURATION</Text>
          <View style={styles.durationButtons}>
            {[15, 25, 45, 60].map((duration) => (
              <TouchableOpacity 
                key={duration}
                style={[
                  styles.durationBtn,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  sessionDuration === duration && { borderColor: '#FFD700', backgroundColor: '#FFD70026' }
                ]}
                onPress={() => handleDurationChange(duration)}
              >
                <Text style={[
                  styles.durationBtnText,
                  sessionDuration === duration && { color: '#FFD700' }
                ]}>
                  {duration} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.timerContainer}>
            <View style={[styles.ringBackground, { borderColor: colors.background }]}>
              <Text style={styles.timerText}>
                {formatTime(minutes)}:{formatTime(seconds)}
              </Text>
              <Text style={styles.sessionLabel}>
                SESSION {currentSession} OF {totalSessions}
              </Text>
            </View>
          </View>

          <View style={styles.indicatorContainer}>
            {Array.from({ length: totalSessions }).map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.dot, 
                  { backgroundColor: colors.background },
                  (index + 1) <= currentSession && { backgroundColor: '#FFD700' }
                ]} 
              />
            ))}
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={handleStart}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isRunning ? "pause" : "play"}
                size={16}
                color="#000"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.startBtnText}>
                {isRunning ? 'Pause Session' : (timeLeft < sessionDuration * 60 ? 'Resume Session' : 'Start Study Session')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.stopBtn, (timeLeft === sessionDuration * 60) && { opacity: 0.5 }]}
              onPress={handleReset}
              disabled={timeLeft === sessionDuration * 60}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {timerComplete && (
            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: '#ff3b30', marginTop: 15 }]}
              onPress={async () => {
                const finishedSession = currentSession;
                const isLast = currentSession === totalSessions;

                await stopRingtone();
                setTimerComplete(false);
                advanceSession();

                navigation.navigate('Check-in', {
                  sessionDuration: sessionDuration,
                  sessionNumber: finishedSession,
                  isLastSession: isLast
                });
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-off" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={[styles.startBtnText, { color: '#fff' }]}>Stop Alarm</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardHeader, { color: '#64748b' }]}>TODAY'S PROGRESS</Text>
          <View style={styles.progressRow}>
            <View style={[styles.progressBox, { backgroundColor: colors.background }]}>
              <Text style={styles.progressValue}>{sessionsCount}</Text>
              <Text style={styles.progressLabel}>SESSIONS</Text>
            </View>
            <View style={[styles.progressBox, { backgroundColor: colors.background }]}>
              <Text style={styles.progressValue}>{totalStudyTime}m</Text>
              <Text style={styles.progressLabel}>STUDY TIME</Text>
            </View>
            <View style={[styles.progressBox, { backgroundColor: colors.background }]}>
              <Text style={styles.progressValue}>{dayStreak}d</Text>
              <Text style={styles.progressLabel}>STREAK</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  titleContainer: { marginBottom: 25 },
  title: { fontSize: 20 },
  titleHighlight: { },
    subtitle: { color: '#888', fontSize: 13, marginTop: 5 },
  notificationBox: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  successBox: {
    backgroundColor: 'rgba(0, 255, 102, 0.15)',
    borderColor: '#00FF66',
  },
  dangerBox: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderColor: '#FF3B30',
  },
  notificationText: { 
    fontSize: 13, 
    fontWeight: 'bold', 
    textAlign: 'center' 
  },
  successText: { color: '#00FF66' },
  dangerText: { color: '#FF3B30' },
  mainCard: { 
    borderRadius: 20,
    padding: 20, 
    marginBottom: 20, 
    borderWidth: 1, 
  },
  cardHeader: { 
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 12, 
    textAlign: 'center' 
  },
  durationButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    gap: 8, 
    marginBottom: 20 
  },
  durationBtn: { 
    flex: 1, 
    paddingVertical: 12, 
    borderRadius: 12, 
    alignItems: 'center',
    borderWidth: 1, 
  },
  durationBtnText: { 
    fontSize: 12,
    fontWeight: 'bold'
  },
  timerContainer: { 
    alignItems: 'center', 
    marginVertical: 20 
  },
  ringBackground: {
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  timerText: { 
    color: '#FFD700', 
    fontSize: 38,
    fontFamily: 'Inter-Bold'
  },
  sessionLabel: { 
    color: '#64748b', 
    fontSize: 11, 
    letterSpacing: 1, 
    marginTop: 4, 
    fontWeight: '600' 
  },
  indicatorContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 6, 
    marginBottom: 20 
  },
  dot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  startBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  stopBtn: {
    width: 25,
    height: 25,
    backgroundColor: '#ff3b30',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  disabledBtn: {
    opacity: 0.6
  },
  startBtnText: { 
    color: '#000', 
    fontWeight: 'bold', 
    fontSize: 14 
  },
  progressRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 10 
  },
  progressBox: { 
    flex: 1, 
    alignItems: 'center', 
    paddingVertical: 10, 
    borderRadius: 16,
    marginHorizontal: 4 
  },
  progressValue: { 
    color: '#FFD700', 
    fontSize: 24, 
    fontWeight: '900', 
    marginBottom: 4 
  },
  progressLabel: { 
    color: '#64748b', 
    fontSize: 10, 
    fontWeight: 'bold' 
  }
});