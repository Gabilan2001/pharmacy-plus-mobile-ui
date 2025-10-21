import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useRouter } from 'expo-router';
import { Minus, Plus, Tag, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CartScreen() {
  const { cartItems, removeFromCart, updateQuantity, getCartTotal, applyCouponAsync, removeCoupon, appliedCoupon, getDiscountAmount, getFinalTotal, placeOrder } = useCart();
  const { currentUser } = useAuth();
  const router = useRouter();
  const [couponCode, setCouponCode] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [addressInput, setAddressInput] = useState(currentUser?.address || '');
  const [submitting, setSubmitting] = useState(false);
  const [payMethod, setPayMethod] = useState<'cod' | 'card'>('cod');
  const [cardModalVisible, setCardModalVisible] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState(''); // MM/YY
  const [cardCvc, setCardCvc] = useState('');
  const [cardProcessing, setCardProcessing] = useState(false);

  const handleApplyCoupon = async () => {
    const result = await applyCouponAsync(couponCode);
    Alert.alert(result.success ? 'Success' : 'Error', result.message);
    if (result.success) setCouponCode('');
  };

  const handlePlaceOrder = () => {
    if (cartItems.length === 0) {
      Alert.alert('Error', 'Your cart is empty');
      return;
    }
    if (payMethod === 'card') {
      // open card modal first
      setCardModalVisible(true);
      return;
    }
    setAddressInput(currentUser?.address || '');
    setConfirmVisible(true);
  };

  const confirmPlaceOrder = async () => {
    if (!addressInput?.trim()) {
      Alert.alert('Address required', 'Please enter a delivery address');
      return;
    }
    await doPlaceOrderWithAddress(addressInput.trim());
  };

  const doPlaceOrderWithAddress = async (addr: string) => {
    try {
      setSubmitting(true);
      const order = await placeOrder(addr);
      if (order) {
        setConfirmVisible(false);
        setCardModalVisible(false);
        Alert.alert('Success', 'Your order has been placed successfully!');
        try { router.push('/(tabs)/orders'); } catch {}
      } else {
        Alert.alert('Unable to place order', 'Make sure all items are from the same pharmacy and you are logged in as a customer.');
      }
    } catch (e: any) {
      console.error('Order error', e);
      Alert.alert('Error', e?.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  // Basic validators for simulated card flow
  const luhnCheck = (num: string) => {
    const arr = (num + '')
      .replace(/\D/g, '')
      .split('')
      .reverse()
      .map((x) => parseInt(x, 10));
    const lastDigit = arr.splice(0, 1)[0];
    let sum = arr.reduce((acc, val, i) => {
      if (i % 2 === 0) {
        val *= 2;
        if (val > 9) val -= 9;
      }
      return acc + val;
    }, 0);
    sum += lastDigit;
    return sum % 10 === 0;
  };

  const parseExpiry = (mmYY: string): { valid: boolean; expired: boolean } => {
    const m = mmYY.match(/^(\d{2})\/(\d{2})$/);
    if (!m) return { valid: false, expired: false };
    const mm = parseInt(m[1], 10);
    const yy = parseInt(m[2], 10);
    if (mm < 1 || mm > 12) return { valid: false, expired: false };
    const now = new Date();
    const year = 2000 + yy;
    const exp = new Date(year, mm, 0); // end of month
    return { valid: true, expired: exp < new Date(now.getFullYear(), now.getMonth() + 1, 0) };
  };

  const simulateStripeCharge = async (): Promise<{ ok: boolean; message?: string }> => {
    // normalize
    const num = cardNumber.replace(/\s+/g, '');
    if (!cardName.trim()) return { ok: false, message: 'Name on card required' };
    if (num.length < 13) return { ok: false, message: 'Enter a valid card number' };
    if (!luhnCheck(num)) return { ok: false, message: 'Invalid card number' };
    const exp = parseExpiry(cardExpiry.trim());
    if (!exp.valid) return { ok: false, message: 'Use MM/YY format for expiry' };
    if (exp.expired) return { ok: false, message: 'Card is expired' };
    if (!/^\d{3,4}$/.test(cardCvc)) return { ok: false, message: 'Invalid CVC' };

    // Handle special Stripe test numbers to simulate outcomes
    const testMap: Record<string, { ok: boolean; message?: string }> = {
      '4242424242424242': { ok: true },
      '5555555555554444': { ok: true },
      '4000000000000002': { ok: false, message: 'Your card was declined.' },
      '4000000000009995': { ok: false, message: 'Insufficient funds.' },
      '4000000000000069': { ok: false, message: 'Expired card.' },
      '4000002500003155': { ok: true, message: '3D Secure challenge simulated and approved.' },
    };
    if (num in testMap) return testMap[num];
    return { ok: true };
  };

  const handleCardSubmit = async () => {
    // Per request: treat Continue as COD flow without blocking on card validation
    try {
      setCardProcessing(true);
      const saved = currentUser?.address?.trim();
      // reflect COD semantics for subsequent UI labels
      setPayMethod('cod');
      if (saved) {
        await doPlaceOrderWithAddress(saved);
      } else {
        setCardModalVisible(false);
        setAddressInput('');
        setConfirmVisible(true);
      }
    } finally {
      setCardProcessing(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <Text style={styles.emptySubtext}>Add some medicines to get started</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {cartItems.map((item) => (
          <View key={item.medicine.id} style={styles.cartItem}>
            <Image source={{ uri: item.medicine.image }} style={styles.itemImage} />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.medicine.name}</Text>
              <Text style={styles.itemPrice}>${item.medicine.price.toFixed(2)}</Text>
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateQuantity(item.medicine.id, item.quantity - 1)}
                >
                  <Minus size={16} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.quantity}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateQuantity(item.medicine.id, item.quantity + 1)}
                >
                  <Plus size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => removeFromCart(item.medicine.id)}
            >
              <Trash2 size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.couponSection}>
          <Text style={styles.sectionTitle}>Apply Coupon</Text>
          {appliedCoupon ? (
            <View style={styles.appliedCoupon}>
              <Tag size={20} color={Colors.success} />
              <Text style={styles.appliedCouponText}>{appliedCoupon.code} applied</Text>
              <TouchableOpacity onPress={removeCoupon}>
                <Text style={styles.removeCoupon}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.couponInput}>
              <TextInput
                style={styles.input}
                placeholder="Enter coupon code"
                placeholderTextColor={Colors.text.light}
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.applyButton} onPress={handleApplyCoupon}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>${getCartTotal().toFixed(2)}</Text>
          </View>
          {appliedCoupon && (
            <View style={styles.totalRow}>
              <Text style={styles.discountLabel}>Discount</Text>
              <Text style={styles.discountValue}>-${getDiscountAmount().toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.finalTotal]}>
            <Text style={styles.finalTotalLabel}>Total</Text>
            <Text style={styles.finalTotalValue}>${getFinalTotal().toFixed(2)}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.checkoutButton, payMethod === 'card' && styles.checkoutButtonOutline]}
            onPress={() => setPayMethod('card')}
          >
            <Text style={[styles.checkoutButtonText, payMethod === 'card' && styles.checkoutButtonOutlineText]}>Card Payment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.checkoutButton, payMethod === 'cod' && styles.checkoutButtonOutline]}
            onPress={() => setPayMethod('cod')}
          >
            <Text style={[styles.checkoutButtonText, payMethod === 'cod' && styles.checkoutButtonOutlineText]}>Cash on Delivery</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.checkoutButton, { marginTop: 8 }]} onPress={handlePlaceOrder}>
          <Text style={styles.checkoutButtonText}>{payMethod === 'card' ? 'Pay' : 'Place Order'}</Text>
        </TouchableOpacity>
      </View>

      {/* Confirm Order Modal */}
      <Modal
        visible={confirmVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !submitting && setConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !submitting && setConfirmVisible(false)} />
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Confirm Order</Text>
            <View style={{ marginTop: 16 }}>
              <Text style={styles.modalLabel}>Delivery Address</Text>
              <TextInput
                style={[styles.input, styles.addressInput]}
                placeholder="Enter your full delivery address including street, city, and postal code"
                placeholderTextColor={Colors.text.light}
                value={addressInput}
                onChangeText={setAddressInput}
                editable={!submitting}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.orderSummary}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Items</Text>
                <Text style={styles.totalValue}>{cartItems.length}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.finalTotalValue}>${getFinalTotal().toFixed(2)}</Text>
              </View>
            </View>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => !submitting && setConfirmVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmPlaceOrder}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.confirmButtonText}>{payMethod === 'card' ? 'Pay' : 'Confirm'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Card Details Modal (Simulated Stripe) */}
      <Modal
        visible={cardModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !cardProcessing && setCardModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !cardProcessing && setCardModalVisible(false)} />
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Card Payment</Text>
            <Text style={{ color: Colors.text.secondary, marginTop: 4, fontSize: 13 }}>
              For testing, use Stripe test cards like 4242 4242 4242 4242, any CVC, any future date.
            </Text>
            <View style={{ marginTop: 16, gap: 12 }}>
              <View>
                <Text style={styles.modalLabel}>Name on card</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor={Colors.text.light}
                  value={cardName}
                  onChangeText={setCardName}
                  editable={!cardProcessing}
                />
              </View>
              <View>
                <Text style={styles.modalLabel}>Card number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="4242 4242 4242 4242"
                  placeholderTextColor={Colors.text.light}
                  value={cardNumber}
                  onChangeText={(t) => setCardNumber(t.replace(/[^\d\s]/g, ''))}
                  keyboardType="numeric"
                  editable={!cardProcessing}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Expiry (MM/YY)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="12/29"
                    placeholderTextColor={Colors.text.light}
                    value={cardExpiry}
                    onChangeText={setCardExpiry}
                    keyboardType="numeric"
                    editable={!cardProcessing}
                  />
                </View>
                <View style={{ width: 120 }}>
                  <Text style={styles.modalLabel}>CVC</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123"
                    placeholderTextColor={Colors.text.light}
                    value={cardCvc}
                    onChangeText={(t) => setCardCvc(t.replace(/[^\d]/g, ''))}
                    keyboardType="numeric"
                    secureTextEntry
                    editable={!cardProcessing}
                  />
                </View>
              </View>
            </View>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => !cardProcessing && setCardModalVisible(false)}
                disabled={cardProcessing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleCardSubmit}
                disabled={cardProcessing}
              >
                {cardProcessing ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.confirmButtonText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  scrollView: {
    flex: 1,
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.lightGray,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginHorizontal: 16,
  },
  deleteButton: {
    padding: 8,
  },
  couponSection: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  couponInput: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  applyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  applyButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  appliedCoupon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  appliedCouponText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.success,
    marginLeft: 8,
  },
  removeCoupon: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '600' as const,
  },
  footer: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 16,
  },
  totalSection: {
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  discountLabel: {
    fontSize: 14,
    color: Colors.success,
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  finalTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  finalTotalLabel: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  finalTotalValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  checkoutButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  checkoutButtonOutline: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkoutButtonOutlineText: {
    color: Colors.text.primary,
  },
  checkoutButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  addressInput: {
    minHeight: 120,
    maxHeight: 150,
    paddingTop: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  orderSummary: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 8,
    paddingBottom: 8,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  confirmButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
