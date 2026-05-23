import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../Config';

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

  const reloadSettings = async (forceReset = false) => {
    try {
      const savedSessions = await AsyncStorage.getItem('settings_sessions');
      const savedPomodoro = await AsyncStorage.getItem('settings_pomodoro');

      if (savedSessions) {
        setTotalSessions(parseInt(savedSessions));
      }

      if (savedPomodoro) {
        const dur = parseInt(savedPomodoro.split(' ')[0]);
        setSessionDuration(dur);

        if (!isRunning && (forceReset || timeLeft === 0)) {

        }
      }
    } catch (e) {
      console.error("Failed to reload timer settings", e);
    }
  };

  useEffect(() => {
    const loadPersistence = async () => {
      try {
        const savedSessions = await AsyncStorage.getItem('settings_sessions');
        const savedPomodoro = await AsyncStorage.getItem('settings_pomodoro');
        const savedCurrent = await AsyncStorage.getItem('timer_current_session');

        if (savedSessions) setTotalSessions(parseInt(savedSessions));
        if (savedPomodoro) {
          const dur = parseInt(savedPomodoro.split(' ')[0]);
          setSessionDuration(dur);
          setTimeLeft(dur * 60);
        }
        if (savedCurrent) setCurrentSession(parseInt(savedCurrent));
      } catch (e) {}
    };
    loadPersistence();
  }, []);

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
        await axios.post(`${API_BASE_URL}/breaks/log-study`, {
          user_id: userId,
          study_duration: duration
        });

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

  // Improved Timer Logic with explicit completion handling
  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Handle completion when timeLeft reaches 0
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      setTimerComplete(true);
      playRingtone();
      saveStudyLog(sessionDuration);
    }
  }, [timeLeft, isRunning]);

  const startTimer = () => {
    if (timeLeft === 0) {
      setTimeLeft(sessionDuration * 60);
    }
    setTimerComplete(false);
    setIsRunning(true);
  };

  const advanceSession = () => {
    setCurrentSession(prev => (prev < totalSessions ? prev + 1 : 1));
    setTimeLeft(sessionDuration * 60);
  };

  const stopTimer = async () => {
    const totalSecondsPossible = sessionDuration * 60;
    const secondsSpent = totalSecondsPossible - timeLeft;
    const timeSpentMinutes = Math.max(1, Math.floor(secondsSpent / 60));

    setIsRunning(false);
    await stopRingtone(); // Ensure sound stops
    await saveStudyLog(timeSpentMinutes);
    advanceSession();

    return timeSpentMinutes;
  };

  const resetTimer = () => {
    setIsRunning(false);
    stopRingtone(); // Ensure sound stops
    setTimeLeft(sessionDuration * 60);
    setTimerComplete(false);
  };

  const updateSessionDuration = (dur) => {
    setSessionDuration(dur);
    if (!isRunning) {
      setTimeLeft(dur * 60);
    }
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
