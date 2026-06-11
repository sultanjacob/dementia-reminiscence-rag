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

  // Helper function to fetch user and their role
  const checkUserAndRole = async (sessionUser: any) => {
    if (!sessionUser) {
      setUser(null);
      setUserRole(null);
      setInitializing(false);
      return;
    }

    setUser(sessionUser);

    // Look up the role in the profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', sessionUser.id)
      .single();

    if (error) {
      console.error("Error fetching role:", error);
    }

    // Default to 'patient' as a safety net if no role is found
    setUserRole(data?.role || 'patient');
    setInitializing(false);
  };

  useEffect(() => {
    // 1. Check current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkUserAndRole(session?.user);
    });

    // 2. Listen for login/logout events
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth State Changed:", _event, session?.user ? "User Found" : "No User");
      // Briefly show loader while we grab the new role
      setInitializing(true); 
      checkUserAndRole(session?.user);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (initializing) return;

    // Check which folder the user is currently trying to view
    const inAuthGroup = segments[0] === '(auth)';
    const inFamilyGroup = segments[0] === '(family)';

    if (!user) {
      // Not logged in -> Go to Login (index screen)
      if (inAuthGroup || inFamilyGroup) {
        router.replace('/');
      }
    } else if (user && userRole) {
      // Logged in -> Go to the correct folder based on their role
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