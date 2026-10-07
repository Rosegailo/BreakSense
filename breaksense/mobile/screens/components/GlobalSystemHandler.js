import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Vibration, Platform, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { API_BASE_URL } from '../../Config';
import { useUser } from '../../UserContext';
import { useTheme } from '../../context/ThemeContext';

// Configure notification behavior for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function GlobalSystemHandler({ navigationRef }) {
  const { user } = useUser();
  const { colors } = useTheme();

  // Access Request State
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [sharingType, setSharingType] = useState('24hours');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [counselor, setCounselor] = useState(null);
  const lastMessageIdRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  const userId = user?.id || user?._id;

  // 1. Fetch Counselor Info
  useEffect(() => {
    if (!userId) return;
    const fetchCounselor = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/auth/counselors`);
        if (res.data && res.data.length > 0) {
          setCounselor(res.data[0]);
        }
      } catch (e) {
        console.log("Error fetching counselor info", e);
      }
    };
    fetchCounselor();
  }, [userId]);

  // 2. Poll for Access Requests & New Messages
  useEffect(() => {
    if (!userId) return;

    const checkSystemState = async () => {
      try {
        // A. Check Access Permission Status
        const profileRes = await axios.get(`${API_BASE_URL}/auth/profile/${userId}`);
        if (profileRes.data && profileRes.data.analyticsAccessStatus === 'pending') {
          setShowAccessModal(true);
        } else {
          setShowAccessModal(false);
        }

        // B. Check Messages if Counselor is known
        if (counselor && counselor._id) {
          const chatRes = await axios.get(
            `${API_BASE_URL}/messages/history?user1=${userId}&user2=${counselor._id}&requesterRole=student`
          );
          const history = chatRes.data || [];

          if (history.length > 0) {
            const latestMsg = history[history.length - 1];

            if (isInitialLoadRef.current) {
              lastMessageIdRef.current = latestMsg._id;
              isInitialLoadRef.current = false;
            } else if (
              latestMsg._id !== lastMessageIdRef.current &&
              latestMsg.sender === counselor._id &&
              !latestMsg.text.includes('System:')
            ) {
              lastMessageIdRef.current = latestMsg._id;
              triggerMessageNotification(latestMsg);
            }
          }
        }
      } catch (e) {
        // Silent catch for background polling
      }
    };

    // Initial check
    checkSystemState();

    // Poll every 4 seconds
    const interval = setInterval(checkSystemState, 4000);
    return () => clearInterval(interval);
  }, [userId, counselor]);

  // Trigger System Push Notification & Vibration
  const triggerMessageNotification = async (msg) => {
    try {
      Vibration.vibrate([0, 150, 100, 150]);
    } catch (e) {}

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💬 Counselor Consultation',
          body: msg.text,
          sound: true,
        },
        trigger: null,
      });
    } catch (e) {}
  };

  // Access Permission Actions
  const handleAllowAccess = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await axios.put(`${API_BASE_URL}/auth/update-permissions`, {
        userId,
        dataSharingPermission: sharingType,
        analyticsAccessStatus: 'granted',
      });

      const durationLabel = sharingType === '24hours' ? '24 hours' : '7 days';
      if (counselor) {
        await axios.post(`${API_BASE_URL}/messages/send`, {
          senderId: userId,
          recipientId: counselor._id,
          text: `🔒 System: Analytics access granted for ${durationLabel}.`,
        });
      }

      setShowAccessModal(false);
    } catch (e) {
      Alert.alert("Error", "Could not update permissions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDenyAccess = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await axios.put(`${API_BASE_URL}/auth/update-permissions`, {
        userId,
        dataSharingPermission: 'none',
        analyticsAccessStatus: 'denied',
      });
      setShowAccessModal(false);
    } catch (e) {
      setShowAccessModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Single Global Access Request Modal */}
      <Modal visible={showAccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: '#1A1D23', borderColor: '#2A2E37' }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" />
              <Text style={styles.modalHeaderTitle}>System. Access Request</Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>
                Your counselor wants to view your break history and analytics.
              </Text>
              <Text style={styles.infoSub}>
                This lets them see your session activity and recovery patterns
              </Text>
            </View>

            <Text style={styles.optionLabel}>Choose how long to share</Text>

            {[
              { id: '24hours', label: 'Allow for 24 hours' },
              { id: '7days', label: 'Allow for 7 days' }
            ].map(opt => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setSharingType(opt.id)}
                disabled={isSubmitting}
                style={[
                  styles.optionRow,
                  { borderColor: sharingType === opt.id ? colors.accent : '#2A2E37' }
                ]}
              >
                <View style={[styles.radio, { borderColor: sharingType === opt.id ? colors.accent : '#555' }]}>
                  {sharingType === opt.id && <View style={[styles.radioInner, { backgroundColor: colors.accent }]} />}
                </View>
                <Text style={[styles.optionText, { color: sharingType === opt.id ? '#FFF' : '#94a3b8' }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.btnRow}>
              <TouchableOpacity onPress={handleDenyAccess} disabled={isSubmitting} style={styles.denyBtn}>
                <Text style={[styles.btnText, { color: '#ef4444' }]}>Deny</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAllowAccess} disabled={isSubmitting} style={styles.allowBtn}>
                <Text style={[styles.btnText, { color: '#22c55e' }]}>{isSubmitting ? 'Updating...' : 'Allow Access'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Privacy Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  modalHeaderTitle: {
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  infoBox: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  infoTitle: {
    color: '#FFF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: 'bold',
  },
  infoSub: {
    color: '#8E95A5',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  optionLabel: {
    color: '#8E95A5',
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 14,
    fontWeight: 'bold',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  denyBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: '#3b1620',
    borderColor: '#7f1d1d',
  },
  allowBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: '#14532d',
    borderColor: '#166534',
  },
  btnText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
});
