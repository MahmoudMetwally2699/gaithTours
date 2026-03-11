import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { sendAIChatMessage, ChatMessage, HotelCard, PriceInfo, fetchHotelPrices } from '../services/aiChatbotService';
import { useAuth } from '../contexts/AuthContext';
import './AIChatbot.css';

interface ChatEntry {
  role: 'user' | 'assistant';
  content: string;
  hotelCards?: HotelCard[] | null;
  city?: string | null; // city tied to hotel cards for price fetch
}

const SUGGESTIONS_EN = [
  '🏨 What hotels do you offer?',
  '🌍 What destinations are available?',
  '💳 What payment methods do you accept?',
  '❓ How do I make a booking?',
];

const SUGGESTIONS_AR = [
  '🏨 ما هي الفنادق المتاحة؟',
  '🌍 ما هي الوجهات المتاحة؟',
  '💳 ما هي طرق الدفع المتاحة؟',
  '❓ كيف أحجز فندقاً؟',
];

// Format YYYY-MM-DD for min date attribute
function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

const AIChatbot: React.FC = () => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';

  const [isOpen, setIsOpen] = useState(false);
  const [showLabel, setShowLabel] = useState(true);
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Price fetching state
  const [priceMap, setPriceMap] = useState<Record<string, PriceInfo>>({});
  const [priceMsgIdx, setPriceMsgIdx] = useState<number | null>(null); // which message's cards to price
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [nights, setNights] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = isRTL ? SUGGESTIONS_AR : SUGGESTIONS_EN;
  const todayStr = toDateStr(new Date());

  // Hide label after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowLabel(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'sub_admin';

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isPricingLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Guard: don't render for admins (after all hooks)
  if (isAdmin) return null;

  const handleSend = async (messageText?: string) => {
    const text = (messageText || input).trim();
    if (!text || isLoading) return;

    setInput('');
    setError(null);

    const userMessage: ChatEntry = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const history: ChatMessage[] = messages
        .slice(-8)
        .map(m => ({ role: m.role, content: m.content }));

      const result = await sendAIChatMessage(text, history);

      // Extract city from message for price fetching later
      const newIdx = messages.length + 1; // index after both user + assistant messages
      const hasCards = result.hotelCards && result.hotelCards.length > 0;

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: result.response,
          hotelCards: result.hotelCards,
          city: hasCards ? extractCityClientSide(text) : null,
        },
      ]);

      // If cards are shown, set which message needs pricing
      if (hasCards) {
        setPriceMsgIdx(messages.length + 1);
        setPriceMap({});
        setPriceError(null);
        setCheckin('');
        setCheckout('');
      }
    } catch (err: any) {
      setError(err.message || (isRTL ? 'فشل الاتصال. حاول مرة أخرى.' : 'Connection failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Simple client-side city extractor (mirrors backend logic)
  function extractCityClientSide(text: string): string {
    const arabicMap: Record<string, string> = {
      'القاهرة': 'cairo', 'دبي': 'dubai', 'الرياض': 'riyadh', 'جدة': 'jeddah',
      'مكة': 'mecca', 'المدينة': 'medina', 'الإسكندرية': 'alexandria',
      'أبوظبي': 'abu dhabi', 'الكويت': 'kuwait city', 'بيروت': 'beirut',
      'عمّان': 'amman', 'مسقط': 'muscat', 'الدوحة': 'doha', 'المنامة': 'manama',
    };
    for (const [ar, en] of Object.entries(arabicMap)) {
      if (text.includes(ar)) return en;
    }
    const cities = ['cairo','dubai','riyadh','jeddah','mecca','medina','alexandria',
      'abu dhabi','kuwait','beirut','amman','muscat','doha','manama','istanbul',
      'london','paris','new york','tokyo','bangkok','hong kong'];
    const lower = text.toLowerCase();
    for (const c of cities) if (lower.includes(c)) return c;
    return '';
  }

  const handleFetchPrices = async () => {
    if (!checkin || !checkout || priceMsgIdx === null) return;
    const cityMsg = messages[priceMsgIdx] || messages[messages.length - 1];
    const city = cityMsg?.city || '';
    if (!city) return;

    // Collect the hotelIds from the cards in that message
    const hotelIds = (cityMsg?.hotelCards || []).map(h => h.hotelId).filter(Boolean);

    setIsPricingLoading(true);
    setPriceError(null);
    try {
      const result = await fetchHotelPrices(city, checkin, checkout, 'USD', hotelIds);
      setPriceMap(result.priceMap);
      setNights(result.nights);
    } catch (err: any) {
      setPriceError(err.message);
    } finally {
      setIsPricingLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (suggestion: string) => {
    const cleanText = suggestion.replace(/^[^\w\u0600-\u06FF]+/, '').trim();
    handleSend(cleanText);
  };

  const formatPrice = (p: PriceInfo) =>
    `${p.currency} ${p.pricePerNight.toLocaleString()}`;

  // Strip any markdown the AI accidentally outputs despite system prompt instructions
  const formatMessage = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')     // **bold** → plain
      .replace(/\*(.*?)\*/g, '$1')          // *italic* → plain
      .replace(/#{1,6}\s+/g, '')            // ## headers → plain
      .replace(/^\d+\.\s+/gm, '• ')        // 1. 2. → bullet
      .replace(/\n{3,}/g, '\n\n')           // collapse extra blank lines
      .trim();
  };


  const isDatePickerVisible = priceMsgIdx !== null && !isLoading;
  const hasCheckin = !!checkin;
  const minCheckout = checkin
    ? toDateStr(new Date(new Date(checkin).getTime() + 86400000))
    : todayStr;

  const placeholderText = isRTL
    ? 'اكتب سؤالك هنا...'
    : 'Ask me anything about Gaith Tours...';

  return (
    <>
      {/* Floating trigger button */}
      <button
        className={`ai-chatbot-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => { setIsOpen(!isOpen); setShowLabel(false); }}
        aria-label="AI Assistant"
        title="GaithBot - AI Assistant"
      >
        {isOpen ? '✕' : '🤖'}
        {showLabel && !isOpen && (
          <span className="ai-chatbot-trigger-label">
            {isRTL ? 'مساعد ذكي' : 'AI Assistant'}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="ai-chatbot-panel" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Header */}
          <div className="ai-chatbot-header">
            <div className="ai-chatbot-header-avatar">🤖</div>
            <div className="ai-chatbot-header-info">
              <h4>GaithBot</h4>
              <span>
                <span className="ai-chatbot-status-dot" />
                {isRTL ? 'مساعد ذكاء اصطناعي' : 'AI Travel Assistant'}
              </span>
            </div>
            <button
              className="ai-chatbot-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="ai-chatbot-messages">
            {messages.length === 0 ? (
              <div className="ai-chatbot-welcome">
                <div className="ai-chatbot-welcome-icon">🌍</div>
                <h3>{isRTL ? 'مرحباً! أنا GaithBot' : "Hi! I'm GaithBot"}</h3>
                <p>
                  {isRTL
                    ? 'يمكنني مساعدتك في إيجاد الفنادق، ومعرفة الأسعار، والإجابة على أسئلتك عن السفر.'
                    : 'I can help you find hotels, compare prices, and answer anything about your travel with Gaith Tours.'}
                </p>
                <div className="ai-chatbot-suggestions">
                  {suggestions.map((s, i) => (
                    <button key={i} className="ai-chatbot-suggestion-btn" onClick={() => handleSuggestion(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div key={idx}>
                    <div className={`ai-chatbot-message ${msg.role}`}>
                    <div className="ai-chatbot-message-avatar">
                        {msg.role === 'assistant' ? '🤖' : '😊'}
                      </div>
                      <div className="ai-chatbot-message-bubble" style={{ whiteSpace: 'pre-wrap' }}>
                        {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}
                      </div>
                    </div>

                    {/* Hotel cards */}
                    {msg.role === 'assistant' && msg.hotelCards && msg.hotelCards.length > 0 && (
                      <>
                        <div className="ai-hotel-cards-scroll">
                          {msg.hotelCards.map((hotel, hIdx) => {
                            const priceInfo = priceMap[hotel.hotelId];
                            return (
                              <a
                                key={hIdx}
                                className="ai-hotel-card"
                                href={`/hotels/details/${hotel.hotelId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <div className="ai-hotel-card-img-wrap">
                                  {hotel.image
                                    ? <img src={hotel.image} alt={hotel.name} className="ai-hotel-card-img" />
                                    : <div className="ai-hotel-card-img-placeholder">🏨</div>
                                  }
                                  {hotel.starRating > 0 && (
                                    <span className="ai-hotel-card-stars">
                                      {'★'.repeat(hotel.starRating)}
                                    </span>
                                  )}
                                  {/* Price badge */}
                                  {priceInfo && (
                                    <span className="ai-hotel-card-price-badge">
                                      {formatPrice(priceInfo)}<small>/night</small>
                                    </span>
                                  )}
                                </div>
                                <div className="ai-hotel-card-body">
                                  <div className="ai-hotel-card-name">{hotel.name}</div>
                                  <div className="ai-hotel-card-location">📍 {hotel.city}, {hotel.country}</div>
                                  {priceInfo ? (
                                    <div className="ai-hotel-card-price-row">
                                      <span className="ai-hotel-card-total">
                                        {priceInfo.currency} {priceInfo.price.toLocaleString()}
                                        <small> / {nights} {nights === 1 ? 'night' : 'nights'}</small>
                                      </span>
                                      {priceInfo.free_cancellation && (
                                        <span className="ai-hotel-card-free-cancel">✓ Free cancel</span>
                                      )}
                                    </div>
                                  ) : (
                                    hotel.amenities.length > 0 && (
                                      <div className="ai-hotel-card-amenities">
                                        {hotel.amenities.slice(0, 3).map((a, i) => (
                                          <span key={i} className="ai-hotel-card-amenity">{a}</span>
                                        ))}
                                      </div>
                                    )
                                  )}
                                  <div className="ai-hotel-card-cta">
                                    {isRTL ? 'عرض الفندق ←' : 'View Hotel →'}
                                  </div>
                                </div>
                              </a>
                            );
                          })}
                        </div>

                        {/* Date picker (only for the LAST hotel card message) */}
                        {idx === priceMsgIdx && (
                          <div className="ai-date-picker-box">
                            <div className="ai-date-picker-title">
                              📅 {isRTL ? 'أدخل تواريخ السفر لعرض الأسعار الحقيقية' : 'Enter travel dates to see real prices'}
                            </div>
                            <div className="ai-date-picker-row">
                              <div className="ai-date-picker-field">
                                <label>{isRTL ? 'وصول' : 'Check-in'}</label>
                                <input
                                  type="date"
                                  value={checkin}
                                  min={todayStr}
                                  onChange={e => {
                                    setCheckin(e.target.value);
                                    if (checkout && checkout <= e.target.value) setCheckout('');
                                  }}
                                />
                              </div>
                              <div className="ai-date-picker-field">
                                <label>{isRTL ? 'مغادرة' : 'Check-out'}</label>
                                <input
                                  type="date"
                                  value={checkout}
                                  min={minCheckout}
                                  disabled={!hasCheckin}
                                  onChange={e => setCheckout(e.target.value)}
                                />
                              </div>
                            </div>
                            {priceError && <div className="ai-date-picker-error">⚠️ {priceError}</div>}
                            <button
                              className="ai-date-picker-btn"
                              onClick={handleFetchPrices}
                              disabled={!checkin || !checkout || isPricingLoading}
                            >
                              {isPricingLoading
                                ? (isRTL ? 'جارٍ البحث...' : 'Fetching prices...')
                                : (isRTL ? '🔍 عرض الأسعار' : '🔍 Show Prices')}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
                {isLoading && (
                  <div className="ai-chatbot-typing">
                    <div className="ai-chatbot-message-avatar">🤖</div>
                    <div className="ai-chatbot-typing-bubble">
                      <div className="ai-chatbot-typing-dot" />
                      <div className="ai-chatbot-typing-dot" />
                      <div className="ai-chatbot-typing-dot" />
                    </div>
                  </div>
                )}

                {error && <div className="ai-chatbot-error">⚠️ {error}</div>}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="ai-chatbot-input-area">
            <textarea
              ref={inputRef}
              className="ai-chatbot-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholderText}
              rows={1}
              maxLength={1000}
              disabled={isLoading}
            />
            <button
              className="ai-chatbot-send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              aria-label="Send"
            >
              {isRTL ? '←' : '➤'}
            </button>
          </div>

          <div className="ai-chatbot-footer">🧡 Powered by Llama 4 · Gaith Tours</div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
