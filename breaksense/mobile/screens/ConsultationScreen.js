import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  SafeAreaView, KeyboardAvoidingView, Platform, Modal, Alert, Clipboard
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
  const [counselor, setCounselor] = useState(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [sharingType, setSharingType] = useState('none');
  const [editingMessageId, setEditingMessageId] = useState(null);

  useEffect(() => {
    fetchCounselorAndHistory();
    // In a real app, check if user has already granted permission
    setShowAccessModal(true);
  }, []);

  const fetchCounselorAndHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/counselors`);
      const foundCounselor = res.data[0];
      if (foundCounselor) {
        setCounselor(foundCounselor);
        const history = await axios.get(`${API_BASE_URL}/messages/history?user1=${user.id}&user2=${foundCounselor._id}`);
        setMessages(history.data);
      }
    } catch (e) { console.log("Chat load error", e); }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !counselor) return;

    if (editingMessageId) {
      try {
        await axios.put(`${API_BASE_URL}/messages/update/${editingMessageId}`, { text: inputText });
        setMessages(messages.map(m => m._id === editingMessageId ? { ...m, text: inputText } : m));
        setEditingMessageId(null);
        setInputText('');
      } catch (e) { console.log("Edit error", e); }
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/messages/send`, {
        senderId: user.id,
        recipientId: counselor._id,
        text: inputText
      });
      setMessages([...messages, res.data.message]);
      setInputText('');
    } catch (e) { console.log("Send error", e); }
  };

  const handleLongPress = (item) => {
    if (item.sender !== user.id) return; // Only own messages

    Alert.alert(
      "Message Options",
      "What would you like to do?",
      [
        { text: "Copy", onPress: () => Clipboard.setString(item.text) },
        { text: "Edit", onPress: () => { setInputText(item.text); setEditingMessageId(item._id); } },
        { text: "Delete", onPress: () => confirmDelete(item._id), style: 'destructive' },
        { text: "Cancel", style: 'cancel' }
      ]
    );
  };

  const confirmDelete = (id) => {
    Alert.alert("Delete Message", "Are you sure?", [
      { text: "No" },
      { text: "Yes", onPress: () => deleteMsg(id) }
    ]);
  };

  const deleteMsg = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/messages/delete/${id}`);
      setMessages(messages.filter(m => m._id !== id));
    } catch (e) { console.log("Delete error", e); }
  };

  const handleAllowAccess = async () => {
    try {
      await axios.put(`${API_BASE_URL}/auth/update-permissions`, {
        userId: user.id,
        dataSharingPermission: sharingType
      });
      setShowAccessModal(false);
    } catch (e) { Alert.alert("Error", "Could not update permissions."); }
  };

  const renderMessage = ({ item }) => {
    const isMine = item.sender === user.id;
    const time = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.8}
        style={[styles.msgContainer, isMine ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}
      >
        <View style={[styles.msgBox, isMine ? { backgroundColor: colors.accent, borderBottomRightRadius: 2 } : { backgroundColor: '#3A3F4B', borderBottomLeftRadius: 2 }]}>
          <Text style={[styles.msgText, { color: isMine ? '#000' : '#FFF' }]}>{item.text}</Text>
        </View>
        <Text style={styles.msgTime}>{time}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#1A1D23' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
           <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{counselor ? `Counselor ${counselor.last_name}` : 'Counselor'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 20 }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : null} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <View style={styles.inputArea}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder={editingMessageId ? "Edit message..." : "Type a message..."}
              placeholderTextColor="#888"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity onPress={handleSendMessage} style={styles.sendBtn}>
              <Ionicons name="paper-plane" size={22} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Access Request Modal */}
      <Modal visible={showAccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
               <MaterialCommunityIcons name="lock-outline" size={20} color="#FFF" />
               <Text style={styles.modalHeaderTitle}>System Access Request</Text>
            </View>

            <View style={styles.infoBox}>
               <Text style={styles.infoTitle}>Your counselor wants to view your break history and analytics.</Text>
               <Text style={styles.infoSub}>This lets them see your session activity and recovery patterns</Text>
            </View>

            <Text style={styles.optionLabel}>Choose how long to share</Text>

            {[
              { id: 'session', label: 'Allow for this session only' },
              { id: '7days', label: 'Allow for 7 days' },
              { id: 'analytics_only', label: 'Analytics only, not full history' }
            ].map(opt => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setSharingType(opt.id)}
                style={styles.optionRow}
              >
                <View style={[styles.radio, sharingType === opt.id && { borderColor: colors.accent }]}>
                  {sharingType === opt.id && <View style={[styles.radioInner, { backgroundColor: colors.accent }]} />}
                </View>
                <Text style={styles.optionText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.btnRow}>
              <TouchableOpacity onPress={() => setShowAccessModal(false)} style={styles.denyBtn}>
                <Text style={styles.btnText}>Deny</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAllowAccess} style={[styles.allowBtn, { backgroundColor: '#1A7A4D' }]}>
                <Text style={styles.btnText}>Allow Access</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#2A2E37' },
  headerTitle: { color: '#FFF', fontSize: 18, fontFamily: 'Syne-Bold' },
  msgContainer: { marginBottom: 15, maxWidth: '80%' },
  msgBox: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15 },
  msgText: { fontSize: 15, fontFamily: 'Syne-Regular' },
  msgTime: { color: '#555', fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  inputArea: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 30 : 20 },
  inputWrapper: { flexDirection: 'row', backgroundColor: '#2A2E37', borderRadius: 15, alignItems: 'center', paddingHorizontal: 15, minHeight: 50 },
  input: { flex: 1, color: '#FFF', fontSize: 15, paddingVertical: 10 },
  sendBtn: { backgroundColor: '#00FF88', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#20242D', width: '90%', borderRadius: 25, padding: 25, borderWidth: 1, borderBottomColor: '#333' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  modalHeaderTitle: { color: '#FFF', fontSize: 16, fontFamily: 'Syne-Regular', opacity: 0.8 },
  infoBox: { backgroundColor: '#2A303C', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#3D4452', marginBottom: 20 },
  infoTitle: { color: '#FFF', fontSize: 16, fontFamily: 'Syne-Bold', marginBottom: 10 },
  infoSub: { color: '#888', fontSize: 12 },
  optionLabel: { color: '#888', fontSize: 14, marginBottom: 15, fontFamily: 'Syne-Regular' },
  optionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2E37', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#555', marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  optionText: { color: '#FFF', fontSize: 14, fontFamily: 'Syne-Regular' },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 15 },
  denyBtn: { flex: 1, height: 50, backgroundColor: '#7D1F1F', borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  allowBtn: { flex: 1, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold' }
});
