import { delay } from './mock/delay';
import { storage } from '../utils/storage';
import { generateOrderId, generateTransactionId } from '../utils/format';
import { getRandomDriver, generateMockRoute } from './mock/data';
import type { Order, Address, VehicleType, OrderRating, TripPoint } from '../types';
import { getCurrentUser } from './auth';

function getOrders(): Order[] {
  const user = getCurrentUser();
  if (!user) return [];
  return storage.get<Order[]>('orders_' + user.id, []);
}

function saveOrders(orders: Order[]): void {
  const user = getCurrentUser();
  if (!user) return;
  storage.set('orders_' + user.id, orders);
}

export function calculatePrice(vehicleType: VehicleType, distance: number, duration: number): number {
  const kmPrice = (distance / 1000) * vehicleType.pricePerKm;
  const minPrice = (duration / 60) * vehicleType.pricePerMin;
  const total = vehicleType.basePrice + kmPrice + minPrice;

  const hour = new Date().getHours();
  let multiplier = 1;
  if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)) multiplier = 1.2;
  if (hour >= 23 || hour < 6) multiplier = vehicleType.id === 'carpool' ? 1.2 : 1.5;

  return parseFloat((total * multiplier).toFixed(2));
}

export async function createOrder(
  origin: Address,
  destination: Address,
  vehicleType: VehicleType,
  couponId?: string
): Promise<Order> {
  await delay(800);
  const user = getCurrentUser();
  if (!user) throw new Error('未登录');

  const distance = 3000 + Math.random() * 15000;
  const duration = (distance / 500) * 60;
  const estimatedPrice = calculatePrice(vehicleType, distance, duration);

  let couponDiscount = 0;
  if (couponId) {
    const coupons = storage.get('coupons_' + user.id, []) as Array<{ id: string; amount: number; minSpend: number; used: boolean }>;
    const coupon = coupons.find((c) => c.id === couponId && !c.used);
    if (coupon && estimatedPrice >= coupon.minSpend) {
      couponDiscount = coupon.amount;
    }
  }

  const route = generateMockRoute();
  const order: Order = {
    id: generateOrderId(),
    userId: user.id,
    status: 'waiting',
    origin,
    destination,
    vehicleType,
    estimatedPrice,
    couponDiscount,
    couponId,
    nearbyDrivers: Math.floor(3 + Math.random() * 10),
    estimatedWait: Math.floor(3 + Math.random() * 8),
    route: { distance, duration, polyline: route },
    createdAt: Date.now(),
  };

  const orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);

  addToHistory(destination);

  return order;
}

function addToHistory(address: Address): void {
  const user = getCurrentUser();
  if (!user) return;
  const key = 'history_addresses_' + user.id;
  const list = storage.get<Address[]>(key, []);
  const filtered = list.filter((a) => a.address !== address.address);
  filtered.unshift(address);
  storage.set(key, filtered.slice(0, 20));
}

export async function simulateDriverAccept(orderId: string): Promise<Order | null> {
  await delay(2000 + Math.random() * 3000);
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order || order.status !== 'waiting') return null;

  order.status = 'accepted';
  order.driver = getRandomDriver();
  order.acceptedAt = Date.now();
  order.currentDriverLocation = {
    lat: order.origin.lat + (Math.random() - 0.5) * 0.01,
    lng: order.origin.lng + (Math.random() - 0.5) * 0.01,
  };
  saveOrders(orders);
  return order;
}

export async function startTrip(orderId: string): Promise<Order | null> {
  await delay(500);
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order || order.status !== 'accepted') return null;

  order.status = 'in_progress';
  order.startedAt = Date.now();
  saveOrders(orders);
  return order;
}

export async function completeTrip(orderId: string): Promise<Order | null> {
  await delay(500);
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order || order.status !== 'in_progress') return null;

  const surcharge = Math.random() > 0.7 ? parseFloat((Math.random() * 5).toFixed(2)) : 0;
  const actualPrice = parseFloat((order.estimatedPrice + surcharge * 0.1).toFixed(2));
  const couponDiscount = order.couponDiscount || 0;
  const finalPrice = parseFloat(Math.max(0, actualPrice + surcharge - couponDiscount).toFixed(2));

  order.status = 'pending_payment';
  order.completedAt = Date.now();
  order.actualPrice = actualPrice;
  order.surcharge = surcharge;
  order.finalPrice = finalPrice;
  saveOrders(orders);
  return order;
}

export async function cancelOrder(orderId: string, reason: string): Promise<Order | null> {
  await delay(500);
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order || (order.status !== 'waiting' && order.status !== 'accepted')) return null;

  let cancelFee = 0;
  if (order.status === 'accepted' && order.acceptedAt) {
    const waitMinutes = (Date.now() - order.acceptedAt) / 60000;
    if (waitMinutes > 3) {
      cancelFee = parseFloat(Math.min(waitMinutes - 3, 30).toFixed(2));
    }
  }

  order.status = 'cancelled';
  order.cancelledAt = Date.now();
  order.cancelFee = cancelFee;
  order.cancelReason = reason;
  saveOrders(orders);
  return order;
}

