import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase'; // Adjust path if needed

export default function ScheduleScreen() {
  const [routines, setRoutines] = useState<any[]>([]);
  
  // State for the Edit Modal
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editActivity, setEditActivity] = useState('');

  // 1. Fetch all routines for the logged-in user
  const fetchRoutines = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return;

      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', user.id)
        .order('time', { ascending: true }); // Orders them alphabetically by time

      if (error) throw error;
      setRoutines(data || []);
    } catch (error) {
      console.error("❌ Fetch Routines Error:", error);
    }
  };

  // Run the fetch when the screen opens
  useEffect(() => {
    fetchRoutines();
  }, []);

  // 2. Delete a routine
  const handleDelete = (id: string) => {
    Alert.alert("Delete Routine?", "Are you sure you want to remove this from the schedule?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          try {
            const { error } = await supabase.from('routines').delete().eq('id', id);
            if (error) throw error;
            
            // Refresh the list
            fetchRoutines();
          } catch (error) {
            console.error("❌ Delete Error:", error);
            Alert.alert("Error", "Could not delete the routine.");
          }
        }
      }
    ]);
  };

  // 3. Open the Edit Modal and pre-fill the data
  const openEditModal = (routine: any) => {
    setSelectedRoutineId(routine.id);
    setEditTime(routine.time);
    setEditActivity(routine.activity);
    setIsEditModalVisible(true);
  };

  // 4. Save the edited routine
  const handleSaveEdit = async () => {
    if (!editTime || !editActivity) {
      return Alert.alert("Wait!", "Time and Activity cannot be empty.");
    }

    try {
      const { error } = await supabase
        .from('routines')
        .update({ time: editTime, activity: editActivity })
        .eq('id', selectedRoutineId);

      if (error) throw error;

      // Close modal and refresh list
      setIsEditModalVisible(false);
      fetchRoutines();
      Alert.alert("Success", "Routine updated!");
    } catch (error) {
      console.error("❌ Update Error:", error);
      Alert.alert("Error", "Could not update the routine.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Daily Schedule 📅</Text>

      <ScrollView style={styles.listContainer}>
        {routines.length === 0 ? (
          <Text style={styles.emptyText}>No routines added yet. Go to the Caregiver tab to add some!</Text>
        ) : (
          routines.map((routine) => (
            <View key={routine.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.timeText}>{routine.time}</Text>
              </View>
              <Text style={styles.activityText}>{routine.activity}</Text>
              
              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(routine)}>
                  <Text style={styles.btnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(routine.id)}>
                  <Text style={styles.btnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* --- EDIT MODAL --- */}
      <Modal visible={isEditModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Routine</Text>
            
            <TextInput 
              style={styles.input} 
              placeholder="Time (e.g., 08:00 AM)" 
              value={editTime} 
              onChangeText={setEditTime} 
            />
            <TextInput 
              style={styles.input} 
              placeholder="Activity" 
              value={editActivity} 
              onChangeText={setEditActivity} 
              multiline
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditModalVisible(false)}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={styles.btnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1a202c', marginBottom: 15, textAlign: 'center' },
  listContainer: { flex: 1 },
  emptyText: { textAlign: 'center', color: '#718096', marginTop: 20, fontSize: 16 },
  
  card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 },
  cardHeader: { borderBottomWidth: 1, borderBottomColor: '#edf2f7', paddingBottom: 8, marginBottom: 8 },
  timeText: { fontSize: 18, fontWeight: 'bold', color: '#2b6cb0' },
  activityText: { fontSize: 16, color: '#4a5568', marginBottom: 15 },
  
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  editBtn: { backgroundColor: '#4299e1', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 6 },
  deleteBtn: { backgroundColor: '#e53e3e', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 6 },
  btnText: { color: 'white', fontWeight: 'bold' },

  // Modal Styles
  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { backgroundColor: '#edf2f7', padding: 12, borderRadius: 8, marginBottom: 10, fontSize: 16 },
  modalActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cancelBtn: { backgroundColor: '#a0aec0', padding: 12, borderRadius: 8, flex: 0.45, alignItems: 'center' },
  saveBtn: { backgroundColor: '#48bb78', padding: 12, borderRadius: 8, flex: 0.45, alignItems: 'center' }
});