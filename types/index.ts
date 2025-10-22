export type UserRole = 'customer' | 'pharmacy_owner' | 'delivery_person' | 'admin';

export type RoleRequest = {
  id: string;
  userId: string;
  requestedRole: 'pharmacy_owner' | 'delivery_person';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  password?: string; // optional on client side (never returned from backend)
  phone: string;
  role: UserRole;
  address?: string;
};

export type Pharmacy = {
  id: string;
  name: string;
  ownerId: string;
  address: string;
  phone: string;
  image: string;
  rating: number;
};

export type Medicine = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  pharmacyId: string;
  category: string;
  manufacturer?: string;
  expiryDate?: string;
  isNearExpiry?: boolean;
  isExpired?: boolean;
  _id?: string;
};

export type CartItem = {
  medicine: Medicine;
  quantity: number;
};

export type OrderStatus = 'packing' | 'on_the_way' | 'delivered';

export type Order = {
  id: string;
  customerId: string;
  pharmacyId: string;
  items: { medicineId: string; quantity: number; price: number; name: string,manufacturer?: string;expiryDate?: string; }[];
  totalAmount: number;
  status: OrderStatus;
  deliveryAddress: string;
  deliveryPersonId?: string;
  couponCode?: string;
  discount?: number;
  createdAt: string;
};

export type Coupon = {
  code: string;
  discount: number;
  minAmount: number;
};
