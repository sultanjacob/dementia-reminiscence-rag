import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { supabase } from '../supabase';

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'patient' | 'family' | null>(null);
  
  const segments = useSegments();
  const router = useRouter();

  // Added a retry mechanism to fix the database timing race condition
  const checkUserAndRole = async (sessionUser: any, retryCount = 0) => {
    if (!sessionUser) {
      setUser(null);
      setUserRole(null);
      setInitializing(false);
      return;
    }

    setUser(sessionUser);

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', sessionUser.id)
      .maybeSingle(); 

    if (error) {
      console.error("Error fetching that role:", error);
    }

    // THE FIX: If data isn't there yet (during a fresh sign-up), wait 1 second and retry.
    if (!data && retryCount < 3) {
      setTimeout(() => checkUserAndRole(sessionUser, retryCount + 1), 1000);
      return;
    }

    // Removed the "|| 'patient'" trapdoor. It now strictly respects the database value.
    setUserRole(data?.role || null);
    setInitializing(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkUserAndRole(session?.user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth State Changed:", _event, session?.user ? "User Found" : "No User");
      setInitializing(true); 
      checkUserAndRole(session?.user);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inFamilyGroup = segments[0] === '(family)';

    if (!user) {
      if (inAuthGroup || inFamilyGroup) {
        router.replace('/');
      }
    } else if (user && userRole) {
      // Strict role-based routing
      if (userRole === 'family' && !inFamilyGroup) {
        router.replace('/(family)');
      } else if (userRole === 'patient' && !inAuthGroup) {
        router.replace('/(auth)');
      }
    }
  }, [user, userRole, initializing, segments]);

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" /> 
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(family)" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#000000' 
  }
});