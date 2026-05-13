import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import React, { useState } from 'react';
import { Dimensions, FlatList, Image, Modal, Platform, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// --- TEMPORARY DUMMY DATA ---
// We will replace this with real images from your Supabase database later!
const DUMMY_MEMORIES = [
  {
    id: '1',
    title: 'Sarah\'s Wedding',
    date: 'June 2018',
    description: 'This is from Sarah\'s wedding day. You wore your favorite blue suit, and we all danced until midnight. You were so proud walking her down the aisle.',
    imageUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: '2',
    title: 'Trip to the Lake',
    date: 'Summer 2022',
    description: 'This is a picture from our family trip to the lake. The weather was beautiful, and we had a picnic on the grass. You loved watching the boats sail by.',
    imageUrl: 'https://images.unsplash.com/photo-1506744626753-eba7bc336e9a?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: '3',
    title: 'Baking Cookies',
    date: 'December 2023',
    description: 'Here we are baking chocolate chip cookies in the kitchen. You showed the grandkids your secret recipe for making them extra soft.',
    imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745a872f?q=80&w=600&auto=format&fit=crop',
  }
];

const screenWidth = Dimensions.get('window').width;

export default function GalleryScreen() {
  const [selectedMemory, setSelectedMemory] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // --- NARRATION LOGIC ---
  const playNarration = (text: string) => {
    Speech.stop(); // Stop any current speech
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
      <Image source={{ uri: item.imageUrl }} style={styles.gridImage} />
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
          
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Memories</Text>
            <Ionicons name="images" size={28} color="#A78BFA" />
          </View>

          {/* PHOTO GRID */}
          <FlatList
            data={DUMMY_MEMORIES}
            keyExtractor={(item) => item.id}
            numColumns={2}
            renderItem={renderMemoryItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />

        </View>
      </View>

      {/* --- THE INTERACTIVE MEMORY VIEWER (MODAL) --- */}
      <Modal visible={!!selectedMemory} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          
          <View style={styles.detailCapsule}>
            {/* Top Bar inside Modal */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedMemory?.title}</Text>
                <Text style={styles.modalDate}>{selectedMemory?.date}</Text>
              </View>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* The Large Photo */}
            <Image source={{ uri: selectedMemory?.imageUrl }} style={styles.largeImage} />

            {/* The Narration Box */}
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
  safeArea: {
    flex: 1,
    backgroundColor: '#000000', 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  appCapsule: {
    flex: 1,
    backgroundColor: '#110C1D', 
    borderRadius: 45,
    overflow: 'hidden',
    marginHorizontal: 10,
    marginBottom: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#231A31',
  },
  internalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Grid Styles
  listContainer: {
    paddingBottom: 30,
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#1A1325',
    margin: 6,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#231A31',
  },
  gridImage: {
    width: '100%',
    height: 140,
  },
  gridTextContainer: {
    padding: 12,
  },
  gridTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  gridDate: {
    color: '#A396B5',
    fontSize: 12,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Darker overlay for focus
    justifyContent: 'center',
    padding: 10,
  },
  detailCapsule: {
    backgroundColor: '#110C1D',
    borderRadius: 35,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3D2F4F',
    elevation: 10,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalDate: {
    fontSize: 16,
    color: '#A78BFA',
    marginTop: 4,
  },
  closeButton: {
    backgroundColor: '#231A31',
    padding: 8,
    borderRadius: 20,
  },
  largeImage: {
    width: '100%',
    height: 300,
    borderRadius: 20,
    marginBottom: 20,
  },
  
  // Narration Box
  narrationContainer: {
    backgroundColor: '#1A1325',
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#231A31',
  },
  narrationInstructions: {
    color: '#A396B5',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  playButton: {
    backgroundColor: '#8B5CF6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    width: '100%',
  },
  playingButton: {
    backgroundColor: '#EF4444', // Turns red when playing so they know how to stop it
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});