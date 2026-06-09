import { create } from 'zustand';
import type { Order, Address, VehicleType, OrderRating } from '../types';
import * as orderApi from '../api/order';
import { MOCK_VEHICLE_TYPES } from '../api/mock/data';
import {
  haversineDistance,
  interpolateLine,
  remainingDistance,
  type LatLng,
} from '../utils/geo';

const TRIP_SEGMENTS = 20;
const TRIP_TICK_MS = 2000;
// 假设司机平均速度 ~10 m/s，用于在缺乏实际时长时估算 ETA。
const ASSUMED_SPEED_MPS = 10;

export interface TripSimulationState {
  orderId: string | null;
  /** 起点-终点等分后的 21 个轨迹点。 */
  pathPoints: LatLng[];
  /** 当前位于 pathPoints 的索引。 */
  currentIndex: number;
  /** 司机当前位置坐标。 */
  currentLocation: LatLng | null;
  /** 已经走过的轨迹（不可变累计）。 */
  traveledPath: LatLng[];
  /** 剩余距离（米）。 */
  remainingDistanceM: number;
  /** 预计到达时间（毫秒时间戳）。 */
  estimatedArrivalAt: number | null;
  /** 模拟是否处于运行状态。 */
  running: boolean;
  /** 模拟是否已经走完终点。 */
  finished: boolean;
}

const EMPTY_SIMULATION: TripSimulationState = {
  orderId: null,
  pathPoints: [],
  currentIndex: 0,
  currentLocation: null,
  traveledPath: [],
  remainingDistanceM: 0,
  estimatedArrivalAt: null,
  running: false,
  finished: false,
};

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

  /** 启动一次实时行程模拟。会在内部按 2s 节拍推进。 */
  startTripSimulation: (orderId: string) => void;
  /** 推进一次模拟（内部由定时器调用）。 */
  tickTripSimulation: () => void;
  /** 主动停止模拟（不重置已记录数据）。 */
  stopTripSimulation: () => void;
  /** 清空模拟状态。 */
  resetTripSimulation: () => void;
}

let simulationTimer: ReturnType<typeof setInterval> | null = null;

function clearSimulationTimer(): void {
  if (simulationTimer) {
    clearInterval(simulationTimer);
    simulationTimer = null;
  }
}

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

  tripSimulation: { ...EMPTY_SIMULATION },

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

  startTripSimulation(orderId) {
    const order = orderApi.getOrderById(orderId);
    if (!order) return;

    clearSimulationTimer();

    const start: LatLng = { lat: order.origin.lat, lng: order.origin.lng };
    const end: LatLng = { lat: order.destination.lat, lng: order.destination.lng };
    const pathPoints = interpolateLine(start, end, TRIP_SEGMENTS);

    const totalDist = remainingDistance(pathPoints, 0);
    const etaSeconds = totalDist / ASSUMED_SPEED_MPS;

    set({
      tripSimulation: {
        orderId,
        pathPoints,
        currentIndex: 0,
        currentLocation: pathPoints[0],
        traveledPath: [pathPoints[0]],
        remainingDistanceM: totalDist,
        estimatedArrivalAt: Date.now() + etaSeconds * 1000,
        running: true,
        finished: false,
      },
    });

    simulationTimer = setInterval(() => {
      get().tickTripSimulation();
    }, TRIP_TICK_MS);
  },

  tickTripSimulation() {
    const { tripSimulation } = get();
    if (!tripSimulation.running || tripSimulation.finished) return;

    const nextIndex = tripSimulation.currentIndex + 1;
    const lastIndex = tripSimulation.pathPoints.length - 1;
    const clampedIndex = Math.min(nextIndex, lastIndex);
    const currentLocation = tripSimulation.pathPoints[clampedIndex];

    const traveledPath = [...tripSimulation.traveledPath, currentLocation];
    const remainingM = remainingDistance(tripSimulation.pathPoints, clampedIndex);
    const finished = clampedIndex >= lastIndex;
    const etaSeconds = remainingM / ASSUMED_SPEED_MPS;

    set({
      tripSimulation: {
        ...tripSimulation,
        currentIndex: clampedIndex,
        currentLocation,
        traveledPath,
        remainingDistanceM: remainingM,
        estimatedArrivalAt: finished ? Date.now() : Date.now() + etaSeconds * 1000,
        running: !finished,
        finished,
      },
    });

    // 同步到当前订单的司机位置上，方便其他视图复用。
    const { currentOrder } = get();
    if (currentOrder && currentOrder.id === tripSimulation.orderId) {
      set({
        currentOrder: {
          ...currentOrder,
          currentDriverLocation: currentLocation,
        },
      });
    }

    if (finished) {
      clearSimulationTimer();
    }
  },

  stopTripSimulation() {
    clearSimulationTimer();
    set((state) => ({
      tripSimulation: { ...state.tripSimulation, running: false },
    }));
  },

  resetTripSimulation() {
    clearSimulationTimer();
    set({ tripSimulation: { ...EMPTY_SIMULATION } });
  },
}));

// 仅供工具消费（避免 tree-shaking 误删）。
export { haversineDistance };
