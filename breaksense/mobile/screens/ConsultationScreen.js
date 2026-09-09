import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../Config';
import { useUser } from '../UserContext';
import { useTheme } from '../context/ThemeContext';
import Header from './components/Header';

export default function ConsultationScreen() {
  const { user } = useUser();
  const { colors } = useTheme();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [counselorId, setCounselorId] = useState(null);

  useEffect(() => {
    fetchCounselorAndHistory();
  }, []);

  const fetchCounselorAndHistory = async () => {
    try {
      // Find the first counselor in the DB (In a real app, you'd pick one)
      const res = await axios.get(`${API_BASE_URL}/auth/counselors`); // I need to add this route
      const counselor = res.data[0];
      if (counselor) {
        setCounselorId(counselor._id);
        const history = await axios.get(`${API_BASE_URL}/messages/history?user1=${user.id}&user2=${counselor._id}`);
        setMessages(history.data);
      }
    } catch (e) { console.log("Chat load error", e); }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !counselorId) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/messages/send`, {
        senderId: user.id,
        recipientId: counselorId,
        text: inputText
      });
      setMessages([...messages, res.data.message]);
      setInputText('');
    } catch (e) { console.log("Send error", e); }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header />
      <View style={styles.titleArea}>
         <Text style={[styles.title, { color: colors.textPrimary, fontFamily: 'Syne-Bold' }]}>Guidance <Text style={{ color: colors.accent }}>Consult</Text></Text>
         <Text style={styles.sub}>Ask for study advice or support.</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={[styles.msgBox, item.sender === user.id ? [styles.sent, { backgroundColor: colors.accent }] : [styles.received, { backgroundColor: colors.card }] ]}>
            <Text style={{ color: item.sender === user.id ? '#000' : colors.textPrimary }}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 20 }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : null} keyboardVerticalOffset={100}>
        <View style={[styles.inputRow, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity onPress={handleSendMessage} style={[styles.sendBtn, { backgroundColor: colors.accent }]}>
            <Ionicons name="send" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleArea: { paddingHorizontal: 20, marginVertical: 10 },
  title: { fontSize: 22 },
  sub: { color: '#888', fontSize: 13, marginTop: 5 },
  msgBox: { padding: 12, borderRadius: 15, marginBottom: 10, maxWidth: '80%' },
  sent: { alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  received: { alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  inputRow: { flexDirection: 'row', padding: 15, alignItems: 'center', borderTopWidth: 1 },
  input: { flex: 1, paddingRight: 15 },
  sendBtn: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' }
});
