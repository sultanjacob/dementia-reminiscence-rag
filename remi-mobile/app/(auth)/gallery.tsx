import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  
  // Audio Recording States
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchMemories();
    return () => {
      Speech.stop();
      if (recording) {
        recording.stopAndUnloadAsync();
      }
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

  const speakMemory = (caption: string) => {
    if (!caption) return;
    Speech.stop(); 
    const conversationalText = `${caption}. What do you remember about this?`;
    Speech.speak(conversationalText, { language: 'en-GB', pitch: 0.9, rate: 0.8 });
  };

  // --- NEW: INTELLIGENT REPLY LOGIC ---
  const startRecording = async (imageId: string) => {
    try {
      Speech.stop(); // Stop Remi talking if she is
      
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert("Permission Denied", "Remi needs microphone access to hear your memories.");
        return;
      }
      
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      
      setRecording(newRecording);
      setActiveRecordingId(imageId);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecordingAndSendToRAG = async (imageContext: any) => {
    if (!recording) return;

    setActiveRecordingId(null);
    setIsProcessing(true);
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      // ========================================================
      // STARTUP RAG LOGIC GOES HERE:
      // In your final app, you will send 'uri' AND 'imageContext'
      // to your Python backend. The AI will transcribe the audio, 
      // see that Mary added a new detail about this specific photo, 
      // and save it to the Vector Database so Remi remembers it forever.
      // ========================================================
      
      console.log(`Sending audio for image ${imageContext.id} to RAG memory...`);
      
      // Simulate network request
      setTimeout(() => {
        setIsProcessing(false);
        Speech.speak("Thank you for telling me that. I will remember it.", { language: 'en-GB' });
      }, 1500);

    } catch (err) {
      console.error("Failed to stop and send", err);
      setIsProcessing(false);
    }
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
          
          {images.map((img) => {
            const isRecordingThis = activeRecordingId === img.id;
            
            return (
              <View key={img.id} style={styles.memoryCard}>
                <Image source={{ uri: img.image_url }} style={styles.image} />
                
                {img.caption ? (
                  <View style={styles.captionContainer}>
                    <Text style={styles.captionText}>{img.caption}</Text>
                    
                    {/* BUTTON ROW */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.listenButton, isRecordingThis && { opacity: 0.3 }]} 
                        onPress={() => speakMemory(img.caption)}
                        disabled={isRecordingThis || isProcessing}
                      >
                        <Ionicons name="volume-high" size={24} color="#000000" />
                        <Text style={styles.listenButtonText}>Listen</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.actionButton, isRecordingThis ? styles.recordingButton : styles.replyButton]} 
                        onPress={() => isRecordingThis ? stopRecordingAndSendToRAG(img) : startRecording(img.id)}
                        disabled={isProcessing}
                      >
                        {isProcessing && activeRecordingId === null ? (
                           <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name={isRecordingThis ? "stop-circle" : "mic"} size={24} color="#FFFFFF" />
                            <Text style={styles.replyButtonText}>
                              {isRecordingThis ? "Stop" : "Reply"}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                    
                    {isRecordingThis && (
                      <Text style={styles.recordingStatusText}>Remi is listening to you...</Text>
                    )}

                  </View>
                ) : null}
              </View>
            )
          })}

          {images.length === 0 && (
            <Text style={styles.emptyText}>Your family hasn't added any photos yet.</Text>
          )}
          
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#1A1325' },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingTop: 20 },
  memoryCard: { backgroundColor: '#110C1D', marginBottom: 40, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#231A31' },
  image: { width: '100%', aspectRatio: 1, backgroundColor: '#1A1325' },
  captionContainer: { padding: 25, backgroundColor: '#110C1D' },
  captionText: { color: '#FFFFFF', fontSize: 26, lineHeight: 38, fontWeight: '600', marginBottom: 25 },
  
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 20 },
  listenButton: { backgroundColor: '#FDE68A' },
  listenButtonText: { color: '#000000', fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
  replyButton: { backgroundColor: '#8B5CF6' },
  recordingButton: { backgroundColor: '#EF4444' },
  replyButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
  
  recordingStatusText: { color: '#EF4444', textAlign: 'center', marginTop: 15, fontSize: 16, fontWeight: '600' },
  emptyText: { color: '#6B7280', fontSize: 20, textAlign: 'center', marginTop: 40, paddingHorizontal: 20 },
});