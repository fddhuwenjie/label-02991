import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/Layout';
import type { ChatMessage } from '../../types';
import { generateId } from '../../utils/format';
import './index.css';

const BOT_REPLIES: Record<string, string> = {
  '你好': '您好！我是快达出行智能客服小快，很高兴为您服务。请问有什么可以帮您的？',
  '取消订单': '关于取消订单：司机接单前可免费取消；司机接单3分钟内可免费取消；超过3分钟取消需支付取消费。如需帮助请输入"转人工"。',
  '支付问题': '我们支持微信支付和支付宝支付。如果支付失败，请检查账户余额和网络状态。如仍有问题请输入"转人工"联系人工客服。',
  '优惠券': '优惠券相关：下单时系统自动匹配可用优惠券，也可手动选择。更多优惠可前往"优惠中心"领取每日签到券。',
  '遗失物品': '如在48小时内的订单中遗失物品，可在订单详情页点击"查找遗失物品"直接联系司机。超过48小时请联系人工客服协助处理。',
  '投诉': '非常抱歉给您带来了不好的体验。请详细描述您遇到的问题，我们会在24小时内为您处理。您也可以输入"转人工"直接联系人工客服。',
  '转人工': '正在为您转接人工客服，请稍候...\n\n人工客服已上线，请描述您的问题，我们会尽快为您解决。',
};

function getBotReply(msg: string): string {
  for (const [key, reply] of Object.entries(BOT_REPLIES)) {
    if (msg.includes(key)) return reply;
  }
  return '感谢您的咨询。您可以尝试描述关键词如"取消订单"、"支付问题"、"优惠券"、"遗失物品"等，或输入"转人工"联系人工客服。';
}

export default function CustomerServicePage() {
  const navigate = useNavigate();
  const [serviceMode, setServiceMode] = useState<'bot' | 'agent'>('bot');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: generateId(),
      sender: 'bot',
      content: '您好！我是快达出行智能客服小快 🙋‍♀️\n有什么可以帮您的吗？\n\n常见问题：\n• 取消订单\n• 支付问题\n• 优惠券\n• 遗失物品\n• 投诉\n• 转人工',
      type: 'text',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      sender: 'user',
      content: text,
      type: 'text',
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    const wantsAgent = text.includes('转人工') || text.includes('人工') || text.includes('客服');

    if (serviceMode === 'bot' && wantsAgent) {
      setTimeout(() => {
        const transferMsg: ChatMessage = {
          id: generateId(),
          sender: 'bot',
          content: '机器人已受理，正在为您转接人工客服，请稍候...',
          type: 'text',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, transferMsg]);
      }, 700);

      setTimeout(() => {
        setServiceMode('agent');
        const agentMsg: ChatMessage = {
          id: generateId(),
          sender: 'agent',
          content: '您好，我是人工客服小达，已接入会话。请描述您遇到的问题，我会优先为您处理。',
          type: 'text',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, agentMsg]);
      }, 1800);
      return;
    }

    setTimeout(() => {
      const replyMsg: ChatMessage = {
        id: generateId(),
        sender: serviceMode === 'agent' ? 'agent' : 'bot',
        content:
          serviceMode === 'agent'
            ? '已收到您的问题，我正在为您核实处理，请稍候。'
            : getBotReply(text),
        type: 'text',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, replyMsg]);
    }, 800 + Math.random() * 500);
  };

  const quickQuestions = ['取消订单', '支付问题', '优惠券', '遗失物品', '转人工'];

  return (
    <div className="cs-page">
      <PageHeader title="客服中心" onBack={() => navigate(-1)} rightText="常见问题" onRight={() => navigate('/faq')} />

      <div className="cs-messages" ref={listRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`cs-msg ${msg.sender === 'user' ? 'msg-right' : 'msg-left'}`}>
            <div className="cs-msg-avatar">
              {msg.sender === 'user' ? '👤' : msg.sender === 'agent' ? '👨‍💼' : '🤖'}
            </div>
            <div className={`cs-msg-bubble ${msg.sender === 'user' ? 'bubble-user' : msg.sender === 'agent' ? 'bubble-agent' : 'bubble-bot'}`}>
              {msg.content.split('\n').map((line, i) => (
                <span key={i}>
                  {line}
                  {i < msg.content.split('\n').length - 1 && <br />}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="cs-quick">
        {quickQuestions.map((q) => (
          <button key={q} className="cs-quick-btn" onClick={() => { setInput(q); }}>
            {q}
          </button>
        ))}
      </div>

      <div className="cs-input-bar">
        <input
          type="text"
          className="cs-input"
          placeholder="请输入您的问题..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button className="cs-send-btn" onClick={sendMessage} disabled={!input.trim()}>
          发送
        </button>
      </div>
    </div>
  );
}
