import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, Syne_800ExtraBold } from '@expo-google-fonts/syne';
import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { Outfit_400Regular } from '@expo-google-fonts/outfit';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { Michroma_400Regular } from '@expo-google-fonts/michroma';

import { StatusBar } from 'expo-status-bar';

// Import User Context and Hook
import { UserContext, useUser } from './UserContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { TimerProvider } from './context/TimerContext';

// Import Screens
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import StudyTimerScreen from './screens/StudyTimerScreen';
import CheckInScreen from './screens/CheckInScreen';
import RecommendScreen from './screens/RecommendScreen';
import LibraryScreen from './screens/LibraryScreen';
import StatsScreen from './screens/StatsScreen';
import SettingsScreen from './screens/SettingsScreen';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

// Custom Drawer Content with Footer
function CustomDrawerContent(props) {
  const { user, setUser } = useUser();
  const { colors, theme } = useTheme();

  const handleLogout = async () => {
    await AsyncStorage.clear();
    setUser(null);
  };

  const activeIndex = props.state.index;
  const activeRouteName = props.state.routeNames[activeIndex];

  const navigationItems = [
    { label: 'Home', subtitle: 'Dashboard & analytics', route: 'Home' },
    { label: 'Study Timer', subtitle: 'Pomodoro focus sessions', route: 'Study Timer' },
    { label: 'Check-in', subtitle: 'Log fatigue & stress', route: 'Check-in' },
    { label: 'Recommendation', subtitle: 'Your KNN break activity', route: 'Recommendation' },
    { label: 'Library', subtitle: '24 guided activities', route: 'Library' },
    { label: 'Logs', subtitle: 'Your session history', route: 'Logs' },
  ];

  if (!user) return null;

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.drawerContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={require('./img/logo.png')}
              style={styles.drawerLogo}
              resizeMode="contain"
            />
            <Text style={[styles.drawerBrand, { color: colors.textPrimary, fontSize: 15, fontFamily: 'Syne-Bold' }]}>
              BreakSense
            </Text>
          </View>

          <TouchableOpacity onPress={() => props.navigation.closeDrawer()}>
            <Ionicons name="close" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 16, marginBottom: 12 }}>
          <Text style={styles.sectionHeader}>NAVIGATION</Text>
        </View>

        {/* Menu Items */}
        <View style={{ paddingHorizontal: 12 }}>
          {navigationItems.map((item, index) => {
            const isActive = activeRouteName === item.route;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.drawerItem,
                  isActive && [styles.drawerItemActive, { backgroundColor: colors.card }]
                ]}
                onPress={() => props.navigation.navigate(item.route)}
              >
                {isActive && <View style={[styles.activeIndicator, { backgroundColor: colors.accent }]} />}
                <View style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemLabel, isActive && [styles.itemLabelActive, { color: colors.textPrimary }]]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.itemSubtitle, isActive && [styles.itemSubtitleActive, { color: colors.accent }]]}>
                      {item.subtitle}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={isActive ? colors.accent : '#64748b'} style={{ marginRight: 4 }} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Drawer Footer */}
        <View style={[styles.drawerFooter, { borderTopColor: colors.border }]}>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>
              {user?.first_name} {user?.last_name}
            </Text>
            <TouchableOpacity onPress={handleLogout} style={[styles.logoutBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.settingsBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => props.navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={18} color="#94a3b8" />
            <Text style={styles.settingsText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </DrawerContentScrollView>
  );
}

// Drawer navigator
function DrawerScreens() {
  const { colors } = useTheme();
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerPosition: 'right', // Drawer appears on the right
        drawerStyle: {
          backgroundColor: colors.background,
          width: 280,
        },
        drawerActiveTintColor: colors.accent,
        drawerActiveBackgroundColor: colors.card,
        drawerInactiveTintColor: '#94a3b8',
        drawerLabelStyle: {
          fontWeight: 'bold',
          fontSize: 15,
        },
      }}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Study Timer" component={StudyTimerScreen} />
      <Drawer.Screen name="Check-in" component={CheckInScreen} />
      <Drawer.Screen name="Recommendation" component={RecommendScreen} />
      <Drawer.Screen name="Library" component={LibraryScreen} />
      <Drawer.Screen name="Logs" component={StatsScreen} />
    </Drawer.Navigator>
  );
}

// Auth Stack 
function AuthStackScreens({ onLogin }) {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login">
        {(props) => <LoginScreen {...props} onLogin={onLogin} />}
      </AuthStack.Screen>
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  const [fontsLoaded] = useFonts({
    'Syne_800ExtraBold': Syne_800ExtraBold,
    'Syne-Bold': Syne_800ExtraBold,
    'Inter': Inter_400Regular,
    'Inter-Bold': Inter_700Bold,
    'Outfit': Outfit_400Regular,
    'JetBrains': JetBrainsMono_700Bold,
    'Michroma': Michroma_400Regular,
  });

  const handleLogin = (userData) => {
    setUser(userData);
  };

  if (!fontsLoaded) {
    return null; // Or a <SplashScreen /> component
  }

  return (
    <ThemeProvider>
      <TimerProvider>
        <UserContext.Provider value={{ user, setUser }}>
          <StatusBar style="auto" />
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {user ? (
                <>
                  <Stack.Screen name="MainApp">
                    {(props) => <DrawerScreens {...props} />}
                  </Stack.Screen>
                  <Stack.Screen
                    name="Settings"
                    component={SettingsScreen}
                    options={{
                      presentation: 'transparentModal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                </>
              ) : (
                <Stack.Screen name="Auth">
                  {(props) => <AuthStackScreens {...props} onLogin={handleLogin} />}
                </Stack.Screen>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </UserContext.Provider>
      </TimerProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
safeArea: {
    flex: 1, // This now has a parent to fill!
  },

  drawerContainer: { flex: 1 },
  drawerHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20,
    borderBottomWidth: 1,
  },
  drawerLogo: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  drawerBrand: {
    fontSize: 22,
  },
  logoText: { color: '#64748b', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  brandName: { fontSize: 18, fontWeight: 'bold' },
  sectionHeader: {
    color: '#64748b',
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: 'bold'
  },
  drawerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  drawerItemActive: {
    backgroundColor: '#1b2e20',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  itemLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  itemLabelActive: {
    color: '#ffffff',
  },
  itemSubtitle: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2
  },
  itemSubtitleActive: {
    color: '#39ef8d',
  },
  drawerFooter: {
    marginTop: 'auto',
    padding: 20,
    borderTopWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4
  },
  userName: {
    fontSize: 15,
    fontWeight: 'bold'
  },
  logoutBtn: {
    marginLeft: 'auto',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center'
  },
  settingsText: {
    color: '#94a3b8',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 13
  }
});