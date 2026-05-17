import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
      headerShown: false,
      tabBarActiveTintColor: '#A78BFA',
      tabBarInactiveTintColor: '#6B7280',
      tabBarStyle: { backgroundColor: '#110C1D', borderTopColor: '#231A31' }
    }}
    initialRouteName="index">
      
      {/* --- VISIBLE TABS --- */}
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Remi',
          tabBarIcon: ({ color }) => <Ionicons name="chatbubbles" size={24} color={color} />
        }} 
      />
      
      <Tabs.Screen 
        name="gallery" 
        options={{ 
          title: 'Memories',
          tabBarIcon: ({ color }) => <Ionicons name="images" size={24} color={color} />
        }} 
      />

      {/* --- HIDDEN TABS (The Caregiver Zone) --- */}
      <Tabs.Screen name="routine" options={{ href: null }} />
      <Tabs.Screen name="schedule" options={{ href: null }} />
      <Tabs.Screen name="caregiver" options={{ href: null }} />

    </Tabs>
  );
}