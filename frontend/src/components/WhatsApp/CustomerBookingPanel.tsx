import React, { useState } from 'react';
import {
  User, Calendar, Clock, MapPin, Phone, Mail, Star,
  Building2, CreditCard, Send, FileText, MessageSquare,
  ChevronDown, ChevronUp, X, Bell, AlertTriangle,
  CheckCircle, XCircle, Timer, Copy, ExternalLink,
  Award, Tag, StickyNote, Languages, History, HelpCircle, Edit
} from 'lucide-react';

// TypeScript interfaces
interface Reservation {
  _id: string;
  checkIn?: string;
  checkOut?: string;
  checkInDate?: string;
  checkOutDate?: string;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  hotelName?: string;
  hotel?: {
    name?: string;
    address?: string;
    city?: string;
  };
  currency?: string;
  roomType?: string;
  numberOfRooms?: number;
  roomCount?: number;
  confirmationNumber?: string;
  partnerId?: string;
}

interface CustomerInfo {
  _id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  loyaltyPoints?: number;
}

interface ConversationData {
  _id: string;
  phoneNumber: string;
  customerName?: string;
  isVip?: boolean;
  userId?: CustomerInfo;
  metadata?: {
    notes?: string;
    preferredLanguage?: 'en' | 'ar';
    customerType?: 'new' | 'returning' | 'vip';
  };
}

interface CustomerBookingPanelProps {
  conversation: ConversationData | null;
  reservations: Reservation[];
  onSendMessage: (message: string) => void;
  onClose?: () => void;
}

