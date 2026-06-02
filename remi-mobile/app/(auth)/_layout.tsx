import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  return (
    <Tabs 
      screenOptions={{
        headerShown: false, // Hides the default top header since we made our own
        tabBarStyle: { 
          backgroundColor: '#110C1D', // Keeps the dark bottom bar from your screenshot
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#8B5CF6', // Remi Purple when selected
        tabBarInactiveTintColor: '#9CA3AF', // Gray when not selected
      }}
    >
      {/* 🟣 TAB 1: THE REMI HOME SCREEN */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Remi',
          tabBarIcon: ({ color }) => <Ionicons name="chatbubble" size={24} color={color} />,
        }}
      />

      {/* 🖼️ TAB 2: THE MEMORIES SCREEN */}
      <Tabs.Screen
        name="memories" // Ensure you have a memories.tsx file in this folder!
        options={{
          title: 'Memories',
          tabBarIcon: ({ color }) => <Ionicons name="images" size={24} color={color} />,
        }}
      />

      {/* 🚫 HIDE OTHER SCREENS FROM THE TAB BAR */}
      <Tabs.Screen
        name="schedule"
        options={{ href: null }} // This hides the schedule screen from showing up as a bottom tab
      />
      <Tabs.Screen
        name="caregiver"
        options={{ href: null }} // This hides the caregiver screen from showing up as a bottom tab
      />
    </Tabs>
  );
}