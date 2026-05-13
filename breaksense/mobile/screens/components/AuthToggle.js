import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function AuthToggle({ activeTab, onTabChange }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Background Tab Highlighter */}
      <View style={[
        styles.activeIndicator, 
        { backgroundColor: colors.accent },
        activeTab === 'SignUp' ? { right: 5 } : { left: 5 }
      ]} />
      
      <TouchableOpacity 
        style={styles.tab} 
        onPress={() => onTabChange('Login')}
      >
        <Text style={[styles.tabText, activeTab === 'Login' ? [styles.activeText, { color: '#0f141e' }] : [styles.inactiveText, { color: colors.textSecondary }]]}>
          Log In
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.tab} 
        onPress={() => onTabChange('SignUp')}
      >
        <Text style={[styles.tabText, activeTab === 'SignUp' ? [styles.activeText, { color: '#0f141e' }] : [styles.inactiveText, { color: colors.textSecondary }]]}>
          Sign Up
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 15,
    height: 60,
    padding: 5,
    marginBottom: 40,
    position: 'relative',
    borderWidth: 1,
  },
  activeIndicator: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    width: '48%',
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  activeText: {
  },
  inactiveText: {
  },
});