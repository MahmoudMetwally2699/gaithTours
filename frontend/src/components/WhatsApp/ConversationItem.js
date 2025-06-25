import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Star, User } from 'lucide-react';

const ConversationItem = ({ conversation, isSelected, onClick }) => {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
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
      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        {/* Avatar */}
        <div className="relative">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
            conversation.isVip ? 'bg-yellow-500' : 'bg-green-500'
          }`}>
            {conversation.customerName ?
              conversation.customerName.charAt(0).toUpperCase() :
              conversation.phoneNumber.slice(-2)
            }
          </div>
          {conversation.isVip && (
            <Star className="absolute -top-1 -right-1 text-yellow-500" size={14} fill="currentColor" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className={`font-medium truncate ${
              conversation.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'
            }`}>
              {conversation.customerName || 'Unknown Customer'}
            </h3>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {formatTime(conversation.lastMessageTimestamp)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 truncate">
                {conversation.phoneNumber}
              </p>
              <p className={`text-sm truncate mt-1 ${
                conversation.unreadCount > 0 ? 'font-medium text-gray-900' : 'text-gray-600'
              }`}>
                {conversation.lastMessageDirection === 'outgoing' && (
                  <span className="text-blue-500 mr-1">You: </span>
                )}
                {truncateMessage(conversation.lastMessage || 'No messages yet')}
              </p>
            </div>

            {/* Unread badge */}
            {conversation.unreadCount > 0 && (
              <div className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ml-2 flex-shrink-0">
                {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
              </div>
            )}
          </div>

          {/* Additional info */}
          <div className="flex items-center mt-2 space-x-2">
            {conversation.userId && (
              <span className="inline-flex items-center text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                <User size={10} className="mr-1" />
                Customer
              </span>
            )}
            {conversation.assignedTo && (
              <span className="inline-flex items-center text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                Assigned
              </span>
            )}
            {conversation.isArchived && (
              <span className="inline-flex items-center text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
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
