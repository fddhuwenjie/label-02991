import { create } from 'zustand';
import type { Order, Address, VehicleType, OrderRating } from '../types';
import * as orderApi from '../api/order';
import { MOCK_VEHICLE_TYPES } from '../api/mock/data';
import { haversineDistance, interpolatePath, calculateETA, type LatLng } from '../utils/geo';

interface TripSimulationState {
  isRunning: boolean;
  fullPath: LatLng[];
  traveledPath: LatLng[];
  remainingPath: LatLng[];
  currentPosition: LatLng | null;
  currentIndex: number;
  remainingDistance: number;
  totalDistance: number;
  estimatedArrival: number;
  intervalId: ReturnType<typeof setInterval> | null;
}

interface OrderState {
  currentOrder: Order | null;
  orders: Order[];
  origin: Address | null;
  destination: Address | null;
  selectedVehicle: VehicleType | null;
  vehicleTypes: VehicleType[];
  historyAddresses: Address[];
  frequentAddresses: Address[];
  loading: boolean;
  tripSimulation: TripSimulationState;

  setOrigin: (addr: Address | null) => void;
  setDestination: (addr: Address | null) => void;
  setSelectedVehicle: (v: VehicleType) => void;
  loadHistoryAddresses: () => void;
  loadFrequentAddresses: () => void;
  addFrequentAddress: (addr: Address) => void;

  createOrder: (couponId?: string) => Promise<Order>;
  cancelOrder: (orderId: string, reason: string) => Promise<Order | null>;
  modifyDestination: (orderId: string, newDest: Address) => Promise<Order | null>;
  payOrder: (orderId: string, method: string) => Promise<Order | null>;
  rateOrder: (orderId: string, rating: OrderRating) => Promise<Order | null>;
  simulateDriverAccept: (orderId: string) => Promise<Order | null>;
  startTrip: (orderId: string) => Promise<Order | null>;
  completeTrip: (orderId: string) => Promise<Order | null>;

  startTripSimulation: (origin: Address, destination: Address) => void;
  stopTripSimulation: () => void;
  resetTripSimulation: () => void;

  loadOrders: (filter?: { status?: string; startDate?: number; endDate?: number }) => void;
  getOrderById: (id: string) => Order | null;
  setCurrentOrder: (order: Order | null) => void;
  refreshCurrentOrder: (orderId: string) => void;
}

const initialTripSimulation: TripSimulationState = {
  isRunning: false,
  fullPath: [],
  traveledPath: [],
  remainingPath: [],
  currentPosition: null,
  currentIndex: 0,
  remainingDistance: 0,
  totalDistance: 0,
  estimatedArrival: 0,
  intervalId: null,
};

