import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function GalleryScreen() {
  const [memories, setMemories] = useState<any[]>([]);
  // NEW: State to track which memory is currently being viewed in full screen
  const [selectedMemory, setSelectedMemory] = useState<any | null>(null);

  const fetchMemories = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return;

      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemories(data || []);
    } catch (error) {
      console.error("❌ FETCH ERROR:", error);
    }
  };

  useEffect(() => { 
    fetchMemories(); 
  }, []);

  const deleteMemory = (id: string) => {
    Alert.alert("Delete Memory?", "This will remove it from Remi's brain forever.", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          try {
            await supabase.from('memories').delete().eq('id', id);
            fetchMemories();
          } catch (error) {
            console.error("❌ DELETE ERROR:", error);
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.grid}>
          {memories.map((item) => (
            <View key={item.id} style={styles.card}>
              {/* NEW: Make the image and text tappable to open the Modal */}
              <TouchableOpacity onPress={() => setSelectedMemory(item)} activeOpacity={0.7}>
                <Image source={{ uri: item.image_url }} style={styles.img} />
                <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteMemory(item.id)}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* NEW: The Full-Screen Modal Viewer */}
      <Modal visible={!!selectedMemory} transparent={true} animationType="fade">
        <View style={styles.modalBackground}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedMemory(null)}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>

          {/* Full Size Image & Text */}
          {selectedMemory && (
            <View style={styles.fullScreenContent}>
              <Image 
                source={{ uri: selectedMemory.image_url }} 
                style={styles.fullImg} 
                resizeMode="contain" 
              />
              <Text style={styles.fullDesc}>{selectedMemory.description}</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10 },
  card: { width: '46%', margin: '2%', backgroundColor: 'white', borderRadius: 15, overflow: 'hidden', elevation: 3 },
  img: { width: '100%', height: 120 },
  desc: { padding: 8, fontSize: 12, color: '#444' },
  deleteBtn: { backgroundColor: '#FF3B30', padding: 8, alignItems: 'center' },
  
  // NEW: Styles for the Full-Screen Modal
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)', // Dark background so the image pops
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    zIndex: 10,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
  fullScreenContent: {
    width: '100%',
    height: '80%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImg: {
    width: '90%',
    height: '70%',
    borderRadius: 10,
  },
  fullDesc: {
    color: 'white',
    fontSize: 20,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  }
});