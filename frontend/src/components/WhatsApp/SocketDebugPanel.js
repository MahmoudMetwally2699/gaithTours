import React, { useState } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { whatsappService } from '../../services/whatsappService';

const SocketDebugPanel = () => {
  const { socket, isConnected, connectionAttempts } = useSocket();
  const [debugMessages, setDebugMessages] = useState([]);
  const [showDebug, setShowDebug] = useState(false);

  const addDebugMessage = (message, type = 'info') => {
    const newMessage = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setDebugMessages(prev => [newMessage, ...prev.slice(0, 49)]); // Keep last 50 messages
  };

  const testSocketEvent = async (eventType) => {
    try {
      addDebugMessage(`Testing ${eventType} event...`, 'info');

      const response = await whatsappService.testSocket(eventType);

      if (response.success) {
        addDebugMessage(`✅ ${eventType} test event sent successfully`, 'success');
      } else {
        addDebugMessage(`❌ Failed to send ${eventType} test event`, 'error');
      }
    } catch (error) {
      addDebugMessage(`❌ Error testing ${eventType}: ${error.message}`, 'error');
    }
  };

  const clearDebugMessages = () => {
    setDebugMessages([]);
  };

  const getConnectionStatus = () => {
    if (isConnected) return 'Connected';
    if (connectionAttempts > 0) return `Reconnecting (${connectionAttempts})`;
    return 'Disconnected';
  };

  const getConnectionColor = () => {
    if (isConnected) return 'text-green-600';
    if (connectionAttempts > 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!showDebug) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowDebug(true)}
          className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg hover:bg-blue-700"
        >
          Debug Socket
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-96 max-h-96 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Socket Debug Panel</h3>
        <button
          onClick={() => setShowDebug(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {/* Connection Status */}
      <div className="mb-3 p-2 bg-gray-50 rounded">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Status:</span>
          <span className={`font-medium ${getConnectionColor()}`}>
            {getConnectionStatus()}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Socket ID:</span>
          <span className="text-gray-800 text-xs font-mono">
            {socket?.id || 'N/A'}
          </span>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="mb-3">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Test Events:</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => testSocketEvent('new_whatsapp_message')}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            disabled={!isConnected}
          >
            New Message
          </button>
          <button
            onClick={() => testSocketEvent('whatsapp_reply_sent')}
            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
            disabled={!isConnected}
          >
            Reply Sent
          </button>
          <button
            onClick={() => testSocketEvent('whatsapp_message_status_update')}
            className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
            disabled={!isConnected}
          >
            Status Update
          </button>
          <button
            onClick={clearDebugMessages}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Clear Log
          </button>
        </div>
      </div>

      {/* Debug Messages */}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        <h4 className="text-xs font-medium text-gray-700">Debug Log:</h4>
        {debugMessages.length === 0 ? (
          <p className="text-xs text-gray-500">No debug messages</p>
        ) : (
          debugMessages.map((msg) => (
            <div
              key={msg.id}
              className={`text-xs p-2 rounded ${
                msg.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : msg.type === 'error'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-blue-50 text-blue-700'
              }`}
            >
              <span className="text-gray-500 mr-2">{msg.timestamp}</span>
              {msg.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SocketDebugPanel;
