import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  return (
    <Tabs 
      screenOptions={{
        headerShown: false, 
        tabBarStyle: { 
          backgroundColor: '#110C1D', 
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
          paddingBottom: 10,
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

      {/* 📅 TAB 3: ROUTINE */}
      <Tabs.Screen
        name="routine" 
        options={{
          title: 'Routine',
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color} />,
        }}
      />

      {/* 🚫 HIDE OTHER SCREENS */}
      <Tabs.Screen
        name="caregiver"
        options={{ href: null }} 
      />
    </Tabs>
  );
}