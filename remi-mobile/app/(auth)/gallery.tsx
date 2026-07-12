import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../supabase';

export default function PatientGalleryScreen() {
  const router = useRouter();
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMemories();
    // Stop any speech if the user leaves the screen
    return () => {
      Speech.stop();
    };
  }, []);

  const fetchMemories = async () => {
    try {
      const { data, error } = await supabase
        .from('memory_vault')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error fetching memories:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: SPEECH FUNCTION ---
  const speakMemory = (caption: string) => {
    if (!caption) return;
    
    // Stop anything currently playing
    Speech.stop(); 
    
    // Add a conversational prompt to the end of the family's caption
    const conversationalText = `${caption}. What do you remember about this?`;
    
    Speech.speak(conversationalText, { 
      language: 'en-GB', // Match Remi's accent
      pitch: 0.9, 
      rate: 0.8 // Speak slightly slower for easier comprehension
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Memories</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {images.map((img) => (
            <View key={img.id} style={styles.memoryCard}>
              <Image source={{ uri: img.image_url }} style={styles.image} />
              
              {img.caption ? (
                <View style={styles.captionContainer}>
                  <Text style={styles.captionText}>{img.caption}</Text>
                  
                  {/* --- NEW: LISTEN BUTTON --- */}
                  <TouchableOpacity 
                    style={styles.speakButton} 
                    onPress={() => speakMemory(img.caption)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="volume-high" size={32} color="#000000" />
                    <Text style={styles.speakButtonText}>Listen</Text>
                  </TouchableOpacity>

                </View>
              ) : null}
            </View>
          ))}

          {images.length === 0 ? (
            <Text style={styles.emptyText}>Your family hasn't added any photos yet.</Text>
          ) : null}
          
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#000000', 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1325'
  },
  headerTitle: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#FFFFFF' 
  },
  centerContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  scrollContent: { 
    paddingTop: 20 
  },
  memoryCard: {
    backgroundColor: '#110C1D',
    marginBottom: 40,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#231A31',
  },
  image: { 
    width: '100%', 
    aspectRatio: 1, 
    backgroundColor: '#1A1325'
  },
  captionContainer: {
    padding: 25,
    backgroundColor: '#110C1D',
  },
  captionText: { 
    color: '#FFFFFF', 
    fontSize: 26, 
    lineHeight: 38,
    fontWeight: '600',
    marginBottom: 25 // Added space for the button
  },
  speakButton: {
    backgroundColor: '#FDE68A', // High contrast yellow
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
  },
  speakButtonText: {
    color: '#000000',
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  emptyText: { 
    color: '#6B7280', 
    fontSize: 20, 
    textAlign: 'center', 
    marginTop: 40,
    paddingHorizontal: 20
  },
});