export async function modifyDestination(orderId: string, newDest: Address): Promise<Order | null> {
  await delay(800);
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order || order.status !== 'in_progress') return null;

  const startedAt = order.startedAt || Date.now();
  const elapsedSeconds = (Date.now() - startedAt) / 1000;
  const elapsedDistance = elapsedSeconds * 8;

  const pastPrice = calculatePrice(order.vehicleType, elapsedDistance, elapsedSeconds);
  const newDistance = 2000 + Math.random() * 10000;
  const newDuration = (newDistance / 500) * 60;
  const futurePrice = calculatePrice(order.vehicleType, newDistance, newDuration);

  order.modifiedDestination = newDest;
  order.destination = newDest;
  order.estimatedPrice = parseFloat((pastPrice + futurePrice).toFixed(2));
  order.route = {
    distance: elapsedDistance + newDistance,
    duration: elapsedSeconds + newDuration,
    polyline: generateMockRoute(),
  };

  saveOrders(orders);
  return order;
}

export async function payOrder(orderId: string, method: string): Promise<Order | null> {
  await delay(1000);
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order || order.status !== 'pending_payment') return null;

  if (order.couponId) {
    const user = getCurrentUser();
    if (user) {
      const coupons = storage.get('coupons_' + user.id, []) as Array<{ id: string; used: boolean; usedAt?: number; orderId?: string }>;
      const coupon = coupons.find((c) => c.id === order.couponId);
      if (coupon) {
        coupon.used = true;
        coupon.usedAt = Date.now();
        coupon.orderId = orderId;
        storage.set('coupons_' + user.id, coupons);
      }
    }
  }

  const user = getCurrentUser();
  if (user) {
    const prepaidKey = 'prepaid_balance_' + user.id;
    const prepaidBalance = storage.get<number>(prepaidKey, 0);
    const payableBeforeChannel = Math.max(0, (order.finalPrice || 0));
    const prepaidDeduction = Math.min(prepaidBalance, payableBeforeChannel);
    order.prepaidDeduction = parseFloat(prepaidDeduction.toFixed(2));
    order.finalPrice = parseFloat((payableBeforeChannel - prepaidDeduction).toFixed(2));
    storage.set(prepaidKey, parseFloat((prepaidBalance - prepaidDeduction).toFixed(2)));
  }

  order.status = 'completed';
  order.paidAt = Date.now();
  order.paymentMethod = method;
  order.transactionId = generateTransactionId();
  saveOrders(orders);

  if (user) {
    const payments = storage.get('payments_' + user.id, []) as Array<unknown>;
    payments.unshift({
      id: order.transactionId,
      orderId: order.id,
      amount: order.finalPrice,
      method: order.paymentMethod,
      transactionId: order.transactionId,
      paidAt: order.paidAt,
      couponDiscount: order.couponDiscount,
      prepaidDeduction: order.prepaidDeduction,
    });
    storage.set('payments_' + user.id, payments);
  }

  return order;
}

export async function rateOrder(orderId: string, rating: OrderRating): Promise<Order | null> {
  await delay(500);
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order || order.status !== 'completed') return null;

  order.rating = { ...rating, createdAt: Date.now() };
  saveOrders(orders);
  return order;
}

export function getOrderById(orderId: string): Order | null {
  const orders = getOrders();
  return orders.find((o) => o.id === orderId) || null;
}

export function getOrderList(filter?: { status?: string; startDate?: number; endDate?: number }): Order[] {
  let orders = getOrders();
  if (filter?.status && filter.status !== 'all') {
    if (filter.status === 'completed') {
      orders = orders.filter((o) => o.status === 'completed');
    } else if (filter.status === 'cancelled') {
      orders = orders.filter((o) => o.status === 'cancelled');
    } else if (filter.status === 'pending_payment') {
      orders = orders.filter((o) => o.status === 'pending_payment');
    }
  }
  if (filter?.startDate) orders = orders.filter((o) => o.createdAt >= filter.startDate!);
  if (filter?.endDate) orders = orders.filter((o) => o.createdAt <= filter.endDate!);
  return orders.sort((a, b) => b.createdAt - a.createdAt);
}

export function getHistoryAddresses(): Address[] {
  const user = getCurrentUser();
  if (!user) return [];
  return storage.get<Address[]>('history_addresses_' + user.id, []);
}

export function getFrequentAddresses(): Address[] {
  const user = getCurrentUser();
  if (!user) return [];
  return storage.get<Address[]>('frequent_addresses_' + user.id, []);
}

export function addFrequentAddress(addr: Address): void {
  const user = getCurrentUser();
  if (!user) return;
  const key = 'frequent_addresses_' + user.id;
  const list = storage.get<Address[]>(key, []);
  if (!list.find((a) => a.address === addr.address)) {
    list.push({ ...addr, isFrequent: true });
    storage.set(key, list);
  }
}

export function saveTripTrajectory(orderId: string, trajectory: TripPoint[]): void {
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (order) {
    order.tripTrajectory = trajectory;
    if (trajectory.length > 0) {
      order.currentDriverLocation = trajectory[trajectory.length - 1];
    }
    saveOrders(orders);
  }
}
