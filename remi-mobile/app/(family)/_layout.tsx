import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

export default function FamilyLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#110C1D',
          borderTopWidth: 1,
          borderTopColor: '#231A31',
          // INCREASED these Android numbers to push the icons up higher
          paddingBottom: Platform.OS === 'android' ? 25 : 28,
          paddingTop: 10,
          height: Platform.OS === 'android' ? 85 : 88,
        },
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#6B7280',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: 'Routines',
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}