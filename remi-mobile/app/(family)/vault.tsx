import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy'; // Legacy import fixed!
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../supabase';

export default function MemoryVaultScreen() {
  const router = useRouter();
  
  // --- ROUTING STATE ---
  const [currentView, setCurrentView] = useState<'menu' | 'photos' | 'audio' | 'music'>('menu');

  const [images, setImages] = useState<any[]>([]);
  const [audioNotes, setAudioNotes] = useState<any[]>([]);
  const [musicTracks, setMusicTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Photo States
  const [isCaptionModalVisible, setCaptionModalVisible] = useState(false);
  const [pendingImage, setPendingImage] = useState<any>(null);
  const [captionText, setCaptionText] = useState('');
  
  // Audio & Music Shared State
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  // Voice Recording State
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Music Upload State
  const [isMusicModalVisible, setMusicModalVisible] = useState(false);
  const [pendingMusic, setPendingMusic] = useState<any>(null);
  const [songName, setSongName] = useState('');
  const [isImportant, setIsImportant] = useState(false);

  useEffect(() => {
    if (currentView !== 'menu') {
      fetchVaultItems();
    }
    
    // Cleanup audio to prevent race condition crashes
    return () => {
      if (sound) sound.unloadAsync().catch(() => {});
      if (recording) recording.stopAndUnloadAsync().catch(() => {});
    };
  }, [currentView, sound, recording]);

  const fetchVaultItems = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('memory_vault')
        .select('*')
        .eq('uploader_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter items so they stay in their respective vaults based on tags
      const fetchedPhotos = data.filter(item => item.image_url !== null);
      
      // Voice notes don't have [MUSIC] tags
      const fetchedAudio = data.filter(item => item.image_url === null && item.audio_url !== null && !item.caption?.includes('[MUSIC'));
      
      // Music tracks are identified by our special backend tag
      const fetchedMusic = data.filter(item => item.audio_url !== null && item.caption?.includes('[MUSIC'));

      setImages(fetchedPhotos);
      setAudioNotes(fetchedAudio);
      setMusicTracks(fetchedMusic);
    } catch (error) {
      console.error('Error fetching vault items:', error);
    } finally {
      setLoading(false);
    }
  };

  const playAudioPreview = async (url: string) => {
    try {
      if (sound) await sound.unloadAsync().catch(() => {});
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: url });
      setSound(newSound);
      await newSound.playAsync();
    } catch (err) {
      Alert.alert("Playback Error", "Could not play this audio file.");
    }
  };

  // ==========================================
  // --- VOICE VAULT LOGIC (NATIVE RECORDING) ---
  // ==========================================

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert("Permission Denied", "We need microphone access to record voice notes.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(newRec);
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecordingAndUpload = async () => {
    if (!recording) return;
    setIsRecording(false);
    setUploading(true);

    try {
      await recording.stopAndUnloadAsync().catch(() => {});
      const uri = recording.getURI();
      if (!uri) throw new Error("No audio file found.");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Uses the literal 'base64' string to avoid undefined error
      const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const ext = Platform.OS === 'ios' ? 'm4a' : 'm4a'; 
      const fileName = `${user.id}/audio_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('memory_vault')
        .upload(fileName, decode(base64Audio), { contentType: `audio/${ext}` });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('memory_vault').getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('memory_vault')
        .insert({
          uploader_id: user.id,
          patient_code: user.id, 
          audio_url: publicUrl,
          caption: "A voice note from family" 
        });

      if (dbError) throw dbError;
      fetchVaultItems();
      setRecording(null);

    } catch (error: any) {
      Alert.alert("Upload Failed", error.message);
    } finally {
      setUploading(false);
    }
  };

  // ==========================================
  // --- MUSIC VAULT LOGIC ---
  // ==========================================

  const pickMusicFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/mpeg', 'audio/mp3', 'audio/m4a', 'audio/wav'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        setPendingMusic(result.assets[0]);
        setMusicModalVisible(true);
      }
    } catch (error) {
      Alert.alert("Error", "Could not select the music file.");
    }
  };

  const uploadMusicFile = async () => {
    if (!songName.trim()) {
      Alert.alert("Missing Info", "Please enter a title for this song.");
      return;
    }
    setMusicModalVisible(false);
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Uses the literal 'base64' string to avoid undefined error
      const base64Audio = await FileSystem.readAsStringAsync(pendingMusic.uri, { encoding: 'base64' });
      const ext = pendingMusic.name.split('.').pop()?.toLowerCase() || 'mp3';
      const fileName = `${user.id}/music_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('memory_vault')
        .upload(fileName, decode(base64Audio), { contentType: `audio/${ext}` });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('memory_vault').getPublicUrl(fileName);

      // Secretly tag the caption so the Patient Screen knows how to handle it
      const tag = isImportant ? '[MUSIC-IMPORTANT]' : '[MUSIC]';
      const finalCaption = `${tag} ${songName.trim()}`;

      const { error: dbError } = await supabase
        .from('memory_vault')
        .insert({
          uploader_id: user.id,
          patient_code: user.id, 
          audio_url: publicUrl,
          caption: finalCaption 
        });

      if (dbError) throw dbError;
      fetchVaultItems();

    } catch (error: any) {
      Alert.alert("Upload Failed", error.message);
    } finally {
      setUploading(false);
      setPendingMusic(null);
      setSongName('');
      setIsImportant(false);
    }
  };


  // ==========================================
  // --- PHOTO VAULT LOGIC ---
  // ==========================================

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setPendingImage(result.assets[0]);
      setCaptionModalVisible(true);
    }
  };

  const uploadPhotoWithCaption = async () => {
    setCaptionModalVisible(false);
    if (!pendingImage) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const base64FileData = pendingImage.base64;
      const ext = pendingImage.uri.split('.').pop()?.toLowerCase() || 'jpeg';
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('memory_vault')
        .upload(fileName, decode(base64FileData), { contentType: `image/${ext}` });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('memory_vault').getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('memory_vault')
        .insert({
          uploader_id: user.id,
          patient_code: user.id, 
          image_url: publicUrl,
          caption: captionText
        });

      if (dbError) throw dbError;
      fetchVaultItems();

    } catch (error: any) {
      Alert.alert("Upload Failed", error.message);
    } finally {
      setUploading(false);
      setPendingImage(null);
      setCaptionText('');
    }
  };

  // ==========================================
  // --- SHARED DELETION LOGIC ---
  // ==========================================

  const confirmDelete = (item: any) => {
    Alert.alert(
      "Delete Item",
      "Are you sure you want to remove this from Mary's device?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteItem(item) }
      ]
    );
  };

  const deleteItem = async (item: any) => {
    const isPhoto = item.image_url !== null;
    const isMusic = item.caption?.includes('[MUSIC');
    
    // Optimistic UI Update
    if (isPhoto) {
      setImages(prev => prev.filter(img => img.id !== item.id));
    } else if (isMusic) {
      setMusicTracks(prev => prev.filter(music => music.id !== item.id));
    } else {
      setAudioNotes(prev => prev.filter(audio => audio.id !== item.id));
    }

    try {
      const urlTarget = isPhoto ? item.image_url : item.audio_url;
      if (urlTarget && urlTarget.includes('supabase.co')) {
        const pathParts = urlTarget.split('/memory_vault/');
        if (pathParts.length > 1) {
          await supabase.storage.from('memory_vault').remove([pathParts[1]]);
        }
      }
      const { error: dbError } = await supabase.from('memory_vault').delete().eq('id', item.id);
      if (dbError) throw dbError;
    } catch (error: any) {
      fetchVaultItems(); 
    }
  };


  // ==========================================
  // --- RENDERERS ---
  // ==========================================

  // 1. MENU RENDERER
  if (currentView === 'menu') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Family Vaults</Text>
          <View style={{ width: 44 }} /> 
        </View>

        <View style={styles.menuContainer}>
          <Text style={styles.menuSubtitle}>What would you like to share with Mary today?</Text>
          
          <TouchableOpacity style={styles.bigMenuCard} onPress={() => setCurrentView('photos')} activeOpacity={0.8}>
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(52, 211, 153, 0.2)' }]}>
              <Ionicons name="images" size={32} color="#34D399" />
            </View>
            <View style={styles.cardTextBox}>
              <Text style={styles.cardTitle}>Photo Vault</Text>
              <Text style={styles.cardDescription}>Upload pictures for Remi to show and talk about.</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#374151" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.bigMenuCard} onPress={() => setCurrentView('audio')} activeOpacity={0.8}>
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
              <Ionicons name="mic" size={32} color="#8B5CF6" />
            </View>
            <View style={styles.cardTextBox}>
              <Text style={styles.cardTitle}>Voice Notes</Text>
              <Text style={styles.cardDescription}>Record your voice for Mary to listen to.</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#374151" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.bigMenuCard} onPress={() => setCurrentView('music')} activeOpacity={0.8}>
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
              <Ionicons name="musical-notes" size={32} color="#F59E0B" />
            </View>
            <View style={styles.cardTextBox}>
              <Text style={styles.cardTitle}>Music Therapy</Text>
              <Text style={styles.cardDescription}>Upload Mary's favorite songs and flag them as important.</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 2. MUSIC VAULT RENDERER
  if (currentView === 'music') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentView('menu')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Music Therapy</Text>
          <View style={{ width: 44 }} /> 
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <TouchableOpacity style={[styles.uploadCard, uploading && styles.uploadCardDisabled]} onPress={pickMusicFile} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color="#F59E0B" />
            ) : (
              <>
                <View style={[styles.uploadIconBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Ionicons name="musical-notes" size={28} color="#F59E0B" />
                </View>
                <Text style={styles.uploadTitle}>Upload a Song</Text>
                <Text style={styles.uploadSubtitle}>Select an MP3 file</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Mary's Playlist</Text>
          {loading ? (
            <ActivityIndicator color="#F59E0B" style={{ marginTop: 20 }} />
          ) : (
            musicTracks.map((music) => {
              const isSongImportant = music.caption.includes('[MUSIC-IMPORTANT]');
              const cleanTitle = music.caption.replace('[MUSIC-IMPORTANT]', '').replace('[MUSIC]', '').trim();

              return (
                <View key={music.id} style={styles.audioRow}>
                  <TouchableOpacity style={[styles.audioPlayBtn, { backgroundColor: '#F59E0B' }]} onPress={() => playAudioPreview(music.audio_url)}>
                    <Ionicons name="play" size={24} color="#FFFFFF" style={{ marginLeft: 3 }} />
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={styles.audioRowTitle} numberOfLines={1}>{cleanTitle}</Text>
                    {isSongImportant ? (
                      <Text style={[styles.audioRowDate, { color: '#EF4444', fontWeight: 'bold' }]}>⭐ Important Notification</Text>
                    ) : (
                      <Text style={styles.audioRowDate}>Standard Playlist</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => confirmDelete(music)} style={styles.audioDeleteBtn}>
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )
            })
          )}
          {musicTracks.length === 0 && !loading && (
             <Text style={styles.emptyText}>No music uploaded yet.</Text>
          )}
        </ScrollView>

        {/* MUSIC UPLOAD MODAL */}
        <Modal visible={isMusicModalVisible} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Song Details</Text>
              
              <Text style={styles.inputLabel}>Song Title</Text>
              <TextInput
                style={[styles.captionInput, { minHeight: 50, textAlignVertical: 'center' }]}
                placeholder="e.g., Frank Sinatra - Fly Me To The Moon"
                placeholderTextColor="#9CA3AF"
                value={songName}
                onChangeText={setSongName}
              />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Mark as Important</Text>
                  <Text style={styles.switchSubtitle}>This will trigger an immediate notification on Mary's screen.</Text>
                </View>
                <Switch
                  value={isImportant}
                  onValueChange={setIsImportant}
                  trackColor={{ false: '#374151', true: '#F59E0B' }}
                  thumbColor={'#FFFFFF'}
                />
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => {
                    setMusicModalVisible(false);
                    setPendingMusic(null);
                    setSongName('');
                    setIsImportant(false);
                  }}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#F59E0B' }]} onPress={uploadMusicFile}>
                  <Text style={styles.saveButtonText}>Upload Song</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // 3. VOICE VAULT RENDERER
  if (currentView === 'audio') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentView('menu')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Voice Notes</Text>
          <View style={{ width: 44 }} /> 
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.recorderContainer}>
            <TouchableOpacity 
              style={[styles.recordButton, isRecording && styles.recordButtonActive]}
              onPressIn={startRecording}
              onPressOut={stopRecordingAndUpload}
              disabled={uploading}
              activeOpacity={0.7}
            >
              {uploading ? (
                <ActivityIndicator color="#FFFFFF" size="large" />
              ) : (
                <Ionicons name={isRecording ? "radio" : "mic"} size={48} color="#FFFFFF" />
              )}
            </TouchableOpacity>
            <Text style={styles.recordInstruction}>
              {uploading ? "Saving your voice..." : isRecording ? "Recording... Release to save" : "Hold button to record a message"}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Your Voice Notes</Text>
          {loading ? (
            <ActivityIndicator color="#8B5CF6" style={{ marginTop: 20 }} />
          ) : (
            audioNotes.map((audio) => (
              <View key={audio.id} style={styles.audioRow}>
                <TouchableOpacity style={styles.audioPlayBtn} onPress={() => playAudioPreview(audio.audio_url)}>
                  <Ionicons name="play" size={24} color="#FFFFFF" style={{ marginLeft: 3 }} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={styles.audioRowTitle}>Voice Note</Text>
                  <Text style={styles.audioRowDate}>{new Date(audio.created_at).toLocaleDateString()}</Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(audio)} style={styles.audioDeleteBtn}>
                  <Ionicons name="trash" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
          {audioNotes.length === 0 && !loading && (
             <Text style={styles.emptyText}>No voice notes recorded yet.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 4. PHOTO VAULT RENDERER
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentView('menu')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Photo Vault</Text>
        <View style={{ width: 44 }} /> 
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={[styles.uploadCard, uploading && styles.uploadCardDisabled]} onPress={pickImage} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color="#8B5CF6" />
            ) : (
              <>
                <View style={styles.uploadIconBadge}>
                  <Ionicons name="cloud-upload" size={28} color="#8B5CF6" />
                </View>
                <Text style={styles.uploadTitle}>Upload New Photo</Text>
                <Text style={styles.uploadSubtitle}>Tap to open gallery</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.galleryGrid}>
            {images.map((img) => (
              <View key={img.id} style={styles.imageContainer}>
                <Image source={{ uri: img.image_url }} style={styles.image} />
                {img.caption ? (
                  <View style={styles.captionOverlay}>
                    <Text style={styles.captionText} numberOfLines={2}>{img.caption}</Text>
                  </View>
                ) : null}
                <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDelete(img)} activeOpacity={0.8}>
                  <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
            
            {images.length === 0 && !uploading && (
              <Text style={styles.emptyText}>No photos uploaded yet.</Text>
            )}
          </View>
        </ScrollView>
      )}

      {/* PHOTO CAPTION MODAL */}
      <Modal visible={isCaptionModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <Text style={styles.modalTitle}>Add a Photo Caption</Text>
              
              {pendingImage && (
                <Image source={{ uri: pendingImage.uri }} style={styles.previewImage} />
              )}
              
              <Text style={styles.inputLabel}>Caption (for Remi to read)</Text>
              <TextInput
                style={styles.captionInput}
                placeholder="Who is in this photo? Where was it taken?"
                placeholderTextColor="#9CA3AF"
                value={captionText}
                onChangeText={setCaptionText}
                multiline
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => {
                    setCaptionModalVisible(false);
                    setPendingImage(null);
                    setCaptionText('');
                  }}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={uploadPhotoWithCaption}>
                  <Text style={styles.saveButtonText}>Save & Upload</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#110C1D', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#231A31' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  
  // --- MENU STYLES ---
  menuContainer: { paddingHorizontal: 20, paddingTop: 20 },
  menuSubtitle: { color: '#9CA3AF', fontSize: 16, marginBottom: 30 },
  bigMenuCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#110C1D', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#231A31' },
  cardIconBox: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  cardTextBox: { flex: 1 },
  cardTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  cardDescription: { color: '#6B7280', fontSize: 14, lineHeight: 20 },

  // --- AUDIO STYLES ---
  recorderContainer: { backgroundColor: '#110C1D', borderRadius: 24, padding: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#231A31', marginBottom: 40 },
  recordButton: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },
  recordButtonActive: { backgroundColor: '#EF4444', transform: [{ scale: 1.1 }] },
  recordInstruction: { color: '#D1D5DB', fontSize: 16, marginTop: 25, fontWeight: '600' },
  sectionTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  audioRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#110C1D', padding: 15, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#231A31' },
  audioPlayBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
  audioRowTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  audioRowDate: { color: '#6B7280', fontSize: 13, marginTop: 4 },
  audioDeleteBtn: { padding: 10 },

  // --- PHOTO & SHARED STYLES ---
  uploadCard: { backgroundColor: '#110C1D', borderRadius: 24, padding: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#231A31', borderStyle: 'dashed', marginBottom: 30 },
  uploadCardDisabled: { opacity: 0.5 },
  uploadIconBadge: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(139, 92, 246, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  uploadTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  uploadSubtitle: { color: '#6B7280', fontSize: 14 },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  imageContainer: { width: '48%', aspectRatio: 1, marginBottom: 15, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#231A31', position: 'relative' },
  image: { width: '100%', height: '100%' },
  captionOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', padding: 10 },
  captionText: { color: '#FFFFFF', fontSize: 12, lineHeight: 16 },
  emptyText: { color: '#6B7280', width: '100%', textAlign: 'center', marginTop: 20 },
  deleteButton: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(239, 68, 68, 0.85)', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  
  // --- MODAL STYLES ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#110C1D', borderRadius: 20, padding: 20, width: '100%', maxHeight: '90%', borderWidth: 1, borderColor: '#231A31' },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  previewImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 15, resizeMode: 'cover' },
  inputLabel: { color: '#D1D5DB', fontSize: 14, fontWeight: '600', marginBottom: 6, marginLeft: 2 },
  captionInput: { backgroundColor: '#000000', color: '#FFFFFF', borderRadius: 10, padding: 15, minHeight: 80, borderWidth: 1, borderColor: '#231A31', textAlignVertical: 'top', marginBottom: 20, fontSize: 16 },
  
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#000000', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#231A31', marginBottom: 25 },
  switchTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  switchSubtitle: { color: '#9CA3AF', fontSize: 12, paddingRight: 10 },

  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15, marginBottom: 10 },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 15, justifyContent: 'center' },
  cancelButtonText: { color: '#9CA3AF', fontSize: 16, fontWeight: 'bold' },
  saveButton: { backgroundColor: '#8B5CF6', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});