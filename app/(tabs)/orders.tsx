import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Order } from '@/types';
import { useFocusEffect } from '@react-navigation/native';
import { CheckCircle, Clock, Package, Truck } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function OrdersScreen() {
  const { updateOrderStatus } = useCart();
  const { currentUser, apiRequest } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchOrders = useCallback(async () => {
    if (!currentUser) return;
    try {
      if (currentUser.role === 'customer') {
        const data = await apiRequest('GET', '/orders/myorders');
        setOrders(data);
      } else if (currentUser.role === 'pharmacy_owner') {
        // Fetch pharmacies then orders for each
        const pharmacies = await apiRequest('GET', `/pharmacies?ownerId=${currentUser.id}`);
        const ids = (pharmacies as any[]).map((p: any) => p.id as string);
        const lists = await Promise.all(ids.map((id: string) => apiRequest('GET', `/orders/pharmacy/${id}`)));
        setOrders(lists.flat());
      } else if (currentUser.role === 'delivery_person') {
        const data = await apiRequest('GET', '/orders/mydeliveries');
        setOrders(data);
      } else if (currentUser.role === 'admin') {
        const data = await apiRequest('GET', '/orders');
        setOrders(data);
      }
    } catch (e) {
      console.error('Failed to load orders', e);
      setOrders([]);
    }
  }, [currentUser, apiRequest]);

  // Refresh orders when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  if (!currentUser) return null;

  const myOrders = orders;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'packing':
        return <Package size={20} color={Colors.status.packing} />;
      case 'on_the_way':
        return <Truck size={20} color={Colors.status.onTheWay} />;
      case 'delivered':
        return <CheckCircle size={20} color={Colors.status.delivered} />;
      default:
        return <Clock size={20} color={Colors.gray} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'packing':
        return Colors.status.packing;
      case 'on_the_way':
        return Colors.status.onTheWay;
      case 'delivered':
        return Colors.status.delivered;
      default:
        return Colors.gray;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'packing':
        return 'Packing';
      case 'on_the_way':
        return 'On the Way';
      case 'delivered':
        return 'Delivered';
      default:
        return status;
    }
  };

  const handleUpdateStatus = (orderId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'packing' ? 'on_the_way' : 'delivered';
    updateOrderStatus(orderId, nextStatus);
  };

  if (myOrders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Package size={64} color={Colors.gray} />
        <Text style={styles.emptyText}>No orders yet</Text>
        <Text style={styles.emptySubtext}>Your orders will appear here</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {myOrders.map((order) => (
        <View key={order.id} style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderId}>Order #{order.id}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              {getStatusIcon(order.status)}
              <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
            </View>
          </View>

          {/* Pharmacy header */}
          {'pharmacyId' in order && (order as any).pharmacyId?.image && (
            <View style={styles.pharmacyHeader}>
              <Image source={{ uri: (order as any).pharmacyId.image }} style={styles.pharmacyImage} />
              <Text style={styles.pharmacyName}>{(order as any).pharmacyId.name}</Text>
            </View>
          )}

          <View style={styles.orderItems}>
            {order.items.map((item, index) => {
              const med: any = (item as any).medicineId;
              const img = med?.image;
              return (
                <View key={index} style={styles.orderItem}>
                  <Image source={{ uri: img }} style={styles.itemImage} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>x{item.quantity}</Text>
                  </View>
                  <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.orderFooter}>
            <View>
              <Text style={styles.addressLabel}>Delivery Address</Text>
              <Text style={styles.addressText}>{order.deliveryAddress}</Text>
              {order.couponCode && (
                <Text style={styles.couponText}>Coupon: {order.couponCode}</Text>
              )}
            </View>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${order.totalAmount.toFixed(2)}</Text>
            </View>
          </View>

          {currentUser.role === 'pharmacy_owner' && order.status !== 'delivered' && (
            <TouchableOpacity
              style={styles.updateButton}
              onPress={() => handleUpdateStatus(order.id, order.status)}
            >
              <Text style={styles.updateButtonText}>
                {order.status === 'packing' ? 'Mark as On the Way' : 'Mark as Delivered'}
              </Text>
            </TouchableOpacity>
          )}

          {currentUser.role === 'admin' && (
            <View style={styles.adminActions}>
              <Text style={styles.adminLabel}>Order Date: {new Date(order.createdAt).toLocaleDateString()}</Text>
            </View>
          )}
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
  orderCard: {
    backgroundColor: Colors.white,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  orderItems: {
    marginBottom: 16,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.lightGray,
  },
  itemName: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  itemMeta: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  itemQuantity: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginHorizontal: 12,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addressLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 12,
    color: Colors.text.primary,
    maxWidth: 200,
  },
  couponText: {
    fontSize: 12,
    color: Colors.success,
    marginTop: 4,
  },
  totalContainer: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  pharmacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  pharmacyImage: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: Colors.lightGray,
  },
  pharmacyName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  updateButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  updateButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  adminActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  adminLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
});
