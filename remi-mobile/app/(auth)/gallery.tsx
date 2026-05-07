import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function GalleryScreen() {
  const [memories, setMemories] = useState<any[]>([]);

  const fetchMemories = async () => {
    try {
      // 1. Get the current user safely
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.log("No user found.");
        return;
      }

      // 2. Fetch data using the correct JS syntax (.from instead of .table)
      const { data, error } = await supabase
        .from('memories') 
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setMemories(data || []);
    } catch (error) {
      console.error("❌ FETCH MEMORIES ERROR DETAIL:", error);
    }
  };

  useEffect(() => { 
    fetchMemories(); 
  }, []);

  const deleteMemory = (id: string, imageUrl: string) => {
    Alert.alert("Delete Memory?", "This will remove it from Remi's brain forever.", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          try {
            // Use .from() here as well
            const { error } = await supabase.from('memories').delete().eq('id', id);
            
            if (error) {
              throw error;
            }
            
            // Refresh list after successful deletion
            fetchMemories();
          } catch (error) {
            console.error("❌ DELETE ERROR DETAIL:", error);
          }
        }
      }
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.grid}>
        {memories.map((item) => (
          <View key={item.id} style={styles.card}>
            <Image source={{ uri: item.image_url }} style={styles.img} />
            <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteMemory(item.id, item.image_url)}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10 },
  card: { width: '46%', margin: '2%', backgroundColor: 'white', borderRadius: 15, overflow: 'hidden', elevation: 3 },
  img: { width: '100%', height: 120 },
  desc: { padding: 8, fontSize: 12, color: '#444' },
  deleteBtn: { backgroundColor: '#FF3B30', padding: 8, alignItems: 'center' }
});