export const useOrderStore = create<OrderState>((set, get) => ({
  currentOrder: null,
  orders: [],
  origin: null,
  destination: null,
  selectedVehicle: MOCK_VEHICLE_TYPES[0],
  vehicleTypes: MOCK_VEHICLE_TYPES,
  historyAddresses: [],
  frequentAddresses: [],
  loading: false,
  tripSimulation: initialTripSimulation,

  setOrigin(addr) { set({ origin: addr }); },
  setDestination(addr) { set({ destination: addr }); },
  setSelectedVehicle(v) { set({ selectedVehicle: v }); },

  loadHistoryAddresses() {
    set({ historyAddresses: orderApi.getHistoryAddresses() });
  },

  loadFrequentAddresses() {
    set({ frequentAddresses: orderApi.getFrequentAddresses() });
  },

  addFrequentAddress(addr) {
    orderApi.addFrequentAddress(addr);
    get().loadFrequentAddresses();
  },

  async createOrder(couponId) {
    const { origin, destination, selectedVehicle } = get();
    if (!origin || !destination || !selectedVehicle) throw new Error('请选择出发地和目的地');
    set({ loading: true });
    try {
      const order = await orderApi.createOrder(origin, destination, selectedVehicle, couponId);
      set({ currentOrder: order });
      return order;
    } finally {
      set({ loading: false });
    }
  },

  async cancelOrder(orderId, reason) {
    set({ loading: true });
    try {
      const order = await orderApi.cancelOrder(orderId, reason);
      if (order) set({ currentOrder: order });
      return order;
    } finally {
      set({ loading: false });
    }
  },

  async modifyDestination(orderId, newDest) {
    set({ loading: true });
    try {
      const order = await orderApi.modifyDestination(orderId, newDest);
      if (order) set({ currentOrder: order });
      return order;
    } finally {
      set({ loading: false });
    }
  },

  async payOrder(orderId, method) {
    set({ loading: true });
    try {
      const order = await orderApi.payOrder(orderId, method);
      if (order) set({ currentOrder: order });
      return order;
    } finally {
      set({ loading: false });
    }
  },

  async rateOrder(orderId, rating) {
    set({ loading: true });
    try {
      const order = await orderApi.rateOrder(orderId, rating);
      if (order) set({ currentOrder: order });
      return order;
    } finally {
      set({ loading: false });
    }
  },

  async simulateDriverAccept(orderId) {
    const order = await orderApi.simulateDriverAccept(orderId);
    if (order) set({ currentOrder: order });
    return order;
  },

  async startTrip(orderId) {
    const order = await orderApi.startTrip(orderId);
    if (order) set({ currentOrder: order });
    return order;
  },

  async completeTrip(orderId) {
    const order = await orderApi.completeTrip(orderId);
    if (order) set({ currentOrder: order });
    return order;
  },

  startTripSimulation(origin, destination) {
    const { tripSimulation } = get();
    if (tripSimulation.intervalId) {
      clearInterval(tripSimulation.intervalId);
    }

    const fullPath = interpolatePath(
      { lat: origin.lat, lng: origin.lng },
      { lat: destination.lat, lng: destination.lng },
      20
    );

    const totalDistance = haversineDistance(fullPath[0], fullPath[fullPath.length - 1]);

    const intervalId = setInterval(() => {
      const { tripSimulation: ts } = get();
      const nextIndex = ts.currentIndex + 1;

      if (nextIndex >= fullPath.length) {
        clearInterval(ts.intervalId!);
        set({
          tripSimulation: {
            ...ts,
            isRunning: false,
            currentIndex: fullPath.length - 1,
            currentPosition: fullPath[fullPath.length - 1],
            traveledPath: fullPath,
            remainingPath: [],
            remainingDistance: 0,
            estimatedArrival: 0,
            intervalId: null,
          },
        });
        return;
      }

      const newPosition = fullPath[nextIndex];
      const traveledPath = fullPath.slice(0, nextIndex + 1);
      const remainingPath = fullPath.slice(nextIndex);
      const remainingDistance = haversineDistance(newPosition, fullPath[fullPath.length - 1]);
      const estimatedArrival = calculateETA(remainingDistance);

      set({
        tripSimulation: {
          ...ts,
          currentIndex: nextIndex,
          currentPosition: newPosition,
          traveledPath,
          remainingPath,
          remainingDistance,
          estimatedArrival,
        },
      });
    }, 2000);

    set({
      tripSimulation: {
        isRunning: true,
        fullPath,
        traveledPath: [fullPath[0]],
        remainingPath: fullPath,
        currentPosition: fullPath[0],
        currentIndex: 0,
        remainingDistance: totalDistance,
        totalDistance,
        estimatedArrival: calculateETA(totalDistance),
        intervalId,
      },
    });
  },

  stopTripSimulation() {
    const { tripSimulation } = get();
    if (tripSimulation.intervalId) {
      clearInterval(tripSimulation.intervalId);
    }
    set({
      tripSimulation: {
        ...get().tripSimulation,
        isRunning: false,
        intervalId: null,
      },
    });
  },

  resetTripSimulation() {
    const { tripSimulation } = get();
    if (tripSimulation.intervalId) {
      clearInterval(tripSimulation.intervalId);
    }
    set({ tripSimulation: initialTripSimulation });
  },

  loadOrders(filter) {
    set({ orders: orderApi.getOrderList(filter) });
  },

  getOrderById(id) {
    return orderApi.getOrderById(id);
  },

  setCurrentOrder(order) {
    set({ currentOrder: order });
  },

  refreshCurrentOrder(orderId) {
    const order = orderApi.getOrderById(orderId);
    if (order) set({ currentOrder: order });
  },
}));
