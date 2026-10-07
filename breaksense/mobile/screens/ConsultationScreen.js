import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  SafeAreaView, KeyboardAvoidingView, Platform, Modal, Alert, Clipboard, Pressable, Dimensions
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { API_BASE_URL } from '../Config';
import { useUser } from '../UserContext';
import { useTheme } from '../context/ThemeContext';
import Header from './components/Header';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function ConsultationScreen() {
  const navigation = useNavigation();
  const { user } = useUser();
  const { colors } = useTheme();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [counselor, setCounselor] = useState(null);
  const [accessStatus, setAccessStatus] = useState('none'); // 'granted', 'pending', 'denied', 'none'

  // Message Menu State
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [menuY, setMenuY] = useState(0);

  useEffect(() => {
    fetchCounselorAndHistory();
    checkInitialAccess();
  }, [user]);

  useEffect(() => {
    // Auto-refresh chat and check for access status every 5 seconds
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
    const userId = user?.id || user?._id;
    if (!userId) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/profile/${userId}`);
      if (res.data) {
        const me = res.data;
        const status = me.analyticsAccessStatus || 'none';
        setAccessStatus(status);
      }
    } catch (e) { console.log("Permission check error", e); }
  };

  const handleRevokeAccess = async () => {
    const userId = user?.id || user?._id;
    Alert.alert(
      "End Session?",
      "Stopping the sharing session will immediately hide your analytics from the counselor.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Session",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.put(`${API_BASE_URL}/auth/revoke-access`, { userId });

              // Automated Message
              if (counselor) {
                await axios.post(`${API_BASE_URL}/messages/send`, {
                  senderId: userId,
                  recipientId: counselor._id,
                  text: `🚫 System: Analytics access revoked by student.`
                });
              }

              setAccessStatus('none');
              if (counselor) loadHistory(counselor._id);
              Alert.alert("Success", "Sharing session ended.");
            } catch (e) { Alert.alert("Error", "Could not end session."); }
          }
        }
      ]
    );
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
      const history = await axios.get(`${API_BASE_URL}/messages/history?user1=${user.id}&user2=${cId}&requesterRole=student`);
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

  const handleLongPress = (msg, event) => {
    const { pageY } = event.nativeEvent;
    setSelectedMessage(msg);
    // Align menu vertically with touch location
    let topPos = pageY ? pageY - 60 : 200;
    if (topPos < 80) topPos = 80;
    if (topPos > SCREEN_HEIGHT - 220) topPos = SCREEN_HEIGHT - 220;
    setMenuY(topPos);
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
      await axios.delete(`${API_BASE_URL}/messages/delete/${selectedMessage._id}?role=student`);
      setMessages(messages.filter(m => m._id !== selectedMessage._id));
      setShowMenu(false);
    } catch (e) { console.log("Delete error", e); }
  };

  const renderMessage = ({ item }) => {
    const isMine = item.sender === user.id;
    const isSystem = item.text.includes('System:');
    const time = item.createdAt
      ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Sending...';

    if (isSystem) {
      return (
        <View style={styles.systemMsgContainer}>
          <Text style={styles.systemMsgText}>{item.text.replace('System:', '').trim()}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.msgContainer, isMine ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
        <TouchableOpacity
          onLongPress={(e) => handleLongPress(item, e)}
          activeOpacity={0.8}
        >
          <View style={[
            styles.msgBox,
            isMine
              ? { backgroundColor: colors.accent, borderBottomRightRadius: 2 }
              : { backgroundColor: '#3A3F4B', borderBottomLeftRadius: 2 }
          ]}>
            <Text style={[styles.msgText, { color: isMine ? '#000' : '#FFF' }]}>{item.text}</Text>
          </View>
        </TouchableOpacity>
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

      {user?.role === 'student' && accessStatus === 'granted' && (
        <View style={{ backgroundColor: '#1C1F26', borderBottomWidth: 1, borderBottomColor: '#2A2E37', flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.accent, fontFamily: 'Inter-Bold', fontSize: 13 }}>Analytics Sharing Active</Text>
            <Text style={{ color: '#64748b', fontFamily: 'Outfit', fontSize: 10, marginTop: 1 }}>Counselor can view your session history.</Text>
          </View>
          <TouchableOpacity onPress={handleRevokeAccess} style={{ backgroundColor: '#3b1620', borderColor: '#7f1d1d', borderWidth: 1, borderRadius: 8, height: 32, paddingHorizontal: 12, justifyContent: 'center' }}>
            <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: 'bold' }}>End Session</Text>
          </TouchableOpacity>
        </View>
      )}

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
        <Pressable style={[styles.menuOverlay, { backgroundColor: 'rgba(0,0,0,0.88)' }]} onPress={() => setShowMenu(false)}>
           <View style={[styles.menuContent, { position: 'absolute', top: menuY, width: '100%', paddingHorizontal: 20 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: selectedMessage?.sender === user?.id ? 'flex-end' : 'flex-start', gap: 12 }}>
                 {/* Action Menu Box */}
                 <View style={[styles.actionBox, { backgroundColor: '#B0B3B8', borderColor: 'transparent', width: 150, borderRadius: 18, overflow: 'hidden' }]}>
                    {selectedMessage?.sender === user?.id && (
                      <>
                        <TouchableOpacity style={[styles.actionItem, { paddingVertical: 12 }]} onPress={startEdit}>
                           <Text style={{ color: '#000', fontSize: 13, fontWeight: '600' }}>Edit</Text>
                        </TouchableOpacity>
                        <View style={{ height: 1, backgroundColor: '#FFF', opacity: 0.5 }} />
                        <TouchableOpacity style={[styles.actionItem, { paddingVertical: 12 }]} onPress={deleteMsg}>
                           <Text style={{ color: '#000', fontSize: 13, fontWeight: '600' }}>Delete message</Text>
                        </TouchableOpacity>
                        <View style={{ height: 1, backgroundColor: '#FFF', opacity: 0.5 }} />
                      </>
                    )}
                    <TouchableOpacity style={[styles.actionItem, { paddingVertical: 12 }]} onPress={copyToClipboard}>
                       <Text style={{ color: '#000', fontSize: 13, fontWeight: '600' }}>Copy</Text>
                    </TouchableOpacity>
                 </View>

                 {/* Selected Message Bubble Preview */}
                 <View style={{ maxWidth: '60%' }}>
                    <View style={[
                      styles.msgBox,
                      selectedMessage?.sender === user?.id
                        ? { backgroundColor: colors.accent, borderBottomRightRadius: 2 }
                        : { backgroundColor: '#3A3F4B', borderBottomLeftRadius: 2 },
                      { paddingHorizontal: 16, paddingVertical: 10 }
                    ]}>
                      <Text style={{ color: selectedMessage?.sender === user?.id ? '#000' : '#FFF', fontSize: 15, fontWeight: '500' }}>
                        {selectedMessage?.text}
                      </Text>
                    </View>
                    <Text style={{ color: '#64748b', fontSize: 9, marginTop: 4, alignSelf: selectedMessage?.sender === user?.id ? 'flex-end' : 'flex-start' }}>
                       {selectedMessage?.createdAt ? new Date(selectedMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                 </View>
              </View>
           </View>
        </Pressable>
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
  systemMsgContainer: { alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginVertical: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  systemMsgText: { color: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains', letterSpacing: 0.5, textTransform: 'uppercase' },
  activeSessionBanner: { flexDirection: 'row', alignItems: 'center', padding: 15, marginHorizontal: 20, borderRadius: 15, borderWidth: 1, marginBottom: 10 },
  sessionTitle: { fontSize: 13, marginBottom: 2 },
  sessionSub: { fontSize: 10, opacity: 0.8 },
  endBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  endBtnText: { fontSize: 11, fontWeight: 'bold' },
  inputArea: { padding: 15, paddingBottom: Platform.OS === 'ios' ? 30 : 15 },
  inputWrapper: { flexDirection: 'row', backgroundColor: '#1E2229', borderRadius: 25, alignItems: 'center', paddingHorizontal: 15, minHeight: 50 },
  input: { flex: 1, color: '#FFF', fontSize: 15, paddingVertical: 10 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },

  // Action Menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  menuContent: { width: '90%', alignItems: 'flex-end' },
  selectedMsgPreview: { marginBottom: 15, maxWidth: '90%' },
  actionBox: { backgroundColor: '#20242D', width: 220, borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
  actionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  actionText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#333' },
});
