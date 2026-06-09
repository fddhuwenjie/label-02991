import { create } from 'zustand';
import type { Order, Address, VehicleType, OrderRating } from '../types';
import type { LatLng } from '../utils/geo';
import { interpolateLine, remainingDistance, totalDistance, estimateEta } from '../utils/geo';
import * as orderApi from '../api/order';
import { MOCK_VEHICLE_TYPES } from '../api/mock/data';

export interface TripSimulationState {
  waypoints: LatLng[];
  currentIndex: number;
  currentPosition: LatLng | null;
  remainingDist: number;
  eta: number;
  isSimulating: boolean;
  isCompleted: boolean;
  avgSpeedMps: number;
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

  loadOrders: (filter?: { status?: string; startDate?: number; endDate?: number }) => void;
  getOrderById: (id: string) => Order | null;
  setCurrentOrder: (order: Order | null) => void;
  refreshCurrentOrder: (orderId: string) => void;

  initTripSimulation: (origin: LatLng, destination: LatLng, totalDurationSec: number) => void;
  tickTripSimulation: () => void;
  completeTripSimulation: () => void;
  resetTripSimulation: () => void;
}

const INITIAL_SIM: TripSimulationState = {
  waypoints: [],
  currentIndex: 0,
  currentPosition: null,
  remainingDist: 0,
  eta: 0,
  isSimulating: false,
  isCompleted: false,
  avgSpeedMps: 8,
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
  tripSimulation: { ...INITIAL_SIM },

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

  initTripSimulation(origin, destination, totalDurationSec) {
    const waypoints = interpolateLine(origin, destination, 20);
    const dist = totalDistance(waypoints);
    const avgSpeedMps = totalDurationSec > 0 ? dist / totalDurationSec : 8;
    const rem = remainingDistance(waypoints, 0);
    const eta = estimateEta(rem, avgSpeedMps);
    set({
      tripSimulation: {
        waypoints,
        currentIndex: 0,
        currentPosition: waypoints[0],
        remainingDist: rem,
        eta,
        isSimulating: true,
        isCompleted: false,
        avgSpeedMps,
      },
    });
  },

  tickTripSimulation() {
    const sim = get().tripSimulation;
    if (!sim.isSimulating || sim.isCompleted) return;
    const nextIndex = sim.currentIndex + 1;
    if (nextIndex >= sim.waypoints.length) {
      get().completeTripSimulation();
      return;
    }
    const rem = remainingDistance(sim.waypoints, nextIndex);
    const eta = estimateEta(rem, sim.avgSpeedMps);
    set({
      tripSimulation: {
        ...sim,
        currentIndex: nextIndex,
        currentPosition: sim.waypoints[nextIndex],
        remainingDist: rem,
        eta,
      },
    });
  },

  completeTripSimulation() {
    const sim = get().tripSimulation;
    set({
      tripSimulation: {
        ...sim,
        isSimulating: false,
        isCompleted: true,
        remainingDist: 0,
        eta: 0,
        currentIndex: sim.waypoints.length - 1,
        currentPosition: sim.waypoints[sim.waypoints.length - 1],
      },
    });
  },

  resetTripSimulation() {
    set({ tripSimulation: { ...INITIAL_SIM } });
  },
}));
