import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function FamilyDashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Family Dashboard</Text>
        <Text style={styles.subtitle}>Welcome to the Caregiver Portal</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    backgroundColor: '#110C1D',
    borderRadius: 45,
    margin: 10,
    borderWidth: 1,
    borderColor: '#231A31',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#A396B5',
    marginTop: 8,
  },
});