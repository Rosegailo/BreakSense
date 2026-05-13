import React, { useState, useRef } from 'react';
import {
  View,
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  Modal,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions
} from 'react-native';
import Header from './components/Header'; 
import { useTheme } from '../context/ThemeContext';
import { useFonts, Syne_800ExtraBold } from '@expo-google-fonts/syne';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const CATEGORIES = ['All', 'Move', 'Mind', 'Nutrition', 'Rest'];

const ACTIVITIES = [
  { 
    id: '1', 
    title: 'Sun Salutation', 
    dur: '10 min', 
    cat: 'PHYSICAL MOVEMENT', 
    icon: '🧘', 
    group: 'Move', 
    desc: 'Yoga sequence linking breath and movement.', 
    steps: ['Stand palms together at chest', 'Inhale arms up, exhale fold', 'Plank - upward dog', 'Downward dog & breath 3x'] 
  },
  { 
    id: '2', 
    title: '5-Min Walk', 
    dur: '5 min', 
    cat: 'PHYSICAL MOVEMENT', 
    icon: '🏃', 
    group: 'Move', 
    desc: 'A brisk walk to clear your head.', 
    steps: ['Step outside', 'Walk at a steady pace', 'Focus on your stride', 'Return refreshed'] 
  },
  { 
    id: '3', 
    title: 'Jumping Jacks', 
    dur: '5 min', 
    cat: 'PHYSICAL MOVEMENT', 
    icon: '⚡', 
    group: 'Move', 
    desc: 'Quick cardio to wake up.', 
    steps: ['Stand with feet together', 'Jump and spread legs', 'Clap hands overhead', 'Repeat for 60 seconds'] 
  },
  { 
    id: '4', 
    title: 'Box Breathing', 
    dur: '5 min', 
    cat: 'MINDFULNESS', 
    icon: '🌬️', 
    group: 'Mind', 
    desc: 'Calm the nervous system.', 
    steps: ['Inhale 4 counts', 'Hold 4 counts', 'Exhale 4 counts', 'Hold 4 counts'] 
  },
  { 
    id: '5', 
    title: '5-4-3-2-1 Grounding', 
    dur: '5 min', 
    cat: 'MINDFULNESS', 
    icon: '🌿', 
    group: 'Mind', 
    desc: 'Reconnect with the present moment.', 
    steps: ['Acknowledge 5 things you see', '4 things you can touch', '3 things you hear', '2 things you smell', '1 thing you can taste'] 
  },
  { 
    id: '6', 
    title: 'Visualization', 
    dur: '10 min', 
    cat: 'MINDFULNESS', 
    icon: '🌅', 
    group: 'Mind', 
    desc: 'Mental imagery for relaxation.', 
    steps: ['Close your eyes', 'Imagine a peaceful place', 'Focus on the sensory details', 'Breathe deeply'] 
  },
  { 
    id: '7', 
    title: 'Hydration Reset', 
    dur: '5 min', 
    cat: 'NUTRITION', 
    icon: '💧', 
    group: 'Nutrition', 
    desc: 'Rehydrate for better focus.', 
    steps: ['Get a glass of water', 'Sip slowly', 'Focus on the cold sensation', 'Finish the glass'] 
  },
  { 
    id: '8', 
    title: 'Brain Snack', 
    dur: '10 min', 
    cat: 'NUTRITION', 
    icon: '🫐', 
    group: 'Nutrition', 
    desc: 'Quick healthy fuel.', 
    steps: ['Choose a piece of fruit or nuts', 'Eat mindfully', 'Avoid distractions while eating'] 
  },
  { 
    id: '9', 
    title: 'Balanced Meal Prep', 
    dur: '20 min', 
    cat: 'NUTRITION', 
    icon: '🥗', 
    group: 'Nutrition', 
    desc: 'Prepare a healthy break meal.', 
    steps: ['Wash vegetables', 'Chop and assemble', 'Include protein and healthy fats'] 
  },
  { 
    id: '10', 
    title: 'Power Nap', 
    dur: '20 min', 
    cat: 'REST & RECOVERY', 
    icon: '😴', 
    group: 'Rest', 
    desc: 'Deep rest for high fatigue.', 
    steps: ['Find a dark, quiet spot', 'Set an alarm for 20 mins', 'Close your eyes', 'Wake up slowly'] 
  },
  { 
    id: '11', 
    title: 'Eye Rest 20-20-20', 
    dur: '5 min', 
    cat: 'REST & RECOVERY', 
    icon: '👁️', 
    group: 'Rest', 
    desc: 'Reduce digital eye strain.', 
    steps: ['Look at something 20 feet away', 'Keep focus for 20 seconds', 'Blink slowly 10 times'] 
  },
  { 
    id: '12', 
    title: 'Quiet Sitting', 
    dur: '10 min', 
    cat: 'REST & RECOVERY', 
    icon: '🪑', 
    group: 'Rest', 
    desc: 'Sit still without devices.', 
    steps: ['Find a comfortable chair', 'Sit upright', 'Close eyes or gaze softly', 'Let thoughts pass by'] 
  },
  {
    id: '13',
    title: 'Neck & Shoulder Stretch',
    dur: '5 min',
    cat: 'PHYSICAL MOVEMENT',
    icon: '🧘‍♂️',
    group: 'Move',
    desc: 'Release tension from long sitting.',
    steps: ['Slowly tilt head to right shoulder', 'Hold for 15s, then left side', 'Roll shoulders backward 10 times', 'Gently drop chin to chest']
  },
  {
    id: '14',
    title: 'Standing Desk Stretches',
    dur: '5 min',
    cat: 'PHYSICAL MOVEMENT',
    icon: '🧍',
    group: 'Move',
    desc: 'Activate lower body while working.',
    steps: ['Rise up on tip-toes 15 times', 'Do 10 air squats', 'Stretch each calf against a wall', 'Shake out your legs']
  },
  {
    id: '15',
    title: 'Doorway Chest Stretch',
    dur: '5 min',
    cat: 'PHYSICAL MOVEMENT',
    icon: '🚪',
    group: 'Move',
    desc: 'Counteract the "computer slouch".',
    steps: ['Place forearms on door frame', 'Lean forward gently', 'Hold for 30 seconds', 'Repeat 3 times']
  },
  {
    id: '16',
    title: 'Gratitude Journaling',
    dur: '5 min',
    cat: 'MINDFULNESS',
    icon: '✍️',
    group: 'Mind',
    desc: 'Shift focus to the positive.',
    steps: ['Grab a pen and paper', 'Write 3 things you are grateful for', 'Think about why they matter', 'Take a deep breath']
  },
  {
    id: '17',
    title: 'Body Scan',
    dur: '10 min',
    cat: 'MINDFULNESS',
    icon: '🔍',
    group: 'Mind',
    desc: 'Check in with physical sensations.',
    steps: ['Sit or lie down comfortably', 'Focus on your toes and move up', 'Notice any tension or comfort', 'Release tension with each exhale']
  },
  {
    id: '18',
    title: 'Single-Tasking Focus',
    dur: '10 min',
    cat: 'MINDFULNESS',
    icon: '🎯',
    group: 'Mind',
    desc: 'Practice deep concentration.',
    steps: ['Pick one small, non-work task', 'Give it 100% of your attention', 'When mind wanders, bring it back', 'Complete the task fully']
  },
  {
    id: '19',
    title: 'Herbal Tea Break',
    dur: '10 min',
    cat: 'NUTRITION',
    icon: '🍵',
    group: 'Nutrition',
    desc: 'A warm, soothing hydration ritual.',
    steps: ['Boil fresh water', 'Choose a caffeine-free tea', 'Savor the aroma while steeping', 'Sip slowly without screens']
  },
  {
    id: '20',
    title: 'Mindful Chewing',
    dur: '5 min',
    cat: 'NUTRITION',
    icon: '🥜',
    group: 'Nutrition',
    desc: 'Improve digestion and awareness.',
    steps: ['Take a small bite of your snack', 'Chew slowly, noticing texture', 'Notice the flavors changing', 'Swallow before the next bite']
  },
  {
    id: '21',
    title: 'Fruit Infused Water',
    dur: '5 min',
    cat: 'NUTRITION',
    icon: '🍓',
    group: 'Nutrition',
    desc: 'Elevate your hydration game.',
    steps: ['Slice lemon, berries or cucumber', 'Add to a large water bottle', 'Let it infuse for a few minutes', 'Enjoy the refreshing taste']
  },
  {
    id: '22',
    title: 'Digital Detox',
    dur: '15 min',
    cat: 'REST & RECOVERY',
    icon: '📵',
    group: 'Rest',
    desc: 'Completely disconnect from screens.',
    steps: ['Put phone in another room', 'Turn off your monitor', 'Look out a window or go outside', 'Let your brain idle']
  },
  {
    id: '23',
    title: 'Lo-fi Music Rest',
    dur: '10 min',
    cat: 'REST & RECOVERY',
    icon: '🎧',
    group: 'Rest',
    desc: 'Auditory relaxation.',
    steps: ['Put on noise-canceling headphones', 'Play a lo-fi or ambient track', 'Close your eyes', 'Let the rhythm steady your heart']
  },
  {
    id: '24',
    title: 'Progressive Relaxation',
    dur: '15 min',
    cat: 'REST & RECOVERY',
    icon: '🛌',
    group: 'Rest',
    desc: 'Systematic tension release.',
    steps: ['Tense your feet for 5s, then release', 'Move to calves, thighs, glutes', 'Continue up to hands and face', 'Feel the total body heaviness']
  },
];

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = useState('All');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const { colors } = useTheme();

  const [fontsLoaded] = useFonts({
    'Syne-ExtraBold': Syne_800ExtraBold,
  });

  const panY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 150) {
          Animated.timing(panY, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setSelectedActivity(null);
            panY.setValue(0);
          });
        } else {
          Animated.spring(panY, {
            toValue: 0,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const filteredData = activeTab === 'All' 
    ? ACTIVITIES 
    : ACTIVITIES.filter(item => item.group === activeTab);

  const renderActivity = ({ item }) => (
    <TouchableOpacity 
      style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => setSelectedActivity(item)}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
        <Text style={styles.emojiIcon}>{item.icon}</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={[styles.catLabel, styles[`cat${item.group}`]]}>{item.cat}</Text>
        <Text style={[styles.activityTitle, { color: colors.textPrimary }]}>{item.title}</Text>
        <Text style={styles.durationText}>{item.dur}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#39ef8d" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.mainTitle, { color: colors.textPrimary, fontFamily: 'Syne-ExtraBold' }]}>
          Activity <Text style={[styles.titleHighlight, { fontFamily: 'Syne-ExtraBold' }]}>Library</Text></Text>
          <Text style={styles.subtitle}>{ACTIVITIES.length} guided break activities.</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat} 
                onPress={() => setActiveTab(cat)}
                style={[styles.tabItem, { backgroundColor: colors.card, borderColor: colors.border }, activeTab === cat && styles.tabItemActive]}
              >
                <Text style={[styles.tabText, activeTab === cat && styles.tabTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* List of Activities */}
        <FlatList
          data={filteredData}
          keyExtractor={item => item.id}
          renderItem={renderActivity}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Activity Detail Modal */}
        <Modal
          visible={!!selectedActivity}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedActivity(null)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.card,
                  transform: [{ translateY: panY }]
                }
              ]}
            >
              <View style={styles.handleContainer} {...panResponder.panHandlers}>
                <View style={styles.modalHandle} />
              </View>
              
              {selectedActivity && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary, fontFamily: 'Syne-ExtraBold' }]}>
                  {selectedActivity.title}
                  </Text>
                  
                  <View style={styles.modalImageContainer}>
                    <Text style={{ fontSize: 60 }}>{selectedActivity.icon}</Text>
                  </View>

                  <Text style={styles.modalDesc}>{selectedActivity.desc}</Text>

                  <Text style={styles.stepsHeader}>STEPS</Text>
                  {(selectedActivity.steps || []).map((step, idx) => (
                    <View key={idx} style={[styles.stepRow, { borderBottomColor: colors.border }]}>
                      <Text style={styles.stepNum}>{idx + 1}</Text>
                      <Text style={[styles.stepText, { color: colors.textPrimary }]}>{step}</Text>
                    </View>
                  ))}

                  <View style={[styles.modalFooter, { backgroundColor: colors.background }]}>
                    <Text style={styles.footerLabel}>Duration</Text>
                    <Text style={styles.footerVal}>{selectedActivity.dur}</Text>
                  </View>

                  <TouchableOpacity 
                    style={[styles.closeBtn, { backgroundColor: colors.border }]}
                    onPress={() => {
                      setSelectedActivity(null);
                      panY.setValue(0);
                    }}
                  >
                    <Text style={[styles.closeBtnText, { color: colors.textPrimary }]}>Back to Library</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </Animated.View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { marginTop: 20, marginBottom: 25 },
  logoText: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  brandName: { color: '#fff' },
  mainTitle: { fontSize: 25, fontWeight: '900' },
  titleHighlight: { color: '#39ef8d' },
  subtitle: { color: '#888', fontSize: 14 },

  tabWrapper: { marginBottom: 20 },
  tabBar: { flexDirection: 'row', paddingRight: 20 },
  tabItem: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 10 },
  tabItemActive: { backgroundColor: '#065f46', borderColor: '#39ef8d' },
  tabText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#39ef8d' },

  activityCard: { flexDirection: 'row', borderRadius: 15, padding: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1 },
  iconContainer: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  emojiIcon: { fontSize: 24 },
  infoContainer: { flex: 1 },
  catLabel: { fontSize: 10, fontWeight: 'bold', marginBottom: 4, letterSpacing: 0.5 },
  catMove: { color: '#39ef8d' },
  catMind: { color: '#a855f7' },
  catNutrition: { color: '#fbbf24' },
  catRest: { color: '#60a5fa' },
  activityTitle: { fontSize: 18, fontWeight: 'bold' },
  durationText: { color: '#64748b', fontSize: 12 },
  chevron: { color: '#334155', fontSize: 24 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, height: '85%' },
  handleContainer: { width: '100%', alignItems: 'center', paddingVertical: 15, marginTop: -10 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#39ef8d', borderRadius: 2 },
  modalTitle: { fontSize: 32, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
  modalImageContainer: { alignItems: 'center', marginBottom: 20 },
  modalDesc: { color: '#94a3b8', fontSize: 16, textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  stepsHeader: { color: '#64748b', fontSize: 12, fontWeight: 'bold', marginBottom: 15 },
  stepRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1 },
  stepNum: { color: '#39ef8d', fontWeight: 'bold', marginRight: 15 },
  stepText: { fontSize: 14 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderRadius: 12, marginTop: 30 },
  footerLabel: { color: '#64748b' },
  footerVal: { color: '#39ef8d', fontWeight: 'bold' },
  closeBtn: { marginTop: 30, paddingVertical: 15, borderRadius: 20, alignItems: 'center', marginBottom: 40 },
  closeBtnText: { fontWeight: 'bold' }
});