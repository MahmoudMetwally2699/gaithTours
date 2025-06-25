import React from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck, Clock, AlertCircle, Image, File, MapPin, User, Phone } from 'lucide-react';

const MessageBubble = ({ message, isOwn }) => {
  const formatTime = (timestamp) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  const getStatusIcon = () => {
    if (!isOwn) return null;

    switch (message.status) {
      case 'sent':
        return <Check size={14} className="text-gray-400" />;
      case 'delivered':
        return <CheckCheck size={14} className="text-gray-400" />;
      case 'read':
        return <CheckCheck size={14} className="text-blue-500" />;
      case 'failed':
        return <AlertCircle size={14} className="text-red-500" />;
      default:
        return <Clock size={14} className="text-gray-400" />;
    }
  };

  const getMessageTypeIcon = () => {
    switch (message.messageType) {
      case 'image':
        return <Image size={16} className="text-gray-500" />;
      case 'document':
        return <File size={16} className="text-gray-500" />;
      case 'location':
        return <MapPin size={16} className="text-gray-500" />;
      case 'contact':
        return <User size={16} className="text-gray-500" />;
      case 'audio':
        return <Phone size={16} className="text-gray-500" />;
      default:
        return null;
    }
  };

  const renderMessageContent = () => {
    switch (message.messageType) {
      case 'image':
        return (
          <div>
            {message.metadata?.media_url && (              <img
                src={message.metadata.media_url}
                alt="Shared content"
                className="max-w-xs rounded-lg mb-2"
              />
            )}
            {message.metadata?.caption && (
              <p className="text-sm">{message.metadata.caption}</p>
            )}
            {!message.metadata?.media_url && (
              <div className="flex items-center space-x-2 text-gray-500">
                <Image size={16} />
                <span className="text-sm">{message.message}</span>
              </div>
            )}
          </div>
        );

      case 'document':
        return (
          <div className="flex items-center space-x-2 p-3 bg-gray-100 rounded-lg">
            <File size={20} className="text-gray-600" />
            <div>
              <p className="text-sm font-medium">{message.metadata?.filename || 'Document'}</p>
              <p className="text-xs text-gray-500">{message.metadata?.mime_type}</p>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="flex items-center space-x-2 p-3 bg-gray-100 rounded-lg">
            <MapPin size={20} className="text-gray-600" />
            <div>
              <p className="text-sm font-medium">Location Shared</p>
              {message.metadata?.location?.name && (
                <p className="text-xs text-gray-500">{message.metadata.location.name}</p>
              )}
              {message.metadata?.location?.address && (
                <p className="text-xs text-gray-500">{message.metadata.location.address}</p>
              )}
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="flex items-center space-x-2 p-3 bg-gray-100 rounded-lg">
            <User size={20} className="text-gray-600" />
            <div>
              <p className="text-sm font-medium">Contact Shared</p>
              {message.metadata?.contact?.name && (
                <p className="text-xs text-gray-500">{message.metadata.contact.name}</p>
              )}
              {message.metadata?.contact?.phone && (
                <p className="text-xs text-gray-500">{message.metadata.contact.phone}</p>
              )}
            </div>
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center space-x-2 p-3 bg-gray-100 rounded-lg">
            <Phone size={20} className="text-gray-600" />
            <div>
              <p className="text-sm font-medium">Voice Message</p>
              <p className="text-xs text-gray-500">Click to play</p>
            </div>
          </div>
        );

      default:
        return <p className="text-sm whitespace-pre-wrap">{message.message}</p>;
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${
        isOwn ? 'order-2' : 'order-1'
      }`}>
        <div className={`px-4 py-2 rounded-lg ${
          isOwn
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-900 border border-gray-200'
        }`}>
          {/* Message type indicator */}
          {message.messageType !== 'text' && (
            <div className={`flex items-center space-x-1 mb-1 ${
              isOwn ? 'text-blue-100' : 'text-gray-500'
            }`}>
              {getMessageTypeIcon()}
              <span className="text-xs capitalize">{message.messageType}</span>
            </div>
          )}

          {/* Message content */}
          {renderMessageContent()}

          {/* Timestamp and status */}
          <div className={`flex items-center justify-end space-x-1 mt-1 ${
            isOwn ? 'text-blue-100' : 'text-gray-500'
          }`}>
            <span className="text-xs">{formatTime(message.timestamp)}</span>
            {getStatusIcon()}
          </div>
        </div>

        {/* Admin info for outgoing messages */}
        {isOwn && message.adminUserId && (
          <div className="text-xs text-gray-500 mt-1 text-right">
            Sent by {message.adminUserId.name || message.adminUserId.firstName}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