// Message templates
const MESSAGE_TEMPLATES = {
  bookingConfirmation: {
    en: "Dear {customerName}, your booking at {hotelName} is confirmed! 🎉\n\n📅 Check-in: {checkIn}\n📅 Check-out: {checkOut}\n🏨 Hotel: {hotelName}\n\nWe look forward to welcoming you!",
    ar: "عزيزي {customerName}، تم تأكيد حجزك في {hotelName}! 🎉\n\n📅 تسجيل الوصول: {checkIn}\n📅 تسجيل المغادرة: {checkOut}\n🏨 الفندق: {hotelName}\n\nنتطلع لاستقبالكم!"
  },
  checkInInfo: {
    en: "Hello {customerName}! 👋\n\nHere's your check-in information:\n\n🕐 Check-in time: 3:00 PM\n📍 Address: {hotelAddress}\n📞 Hotel phone: Contact front desk\n\nPlease have your ID and booking confirmation ready. Safe travels!",
    ar: "مرحباً {customerName}! 👋\n\nإليك معلومات تسجيل الوصول:\n\n🕐 وقت تسجيل الوصول: 3:00 مساءً\n📍 العنوان: {hotelAddress}\n\nيرجى إحضار الهوية وتأكيد الحجز. رحلة آمنة!"
  },
  paymentReminder: {
    en: "Hi {customerName},\n\nThis is a friendly reminder about your upcoming stay at {hotelName}.\n\n💰 Total amount: {amount}\n📅 Check-in: {checkIn}\n\nPlease ensure payment is completed before your arrival. Let us know if you have any questions!",
    ar: "مرحباً {customerName}،\n\nهذا تذكير ودي بشأن إقامتك القادمة في {hotelName}.\n\n💰 المبلغ الإجمالي: {amount}\n📅 تسجيل الوصول: {checkIn}\n\nيرجى التأكد من إتمام الدفع قبل وصولك."
  },
  thankYou: {
    en: "Thank you for choosing us, {customerName}! 🙏\n\nWe hope you had a wonderful stay. We'd love to hear your feedback!\n\nLooking forward to serving you again! ⭐",
    ar: "شكراً لاختياركم لنا، {customerName}! 🙏\n\nنأمل أن تكون إقامتك رائعة. نود سماع تعليقاتكم!\n\nنتطلع لخدمتكم مرة أخرى! ⭐"
  },
  cancellationInfo: {
    en: "Hi {customerName},\n\nRegarding your booking at {hotelName}:\n\n📋 Cancellation Policy:\n• Free cancellation until 48 hours before check-in\n• After that, first night charges apply\n\nWould you like to proceed with cancellation or modify your dates?",
    ar: "مرحباً {customerName}،\n\nبخصوص حجزك في {hotelName}:\n\n📋 سياسة الإلغاء:\n• إلغاء مجاني حتى 48 ساعة قبل الوصول\n• بعد ذلك، تطبق رسوم الليلة الأولى\n\nهل تريد المتابعة في الإلغاء أو تعديل التواريخ؟"
  },
  // Question templates
  whichTrip: {
    en: "Hi {customerName}! 👋\n\nCould you please clarify which reservation you're referring to?\n\nI can see you have a booking at {hotelName} from {checkIn} to {checkOut}. Is this the one you mean?",
    ar: "مرحباً {customerName}! 👋\n\nهل يمكنك توضيح أي حجز تقصد؟\n\nأرى أن لديك حجز في {hotelName} من {checkIn} إلى {checkOut}. هل هذا ما تقصده؟"
  },
  moreDetails: {
    en: "Hi {customerName},\n\nTo better assist you, could you please provide more details about:\n\n• What specific help do you need?\n• Is this regarding your booking at {hotelName}?\n• Any dates or other information?\n\nI'm here to help! 🤝",
    ar: "مرحباً {customerName}،\n\nلمساعدتك بشكل أفضل، هل يمكنك تزويدنا بمزيد من التفاصيل حول:\n\n• ما هي المساعدة التي تحتاجها؟\n• هل هذا بخصوص حجزك في {hotelName}؟\n• أي تواريخ أو معلومات أخرى؟\n\nأنا هنا للمساعدة! 🤝"
  },
  modifyBooking: {
    en: "Hi {customerName},\n\nI'd be happy to help you modify your booking at {hotelName}.\n\n📅 Current dates: {checkIn} - {checkOut}\n\nWhat changes would you like to make?\n• Change dates?\n• Add/remove rooms?\n• Special requests?\n\nPlease let me know!",
    ar: "مرحباً {customerName}،\n\nيسعدني مساعدتك في تعديل حجزك في {hotelName}.\n\n📅 التواريخ الحالية: {checkIn} - {checkOut}\n\nما التغييرات التي تريد إجراؤها؟\n• تغيير التواريخ؟\n• إضافة/إزالة غرف؟\n• طلبات خاصة؟\n\nأخبرني من فضلك!"
  },
  preferences: {
    en: "Hi {customerName}! 🏨\n\nFor your upcoming stay at {hotelName}, do you have any special requests or preferences?\n\n• Room preference (high floor, quiet area, etc.)?\n• Special occasions (birthday, anniversary)?\n• Dietary requirements?\n• Airport transfer needed?\n\nWe want to make your stay perfect!",
    ar: "مرحباً {customerName}! 🏨\n\nلإقامتك القادمة في {hotelName}، هل لديك أي طلبات أو تفضيلات خاصة؟\n\n• تفضيل الغرفة (طابق عالي، منطقة هادئة، الخ)؟\n• مناسبات خاصة (عيد ميلاد، ذكرى زواج)؟\n• متطلبات غذائية؟\n• تحتاج توصيل من المطار؟\n\nنريد أن نجعل إقامتك مثالية!"
  },
  lateCheckout: {
    en: "Hi {customerName},\n\nWould you like to request a late check-out for your stay at {hotelName}?\n\n🕐 Standard check-out: 12:00 PM\n🕑 Late check-out options available (subject to availability)\n\nLet me know if you'd like me to check with the hotel!",
    ar: "مرحباً {customerName}،\n\nهل ترغب في طلب تسجيل مغادرة متأخر لإقامتك في {hotelName}؟\n\n🕐 تسجيل المغادرة العادي: 12:00 ظهراً\n🕑 خيارات المغادرة المتأخرة متاحة (حسب التوفر)\n\nأخبرني إذا كنت تريد أن أتحقق مع الفندق!"
  }
};

