import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Modal, Platform, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase'; // Ensure this path is correct!

const screenWidth = Dimensions.get('window').width;

export default function GalleryScreen() {
  const [memories, setMemories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // --- FETCH REAL MEMORIES FROM SUPABASE ---
  useEffect(() => {
    const fetchMemories = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('memories')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setMemories(data);
      } catch (error) {
        console.error("Error fetching memories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemories();
  }, []);

  // --- NARRATION LOGIC ---
  const playNarration = (text: string) => {
    if (!text) return;
    Speech.stop(); 
    setIsPlaying(true);
    Speech.speak(text, { 
      language: 'en-GB', 
      pitch: 0.9, 
      rate: 0.85,
      onDone: () => setIsPlaying(false),
      onStopped: () => setIsPlaying(false),
    });
  };

  const stopNarration = () => {
    Speech.stop();
    setIsPlaying(false);
  };

  const closeModal = () => {
    stopNarration();
    setSelectedMemory(null);
  };

  // --- RENDER SINGLE PHOTO GRID ITEM ---
  const renderMemoryItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.gridItem} 
      activeOpacity={0.8}
      onPress={() => setSelectedMemory(item)}
    >
      <Image source={{ uri: item.image_url }} style={styles.gridImage} />
      <View style={styles.gridTextContainer}>
        <Text style={styles.gridTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.gridDate}>{item.date}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <View style={styles.appCapsule}>
        <View style={styles.internalContent}>
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Memories</Text>
            <Ionicons name="images" size={28} color="#A78BFA" />
          </View>

          {/* LOADING SPINNER OR PHOTO GRID */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>Fetching memories...</Text>
            </View>
          ) : memories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={48} color="#3D2F4F" />
              <Text style={styles.emptyText}>No memories found.</Text>
              <Text style={styles.emptySubtext}>Add photos from the caregiver portal.</Text>
            </View>
          ) : (
            <FlatList
              data={memories}
              keyExtractor={(item) => item.id}
              numColumns={2}
              renderItem={renderMemoryItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )}

        </View>
      </View>

      {/* --- THE INTERACTIVE MEMORY VIEWER (MODAL) --- */}
      <Modal visible={!!selectedMemory} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.detailCapsule}>
            
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedMemory?.title}</Text>
                <Text style={styles.modalDate}>{selectedMemory?.date}</Text>
              </View>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Image source={{ uri: selectedMemory?.image_url }} style={styles.largeImage} />

            <View style={styles.narrationContainer}>
              <Text style={styles.narrationInstructions}>
                Ask about this photo. If they need a hint, tap below.
              </Text>

              <TouchableOpacity 
                style={[styles.playButton, isPlaying && styles.playingButton]} 
                activeOpacity={0.8}
                onPress={() => isPlaying ? stopNarration() : playNarration(selectedMemory?.description)}
              >
                <Ionicons name={isPlaying ? "stop-circle" : "play-circle"} size={28} color="#FFFFFF" />
                <Text style={styles.playButtonText}>
                  {isPlaying ? "Stop Story" : "Remi, tell the story"}
                </Text>
              </TouchableOpacity>
            </View>
            
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  appCapsule: { flex: 1, backgroundColor: '#110C1D', borderRadius: 45, overflow: 'hidden', marginHorizontal: 10, marginBottom: 10, marginTop: 10, borderWidth: 1, borderColor: '#231A31' },
  internalContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' },
  
  // Loading and Empty States
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#A396B5', marginTop: 12, fontSize: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 50 },
  emptyText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginTop: 16 },
  emptySubtext: { color: '#A396B5', fontSize: 14, marginTop: 8, textAlign: 'center' },

  listContainer: { paddingBottom: 30 },
  gridItem: { flex: 1, backgroundColor: '#1A1325', margin: 6, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#231A31' },
  gridImage: { width: '100%', height: 140 },
  gridTextContainer: { padding: 12 },
  gridTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  gridDate: { color: '#A396B5', fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', padding: 10 },
  detailCapsule: { backgroundColor: '#110C1D', borderRadius: 35, padding: 20, borderWidth: 1, borderColor: '#3D2F4F', elevation: 10, shadowColor: '#8B5CF6', shadowOpacity: 0.2, shadowRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  modalDate: { fontSize: 16, color: '#A78BFA', marginTop: 4 },
  closeButton: { backgroundColor: '#231A31', padding: 8, borderRadius: 20 },
  largeImage: { width: '100%', height: 300, borderRadius: 20, marginBottom: 20 },
  
  narrationContainer: { backgroundColor: '#1A1325', padding: 20, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: '#231A31' },
  narrationInstructions: { color: '#A396B5', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  playButton: { backgroundColor: '#8B5CF6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30, width: '100%' },
  playingButton: { backgroundColor: '#EF4444' },
  playButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
});