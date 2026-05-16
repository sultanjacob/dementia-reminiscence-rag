import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} initialRouteName="home">
      
      {/* --- VISIBLE TABS (The User Zone) --- */}
      <Tabs.Screen 
        name="home" 
        options={{ title: 'Remi' }} 
      />
      
      <Tabs.Screen 
        name="gallery" 
        options={{ title: 'Memories' }} 
      />

      {/* --- HIDDEN TABS (The Caregiver Zone) --- */}
      {/* href: null makes the page exist, but hides the button on the bottom bar */}
      <Tabs.Screen 
        name="routine" 
        options={{ 
          href: null 
        }} 
      />
      <Tabs.Screen 
        name="schedule" 
        options={{ 
          href: null 
        }} 
      />
      <Tabs.Screen 
        name="caregiver" 
        options={{ 
          href: null 
        }} 
      />

    </Tabs>
  );
}