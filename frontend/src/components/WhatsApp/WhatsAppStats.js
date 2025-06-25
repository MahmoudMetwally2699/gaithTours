import React from 'react';
import { MessageCircle, Users, Star, Clock } from 'lucide-react';

const WhatsAppStats = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      <div className="bg-blue-50 p-3 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-600 font-medium">Total</p>
            <p className="text-lg font-semibold text-blue-900">{stats.totalConversations}</p>
          </div>
          <MessageCircle className="text-blue-500" size={20} />
        </div>
      </div>

      <div className="bg-red-50 p-3 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-red-600 font-medium">Unread</p>
            <p className="text-lg font-semibold text-red-900">{stats.unreadConversations}</p>
          </div>
          <div className="relative">
            <MessageCircle className="text-red-500" size={20} />
            {stats.totalUnreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {stats.totalUnreadMessages > 9 ? '9+' : stats.totalUnreadMessages}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 p-3 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-yellow-600 font-medium">VIP</p>
            <p className="text-lg font-semibold text-yellow-900">{stats.vipConversations}</p>
          </div>
          <Star className="text-yellow-500" size={20} fill="currentColor" />
        </div>
      </div>

      <div className="bg-green-50 p-3 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-green-600 font-medium">Active</p>
            <p className="text-lg font-semibold text-green-900">{stats.activeConversations || 0}</p>
          </div>
          <Users className="text-green-500" size={20} />
        </div>
      </div>
    </div>
  );
};

export default WhatsAppStats;
