import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../Config';

const TimerContext = createContext();

export const TimerProvider = ({ children }) => {
  const [sessionDuration, setSessionDuration] = useState(25);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentSession, setCurrentSession] = useState(1);
  const [totalSessions, setTotalSessions] = useState(4);
  const [timerComplete, setTimerComplete] = useState(false);

  const timerRef = useRef(null);
  const soundRef = useRef(null);

  const reloadSettings = async () => {
    try {
      const savedSessions = await AsyncStorage.getItem('settings_sessions');
      const savedPomodoro = await AsyncStorage.getItem('settings_pomodoro');
      if (savedSessions) setTotalSessions(parseInt(savedSessions));
      if (savedPomodoro && !isRunning) {
        const dur = parseInt(savedPomodoro.split(' ')[0]);
        setSessionDuration(dur);
        setMinutes(dur);
        setSeconds(0);
      }
    } catch (e) {
      console.error("Failed to reload timer settings", e);
    }
  };

  // Load persistence and settings on mount
  useEffect(() => {
    const loadPersistence = async () => {
      await reloadSettings();
      try {
        const savedCurrent = await AsyncStorage.getItem('timer_current_session');
        if (savedCurrent) setCurrentSession(parseInt(savedCurrent));
      } catch (e) {}
    };
    loadPersistence();
  }, []);

  // Save current session whenever it changes
  useEffect(() => {
    AsyncStorage.setItem('timer_current_session', currentSession.toString());
  }, [currentSession]);

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
        // 1. Log to users table for stats
        await axios.post(`${API_BASE_URL}/breaks/log-study`, {
          user_id: userId,
          study_duration: duration
        });

        // 2. Log to history table for the "Logs" screen
        await axios.post(`${API_BASE_URL}/breaks/save`, {
          user_id: userId,
          break_type: `Study Session ${currentSession}`,
          category: 'Focus Time',
          duration_taken: duration,
          fatigue_before: 0,
          stress_before: 0,
          rating: 5,
          session_number: currentSession
        });
      }
    } catch (e) {
      console.error("Failed to save study session to DB:", e.message);
    }
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds(prevSeconds => {
          if (prevSeconds > 0) {
            return prevSeconds - 1;
          } else {
            let currentMinutes;
            setMinutes(prevMinutes => {
              currentMinutes = prevMinutes;
              if (prevMinutes > 0) return prevMinutes - 1;
              return 0;
            });

            if (currentMinutes === 0) {
              clearInterval(timerRef.current);
              setIsRunning(false);
              playRingtone();
              saveStudyLog(sessionDuration);
              setTimerComplete(true);
              return 0;
            }
            return 59;
          }
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, sessionDuration, currentSession]);

  const startTimer = () => {
    setTimerComplete(false);
    setIsRunning(true);
  };

  const advanceSession = () => {
    setCurrentSession(prev => {
      const next = prev < totalSessions ? prev + 1 : 1;
      return next;
    });
    setMinutes(sessionDuration);
    setSeconds(0);
  };

  const stopTimer = async () => {
    const totalSecondsPossible = sessionDuration * 60;
    const secondsRemaining = (minutes * 60) + seconds;
    const secondsSpent = totalSecondsPossible - secondsRemaining;
    const timeSpentMinutes = Math.max(1, Math.floor(secondsSpent / 60));

    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);

    await saveStudyLog(timeSpentMinutes);
    advanceSession();

    return timeSpentMinutes;
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setMinutes(sessionDuration);
    setSeconds(0);
    setTimerComplete(false);
  };

  return (
    <TimerContext.Provider value={{
      minutes, seconds, isRunning, sessionDuration,
      setSessionDuration, setMinutes, setSeconds,
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
