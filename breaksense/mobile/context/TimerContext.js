import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import { API_BASE_URL } from '../Config';

// Configure notifications (Mobile only)
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const TimerContext = createContext();

export const TimerProvider = ({ children }) => {
  const [sessionDuration, setSessionDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [currentSession, setCurrentSession] = useState(1);
  const [totalSessions, setTotalSessions] = useState(4);
  const [timerComplete, setTimerComplete] = useState(false);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const timerRef = useRef(null);
  const soundRef = useRef(null);
  const appState = useRef(AppState.currentState);

  // Load persistence
  useEffect(() => {
    const loadPersistence = async () => {
      try {
        const savedSessions = await AsyncStorage.getItem('settings_sessions');
        const savedPomodoro = await AsyncStorage.getItem('settings_pomodoro');
        const savedCurrent = await AsyncStorage.getItem('timer_current_session');
        const savedEndTime = await AsyncStorage.getItem('timer_end_time');
        const savedIsRunning = await AsyncStorage.getItem('timer_is_running');

        if (savedSessions) setTotalSessions(parseInt(savedSessions) || 4);
        if (savedCurrent) setCurrentSession(parseInt(savedCurrent) || 1);

        const dur = savedPomodoro ? (parseInt(savedPomodoro.split(' ')[0]) || 25) : 25;
        setSessionDuration(dur);

        if (savedIsRunning === 'true' && savedEndTime) {
          const remaining = Math.round((parseInt(savedEndTime) - Date.now()) / 1000);
          if (remaining > 0) {
            setTimeLeft(remaining);
            setIsRunning(true);
          } else {
            setTimeLeft(0);
            setTimerComplete(true);
            setIsRunning(false);
            if (Platform.OS !== 'web') playRingtone();
          }
        } else {
          setTimeLeft(dur * 60);
        }
      } catch (e) {
        console.error("Timer persistence load error:", e);
      }
    };
    loadPersistence();

    if (Platform.OS !== 'web') {
      Notifications.requestPermissionsAsync();
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        const savedEndTime = await AsyncStorage.getItem('timer_end_time');
        const savedIsRunning = await AsyncStorage.getItem('timer_is_running');

        if (savedIsRunning === 'true' && savedEndTime) {
          const remaining = Math.round((parseInt(savedEndTime) - Date.now()) / 1000);
          if (remaining <= 0) {
            setTimeLeft(0);
            setIsRunning(false);
            setTimerComplete(true);
            if (Platform.OS !== 'web') playRingtone();
          } else {
            setTimeLeft(remaining);
          }
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  const playRingtone = async () => {
    if (Platform.OS === 'web') return;
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/alarm.mp3'),
        { shouldPlay: true, isLooping: true }
      );
      soundRef.current = sound;
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  };

  const stopRingtone = async () => {
    if (Platform.OS === 'web') return;
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (error) {
      console.log('Error stopping sound:', error);
    }
  };

  const saveStudyLog = async (duration) => {
    try {
      const storedUserId = await AsyncStorage.getItem('currentUserId');
      const userJson = await AsyncStorage.getItem('user');
      const userId = storedUserId || (userJson ? JSON.parse(userJson).id : null);

      if (userId) {
        console.log(`[Timer] Logging study session: ${duration}m for user ${userId}`);
        await axios.post(`${API_BASE_URL}/breaks/log-study`, {
          user_id: userId,
          study_duration: duration
        });
      } else {
        console.warn("[Timer] Cannot log study session: No User ID found.");
      }
    } catch (e) {
      console.error("Failed to save study session to DB:", e.message);
    }
  };

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      setTimerComplete(true);
      AsyncStorage.setItem('timer_is_running', 'false');
      if (Platform.OS !== 'web') playRingtone();
      saveStudyLog(sessionDuration);
    }
  }, [timeLeft, isRunning]);

  const startTimer = async () => {
    // --- STREAK TRIGGER ON START ---
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const lastSessionDate = await AsyncStorage.getItem('last_session_date');

    if (lastSessionDate !== today) {
      let currentStreak = parseInt(await AsyncStorage.getItem('user_streak') || '0');
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

      if (lastSessionDate === yesterdayStr) {
        currentStreak += 1;
      } else {
        currentStreak = 1; // Start new streak
      }

      await AsyncStorage.setItem('user_streak', currentStreak.toString());
      await AsyncStorage.setItem('last_session_date', today); // Mark that we started today
    }

    // Safety: Ensure timeLeft is valid before starting.
    // If user starts with 0 time, reset it to full duration.
    let secondsToWait = timeLeft;
    if (isNaN(secondsToWait) || secondsToWait <= 0) {
      secondsToWait = sessionDuration * 60;
      setTimeLeft(secondsToWait);
    }

    const endTime = Date.now() + (secondsToWait * 1000);
    await AsyncStorage.setItem('timer_end_time', endTime.toString());
    await AsyncStorage.setItem('timer_is_running', 'true');

    // Schedule Notification (Mobile only)
    if (Platform.OS !== 'web') {
      const studyAlerts = await AsyncStorage.getItem('settings_studyAlerts');
      if (studyAlerts !== 'false') { // Default to true if not set
        await Notifications.cancelAllScheduledNotificationsAsync();

        // Only schedule if there's actually a significant amount of time left.
        // This prevents immediate notifications.
        if (secondsToWait > 1) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Study Session Complete!",
              body: "Time for a break and a quick check-in.",
              sound: true,
            },
            trigger: { seconds: secondsToWait },
          });
        }
      }
    }

    setTimerComplete(false);
    setIsRunning(true);
  };

  const pauseTimer = async () => {
    setIsRunning(false);
    await AsyncStorage.setItem('timer_is_running', 'false');
    if (Platform.OS !== 'web') {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  };

  const stopTimer = async () => {
    const totalSecondsPossible = sessionDuration * 60;
    const secondsSpent = totalSecondsPossible - timeLeft;
    const timeSpentMinutes = Math.max(1, Math.floor(secondsSpent / 60));

    setIsRunning(false);
    await AsyncStorage.setItem('timer_is_running', 'false');
    if (Platform.OS !== 'web') {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await stopRingtone();
    }
    await saveStudyLog(timeSpentMinutes);
    advanceSession();

    return timeSpentMinutes;
  };

  const resetTimer = async () => {
    setIsRunning(false);
    await AsyncStorage.setItem('timer_is_running', 'false');
    if (Platform.OS !== 'web') {
      await Notifications.cancelAllScheduledNotificationsAsync();
      stopRingtone();
    }
    setTimeLeft(sessionDuration * 60);
    setTimerComplete(false);
  };

  const advanceSession = () => {
    const next = currentSession < totalSessions ? currentSession + 1 : 1;
    setCurrentSession(next);
    AsyncStorage.setItem('timer_current_session', next.toString());
    setTimeLeft(sessionDuration * 60);
  };

  const updateSessionDuration = (dur) => {
    setSessionDuration(dur);
    if (!isRunning) {
      setTimeLeft(dur * 60);
    }
  };

  const reloadSettings = async () => {
    try {
      const savedSessions = await AsyncStorage.getItem('settings_sessions');
      const savedPomodoro = await AsyncStorage.getItem('settings_pomodoro');

      if (savedSessions) setTotalSessions(parseInt(savedSessions));
      if (savedPomodoro) {
        const dur = parseInt(savedPomodoro.split(' ')[0]);
        setSessionDuration(dur);

        // ONLY reset the clock if it's NOT running and
        // hasn't started yet (still at the original full duration)
        const isTimerUntouched = timeLeft === sessionDuration * 60;
        if (!isRunning && isTimerUntouched) {
          setTimeLeft(dur * 60);
        }
      }
    } catch (e) {
      console.error("Failed to reload settings:", e);
    }
  };

  return (
    <TimerContext.Provider value={{
      minutes, seconds, isRunning, sessionDuration,
      setSessionDuration: updateSessionDuration,
      currentSession, setCurrentSession,
      totalSessions, setTotalSessions,
      startTimer, pauseTimer, stopTimer, resetTimer,
      timerComplete, setTimerComplete,
      playRingtone, stopRingtone,
      advanceSession, reloadSettings, timeLeft
    }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => useContext(TimerContext);