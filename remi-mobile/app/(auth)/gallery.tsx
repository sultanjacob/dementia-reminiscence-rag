import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={32} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Memories</Text>
        <View style={{ width: 50 }} /> 
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
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1325'
  },
  backButton: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#110C1D', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 2, 
    borderColor: '#231A31' 
  },
  headerTitle: { 
    fontSize: 28, 
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
    fontSize: 24, 
    lineHeight: 34,
    fontWeight: '500'
  },
  emptyText: { 
    color: '#6B7280', 
    fontSize: 20, 
    textAlign: 'center', 
    marginTop: 40,
    paddingHorizontal: 20
  },
});