// Suggested quick replies
const QUICK_REPLIES = {
  en: [
    "How can I help you today?",
    "Let me check that for you.",
    "Your booking is confirmed!",
    "I'll send you the details shortly.",
    "Is there anything else I can assist with?"
  ],
  ar: [
    "كيف يمكنني مساعدتك اليوم؟",
    "دعني أتحقق من ذلك.",
    "حجزك مؤكد!",
    "سأرسل لك التفاصيل قريباً.",
    "هل هناك شيء آخر يمكنني مساعدتك به؟"
  ]
};

const CustomerBookingPanel: React.FC<CustomerBookingPanelProps> = ({
  conversation,
  reservations,
  onSendMessage,
  onClose
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('bookings');
  const [customerNotes, setCustomerNotes] = useState(conversation?.metadata?.notes || '');
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'ar'>(
    conversation?.metadata?.preferredLanguage || 'en'
  );
  const [selectedBooking, setSelectedBooking] = useState<Reservation | null>(null);

  if (!conversation) return null;

  const customerName = conversation.customerName ||
    (conversation.userId?.firstName && conversation.userId?.lastName
      ? `${conversation.userId.firstName} ${conversation.userId.lastName}`
      : conversation.userId?.name) ||
    'Customer';

  const loyaltyPoints = conversation.userId?.loyaltyPoints || 0;
  const isVip = conversation.isVip || false;

  // Get upcoming and past reservations
  const now = new Date();
  const upcomingReservations = reservations.filter(r => {
    const checkIn = new Date(r.checkIn || r.checkInDate || '');
    return checkIn >= now && r.status !== 'cancelled';
  });
  const activeReservations = reservations.filter(r => {
    const checkIn = new Date(r.checkIn || r.checkInDate || '');
    const checkOut = new Date(r.checkOut || r.checkOutDate || '');
    return checkIn <= now && checkOut >= now && r.status === 'confirmed';
  });
  const pastReservations = reservations.filter(r => {
    const checkOut = new Date(r.checkOut || r.checkOutDate || '');
    return checkOut < now || r.status === 'completed';
  });

  // Check for alerts
  const alerts: { type: 'urgent' | 'warning' | 'info'; message: string }[] = [];
  upcomingReservations.forEach(r => {
    const checkIn = new Date(r.checkIn || r.checkInDate || '');
    const daysUntil = Math.ceil((checkIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil === 0) {
      alerts.push({ type: 'urgent', message: `Check-in TODAY at ${r.hotel?.name || r.hotelName}!` });
    } else if (daysUntil === 1) {
      alerts.push({ type: 'warning', message: `Check-in TOMORROW at ${r.hotel?.name || r.hotelName}` });
    } else if (daysUntil <= 3) {
      alerts.push({ type: 'info', message: `Check-in in ${daysUntil} days` });
    }
    if (r.status === 'pending') {
      alerts.push({ type: 'warning', message: `Pending confirmation: ${r.hotel?.name || r.hotelName}` });
    }
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency?: string) => {
    return `${currency || 'SAR'} ${amount.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle size={14} />;
      case 'pending': return <Timer size={14} />;
      case 'cancelled': return <XCircle size={14} />;
      case 'completed': return <CheckCircle size={14} />;
      default: return null;
    }
  };

  const fillTemplate = (template: string, booking?: Reservation) => {
    let filled = template
      .replace(/{customerName}/g, customerName)
      .replace(/{hotelName}/g, booking?.hotel?.name || booking?.hotelName || 'the hotel')
      .replace(/{checkIn}/g, formatDate(booking?.checkIn || booking?.checkInDate))
      .replace(/{checkOut}/g, formatDate(booking?.checkOut || booking?.checkOutDate))
      .replace(/{hotelAddress}/g, booking?.hotel?.address || 'Please contact hotel')
      .replace(/{amount}/g, formatCurrency(booking?.totalAmount || 0, booking?.currency));
    return filled;
  };

  const handleSendTemplate = (templateKey: keyof typeof MESSAGE_TEMPLATES, booking?: Reservation) => {
    const template = MESSAGE_TEMPLATES[templateKey][selectedLanguage];
    const message = fillTemplate(template, booking);
    onSendMessage(message);
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-80 lg:w-96 bg-white/95 backdrop-blur-xl border-l border-gray-200/50 flex flex-col h-full overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg flex items-center">
            <User size={20} className="mr-2" />
            Customer Info
          </h3>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-all">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Customer Profile */}
        <div className="flex items-center space-x-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg ${
            isVip ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : 'bg-white/20'
          }`}>
            {customerName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-lg">{customerName}</span>
              {isVip && <Star size={16} fill="currentColor" className="text-yellow-300" />}
            </div>
            <p className="text-white/80 text-sm">{conversation.phoneNumber}</p>
            {conversation.userId?.email && (
              <p className="text-white/60 text-xs truncate">{conversation.userId.email}</p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center space-x-4 mt-3 text-sm">
          <div className="flex items-center bg-white/20 px-3 py-1 rounded-full">
            <Award size={14} className="mr-1" />
            <span>{loyaltyPoints} points</span>
          </div>
          <div className="flex items-center bg-white/20 px-3 py-1 rounded-full">
            <Building2 size={14} className="mr-1" />
            <span>{reservations.length} bookings</span>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
          {alerts.slice(0, 3).map((alert, index) => (
            <div key={index} className={`flex items-center text-xs p-2 rounded-lg mb-1 last:mb-0 ${
              alert.type === 'urgent' ? 'bg-red-100 text-red-700' :
              alert.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {alert.type === 'urgent' ? <AlertTriangle size={14} className="mr-2 flex-shrink-0" /> :
               alert.type === 'warning' ? <Bell size={14} className="mr-2 flex-shrink-0" /> :
               <Clock size={14} className="mr-2 flex-shrink-0" />}
              <span className="truncate">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* All Bookings Section - Always shows all bookings */}
        {reservations.length > 0 && (
          <div className="border-b border-gray-100">
            <button
              onClick={() => toggleSection('bookings')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <Calendar size={16} className="text-green-600" />
                </div>
                <div className="text-left">
                  <span className="font-semibold text-gray-800">All Bookings</span>
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    {reservations.length}
                  </span>
                </div>
              </div>
              {expandedSection === 'bookings' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {expandedSection === 'bookings' && (
              <div className="px-4 pb-4 space-y-3">
                {reservations.map((booking) => (
                  <div
                    key={booking._id}
                    className={`bg-gradient-to-br from-gray-50 to-white border-2 rounded-xl p-3 shadow-sm cursor-pointer transition-all ${
                      selectedBooking?._id === booking._id
                        ? 'border-indigo-400 ring-2 ring-indigo-100'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                    onClick={() => setSelectedBooking(booking)}
                  >
                    {/* Selected indicator */}
                    {selectedBooking?._id === booking._id && (
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-indigo-100">
                        <span className="text-xs font-semibold text-indigo-600 flex items-center">
                          <CheckCircle size={12} className="mr-1" />
                          Selected for Templates
                        </span>
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 text-sm flex items-center">
                          <Building2 size={14} className="mr-1 text-indigo-500" />
                          {booking.hotel?.name || booking.hotelName || 'Hotel'}
                        </h4>
                        {booking.confirmationNumber && (
                          <div className="flex items-center mt-1">
                            <span className="text-xs text-gray-500">#{booking.confirmationNumber}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(booking.confirmationNumber!); }}
                              className="ml-1 p-0.5 hover:bg-gray-200 rounded"
                            >
                              <Copy size={10} className="text-gray-400" />
                            </button>
                          </div>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full border flex items-center ${getStatusColor(booking.status)}`}>
                        {getStatusIcon(booking.status)}
                        <span className="ml-1 capitalize">{booking.status}</span>
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center">
                        <Calendar size={12} className="mr-2 text-gray-400" />
                        <span>{formatDate(booking.checkIn || booking.checkInDate)} - {formatDate(booking.checkOut || booking.checkOutDate)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <CreditCard size={12} className="mr-2 text-gray-400" />
                          {formatCurrency(booking.totalAmount, booking.currency)}
                        </span>
                        <span className="text-gray-500">
                          {booking.roomCount || booking.numberOfRooms || 1} room(s)
                        </span>
                      </div>
                    </div>

                    {/* Quick Actions for this booking */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSendTemplate('bookingConfirmation', booking); }}
                        className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors flex items-center"
                      >
                        <Send size={10} className="mr-1" />
                        Confirm
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSendTemplate('checkInInfo', booking); }}
                        className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-lg hover:bg-green-100 transition-colors flex items-center"
                      >
                        <MapPin size={10} className="mr-1" />
                        Check-in
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSendTemplate('paymentReminder', booking); }}
                        className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded-lg hover:bg-amber-100 transition-colors flex items-center"
                      >
                        <CreditCard size={10} className="mr-1" />
                        Payment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message Templates Section */}
        <div className="border-b border-gray-100">
          <button
            onClick={() => toggleSection('templates')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <FileText size={16} className="text-purple-600" />
              </div>
              <span className="font-semibold text-gray-800">Message Templates</span>
            </div>
            {expandedSection === 'templates' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {expandedSection === 'templates' && (
            <div className="px-4 pb-4">
              {/* Selected Booking Indicator */}
              {selectedBooking ? (
                <div className="flex items-center justify-between mb-3 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                  <span className="text-xs text-indigo-700 flex items-center">
                    <CheckCircle size={14} className="mr-1" />
                    Using: <strong className="ml-1">{selectedBooking.hotel?.name || selectedBooking.hotelName}</strong>
                  </span>
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="text-xs text-indigo-500 hover:text-indigo-700"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <div className="flex items-center mb-3 bg-amber-50 p-2 rounded-lg border border-amber-100">
                  <AlertTriangle size={14} className="mr-2 text-amber-600" />
                  <span className="text-xs text-amber-700">Select a booking above to use with templates</span>
                </div>
              )}

              {/* Language Toggle */}
              <div className="flex items-center justify-between mb-3 bg-gray-50 p-2 rounded-lg">
                <span className="text-xs text-gray-500 flex items-center">
                  <Languages size={14} className="mr-1" />
                  Language:
                </span>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setSelectedLanguage('en')}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                      selectedLanguage === 'en'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setSelectedLanguage('ar')}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                      selectedLanguage === 'ar'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    العربية
                  </button>
                </div>
              </div>

              {/* Template Buttons - Booking Actions */}
              <div className="mb-3">
                <p className="text-xs text-gray-500 font-medium mb-2">📋 Booking Actions</p>
                <div className="space-y-2">
                  {[
                    { key: 'bookingConfirmation' as const, label: 'Booking Confirmation', icon: CheckCircle, color: 'green' },
                    { key: 'checkInInfo' as const, label: 'Check-in Information', icon: MapPin, color: 'blue' },
                    { key: 'paymentReminder' as const, label: 'Payment Reminder', icon: CreditCard, color: 'amber' },
                    { key: 'cancellationInfo' as const, label: 'Cancellation Policy', icon: XCircle, color: 'red' },
                    { key: 'thankYou' as const, label: 'Thank You Message', icon: Star, color: 'purple' },
                  ].map(({ key, label, icon: Icon, color }) => (
                    <button
                      key={key}
                      onClick={() => handleSendTemplate(key, selectedBooking || undefined)}
                      disabled={!selectedBooking && key !== 'thankYou'}
                      className={`w-full text-left p-3 rounded-xl border transition-all hover:shadow-md flex items-center
                        ${!selectedBooking && key !== 'thankYou' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{
                        backgroundColor: color === 'green' ? '#f0fdf4' :
                                        color === 'blue' ? '#eff6ff' :
                                        color === 'amber' ? '#fffbeb' :
                                        color === 'red' ? '#fef2f2' : '#faf5ff',
                        borderColor: color === 'green' ? '#dcfce7' :
                                     color === 'blue' ? '#dbeafe' :
                                     color === 'amber' ? '#fef3c7' :
                                     color === 'red' ? '#fecaca' : '#e9d5ff'
                      }}
                    >
                      <Icon size={16} className="mr-2 flex-shrink-0" />
                      <span className="text-sm font-medium">{label}</span>
                      <Send size={14} className="ml-auto opacity-60" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Buttons - Questions */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">❓ Questions & Clarifications</p>
                <div className="space-y-2">
                  {[
                    { key: 'whichTrip' as const, label: 'Which Trip?', icon: HelpCircle, color: 'cyan' },
                    { key: 'moreDetails' as const, label: 'Need More Details', icon: MessageSquare, color: 'cyan' },
                    { key: 'modifyBooking' as const, label: 'Modify Booking', icon: Edit, color: 'orange' },
                    { key: 'preferences' as const, label: 'Ask Preferences', icon: Star, color: 'pink' },
                    { key: 'lateCheckout' as const, label: 'Late Checkout', icon: Clock, color: 'gray' },
                  ].map(({ key, label, icon: Icon, color }) => (
                    <button
                      key={key}
                      onClick={() => handleSendTemplate(key, selectedBooking || undefined)}
                      disabled={!selectedBooking}
                      className={`w-full text-left p-3 rounded-xl border transition-all hover:shadow-md flex items-center
                        ${!selectedBooking ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{
                        backgroundColor: color === 'cyan' ? '#ecfeff' :
                                        color === 'orange' ? '#fff7ed' :
                                        color === 'pink' ? '#fdf2f8' : '#f9fafb',
                        borderColor: color === 'cyan' ? '#a5f3fc' :
                                     color === 'orange' ? '#fed7aa' :
                                     color === 'pink' ? '#fbcfe8' : '#e5e7eb'
                      }}
                    >
                      <Icon size={16} className="mr-2 flex-shrink-0" />
                      <span className="text-sm font-medium">{label}</span>
                      <Send size={14} className="ml-auto opacity-60" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Replies Section */}
        <div className="border-b border-gray-100">
          <button
            onClick={() => toggleSection('quick')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <MessageSquare size={16} className="text-blue-600" />
              </div>
              <span className="font-semibold text-gray-800">Quick Replies</span>
            </div>
            {expandedSection === 'quick' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {expandedSection === 'quick' && (
            <div className="px-4 pb-4 space-y-2">
              {QUICK_REPLIES[selectedLanguage].map((reply, index) => (
                <button
                  key={index}
                  onClick={() => onSendMessage(reply)}
                  className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm text-gray-700 transition-colors border border-gray-100 hover:border-gray-200"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Customer Notes Section */}
        <div className="border-b border-gray-100">
          <button
            onClick={() => toggleSection('notes')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                <StickyNote size={16} className="text-amber-600" />
              </div>
              <span className="font-semibold text-gray-800">Customer Notes</span>
            </div>
            {expandedSection === 'notes' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {expandedSection === 'notes' && (
            <div className="px-4 pb-4">
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Add notes about this customer..."
                className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                rows={3}
              />
              <p className="text-xs text-gray-400 mt-1">Notes are saved automatically</p>
            </div>
          )}
        </div>

        {/* No Bookings State */}
        {reservations.length === 0 && (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 size={24} className="text-gray-400" />
            </div>
            <h4 className="font-semibold text-gray-700 mb-1">No Bookings Found</h4>
            <p className="text-sm text-gray-500">
              This customer doesn't have any bookings yet.
            </p>
          </div>
        )}
      </div>

      {/* Footer Quick Actions */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-2">
        <div className="flex space-x-2">
          <button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center">
            <Phone size={14} className="mr-1" />
            Call
          </button>
          <button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center">
            <Mail size={14} className="mr-1" />
            Email
          </button>
          <button className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center">
            <ExternalLink size={14} className="mr-1" />
            Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerBookingPanel;
