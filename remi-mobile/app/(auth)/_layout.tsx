import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#003366',
      headerShown: false, // You can change this to false later if you want a custom top header!
    }}>
      
      {/* --- VISIBLE TABS (The User Zone) --- */}
      <Tabs>
  {/* HOME TAB MUST BE FIRST so it opens by default */}
  <Tabs.Screen 
    name="home" 
    options={{ title: 'Remi' }} 
  />
  
  {/* MEMORIES TAB IS SECOND */}
  <Tabs.Screen 
    name="gallery" 
    options={{ title: 'Memories' }} 
  />
</Tabs>

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