import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function GalleryScreen() {
  const [memories, setMemories] = useState<any[]>([]);

  const fetchMemories = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.table('memories').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setMemories(data || []);
  };

  useEffect(() => { fetchMemories(); }, []);

  const deleteMemory = (id: string, imageUrl: string) => {
    Alert.alert("Delete Memory?", "This will remove it from Remi's brain forever.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          // 1. Delete from DB
          await supabase.table('memories').delete().eq('id', id);
          // 2. Refresh list
          fetchMemories();
        }}
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