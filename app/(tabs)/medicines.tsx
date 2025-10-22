import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import { Package } from 'lucide-react-native';
import { useEffect, useState, useCallback } from 'react';
import { Medicine, Pharmacy } from '@/types';

export default function MedicinesScreen() {
  const { currentUser, apiRequest } = useAuth();
  const [myMedicines, setMyMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'pharmacy_owner') return;
    setLoading(true);
    try {
      const pharmacies: Pharmacy[] = await apiRequest('GET', `/pharmacies?ownerId=${currentUser.id}`);
      const ids = pharmacies.map(p => p.id);
      const medsArrays = await Promise.all(ids.map(id => apiRequest('GET', `/medicines/pharmacy/${id}`)));
      setMyMedicines(medsArrays.flat());
    } catch (e) {
      console.error('Failed to load medicines', e);
      setMyMedicines([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, apiRequest]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!currentUser || currentUser.role !== 'pharmacy_owner') return null;

  if (loading || myMedicines.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Package size={64} color={Colors.gray} />
        <Text style={styles.emptyText}>{loading ? 'Loading medicines...' : 'No medicines yet'}</Text>
        {!loading && <Text style={styles.emptySubtext}>Add medicines to your pharmacy</Text>}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {myMedicines.map((medicine) => (
        <View key={medicine.id} style={styles.medicineCard}>
          <Image source={{ uri: medicine.image }} style={styles.medicineImage} />
          <View style={styles.medicineInfo}>
            <Text style={styles.medicineName}>{medicine.name}</Text>
            <Text style={styles.medicineDescription} numberOfLines={2}>
              {medicine.description}
            </Text>
            <View style={styles.medicineFooter}>
              <View>
                <Text style={styles.medicineCategory}>{medicine.category}</Text>
                <Text style={styles.medicineStock}>Stock: {medicine.stock} units</Text>
              </View>
              <Text style={styles.medicinePrice}>${medicine.price.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  medicineCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medicineImage: {
    width: 120,
    height: 120,
    backgroundColor: Colors.lightGray,
  },
  medicineInfo: {
    flex: 1,
    padding: 12,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  medicineDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  medicineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto' as const,
  },
  medicineCategory: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  medicineStock: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  medicinePrice: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
});
