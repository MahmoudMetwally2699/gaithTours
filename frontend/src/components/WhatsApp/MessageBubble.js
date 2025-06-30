import React from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck, Clock, AlertCircle, Image, File, MapPin, User, Phone } from 'lucide-react';

const MessageBubble = ({ message, isOwn }) => {
  // Format file size helper function
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (timestamp) => {
    // Handle null, undefined, or invalid timestamps
    if (!timestamp) {
      return '--:--';
    }

    try {
      const date = new Date(timestamp);

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return '--:--';
      }

      return format(date, 'HH:mm');
    } catch (error) {
      console.error('Error formatting time:', error);
      return '--:--';
    }
  };

  const getStatusIcon = () => {
    if (!isOwn) return null;

    switch (message.status) {
      case 'sent':
        return <Check size={14} className="text-white/70" />;
      case 'delivered':
        return <CheckCheck size={14} className="text-white/70" />;
      case 'read':
        return <CheckCheck size={14} className="text-white/90" />;
      case 'failed':
        return <AlertCircle size={14} className="text-red-300" />;
      default:
        return <Clock size={14} className="text-white/70" />;
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
  };  const renderMessageContent = () => {
    switch (message.messageType) {
      case 'image':
        return (
          <div>
            {message.metadata?.media_url && (
              <div className="mb-2">
                <img
                  src={message.metadata.media_url}
                  alt="Shared content"
                  className="max-w-full w-full sm:max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(message.metadata.media_url, '_blank')}
                />
              </div>
            )}
            {(message.metadata?.caption || message.message) && (
              <p className="text-sm">{message.metadata?.caption || message.message}</p>
            )}
            {!message.metadata?.media_url && (
              <div className="flex items-center space-x-2 text-gray-500">
                <Image size={16} />
                <span className="text-sm">{message.message}</span>
              </div>
            )}
          </div>
        );      case 'document':
        return (
          <div>
            {message.metadata?.media_url ? (
              <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg mb-2 hover:bg-gray-200 transition-colors cursor-pointer"
                   onClick={() => {
                     console.log('🔍 Opening document:', message.metadata.media_url);
                     window.open(message.metadata.media_url, '_blank');
                   }}>
                <File size={20} className="text-gray-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{message.metadata?.filename || 'Document'}</p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{message.metadata?.mime_type}</span>
                    {message.metadata?.file_size && (
                      <>
                        <span>•</span>
                        <span>{formatFileSize(message.metadata.file_size)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-xs text-blue-600 font-medium">
                  {message.metadata?.mime_type === 'application/pdf' ? 'View PDF' : 'Open'}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 p-2 sm:p-3 bg-gray-100 rounded-lg">
                <File size={16} className="sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{message.metadata?.filename || 'Document'}</p>
                  <p className="text-xs text-gray-500">{message.metadata?.mime_type}</p>
                </div>
              </div>
            )}
            {(message.metadata?.caption || (message.message && message.message !== 'Sent document')) && (
              <p className="text-sm">{message.metadata?.caption || message.message}</p>
            )}

            {/* Debug info for PDFs - remove this in production */}
            {process.env.NODE_ENV === 'development' && message.metadata?.mime_type === 'application/pdf' && (
              <div className="mt-2 p-2 bg-yellow-100 rounded text-xs">
                <strong>Debug PDF:</strong><br/>
                URL: {message.metadata?.media_url}<br/>
                Type: {message.messageType}<br/>
                MIME: {message.metadata?.mime_type}
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div>
            {message.metadata?.media_url && (
              <div className="mb-2">
                <video
                  controls
                  className="max-w-full w-full sm:max-w-xs rounded-lg"
                  preload="metadata"
                >
                  <source src={message.metadata.media_url} type={message.metadata?.mime_type || 'video/mp4'} />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
            {(message.metadata?.caption || message.message) && (
              <p className="text-sm">{message.metadata?.caption || message.message}</p>
            )}
            {!message.metadata?.media_url && (
              <div className="flex items-center space-x-2 text-gray-500">
                <Phone size={16} />
                <span className="text-sm">{message.message}</span>
              </div>
            )}
          </div>
        );

      case 'audio':
        return (
          <div>
            {message.metadata?.media_url ? (
              <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg mb-2">
                <Phone size={20} className="text-gray-600 flex-shrink-0" />
                <div className="flex-1">
                  <audio controls className="w-full">
                    <source src={message.metadata.media_url} type={message.metadata?.mime_type || 'audio/mpeg'} />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 p-2 sm:p-3 bg-gray-100 rounded-lg">
                <Phone size={16} className="sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Voice Message</p>
                  <p className="text-xs text-gray-500">Click to play</p>
                </div>
              </div>
            )}
            {(message.metadata?.caption || (message.message && message.message !== 'Sent audio')) && (
              <p className="text-sm">{message.metadata?.caption || message.message}</p>
            )}
          </div>
        );

      case 'location':
        return (
          <div className="flex items-center space-x-2 p-2 sm:p-3 bg-gray-100 rounded-lg">
            <MapPin size={16} className="sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Location Shared</p>
              {message.metadata?.location?.name && (
                <p className="text-xs text-gray-500 truncate">{message.metadata.location.name}</p>
              )}
              {message.metadata?.location?.address && (
                <p className="text-xs text-gray-500 truncate">{message.metadata.location.address}</p>
              )}
            </div>
          </div>        );

      case 'contact':
        return (
          <div className="flex items-center space-x-2 p-2 sm:p-3 bg-gray-100 rounded-lg">
            <User size={16} className="sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Contact Shared</p>
              {message.metadata?.contact?.name && (
                <p className="text-xs text-gray-500 truncate">{message.metadata.contact.name}</p>
              )}
              {message.metadata?.contact?.phone && (
                <p className="text-xs text-gray-500">{message.metadata.contact.phone}</p>
              )}
            </div>
          </div>
        );

      default:
        return <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>;
    }
  };return (
    <div className={`flex mb-3 lg:mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] sm:max-w-xs lg:max-w-md xl:max-w-lg transform transition-all duration-300 hover:scale-105 ${
        isOwn ? 'order-2' : 'order-1'
      }`}>
        <div className={`px-3 sm:px-4 lg:px-5 py-2 sm:py-3 rounded-2xl shadow-lg relative ${
          isOwn
            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
            : 'bg-white text-gray-900 border border-gray-200 shadow-md'
        }`}>
          {/* Message tail */}
          <div className={`absolute top-2 sm:top-3 w-2 h-2 sm:w-3 sm:h-3 transform rotate-45 ${
            isOwn
              ? '-right-1 bg-gradient-to-r from-green-500 to-emerald-500'
              : '-left-1 bg-white border-l border-b border-gray-200'
          }`}></div>

          {/* Message type indicator */}
          {message.messageType !== 'text' && (
            <div className={`flex items-center space-x-2 mb-2 ${
              isOwn ? 'text-white/80' : 'text-gray-600'
            }`}>
              {getMessageTypeIcon()}
              <span className="text-xs font-semibold capitalize">{message.messageType}</span>
            </div>
          )}

          {/* Message content */}
          <div className={isOwn ? 'text-white' : 'text-gray-800'}>
            {renderMessageContent()}
          </div>

          {/* Timestamp and status */}
          <div className={`flex items-center justify-end space-x-1 sm:space-x-2 mt-1 sm:mt-2 ${
            isOwn ? 'text-white/70' : 'text-gray-500'
          }`}>
            <span className="text-xs font-medium">{formatTime(message.timestamp)}</span>
            {getStatusIcon()}
          </div>
        </div>

        {/* Admin info for outgoing messages */}
        {isOwn && message.adminUserId && (
          <div className="text-xs text-gray-500 mt-1 sm:mt-2 text-right font-medium">
            Sent by {message.adminUserId.name || message.adminUserId.firstName}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
