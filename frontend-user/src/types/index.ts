export interface User {
  id: string;
  phone: string;
  nickname: string;
  avatar: string;
  gender: 'male' | 'female' | '' | '男' | '女';
  birthday: string;
  homeAddress: string;
  companyAddress: string;
  emergencyContact: string;
  emergencyPhone: string;
  lastNicknameChange: string;
  loginProtection?: boolean;
  createdAt: string;
  wechatOpenId?: string;
}

export interface VerifyCode {
  phone: string;
  code: string;
  expireAt: number;
}

export interface Agreement {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  isFrequent?: boolean;
}

export interface VehicleType {
  id: string;
  name: string;
  icon: string;
  description: string;
  basePrice: number;
  pricePerKm: number;
  pricePerMin: number;
  estimatedArrival: number;
  features: string[];
  billingRules: string;
  surchargeRules: string;
  serviceStandard: string;
}

export interface RouteInfo {
  distance: number;
  duration: number;
  polyline: Array<{ lat: number; lng: number }>;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  plateNumber: string;
  vehicleModel: string;
  vehicleColor: string;
  vehiclePhoto: string;
  rating: number;
  totalTrips: number;
}

export type OrderStatus =
  | 'waiting'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'pending_payment';

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  origin: Address;
  destination: Address;
  vehicleType: VehicleType;
  driver?: Driver;
  route?: RouteInfo;
  estimatedPrice: number;
  actualPrice?: number;
  surcharge?: number;
  couponDiscount?: number;
  prepaidDeduction?: number;
  couponId?: string;
  finalPrice?: number;
  cancelFee?: number;
  cancelReason?: string;
  nearbyDrivers: number;
  estimatedWait: number;
  acceptedAt?: number;
  startedAt?: number;
  completedAt?: number;
  cancelledAt?: number;
  paidAt?: number;
  paymentMethod?: string;
  transactionId?: string;
  rating?: OrderRating;
  createdAt: number;
  currentDriverLocation?: { lat: number; lng: number };
  modifiedDestination?: Address;
  tripPath?: Array<{ lat: number; lng: number }>;
}

export interface OrderRating {
  attitude: number;
  driving: number;
  cleanliness: number;
  comment: string;
  createdAt: number;
}

export interface Coupon {
  id: string;
  type: 'newUser' | 'daily' | 'invite';
  typeName: string;
  amount: number;
  minSpend: number;
  expireAt: number;
  used: boolean;
  usedAt?: number;
  orderId?: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  transactionId: string;
  paidAt: number;
  couponDiscount?: number;
  prepaidDeduction?: number;
}

export interface FeedbackItem {
  id: string;
  type: 'suggestion' | 'bug';
  content: string;
  images: string[];
  status: 'pending' | 'processing' | 'resolved';
  reply?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'driver' | 'system' | 'bot' | 'agent';
  content: string;
  type: 'text' | 'image';
  timestamp: number;
}

export interface FAQ {
  id: string;
  category: 'order' | 'payment' | 'coupon' | 'safety';
  categoryName: string;
  question: string;
  answer: string;
}
