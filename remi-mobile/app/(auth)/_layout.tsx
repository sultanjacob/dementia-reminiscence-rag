import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native'; // 💡 NEW: Import Platform to check the device type

export default function AuthLayout() {
  return (
    <Tabs 
      screenOptions={{
        headerShown: false, 
        tabBarStyle: { 
          backgroundColor: '#110C1D', 
          borderTopWidth: 0,
          elevation: 0,
          // 💡 NEW: Flexible height and padding so it never gets crushed by the system nav bar
          minHeight: Platform.OS === 'android' ? 70 : 85,
          paddingBottom: Platform.OS === 'android' ? 15 : 30,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#8B5CF6', 
        tabBarInactiveTintColor: '#9CA3AF', 
      }}
    >
      {/* 🟣 TAB 1: REMI */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Remi',
          tabBarIcon: ({ color }) => <Ionicons name="chatbubble" size={24} color={color} />,
        }}
      />

      {/* 🖼️ TAB 2: GALLERY */}
      <Tabs.Screen
        name="gallery" 
        options={{
          title: 'Gallery',
          tabBarIcon: ({ color }) => <Ionicons name="images" size={24} color={color} />,
        }}
      />

      {/* 🚫 HIDE ALL OTHER SCREENS FROM THE TAB BAR */}
      <Tabs.Screen
        name="routine" 
        options={{ href: null }} 
      />
      <Tabs.Screen
        name="schedule" 
        options={{ href: null }} 
      />
      <Tabs.Screen
        name="caregiver"
        options={{ href: null }} 
      />
    </Tabs>
  );
}