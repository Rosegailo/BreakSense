import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';

export default function Header() {
  const navigation = useNavigation();
  const { colors } = useTheme();

  return (
    <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={styles.logoWrapper}>
        <Image
          source={require('../../img/logo.png')}
          style={styles.headerIcon}
          resizeMode="contain"
        />
        <Text style={[styles.brandName, { color: colors.textPrimary }, { fontFamily: 'Syne-Bold' }]}>
          Break<Text style={{ color: colors.accent }}>Sense</Text>
        </Text>
      </View>
      <TouchableOpacity onPress={() => navigation.openDrawer()}
      style={{ paddingRight: 20 }}>
        <Ionicons name="menu" size={24} color={colors.accent} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 35,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a3342',
    zIndex: 100,
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 20,
  },
  headerIcon: {
    width: 42,
    height: 42,
  },
  logoText: { 
    fontSize: 10,
    fontWeight: 'bold' 
  },
  brandName: { 
    fontSize: 18,
    fontWeight: 'normal'
  },
});