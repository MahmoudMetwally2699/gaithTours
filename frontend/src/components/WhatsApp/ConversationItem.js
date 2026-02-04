import React from 'react';
import { Star, User, Building2, Calendar } from 'lucide-react';

const ConversationItem = ({ conversation, isSelected, onClick }) => {  const formatTime = (timestamp) => {
    // Handle null, undefined, or invalid timestamps
    if (!timestamp) {
      return 'No date';
    }

    const date = new Date(timestamp);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const truncateMessage = (message, maxLength = 50) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };
  return (
    <div
      onClick={onClick}
      className={`relative p-4 border-b border-gray-100 cursor-pointer transition-all duration-200 hover:bg-orange-50 ${
        isSelected
          ? 'bg-orange-50 border-l-4 border-l-orange-500'
          : ''
      }`}
    >
      {/* Active indicator */}
      {isSelected && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-gradient-to-b from-orange-500 to-amber-500 rounded-r-full"></div>
      )}

      <div className="flex items-start space-x-3">        {/* Avatar */}
        <div className="relative">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg transition-all duration-300 ${
            conversation.isVip
              ? 'bg-gradient-to-r from-yellow-400 to-amber-400 ring-4 ring-yellow-100'
              : isSelected
                ? 'bg-gradient-to-r from-orange-400 to-amber-400 ring-4 ring-orange-100'
                : 'bg-gradient-to-r from-orange-400 to-amber-400'
          }`}>
            {conversation.customerName ?
              conversation.customerName.charAt(0).toUpperCase() :
              conversation.phoneNumber.slice(-2)
            }
          </div>

          {/* Unread count badge */}
          {conversation.unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center text-xs text-white font-bold shadow-lg animate-pulse">
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </div>
          )}

          {/* VIP badge */}
          {conversation.isVip && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-amber-400 rounded-full flex items-center justify-center shadow-lg">
              <Star size={12} fill="white" className="text-white" />
            </div>
          )}
          {/* Online indicator */}
          <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-orange-400 border-2 border-white rounded-full"></div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-semibold truncate transition-colors duration-300 ${
              isSelected
                ? 'text-orange-700'
                : conversation.unreadCount > 0
                  ? 'text-gray-900'
                  : 'text-gray-700'
            }`}>
              {conversation.customerName || 'Unknown Customer'}
            </h3>
            <span className="text-xs text-gray-500 flex-shrink-0 font-medium">
              {formatTime(conversation.lastMessageTimestamp)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 truncate font-medium mb-1">
                {conversation.phoneNumber}
              </p>
              <p className={`text-sm truncate transition-colors duration-300 ${
                conversation.unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'
              }`}>
                {conversation.lastMessageDirection === 'outgoing' && (
                  <span className="text-orange-600 mr-1 font-semibold">You: </span>
                )}
                {truncateMessage(conversation.lastMessage || 'No messages yet')}
              </p>
            </div>

            {/* Status indicators */}
            <div className="flex items-center space-x-2 ml-3">
              {conversation.unreadCount > 0 && (
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
              )}
              {isSelected && (
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse"></div>
                  <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
              )}
            </div>
          </div>          {/* Additional info */}
          <div className="flex items-center mt-3 space-x-2 flex-wrap gap-1">
            {conversation.userId && (
              <span className="inline-flex items-center text-xs text-orange-700 bg-gradient-to-r from-orange-100 to-amber-100 px-2 py-1 rounded-full border border-orange-200 font-medium">
                <User size={10} className="mr-1" />
                Customer
              </span>
            )}
            {conversation.bookingCount > 0 && (
              <span className="inline-flex items-center text-xs text-indigo-700 bg-gradient-to-r from-indigo-100 to-purple-100 px-2 py-1 rounded-full border border-indigo-200 font-medium">
                <Building2 size={10} className="mr-1" />
                {conversation.bookingCount} {conversation.bookingCount === 1 ? 'Booking' : 'Bookings'}
              </span>
            )}
            {conversation.hasUpcomingCheckIn && (
              <span className="inline-flex items-center text-xs text-amber-700 bg-gradient-to-r from-amber-100 to-orange-100 px-2 py-1 rounded-full border border-amber-200 font-medium animate-pulse">
                <Calendar size={10} className="mr-1" />
                Check-in Soon
              </span>
            )}
            {conversation.assignedTo && (
              <span className="inline-flex items-center text-xs text-purple-700 bg-gradient-to-r from-purple-100 to-pink-100 px-2 py-1 rounded-full border border-purple-200 font-medium">
                Assigned
              </span>
            )}
            {conversation.isArchived && (
              <span className="inline-flex items-center text-xs text-gray-700 bg-gradient-to-r from-gray-100 to-slate-100 px-2 py-1 rounded-full border border-gray-200 font-medium">
                Archived
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationItem;
