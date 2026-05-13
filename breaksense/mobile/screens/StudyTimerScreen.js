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
import { useFonts, Syne_800ExtraBold } from '@expo-google-fonts/syne';
import { useTheme } from '../context/ThemeContext';
import { useTimer } from '../context/TimerContext';

export default function StudyTimerScreen({ navigation }) { 
  const { colors } = useTheme();
  const {
    minutes, seconds, isRunning, sessionDuration,
    setSessionDuration, setMinutes, setSeconds,
    currentSession, setCurrentSession,
    totalSessions, setTotalSessions,
    startTimer, stopTimer, resetTimer,
    timerComplete, setTimerComplete
  } = useTimer();
  
  const [sessionsCount, setSessionsCount] = useState(0);
  const [totalStudyTime, setTotalStudyTime] = useState('0m');
  const [dayStreak, setDayStreak] = useState(0);
  
  const [notificationState, setNotificationState] = useState({
    message: null,
    type: 'success'
  });

  // Handle Timer Completion Navigation
  useEffect(() => {
    if (timerComplete) {
      setNotificationState({
        message: `Session ${currentSession} complete! Heading to check-in...`,
        type: 'success'
      });

      // Update local progress counters
      setSessionsCount(prev => (typeof prev === 'number' ? prev : parseInt(prev) || 0) + 1);
      setTotalStudyTime(prev => {
        const currentNum = parseInt(prev) || 0;
        return `${currentNum + sessionDuration}m`;
      });

      setTimeout(() => {
        setTimerComplete(false);
        navigation.navigate('Check-in', {
          sessionDuration: sessionDuration,
          sessionNumber: currentSession,
          isLastSession: currentSession === totalSessions
        });

        // Reset for next
        if (currentSession < totalSessions) {
          setCurrentSession(prev => prev + 1);
        } else {
          setCurrentSession(1);
        }
        setMinutes(sessionDuration);
        setSeconds(0);
      }, 3000);
    }
  }, [timerComplete]);

  // Load settings on focus
  useFocusEffect(
    useCallback(() => {
      const loadSettings = async () => {
        try {
          const savedPomodoro = await AsyncStorage.getItem('settings_pomodoro');
          const savedSessions = await AsyncStorage.getItem('settings_sessions');

          if (!isRunning) {
            if (savedPomodoro) {
              const dur = parseInt(savedPomodoro.split(' ')[0]);
              setSessionDuration(dur);
              setMinutes(dur);
              setSeconds(0);
            }
            if (savedSessions) {
              setTotalSessions(parseInt(savedSessions));
            }
          }
        } catch (e) {
          console.error("Failed to load settings in Timer", e);
        }
      };
      loadSettings();
    }, [isRunning])
  );

  // Fetch user stats
  useFocusEffect(
    useCallback(() => {
      const fetchStats = async () => {
        try {
          const userId = await AsyncStorage.getItem('currentUserId');
          if (userId) {
            const response = await axios.get(`${API_BASE_URL}/breaks/stats?user_id=${userId}`);
            if (response.data) {
              setSessionsCount(response.data.SessionsToday || 0);
              const studyTime = response.data.TotalStudyTimeToday || 0;
              setTotalStudyTime(`${studyTime}m`);
              setDayStreak(response.data.DayStreak || 0);
            }
          }
        } catch (error) {
          console.error('Failed to fetch user stats:', error);
        }
      };
      fetchStats();
    }, [])
  );

  const handleDurationChange = (duration) => {
    if (isRunning) return;
    setSessionDuration(duration);
    setMinutes(duration);
    setSeconds(0);
    setNotificationState({ message: null, type: 'success' });
  };

  const handleStart = () => {
    setNotificationState({ message: null, type: 'success' });
    startTimer();
  };

  const handleReset = async () => {
    if (isRunning) {
      const timeSpentMinutes = await stopTimer();

      setNotificationState({
        message: `Session saved early (${timeSpentMinutes}m).`,
        type: 'success'
      });

      setSessionsCount(prev => (typeof prev === 'number' ? prev : parseInt(prev) || 0) + 1);
      setTotalStudyTime(prev => {
        const currentNum = parseInt(prev) || 0;
        return `${currentNum + timeSpentMinutes}m`;
      });

      setTimeout(() => {
        navigation.navigate('Check-in', {
          sessionDuration: timeSpentMinutes,
          sessionNumber: currentSession,
          isLastSession: currentSession === totalSessions
        });
      }, 1500);

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
          <Text style={[styles.title, { color: colors.textPrimary, fontWeight: '900' }]}>
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
              style={[styles.startBtn, isRunning && styles.disabledBtn]}
              onPress={handleStart}
              disabled={isRunning}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={16} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.startBtnText}>
                {isRunning ? 'Session in progress...' : 'Start Study Session'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stopBtn}
              onPress={handleReset}
              activeOpacity={0.8}
            />
          </View>
        </View>

        <View style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardHeader, { color: '#64748b' }]}>TODAY'S PROGRESS</Text>
          <View style={styles.progressRow}>
            <View style={[styles.progressBox, { backgroundColor: colors.background }]}>
              <Text style={styles.progressValue}>{sessionsCount}</Text>
              <Text style={styles.progressLabel}>SESSIONS</Text>
            </View>
            <View style={[styles.progressBox, { backgroundColor: colors.background }]}>
              <Text style={styles.progressValue}>{totalStudyTime}</Text>
              <Text style={styles.progressLabel}>STUDY TIME</Text>
            </View>
            <View style={[styles.progressBox, { backgroundColor: colors.background }]}>
              <Text style={styles.progressValue}>{dayStreak}</Text>
              <Text style={styles.progressLabel}>DAY STREAK</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f141e' },
  content: { padding: 20 },
  titleContainer: { marginBottom: 25 },
  title: { color: '#fff', fontSize: 25, fontWeight: '900' },
  titleHighlight: { color: '#39ef8d' },
  subtitle: { color: '#888', fontSize: 14 },
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
    backgroundColor: '#1b222d', 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: '#2a3342' 
  },
  cardHeader: { 
    color: '#FFD700', 
    fontSize: 11, 
    fontWeight: 'bold', 
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
    backgroundColor: '#2a3342', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#333b49' 
  },
  durationBtnActive: { 
    backgroundColor: '#FFD700', 
    borderColor: '#FFD700' 
  },
  durationBtnText: { 
    color: '#64748b', 
    fontSize: 12, 
    fontWeight: 'bold' 
  },
  durationBtnTextActive: { 
    color: '#000', 
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
    borderColor: '#2a3342',
    justifyContent: 'center',
    alignItems: 'center'
  },
  timerText: { 
    color: '#FFD700', 
    fontSize: 38, 
    fontWeight: '900' 
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
    backgroundColor: '#2a3342' 
  },
  activeDot: { 
    backgroundColor: '#FFD700' 
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
  stopSquare: {
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
    backgroundColor: '#0f141e', 
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