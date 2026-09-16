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
  }, []);

  const checkInitialAccess = async () => {
    // In a real app, you would check the database first
    setShowAccessModal(true);
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
    try {
      const history = await axios.get(`${API_BASE_URL}/messages/history?user1=${user.id}&user2=${cId}`);
      setMessages(history.data);
    } catch (e) {}
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
    const time = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header />
      <View style={styles.titleArea}>
         <Text style={[styles.title, { color: colors.textPrimary, fontFamily: 'Syne-Bold' }]}>Counselor <Text style={{ color: colors.accent }}>Consult</Text></Text>
         <Text style={styles.sub}>Ask for study advice or support.</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
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
              <View style={styles.selectedMsgPreview}>
                 <View style={[styles.msgBox, { backgroundColor: colors.accent, borderBottomRightRadius: 2 }]}>
                    <Text style={[styles.msgText, { color: '#000' }]}>{selectedMessage?.text}</Text>
                 </View>
              </View>

              <View style={styles.actionBox}>
                 <TouchableOpacity style={styles.actionItem} onPress={startEdit}>
                    <Text style={styles.actionText}>Edit</Text>
                    <Ionicons name="pencil-outline" size={18} color="#FFF" />
                 </TouchableOpacity>
                 <View style={styles.divider} />
                 <TouchableOpacity style={styles.actionItem} onPress={deleteMsg}>
                    <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete message</Text>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                 </TouchableOpacity>
                 <View style={styles.divider} />
                 <TouchableOpacity style={styles.actionItem} onPress={copyToClipboard}>
                    <Text style={styles.actionText}>Copy</Text>
                    <Ionicons name="copy-outline" size={18} color="#FFF" />
                 </TouchableOpacity>
              </View>
           </View>
        </Pressable>
      </Modal>

      {/* Access Request Modal */}
      <Modal visible={showAccessModal} transparent animationType="slide">
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
              { id: '7days', label: 'Allow for 7 days' }
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
              <TouchableOpacity onPress={handleDenyAccess} style={styles.denyBtn}>
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
  header: {
    height: Platform.OS === 'ios' ? 60 : 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'ios' ? 0 : 10
  },
  backBtn: { padding: 5 },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontFamily: 'Inter-Bold', textAlign: 'center' },
  headerRight: { width: 40 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#16191E', width: '90%', borderRadius: 25, padding: 25, borderWidth: 1, borderColor: '#2A2E37' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  modalHeaderTitle: { color: '#FFF', fontSize: 16, opacity: 0.8 },
  infoBox: { backgroundColor: '#20242D', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#333', marginBottom: 20 },
  infoTitle: { color: '#FFF', fontSize: 18, fontFamily: 'Inter-Bold', marginBottom: 10 },
  infoSub: { color: '#888', fontSize: 12 },
  optionLabel: { color: '#888', fontSize: 14, marginBottom: 15 },
  optionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E2229', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#555', marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  optionText: { color: '#FFF', fontSize: 14 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 15 },
  denyBtn: { flex: 1, height: 50, backgroundColor: '#3b1620', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ef4444' },
  allowBtn: { flex: 1, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold' }
});
