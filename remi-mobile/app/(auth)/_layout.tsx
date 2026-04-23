import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#003366',
      headerShown: true,
    }}>
      <Tabs.Screen name="home" options={{ title: 'Remi', tabBarIcon: () => <Text>🧠</Text> }} />
      <Tabs.Screen name="gallery" options={{ title: 'Memories', tabBarIcon: () => <Text>🖼️</Text> }} />
      <Tabs.Screen name="routine" options={{ title: 'Routine', tabBarIcon: () => <Text>🕒</Text> }} />
    </Tabs>
  );
}