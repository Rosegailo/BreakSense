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

  const playRingtone = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/alarm.mp3'),
        { shouldPlay: true }
      );
      soundRef.current = sound;
    } catch (error) {
      console.log('Error playing sound:', error);
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
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev > 0) return prev - 1;

          let nextMinutes;
          setMinutes(prevMin => {
            if (prevMin > 0) {
              nextMinutes = prevMin - 1;
              return nextMinutes;
            }
            nextMinutes = 0;
            return 0;
          });

          if (nextMinutes === 0) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            playRingtone();
            saveStudyLog(sessionDuration);
            setTimerComplete(true);
            return 0;
          }
          return 59;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, sessionDuration]);

  const startTimer = () => {
    setTimerComplete(false);
    setIsRunning(true);
  };

  const stopTimer = async () => {
    if (isRunning) {
      const totalSecondsPossible = sessionDuration * 60;
      const secondsRemaining = (minutes * 60) + seconds;
      const secondsSpent = totalSecondsPossible - secondsRemaining;
      const timeSpentMinutes = Math.max(1, Math.floor(secondsSpent / 60));

      setIsRunning(false);
      await saveStudyLog(timeSpentMinutes);

      // Reset logic
      if (currentSession < totalSessions) {
        setCurrentSession(prev => prev + 1);
      } else {
        setCurrentSession(1);
      }
      setMinutes(sessionDuration);
      setSeconds(0);

      return timeSpentMinutes;
    }
    return 0;
  };

  const resetTimer = () => {
    setIsRunning(false);
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
      timerComplete, setTimerComplete
    }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => useContext(TimerContext);
