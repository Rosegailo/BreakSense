import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  SafeAreaView, KeyboardAvoidingView, Platform, Modal, Alert, Clipboard, Pressable
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { API_BASE_URL } from '../Config';
import { useUser } from '../UserContext';
import { useTheme } from '../context/ThemeContext';
import Header from './components/Header';

export default function ConsultationScreen() {
  const navigation = useNavigation();
  const { user } = useUser();
  const { colors } = useTheme();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [counselor, setCounselor] = useState(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [sharingType, setSharingType] = useState('none');

  // Message Menu State
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);

  useEffect(() => {
    fetchCounselorAndHistory();
    checkInitialAccess();

    // Auto-refresh chat and check for access requests every 5 seconds
    const interval = setInterval(() => {
      checkInitialAccess();
      if (counselor) {
        loadHistory(counselor._id);
      } else {
        fetchCounselorAndHistory();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [counselor]);

  const checkInitialAccess = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/students`);
      const me = res.data.find(s => s._id === user.id);
      if (me && me.analyticsAccessStatus === 'pending') {
        setShowAccessModal(true);
      }
    } catch (e) { console.log("Permission check error", e); }
  };

  const fetchCounselorAndHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/counselors`);
      const foundCounselor = res.data[0];
      if (foundCounselor) {
        setCounselor(foundCounselor);
        loadHistory(foundCounselor._id);
      }
    } catch (e) { console.log("Chat load error", e); }
  };

  const loadHistory = async (cId) => {
    if (!user || !user.id) return;
    try {
      const history = await axios.get(`${API_BASE_URL}/messages/history?user1=${user.id}&user2=${cId}`);
      setMessages(history.data);
    } catch (e) {}
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !counselor || !user || !user.id) return;

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

  const handleLongPress = (msg) => {
    if (msg.sender !== user.id) return; // Only allow actions on own messages
    setSelectedMessage(msg);
    setShowMenu(true);
  };

  const copyToClipboard = () => {
    Clipboard.setString(selectedMessage.text);
    setShowMenu(false);
  };

  const startEdit = () => {
    setInputText(selectedMessage.text);
    setEditingMessageId(selectedMessage._id);
    setShowMenu(false);
  };

  const deleteMsg = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/messages/delete/${selectedMessage._id}`);
      setMessages(messages.filter(m => m._id !== selectedMessage._id));
      setShowMenu(false);
    } catch (e) { console.log("Delete error", e); }
  };

  const handleAllowAccess = async () => {
    try {
      await axios.put(`${API_BASE_URL}/auth/update-permissions`, {
        userId: user.id,
        dataSharingPermission: sharingType,
        analyticsAccessStatus: 'granted'
      });
      setShowAccessModal(false);
    } catch (e) { Alert.alert("Error", "Could not update permissions."); }
  };

  const handleDenyAccess = async () => {
    try {
      await axios.put(`${API_BASE_URL}/auth/update-permissions`, {
        userId: user.id,
        dataSharingPermission: 'none',
        analyticsAccessStatus: 'denied'
      });
      setShowAccessModal(false);
    } catch (e) { setShowAccessModal(false); }
  };

  const renderMessage = ({ item }) => {
    const isMine = item.sender === user.id;
    const time = item.createdAt
      ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Sending...';

    return (
      <View style={[styles.msgContainer, isMine ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {!isMine && (
             <View style={[styles.msgBox, { backgroundColor: '#3A3F4B', borderBottomLeftRadius: 2 }]}>
                <Text style={[styles.msgText, { color: '#FFF' }]}>{item.text}</Text>
             </View>
          )}

          {isMine && (
            <>
              <TouchableOpacity
                onPress={() => handleLongPress(item)}
                style={{ padding: 4 }}
              >
                <Ionicons name="ellipsis-horizontal" size={16} color="#64748b" />
              </TouchableOpacity>
              <TouchableOpacity
                onLongPress={() => handleLongPress(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.msgBox, { backgroundColor: colors.accent, borderBottomRightRadius: 2 }]}>
                  <Text style={[styles.msgText, { color: '#000' }]}>{item.text}</Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
        <Text style={[styles.msgTime, isMine ? { alignSelf: 'flex-end', marginRight: 0 } : { alignSelf: 'flex-start' }]}>{time}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header />
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: 'Syne-Bold', fontSize: 20 }]}>
          Counselor <Text style={{ color: colors.accent }}>Consult</Text>
        </Text>
        <Text style={[styles.subtitle, { fontFamily: 'Outfit', color: colors.textSecondary, marginTop: 5 }]}>
          Ask for study advice or support.
        </Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item, index) => item._id || index.toString()}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        ListEmptyComponent={() => (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
             <Ionicons name="chatbubbles-outline" size={40} color="#3A3F4B" />
             <Text style={{ color: '#666', marginTop: 10, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                {counselor ? "No messages yet" : "Connecting to Counselor..."}
             </Text>
          </View>
        )}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : null} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <View style={styles.inputArea}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder={editingMessageId ? "Editing..." : "Type a message..."}
              placeholderTextColor="#666"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            {editingMessageId && (
              <TouchableOpacity onPress={() => { setEditingMessageId(null); setInputText(''); }} style={{ marginRight: 10 }}>
                 <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: 'bold' }}>CANCEL</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleSendMessage} style={[styles.sendBtn, { backgroundColor: colors.accent }]}>
              <Ionicons name="paper-plane" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* iMessage Style Action Menu */}
      <Modal visible={showMenu} transparent animationType="fade">
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
           <View style={styles.menuContent}>
              <View style={[styles.actionBox, { backgroundColor: '#1E2229', borderColor: '#2A2E37', width: 200 }]}>
                 <TouchableOpacity style={styles.actionItem} onPress={startEdit}>
                    <Text style={[styles.actionText, { color: '#FFF', fontFamily: 'Inter-Bold' }]}>Edit</Text>
                 </TouchableOpacity>
                 <View style={[styles.divider, { backgroundColor: '#2A2E37' }]} />
                 <TouchableOpacity style={styles.actionItem} onPress={deleteMsg}>
                    <Text style={[styles.actionText, { color: '#FF5C5C', fontFamily: 'Inter-Bold' }]}>Delete message</Text>
                 </TouchableOpacity>
                 <View style={[styles.divider, { backgroundColor: '#2A2E37' }]} />
                 <TouchableOpacity style={styles.actionItem} onPress={copyToClipboard}>
                    <Text style={[styles.actionText, { color: '#FFF', fontFamily: 'Inter-Bold' }]}>Copy</Text>
                 </TouchableOpacity>
              </View>
              {/* Optional bubble indicator if needed, but the image is clean */}
           </View>
        </Pressable>
      </Modal>

      {/* Access Request Modal */}
      <Modal visible={showAccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: '#1A1D23', borderColor: '#2A2E37' }]}>
            <View style={styles.modalHeader}>
               <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" />
               <Text style={[styles.modalHeaderTitle, { fontFamily: 'JetBrains', fontSize: 13, letterSpacing: 1 }]}>System. Access Request</Text>
            </View>

            <View style={[styles.infoBox, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }]}>
               <Text style={[styles.infoTitle, { color: '#FFF', fontSize: 16, fontFamily: 'Outfit' }]}>Your counselor wants to view your break history and analytics.</Text>
               <Text style={[styles.infoSub, { color: '#64748b', fontSize: 12, marginTop: 8 }]}>This lets them see your session activity and recovery patterns</Text>
            </View>

            <Text style={[styles.optionLabel, { fontFamily: 'JetBrains', fontSize: 11, letterSpacing: 1.5, marginBottom: 20 }]}>Choose how long to share</Text>

            {[
              { id: 'session', label: 'Allow for this session only' },
              { id: '7days', label: 'Allow for 7 days' }
            ].map(opt => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setSharingType(opt.id)}
                style={[styles.optionRow, { backgroundColor: 'transparent', borderColor: sharingType === opt.id ? colors.accent : '#2A2E37' }]}
              >
                <View style={[styles.radio, { borderColor: sharingType === opt.id ? colors.accent : '#555' }]}>
                  {sharingType === opt.id && <View style={[styles.radioInner, { backgroundColor: colors.accent }]} />}
                </View>
                <Text style={[styles.optionText, { color: sharingType === opt.id ? '#FFF' : '#94a3b8' }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.btnRow}>
              <TouchableOpacity onPress={handleDenyAccess} style={[styles.denyBtn, { backgroundColor: '#3b1620', borderColor: '#7f1d1d' }]}>
                <Text style={[styles.btnText, { color: '#ef4444' }]}>Deny</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAllowAccess} style={[styles.allowBtn, { backgroundColor: '#14532d', borderColor: '#166534' }]}>
                <Text style={[styles.btnText, { color: '#22c55e' }]}>Allow Access</Text>
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
  titleContainer: { paddingHorizontal: 20, paddingTop: 20, marginBottom: 25 },
  title: { fontSize: 22 },
  subtitle: { color: '#888', fontSize: 14 },
  msgContainer: { marginBottom: 15, maxWidth: '80%' },
  msgBox: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  msgText: { fontSize: 15, lineHeight: 22 },
  msgTime: { color: '#555', fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  inputArea: { padding: 15, paddingBottom: Platform.OS === 'ios' ? 30 : 15 },
  inputWrapper: { flexDirection: 'row', backgroundColor: '#1E2229', borderRadius: 25, alignItems: 'center', paddingHorizontal: 15, minHeight: 50 },
  input: { flex: 1, color: '#FFF', fontSize: 15, paddingVertical: 10 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },

  // Action Menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  menuContent: { width: '85%', alignItems: 'flex-end' },
  selectedMsgPreview: { marginBottom: 15, maxWidth: '90%' },
  actionBox: { backgroundColor: '#20242D', width: 220, borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
  actionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  actionText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#333' },

  // Privacy Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', borderRadius: 20, padding: 25, borderWidth: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, gap: 10 },
  modalHeaderTitle: { color: '#94a3b8', textTransform: 'uppercase' },
  infoBox: { padding: 20, borderRadius: 15, borderWidth: 1, marginBottom: 25 },
  infoTitle: { lineHeight: 22 },
  infoSub: { lineHeight: 18 },
  optionLabel: { color: '#64748b', textTransform: 'uppercase' },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 16, marginBottom: 12, borderWidth: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  optionText: { fontSize: 14, fontWeight: '500' },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, gap: 15 },
  denyBtn: { flex: 1, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  allowBtn: { flex: 1, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  btnText: { fontWeight: 'bold', fontSize: 14 }
});
