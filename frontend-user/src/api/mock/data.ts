import type { VehicleType, Address, Driver, FAQ, Agreement, Coupon } from '../../types';
import { generateId } from '../../utils/format';

export const MOCK_VEHICLE_TYPES: VehicleType[] = [
  {
    id: 'express',
    name: '快车',
    icon: '🚗',
    description: '经济实惠，满足日常出行',
    basePrice: 10,
    pricePerKm: 1.8,
    pricePerMin: 0.4,
    estimatedArrival: 5,
    features: ['含基础险', '空调车', '4座'],
    billingRules: '一口价计费：根据出发地和目的地预估总价，行程中不受路线变化影响（修改目的地除外）。基础费用=起步价(10元) + 里程费(1.8元/公里) + 时长费(0.4元/分钟)。',
    surchargeRules: '高峰时段（07:00-09:00, 17:00-19:00）加收1.2倍；夜间时段（23:00-06:00）加收1.5倍；恶劣天气加收2元。',
    serviceStandard: '司机需保持车内整洁、空调正常运行、主动问候乘客、按导航行驶。',
  },
  {
    id: 'carpool',
    name: '顺风车',
    icon: '🚙',
    description: '价格更优，绿色共享出行',
    basePrice: 6,
    pricePerKm: 1.0,
    pricePerMin: 0.2,
    estimatedArrival: 15,
    features: ['拼车优惠', '绿色出行', '4座'],
    billingRules: '一口价计费：根据出发地和目的地预估总价。基础费用=起步价(6元) + 里程费(1.0元/公里) + 时长费(0.2元/分钟)。顺风车价格已包含分摊优惠。',
    surchargeRules: '顺风车无高峰附加费；夜间时段（23:00-06:00）加收1.2倍。',
    serviceStandard: '车主需遵守交通规则、保持车内整洁、顺路接送、不绕路。',
  },
];

export const MOCK_HOT_ADDRESSES: Address[] = [
  { id: 'h1', name: '火车站', address: '市中心火车站北广场', lat: 30.571, lng: 104.066 },
  { id: 'h2', name: '机场T2航站楼', address: '双流国际机场T2航站楼出发层', lat: 30.578, lng: 103.946 },
  { id: 'h3', name: '万象城', address: '天府大道北段万象城购物中心', lat: 30.635, lng: 104.074 },
  { id: 'h4', name: '春熙路', address: '春熙路步行街中段', lat: 30.657, lng: 104.081 },
  { id: 'h5', name: '天府广场', address: '天府广场地铁站B口', lat: 30.652, lng: 104.065 },
  { id: 'h6', name: '软件园', address: '天府软件园E区', lat: 30.545, lng: 104.063 },
];

export const MOCK_DRIVERS: Driver[] = [
  {
    id: 'd1', name: '王师傅', phone: '13800001111', avatar: '',
    plateNumber: '川A·D6789', vehicleModel: '丰田卡罗拉', vehicleColor: '白色',
    vehiclePhoto: '', rating: 4.9, totalTrips: 3560,
  },
  {
    id: 'd2', name: '李师傅', phone: '13800002222', avatar: '',
    plateNumber: '川A·K2345', vehicleModel: '大众朗逸', vehicleColor: '银色',
    vehiclePhoto: '', rating: 4.7, totalTrips: 2180,
  },
  {
    id: 'd3', name: '张师傅', phone: '13800003333', avatar: '',
    plateNumber: '川A·M8901', vehicleModel: '本田思域', vehicleColor: '黑色',
    vehiclePhoto: '', rating: 4.8, totalTrips: 4200,
  },
];

export const MOCK_FAQS: FAQ[] = [
  { id: 'f1', category: 'order', categoryName: '订单问题', question: '如何取消订单？', answer: '在等待接单页面点击"取消订单"按钮即可。司机接单3分钟内取消免费，超过3分钟取消需支付取消费，取消费按等待时长计算（1元/分钟）。' },
  { id: 'f2', category: 'order', categoryName: '订单问题', question: '司机迟迟不来怎么办？', answer: '如司机接单后超过预估到达时间仍未到达，您可以联系司机了解情况或取消订单重新叫车。超时取消免收取消费。' },
  { id: 'f3', category: 'order', categoryName: '订单问题', question: '行程中可以修改目的地吗？', answer: '可以。行程中点击"修改目的地"，系统会重新规划路线并计算价格。新价格=已行驶路段价格+新路线价格。修改后需您确认新价格后生效。' },
  { id: 'f4', category: 'payment', categoryName: '支付问题', question: '支持哪些支付方式？', answer: '目前支持微信支付、支付宝支付。支付时优先使用优惠券抵扣，剩余金额从绑定的支付方式扣除。' },
  { id: 'f5', category: 'payment', categoryName: '支付问题', question: '支付失败怎么办？', answer: '请检查支付账户余额是否充足、网络是否正常。如多次失败，可尝试更换支付方式或联系客服处理。' },
  { id: 'f6', category: 'coupon', categoryName: '优惠问题', question: '优惠券如何使用？', answer: '下单时系统会自动匹配满足条件的优惠券，您也可以手动选择使用哪张优惠券。优惠券在满足使用门槛时自动抵扣。' },
  { id: 'f7', category: 'coupon', categoryName: '优惠问题', question: '优惠券过期了还能用吗？', answer: '很抱歉，过期的优惠券无法使用。建议您关注优惠券有效期，及时使用。' },
  { id: 'f8', category: 'safety', categoryName: '安全问题', question: '行程中遇到紧急情况怎么办？', answer: '请立即使用APP内的紧急联系人功能或直接拨打110。平台会记录您的行程轨迹信息，配合相关部门处理。' },
  { id: 'f9', category: 'safety', categoryName: '安全问题', question: '如何设置紧急联系人？', answer: '进入"我的-个人资料-紧急联系人"进行设置。行程开始时，系统会自动向紧急联系人发送行程信息。' },
];

