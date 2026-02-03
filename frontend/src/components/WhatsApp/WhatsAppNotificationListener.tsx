import React, { useEffect, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { toast } from 'react-hot-toast';
// import notificationSound from '../../assets/sounds/notification.mp3'; // You'll need to add a sound file

export const WhatsAppNotificationListener: React.FC = () => {
  const { socket } = useSocket();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Initialize audio (optional, if you have a sound file)
    // audioRef.current = new Audio('/sounds/notification.mp3');
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: any) => {
      const { message, conversation } = data;

      // Don't notify for own messages (outgoing)
      if (message.direction === 'outgoing') return;

      // 1. Play Sound
      // const audio = new Audio('/sounds/notification.mp3');
      // audio.play().catch(e => console.log('Audio play failed', e));

      // 2. Browser Notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(`New Message from ${conversation.customerName || conversation.phoneNumber}`, {
          body: message.message || (message.messageType === 'image' ? '📷 Image' : '📎 Attachment'),
          icon: '/logo192.png', // Ensure this path exists or use a valid one
          tag: 'whatsapp-message', // Prevents spamming, replaces old notification from same tag
        });

        notification.onclick = () => {
          window.focus();
          // Ideally navigate to the specific chat, e.g.:
          // history.push(`/admin/dashboard/whatsapp?phone=${conversation.phoneNumber}`);
        };
      }

      // 3. Update Tab Title
      const originalTitle = document.title;
      document.title = `(1) New Message! | ${originalTitle}`;

      // Reset title after 5 seconds or on focus
      setTimeout(() => {
        document.title = originalTitle.replace(/^\(\d+\) New Message! \| /, '');
      }, 5000);

      // 4. In-App Toast (Fallback)
      toast(`New message from ${conversation.customerName || conversation.phoneNumber}`, {
        icon: '💬',
        duration: 4000,
      });
    };

    socket.on('new_whatsapp_message', handleNewMessage);

    return () => {
      socket.off('new_whatsapp_message', handleNewMessage);
    };
  }, [socket]);

  // Debug UI (Only visible in development or for admins)
  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 p-4 bg-white/90 backdrop-blur shadow-lg rounded-xl border border-gray-200 text-xs">
      <div className="flex items-center gap-2">
         <div className={`w-2 h-2 rounded-full ${socket?.connected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
         <span className="font-medium text-gray-700">
           {socket?.connected ? 'Socket Connected' : 'Socket Disconnected'}
         </span>
      </div>
      <button
        onClick={() => {
          // Play sound
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(e => console.error('Audio play failed', e));

          // Trigger notification
          if ('Notification' in window && Notification.permission === 'granted') {
             new Notification('🔔 Test Notification', {
               body: 'This is a test message to verify permissions.',
               icon: '/logo192.png'
             });
          } else {
            toast('Notifications not granted', { icon: '⚠️' });
          }

          toast('Test Notification Triggered', { icon: '🔔' });
        }}
        className="px-3 py-1 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors"
      >
        Test Notification
      </button>
      <div className="text-gray-400 text-[10px]">
        ID: {socket?.id || 'No ID'}
      </div>
    </div>
  );
};
