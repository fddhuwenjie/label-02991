import { create } from 'zustand';
import type { Order, Address, VehicleType, OrderRating, LatLng, TripSimulationState, TripPoint } from '../types';
import * as orderApi from '../api/order';
import { MOCK_VEHICLE_TYPES } from '../api/mock/data';
import { interpolatePoints, calculateTotalDistance, estimateETA } from '../utils/geo';

const TRACKING_INTERVAL_MS = 2000;
const TRACKING_SEGMENTS = 20;

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

  startTripSimulation: (order: Order) => void;
  pauseTripSimulation: () => void;
  resumeTripSimulation: () => void;
  stopTripSimulation: () => void;
  resetTripSimulation: () => void;
}

const initialTripSimulation: TripSimulationState = {
  isActive: false,
  isPaused: false,
  isCompleted: false,
  currentIndex: 0,
  totalPoints: 0,
  trajectoryPoints: [],
  currentPosition: null,
  traveledPath: [],
  remainingPath: [],
  remainingDistance: 0,
  etaSeconds: 0,
  elapsedSeconds: 0,
  fullTrajectory: [],
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
      get().stopTripSimulation();
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
      if (order) {
        set({ currentOrder: order });
        const { tripSimulation, startTripSimulation } = get();
        if (tripSimulation.isActive && !tripSimulation.isCompleted) {
          get().stopTripSimulation();
          if (order.status === 'in_progress') {
            startTripSimulation(order);
          }
        }
      }
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
    if (order) {
      set({ currentOrder: order });
      get().startTripSimulation(order);
    }
    return order;
  },

  async completeTrip(orderId) {
    get().stopTripSimulation();
    const { tripSimulation } = get();
    
    orderApi.saveTripTrajectory(orderId, tripSimulation.fullTrajectory);

    const order = await orderApi.completeTrip(orderId);
    if (order) {
      order.tripTrajectory = tripSimulation.fullTrajectory;
      set({ currentOrder: order });
    }
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

  startTripSimulation(order: Order) {
    const { tripSimulation } = get();
    if (tripSimulation.intervalId) {
      clearInterval(tripSimulation.intervalId);
    }

    const origin: LatLng = { lat: order.origin.lat, lng: order.origin.lng };
    const destination: LatLng = { lat: order.destination.lat, lng: order.destination.lng };
    
    const trajectoryPoints = interpolatePoints(origin, destination, TRACKING_SEGMENTS);
    const totalDistance = calculateTotalDistance(trajectoryPoints);
    
    const fullTrajectory: TripPoint[] = trajectoryPoints.map((p, i) => ({
      ...p,
      timestamp: Date.now() + i * TRACKING_INTERVAL_MS,
    }));

    set({
      tripSimulation: {
        isActive: true,
        isPaused: false,
        isCompleted: false,
        currentIndex: 0,
        totalPoints: trajectoryPoints.length,
        trajectoryPoints,
        currentPosition: trajectoryPoints[0],
        traveledPath: [trajectoryPoints[0]],
        remainingPath: trajectoryPoints.slice(1),
        remainingDistance: totalDistance,
        etaSeconds: estimateETA(totalDistance),
        elapsedSeconds: 0,
        fullTrajectory: [fullTrajectory[0]],
        intervalId: null,
      },
    });

    const intervalId = setInterval(() => {
      const state = get().tripSimulation;
      if (!state.isActive || state.isPaused || state.isCompleted) return;

      const nextIndex = state.currentIndex + 1;
      
      if (nextIndex >= state.trajectoryPoints.length) {
        clearInterval(state.intervalId!);
        set({
          tripSimulation: {
            ...state,
            isCompleted: true,
            currentIndex: state.trajectoryPoints.length - 1,
            currentPosition: state.trajectoryPoints[state.trajectoryPoints.length - 1],
            traveledPath: state.trajectoryPoints,
            remainingPath: [],
            remainingDistance: 0,
            etaSeconds: 0,
            elapsedSeconds: state.elapsedSeconds + TRACKING_INTERVAL_MS / 1000,
            intervalId: null,
          },
        });
        return;
      }

      const currentPos = state.trajectoryPoints[nextIndex];
      const traveledPath = state.trajectoryPoints.slice(0, nextIndex + 1);
      const remainingPath = state.trajectoryPoints.slice(nextIndex + 1);
      const remainingDistance = calculateTotalDistance([currentPos, ...remainingPath]);
      
      const newFullTrajectory: TripPoint[] = [
        ...state.fullTrajectory,
        { ...currentPos, timestamp: Date.now() },
      ];

      set({
        tripSimulation: {
          ...state,
          currentIndex: nextIndex,
          currentPosition: currentPos,
          traveledPath,
          remainingPath,
          remainingDistance,
          etaSeconds: estimateETA(remainingDistance),
          elapsedSeconds: state.elapsedSeconds + TRACKING_INTERVAL_MS / 1000,
          fullTrajectory: newFullTrajectory,
        },
      });
    }, TRACKING_INTERVAL_MS);

    set((state) => ({
      tripSimulation: { ...state.tripSimulation, intervalId },
    }));
  },

  pauseTripSimulation() {
    set((state) => ({
      tripSimulation: { ...state.tripSimulation, isPaused: true },
    }));
  },

  resumeTripSimulation() {
    set((state) => ({
      tripSimulation: { ...state.tripSimulation, isPaused: false },
    }));
  },

  stopTripSimulation() {
    const { tripSimulation } = get();
    if (tripSimulation.intervalId) {
      clearInterval(tripSimulation.intervalId);
    }
  },

  resetTripSimulation() {
    const { tripSimulation } = get();
    if (tripSimulation.intervalId) {
      clearInterval(tripSimulation.intervalId);
    }
    set({ tripSimulation: initialTripSimulation });
  },
}));
