import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  SafeAreaView, 
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL } from '../Config';
import Header from './components/Header'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function StatsScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();

  const fetchHistory = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('currentUserId');
      const urlSuffix = storedUserId ? `?user_id=${storedUserId}` : '';
      
      const res = await axios.get(`${API_BASE_URL}/breaks/history${urlSuffix}`);
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.history || []);
      setHistory(data);
    } catch (e) {
      console.log("Error fetching logs:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();

    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strTime = hours + ':' + (minutes < 10 ? '0' + minutes : minutes) + ' ' + ampm;

    return `${month} ${day}  .  ${strTime}`;
  };

  const getCategoryColor = (category) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('move')) return '#39ef8d';
    if (cat.includes('mind')) return '#a855f7';
    if (cat.includes('nutrition')) return '#fbbf24';
    if (cat.includes('rest')) return '#60a5fa';
    if (cat.includes('focus')) return '#10b981'; // Green for focus time
    return colors.accent;
  };

  const getFatigueText = (val) => {
    if (val <= 2) return 'Good';
    if (val <= 3) return 'Mild';
    return 'Trd';
  };

  const getStressText = (val) => {
    if (val <= 1) return 'Low';
    if (val <= 2) return 'Mild';
    return 'High';
  };

  const renderLogItem = ({ item }) => {
    const catColor = getCategoryColor(item.category);
    const isFocusTime = item.category?.toLowerCase() === 'focus time';

    return (
      <View style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.logHeader}>
          <Text style={styles.dateText}>{formatDateTime(item.createdAt)}</Text>
          {!isFocusTime && (
            <View style={styles.starsRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Ionicons
                  key={i}
                  name="star"
                  size={12}
                  color={i < item.rating ? '#fbbf24' : '#334155'}
                  style={{ marginLeft: 2 }}
                />
              ))}
            </View>
          )}
        </View>

        {!isFocusTime && item.session_number && (
          <View style={styles.sessionRow}>
            <Text style={styles.sessionEmoji}>🍅</Text>
            <Text style={styles.sessionText}>After Session {item.session_number}</Text>
          </View>
        )}

        <Text style={[styles.activityTitle, { color: colors.textPrimary }]}>
          {isFocusTime
            ? `Study Session ${item.session_number || ''}`
            : item.break_type}
        </Text>

        <View style={styles.tagContainer}>
          <View style={[styles.catTag, { backgroundColor: catColor + '20' }]}>
            <Text style={[styles.catTagText, { color: catColor }]}>{item.category?.toLowerCase()}</Text>
          </View>

          {!isFocusTime && (
            <>
              <View style={[styles.infoTag, { backgroundColor: colors.background }]}>
                <Text style={styles.infoEmoji}>😴</Text>
                <Text style={styles.infoTagText}>F {getFatigueText(item.fatigue_before)}</Text>
              </View>

              <View style={[styles.infoTag, { backgroundColor: colors.background }]}>
                <Text style={styles.infoEmoji}>😤</Text>
                <Text style={styles.infoTagText}>S {getStressText(item.stress_before)}</Text>
              </View>
            </>
          )}

          <View style={[styles.infoTag, { backgroundColor: colors.background }]}>
            <Ionicons name="time-outline" size={12} color="#64748b" style={{ marginRight: 4 }} />
            <Text style={styles.infoTagText}>T {item.duration_taken}m</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.topBar}>
          <View style={styles.header}>
            <Text style={[styles.mainTitle, { color: colors.textPrimary, fontFamily: 'Syne-ExtraBold' }]}>
              Break <Text style={styles.titleHighlight}>Logs</Text>
            </Text>
            <Text style={styles.subtitle}>Your session history.</Text>
          </View>
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary, fontFamily: 'Syne-ExtraBold' }]}>No Break Logs Yet</Text>
            <Text style={styles.emptySubtitle}>Complete your Mood Check-in first.</Text>
            <TouchableOpacity 
              style={[styles.checkInBtn, { borderColor: colors.accent }]}
              onPress={() => navigation.navigate('Check-in')}
            >
              <Text style={[styles.checkInBtnText, { color: colors.accent }]}>Go to Check-in</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            renderItem={renderLogItem}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 20, marginBottom: 25 },
  header: { flex: 1 },
  mainTitle: { fontSize: 25, fontWeight: '900' },
  titleHighlight: { color: '#39ef8d' },
  subtitle: { color: '#64748b', fontSize: 14, marginTop: 4 },

  logCard: { 
    borderRadius: 24,
    padding: 20, 
    marginBottom: 16,
    borderWidth: 1, 
  },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateText: { color: '#64748b', fontSize: 11, fontWeight: 'bold' },
  starsRow: { flexDirection: 'row' },

  sessionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sessionEmoji: { fontSize: 14, marginRight: 6 },
  sessionText: { color: '#f97316', fontSize: 12, fontWeight: 'bold' },

  activityTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },

  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  catTagText: { fontSize: 11, fontWeight: 'bold' },

  infoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#33415520'
  },
  infoEmoji: { fontSize: 12, marginRight: 4 },
  infoTagText: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  emptyEmoji: { fontSize: 60, marginBottom: 20 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  emptySubtitle: { color: '#888', fontSize: 14, marginBottom: 30 },
  checkInBtn: { borderWidth: 2, paddingHorizontal: 40, paddingVertical: 15, borderRadius: 15 },
  checkInBtnText: { fontWeight: 'bold' }
});
