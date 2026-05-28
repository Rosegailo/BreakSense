import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import { API_BASE_URL } from '../Config';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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

        if (savedSessions) setTotalSessions(parseInt(savedSessions));
        if (savedCurrent) setCurrentSession(parseInt(savedCurrent));

        const dur = savedPomodoro ? parseInt(savedPomodoro.split(' ')[0]) : 25;
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
            playRingtone();
          }
        } else {
          setTimeLeft(dur * 60);
        }
      } catch (e) {}
    };
    loadPersistence();

    // Request notification permissions
    Notifications.requestPermissionsAsync();
  }, []);

  // Handle App State Changes (Foreground/Background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        const savedEndTime = await AsyncStorage.getItem('timer_end_time');
        const savedIsRunning = await AsyncStorage.getItem('timer_is_running');

        if (savedIsRunning === 'true' && savedEndTime) {
          const remaining = Math.round((parseInt(savedEndTime) - Date.now()) / 1000);
          if (remaining <= 0) {
            setTimeLeft(0);
            setIsRunning(false);
            setTimerComplete(true);
            playRingtone();
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
      const userId = await AsyncStorage.getItem('currentUserId');
      if (userId) {
        await axios.post(`${API_BASE_URL}/breaks/log-study`, {
          user_id: userId,
          study_duration: duration
        });
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
      playRingtone();
      saveStudyLog(sessionDuration);
    }
  }, [timeLeft, isRunning]);

  const startTimer = async () => {
    const endTime = Date.now() + timeLeft * 1000;
    await AsyncStorage.setItem('timer_end_time', endTime.toString());
    await AsyncStorage.setItem('timer_is_running', 'true');

    // Schedule Notification
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Study Session Complete!",
        body: "Time for a break and a quick check-in.",
        sound: true,
      },
      trigger: { seconds: timeLeft },
    });

    setTimerComplete(false);
    setIsRunning(true);
  };

  const stopTimer = async () => {
    const totalSecondsPossible = sessionDuration * 60;
    const secondsSpent = totalSecondsPossible - timeLeft;
    const timeSpentMinutes = Math.max(1, Math.floor(secondsSpent / 60));

    setIsRunning(false);
    await AsyncStorage.setItem('timer_is_running', 'false');
    await Notifications.cancelAllScheduledNotificationsAsync();
    await stopRingtone();
    await saveStudyLog(timeSpentMinutes);
    advanceSession();

    return timeSpentMinutes;
  };

  const resetTimer = async () => {
    setIsRunning(false);
    await AsyncStorage.setItem('timer_is_running', 'false');
    await Notifications.cancelAllScheduledNotificationsAsync();
    stopRingtone();
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
     // Implementation omitted for brevity
  };

  return (
    <TimerContext.Provider value={{
      minutes, seconds, isRunning, sessionDuration,
      setSessionDuration: updateSessionDuration,
      currentSession, setCurrentSession,
      totalSessions, setTotalSessions,
      startTimer, stopTimer, resetTimer,
      timerComplete, setTimerComplete,
      playRingtone, stopRingtone,
      advanceSession, reloadSettings
    }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => useContext(TimerContext);
