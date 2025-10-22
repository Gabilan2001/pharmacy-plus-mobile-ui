import { colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { Medicine } from '@/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import {
  Calendar,
  ChevronDown,
  DollarSign,
  Edit,
  Image as ImageIcon,
  Package,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Medicines() {
  const { currentUser, apiRequest, token } = useAuth();
  const insets = useSafeAreaInsets();

  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPharmacyDropdown, setShowPharmacyDropdown] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null);
  const [imageUri, setImageUri] = useState<string>('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editMedicine, setEditMedicine] = useState<any>(null);
  const [editFields, setEditFields] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    expiryDate: '',
    storageInstructions: '',
    manufacturer: '',
  });
  const [editImageUri, setEditImageUri] = useState<string>('');
  const [newMedicine, setNewMedicine] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    expiryDate: '',
    storageInstructions: '',
    manufacturer: '',
  });
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // NEW: dropdown category list + picker state
  const CATEGORIES = [
    'General',
    'OTC',
    'Antibiotic',
    'Analgesic',
    'Antihistamine',
    'Vitamins',
    'Dermatology',
    'Cardiology',
    'Diabetes',
    'Respiratory',
    'Gastro',
    'Other',
  ];
  const [showCategoryDropdownAdd, setShowCategoryDropdownAdd] = useState(false);
  const [showCategoryDropdownEdit, setShowCategoryDropdownEdit] = useState(false);
  const [showExpiryPickerAdd, setShowExpiryPickerAdd] = useState(false);
  const [showExpiryPickerEdit, setShowExpiryPickerEdit] = useState(false);

  const toYMD = (d: Date) => d.toISOString().slice(0, 10);

  useEffect(() => {
    if (currentUser?.id) {
      fetchPharmacies();
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (selectedPharmacy) {
      fetchMedicines();
    }
  }, [selectedPharmacy]);

  const fetchPharmacies = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('GET', '/pharmacies');
      const myPharmacies = data.filter(
        (p: any) => p.ownerId?._id === currentUser?.id || p.ownerId === currentUser?.id
      );
      setPharmacies(myPharmacies);
      if (myPharmacies.length > 0) {
        setSelectedPharmacy(myPharmacies[0]);
      }
    } catch (error) {
      console.error('Error fetching pharmacies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicines = async () => {
    if (!selectedPharmacy) return;
    try {
      setLoading(true);
      const pid = selectedPharmacy.id || selectedPharmacy._id;
      if (!pid) {
        console.warn('No pharmacy id on selectedPharmacy:', selectedPharmacy);
        return;
      }
      const data = await apiRequest('GET', `/medicines/pharmacy/${pid}`);
      setMedicines(data);
    } catch (error) {
      console.error('Error fetching medicines:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d?: string | Date) => {
    if (!d) return '-';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? String(d) : dt.toISOString().slice(0, 10);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickEditImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setEditImageUri(result.assets[0].uri);
    }
  };

  const handleAddMedicine = async () => {
    if (
      !newMedicine.name ||
      !newMedicine.price ||
      !newMedicine.stock ||
      !newMedicine.expiryDate ||
      !newMedicine.manufacturer
    ) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!imageUri) {
      Alert.alert('Error', 'Please select an image for the medicine');
      return;
    }

    if (!selectedPharmacy) {
      Alert.alert('Error', 'Please select a pharmacy first');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('name', newMedicine.name);
      formData.append('description', newMedicine.description);
      formData.append('price', newMedicine.price);
      formData.append('stock', newMedicine.stock);
      formData.append('category', newMedicine.category || 'General');
      formData.append('expiryDate', newMedicine.expiryDate);
      if (newMedicine.storageInstructions)
        formData.append('storageInstructions', newMedicine.storageInstructions);
      formData.append('manufacturer', newMedicine.manufacturer);

      const pid = selectedPharmacy.id || selectedPharmacy._id;
      if (!pid) {
        Alert.alert('Error', 'Unable to determine selected pharmacy id');
        setLoading(false);
        return;
      }
      formData.append('pharmacyId', String(pid));

      const filename = imageUri.split('/').pop() || 'medicine.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      if (Platform.OS === 'web') {
        const blob = await (await fetch(imageUri)).blob();
        formData.append('image', blob, filename);
      } else {
        formData.append(
          'image',
          {
            uri: imageUri,
            name: filename,
            type,
          } as any
        );
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000/api'}/medicines`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add medicine');
      }

      await fetchMedicines();
      setNewMedicine({
        name: '',
        description: '',
        price: '',
        stock: '',
        category: '',
        expiryDate: '',
        storageInstructions: '',
        manufacturer: '',
      });
      setImageUri('');
      setShowAddForm(false);
      Alert.alert('Success', 'Medicine added successfully!');
    } catch (error: any) {
      console.error('Error adding medicine:', error);
      Alert.alert('Error', error.message || 'Failed to add medicine');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMedicine = (id: string) => {
    setDeleteTargetId(id);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setDeleting(true);
      await apiRequest('DELETE', `/medicines/${deleteTargetId}`);
      setDeleteModalVisible(false);
      setDeleteTargetId(null);
      await fetchMedicines();
    } catch (error: any) {
      console.error('Delete error:', error);
      Alert.alert('Error', error?.message || 'Failed to delete medicine');
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (medicine: any) => {
    setEditMedicine(medicine);
    setEditFields({
      name: medicine?.name || '',
      description: medicine?.description || '',
      price:
        medicine?.price !== undefined && medicine?.price !== null
          ? String(medicine.price)
          : '',
      stock:
        medicine?.stock !== undefined && medicine?.stock !== null
          ? String(medicine.stock)
          : '',
      category: medicine?.category || '',
      expiryDate: medicine?.expiryDate ? String(medicine.expiryDate).slice(0, 10) : '',
      storageInstructions: medicine?.storageInstructions || '',
      manufacturer: medicine?.manufacturer || '',
    });
    setEditImageUri('');
    setEditModalVisible(true);
  };

  const handleUpdateMedicine = async () => {
    if (!editMedicine) return;
    if (
      !editFields.name ||
      !editFields.price ||
      !editFields.stock ||
      !editFields.expiryDate ||
      !editFields.manufacturer
    ) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('name', editFields.name);
      formData.append('description', editFields.description);
      formData.append('price', editFields.price);
      formData.append('stock', editFields.stock);
      formData.append('category', editFields.category || 'General');
      formData.append('expiryDate', editFields.expiryDate);
      if (editFields.storageInstructions)
        formData.append('storageInstructions', editFields.storageInstructions);
      formData.append('manufacturer', editFields.manufacturer);

      if (editImageUri) {
        const filename = editImageUri.split('/').pop() || 'medicine.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        if (Platform.OS === 'web') {
          const blob = await (await fetch(editImageUri)).blob();
          formData.append('image', blob, filename);
        } else {
          formData.append(
            'image',
            {
              uri: editImageUri,
              name: filename,
              type,
            } as any
          );
        }
      }

      const id = editMedicine._id || editMedicine.id;
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000/api'}/medicines/${id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update medicine');
      }

      setEditModalVisible(false);
      setEditMedicine(null);
      setEditImageUri('');
      await fetchMedicines();
      Alert.alert('Success', 'Medicine updated successfully!');
    } catch (error: any) {
      console.error('Error updating medicine:', error);
      Alert.alert('Error', error.message || 'Failed to update medicine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Medicines</Text>
        {pharmacies.length > 0 && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddForm(!showAddForm)}>
            <Plus size={20} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>

      {/* Pharmacy Selector */}
      {pharmacies.length > 0 && (
        <TouchableOpacity style={styles.pharmacySelector} onPress={() => setShowPharmacyDropdown(true)}>
          <Text style={styles.pharmacySelectorLabel}>Selected Pharmacy:</Text>
          <View style={styles.pharmacySelectorValue}>
            <Text style={styles.pharmacySelectorText}>
              {selectedPharmacy?.name || 'Select Pharmacy'}
            </Text>
            <ChevronDown size={20} color={colors.text} />
          </View>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {showAddForm && (
          <View style={styles.addForm}>
            <Text style={styles.formTitle}>Add New Medicine</Text>

            {/* Pharmacy in Add Form */}
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowPharmacyDropdown(true)}>
              <Text style={styles.dropdownButtonText}>
                {selectedPharmacy ? selectedPharmacy.name : 'Select Pharmacy *'}
              </Text>
              <ChevronDown size={20} color={colors.text} />
            </TouchableOpacity>

            {/* Image Picker */}
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <ImageIcon size={40} color={colors.textSecondary} />
                  <Text style={styles.imagePickerText}>Tap to select image *</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Medicine Name *"
              value={newMedicine.name}
              onChangeText={(text) => setNewMedicine({ ...newMedicine, name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={newMedicine.description}
              onChangeText={(text) => setNewMedicine({ ...newMedicine, description: text })}
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Price *"
              value={newMedicine.price}
              onChangeText={(text) => setNewMedicine({ ...newMedicine, price: text })}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Stock *"
              value={newMedicine.stock}
              onChangeText={(text) => setNewMedicine({ ...newMedicine, stock: text })}
              keyboardType="number-pad"
            />

            {/* Category (Dropdown) */}
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowCategoryDropdownAdd(true)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: newMedicine.category ? colors.text : colors.textSecondary }}>
                  {newMedicine.category || 'Category (select)'}
                </Text>
                <ChevronDown size={18} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Manufacturer *"
              value={newMedicine.manufacturer}
              onChangeText={(text) => setNewMedicine({ ...newMedicine, manufacturer: text })}
            />

            {/* Expiry Date (Calendar) */}
            <TouchableOpacity
              style={[styles.input, !newMedicine.expiryDate && { borderColor: '#fca5a5' }]}
              onPress={() => setShowExpiryPickerAdd(true)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: newMedicine.expiryDate ? colors.text : colors.textSecondary }}>
                  {newMedicine.expiryDate ? newMedicine.expiryDate : 'Expiry Date *'}
                </Text>
                <Calendar size={18} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            {showExpiryPickerAdd && (
              <DateTimePicker
                value={newMedicine.expiryDate ? new Date(newMedicine.expiryDate) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(event, selectedDate) => {
                  if (Platform.OS === 'android') setShowExpiryPickerAdd(false);
                  if (selectedDate) {
                    setNewMedicine({ ...newMedicine, expiryDate: toYMD(selectedDate) });
                  }
                }}
              />
            )}

            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              placeholder="Storage Instructions"
              value={newMedicine.storageInstructions}
              onChangeText={(text) => setNewMedicine({ ...newMedicine, storageInstructions: text })}
              multiline
            />
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddForm(false);
                  setImageUri('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAddMedicine} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Add Medicine</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading && medicines.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : pharmacies.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Pharmacy Found</Text>
            <Text style={styles.emptySubtitle}>Please create a pharmacy first in the Dashboard</Text>
          </View>
        ) : medicines.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Medicines Yet</Text>
            <Text style={styles.emptySubtitle}>Add your first medicine to get started</Text>
          </View>
        ) : (
          medicines.map((medicine: any) => (
            <View key={medicine._id || medicine.id} style={styles.medicineCard}>
              <Image source={{ uri: medicine.image }} style={styles.medicineImage} />
              <View style={styles.medicineInfo}>
                <Text style={styles.medicineName}>{medicine.name}</Text>
                <Text style={styles.medicineDescription} numberOfLines={2}>
                  {medicine.description}
                </Text>
                <View style={styles.medicineDetails}>
                  <View style={styles.detailItem}>
                    <DollarSign size={16} color={colors.primary} />
                    <Text style={styles.detailText}>${Number(medicine.price).toFixed(2)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Package size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>Stock: {medicine.stock}</Text>
                  </View>
                </View>
                <View style={styles.medicineDetails}>
                  <View style={styles.detailItem}>
                    <Calendar size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>Expires: {formatDate(medicine.expiryDate)}</Text>
                  </View>
                  <View
                    style={[
                      styles.categoryBadge,
                      medicine.isExpired
                        ? styles.expiredBadge
                        : medicine.isNearExpiry
                        ? styles.nearExpiryBadge
                        : null,
                    ]}
                  >
                    <Text style={styles.categoryText}>
                      {medicine.isExpired
                        ? 'Expired'
                        : medicine.isNearExpiry
                        ? 'Near Expiry'
                        : medicine.category}
                    </Text>
                  </View>
                </View>
                {medicine.manufacturer ? (
                  <Text style={[styles.medicineDescription, { marginTop: -4 }]}>
                    By {medicine.manufacturer}
                  </Text>
                ) : null}
                {medicine.storageInstructions ? (
                  <Text style={[styles.medicineDescription]} numberOfLines={2}>
                    Storage: {medicine.storageInstructions}
                  </Text>
                ) : null}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(medicine)}>
                  <Edit size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteMedicine(medicine._id || medicine.id)}
                >
                  <Trash2 size={18} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Pharmacy Dropdown Modal */}
      <Modal
        visible={showPharmacyDropdown}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPharmacyDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowPharmacyDropdown(false)} />
          <View style={styles.dropdownModal}>
            <Text style={styles.dropdownTitle}>Select Pharmacy</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {pharmacies.map((pharmacy: any) => (
                <TouchableOpacity
                  key={pharmacy._id || pharmacy.id}
                  style={[
                    styles.dropdownItem,
                    selectedPharmacy?._id === pharmacy._id && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedPharmacy(pharmacy);
                    setShowPharmacyDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedPharmacy?._id === pharmacy._id && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {pharmacy.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Medicine Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditModalVisible(false)} />
          <View style={styles.dropdownModal}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.formTitle}>Edit Medicine</Text>

              {/* Image Picker */}
              <TouchableOpacity style={styles.imagePicker} onPress={pickEditImage}>
                {editImageUri || editMedicine?.image ? (
                  <Image source={{ uri: editImageUri || editMedicine?.image }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <ImageIcon size={40} color={colors.textSecondary} />
                    <Text style={styles.imagePickerText}>Tap to select image</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Medicine Name *"
                value={editFields.name}
                onChangeText={(text) => setEditFields({ ...editFields, name: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Description"
                value={editFields.description}
                onChangeText={(text) => setEditFields({ ...editFields, description: text })}
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="Price *"
                value={editFields.price}
                onChangeText={(text) => setEditFields({ ...editFields, price: text })}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Stock *"
                value={editFields.stock}
                onChangeText={(text) => setEditFields({ ...editFields, stock: text })}
                keyboardType="number-pad"
              />

              {/* Category (Dropdown) */}
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowCategoryDropdownEdit(true)}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: editFields.category ? colors.text : colors.textSecondary }}>
                    {editFields.category || 'Category (select)'}
                  </Text>
                  <ChevronDown size={18} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Manufacturer *"
                value={editFields.manufacturer}
                onChangeText={(text) => setEditFields({ ...editFields, manufacturer: text })}
              />

              {/* Expiry Date (Calendar) */}
              <TouchableOpacity
                style={[styles.input, !editFields.expiryDate && { borderColor: '#fca5a5' }]}
                onPress={() => setShowExpiryPickerEdit(true)}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: editFields.expiryDate ? colors.text : colors.textSecondary }}>
                    {editFields.expiryDate ? editFields.expiryDate : 'Expiry Date *'}
                  </Text>
                  <Calendar size={18} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>

              {showExpiryPickerEdit && (
                <DateTimePicker
                  value={editFields.expiryDate ? new Date(editFields.expiryDate) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === 'android') setShowExpiryPickerEdit(false);
                    if (selectedDate) {
                      setEditFields({ ...editFields, expiryDate: toYMD(selectedDate) });
                    }
                  }}
                />
              )}

              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                placeholder="Storage Instructions"
                value={editFields.storageInstructions}
                onChangeText={(text) =>
                  setEditFields({ ...editFields, storageInstructions: text })
                }
                multiline
              />
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setEditModalVisible(false);
                    setEditMedicine(null);
                    setEditImageUri('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleUpdateMedicine}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          if (!deleting) setDeleteModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !deleting && setDeleteModalVisible(false)} />
        </View>
        <View style={styles.dropdownModal}>
          <Text style={styles.formTitle}>Delete Medicine</Text>
          <Text style={{ color: colors.text, marginBottom: 16 }}>
            Are you sure you want to delete this medicine?
          </Text>
          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => !deleting && setDeleteModalVisible(false)}
              disabled={deleting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: '#FF6B6B' }]}
              onPress={confirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Category Dropdown - Add */}
      <Modal
        visible={showCategoryDropdownAdd}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategoryDropdownAdd(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCategoryDropdownAdd(false)} />
          <View style={styles.dropdownModal}>
            <Text style={styles.dropdownTitle}>Select Category</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.dropdownItem,
                    newMedicine.category === cat && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setNewMedicine({ ...newMedicine, category: cat });
                    setShowCategoryDropdownAdd(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      newMedicine.category === cat && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Category Dropdown - Edit */}
      <Modal
        visible={showCategoryDropdownEdit}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategoryDropdownEdit(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCategoryDropdownEdit(false)} />
          <View style={styles.dropdownModal}>
            <Text style={styles.dropdownTitle}>Select Category</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.dropdownItem,
                    editFields.category === cat && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setEditFields({ ...editFields, category: cat });
                    setShowCategoryDropdownEdit(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      editFields.category === cat && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  addForm: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  medicineCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  medicineImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  medicineInfo: {
    flex: 1,
    marginLeft: 12,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  medicineDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  medicineDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600' as const,
  },
  categoryBadge: {
    backgroundColor: '#E6F7F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  nearExpiryBadge: {
    backgroundColor: '#FFF4E5',
  },
  expiredBadge: {
    backgroundColor: '#FFE5E5',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  actions: {
    justifyContent: 'center',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pharmacySelector: {
    backgroundColor: colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pharmacySelectorLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  pharmacySelectorValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pharmacySelectorText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownButtonText: {
    fontSize: 15,
    color: colors.text,
  },
  imagePicker: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  imagePickerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  imagePickerText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dropdownModal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 16,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  dropdownItemSelected: {
    backgroundColor: '#E6F7F1',
  },
  dropdownItemText: {
    fontSize: 16,
    color: colors.text,
  },
  dropdownItemTextSelected: {
    fontWeight: '600' as const,
    color: colors.primary,
  },
});