export const MOCK_AGREEMENTS: Agreement[] = [
  {
    id: 'service',
    title: '用户服务协议',
    content: `快达出行用户服务协议

生效日期：2025年1月1日
更新日期：2025年6月15日

第一条 服务内容
1.1 快达出行（以下简称"平台"）为用户提供网约车信息撮合服务，连接乘客与司机。
1.2 平台提供的服务包括但不限于：快车服务、顺风车服务。

第二条 用户注册与账号
2.1 用户需使用真实手机号注册账号，一个手机号仅可注册一个账号。
2.2 用户应妥善保管账号信息，因用户保管不当造成的损失由用户自行承担。
2.3 用户不得将账号转让、出借给他人使用。

第三条 服务使用规范
3.1 用户应如实填写出发地和目的地信息。
3.2 用户应在约定地点等候司机，如因用户原因导致司机等待超过5分钟，平台有权收取等待费。
3.3 用户在行程中应遵守交通法规，系好安全带。
3.4 用户不得在车内吸烟、饮食（司机允许除外）。

第四条 费用与支付
4.1 行程费用根据里程、时长等因素计算，下单前会展示预估价格。
4.2 实际费用以行程结束后系统计算为准。
4.3 用户应在行程结束后及时完成支付。

第五条 取消与违约
5.1 司机接单前，用户可免费取消订单。
5.2 司机接单后3分钟内，用户可免费取消订单。
5.3 司机接单超过3分钟后取消，需支付取消费。

第六条 隐私保护
详见《隐私政策》。

第七条 免责声明
7.1 因不可抗力导致的服务中断，平台不承担责任。
7.2 平台作为信息撮合方，不对司机的驾驶行为承担直接责任。

第八条 协议修改
平台有权根据业务发展修改本协议，修改后的协议将在平台公示。`,
    updatedAt: '2025-06-15',
  },
  {
    id: 'privacy',
    title: '隐私政策',
    content: `快达出行隐私政策

生效日期：2025年1月1日
更新日期：2025年6月15日

一、信息收集
1. 注册信息：手机号码、验证码。
2. 个人资料：昵称、头像、性别、生日（选填）。
3. 位置信息：GPS定位数据，用于确定您的出发地和匹配附近车辆。
4. 行程信息：出发地、目的地、行程轨迹。
5. 支付信息：支付方式、交易记录。
6. 设备信息：设备型号、操作系统版本、设备标识符。

二、信息使用
1. 为您提供叫车服务和行程管理。
2. 处理支付交易。
3. 提供客服支持。
4. 改善产品和服务质量。
5. 保障交易安全。

三、信息共享
1. 行程中，您的部分信息（如上车点、目的地）将与接单司机共享。
2. 紧急情况下，可能向相关部门提供您的行程信息。
3. 未经您的同意，不会将您的信息提供给其他第三方。

四、信息保护
1. 使用加密技术保护您的个人信息。
2. 严格限制员工访问用户信息的权限。
3. 定期进行安全审计。

五、号码保护
平台对乘客和司机的手机号码进行加密处理，双方通过平台虚拟号码通话，保护双方隐私。

六、您的权利
1. 查看、修改个人信息。
2. 删除账号及相关数据。
3. 撤回信息授权。

七、联系方式
如有隐私相关问题，请联系：privacy@kuaida.com`,
    updatedAt: '2025-06-15',
  },
];

export function generateMockCoupons(): Coupon[] {
  const now = Date.now();
  const day = 86400000;
  return [
    { id: generateId(), type: 'newUser', typeName: '新人专享', amount: 10, minSpend: 20, expireAt: now + 30 * day, used: false },
    { id: generateId(), type: 'newUser', typeName: '新人专享', amount: 5, minSpend: 15, expireAt: now + 30 * day, used: false },
    { id: generateId(), type: 'daily', typeName: '每日签到', amount: 3, minSpend: 10, expireAt: now + 7 * day, used: false },
    { id: generateId(), type: 'daily', typeName: '每日签到', amount: 2, minSpend: 0, expireAt: now + 3 * day, used: false },
  ];
}

export function getRandomDriver(): Driver {
  return MOCK_DRIVERS[Math.floor(Math.random() * MOCK_DRIVERS.length)];
}

export function generateMockRoute() {
  const points: Array<{ lat: number; lng: number }> = [];
  let lat = 30.55 + Math.random() * 0.1;
  let lng = 104.05 + Math.random() * 0.03;
  for (let i = 0; i < 20; i++) {
    lat += (Math.random() - 0.3) * 0.005;
    lng += (Math.random() - 0.3) * 0.005;
    points.push({ lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) });
  }
  return points;
}
