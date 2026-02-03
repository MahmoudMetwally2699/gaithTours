import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
// import notificationSound from '../../assets/sounds/notification.mp3'; // You'll need to add a sound file

export const WhatsAppNotificationListener: React.FC = () => {
  const { socket } = useSocket();
  const { user, isAuthenticated } = useAuth();
  // Pre-initialize AudioContext on mount and unlock on any user interaction
  const audioContextRef = useRef<AudioContext | null>(null);

  // Helper to play a clean beep using Web Audio API (No files needed)
  const playNotificationSound = () => {
    try {
      // Ensure context is created and resumed
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        audioContextRef.current = new AudioContextClass();
      }

      const ctx = audioContextRef.current;

      // Resume if suspended (due to browser policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error('Audio play failed', e);
    }
  };

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Pre-initialize AudioContext on any user interaction to unlock audio
    const unlockAudio = () => {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
        }
      }
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };

    // Listen for any user interaction to unlock audio
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const [apiStatus, setApiStatus] = useState<string>('Checking...');
  const [socketError, setSocketError] = useState<string>('');

  useEffect(() => {
    // Check API Health
    const checkApi = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/health`);
        if (response.ok) {
          setApiStatus('Online');
        } else {
          setApiStatus(`Error: ${response.status}`);
        }
      } catch (err: any) {
        setApiStatus('Unreachable');
        console.error('API Check Failed', err);
      }
    };

    checkApi();
    const interval = setInterval(checkApi, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('connect_error', (err: any) => {
      setSocketError(err.message);
    });

    socket.on('connect', () => {
      setSocketError('');
    });

    return () => {
      socket.off('connect_error');
      socket.off('connect');
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: any) => {
      const { message, conversation } = data;

      // Don't notify for own messages (outgoing)
      if (message.direction === 'outgoing') return;

      // 1. Play Sound
      playNotificationSound();

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
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 p-4 bg-white/90 backdrop-blur shadow-lg rounded-xl border border-gray-200 text-xs font-mono">
      <div className="flex items-center gap-2">
         <div className={`w-2 h-2 rounded-full ${socket?.connected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
         <span className="font-medium text-gray-700">
           Socket: {socket ? (socket.connected ? 'Connected' : 'Disconnected') : 'NULL (Not Init)'}
         </span>
      </div>
      <div className="flex items-center gap-2">
         <div className={`w-2 h-2 rounded-full ${apiStatus === 'Online' ? 'bg-green-500' : 'bg-red-500'}`} />
         <span className="font-medium text-gray-700">
           API: {apiStatus}
         </span>
      </div>

      {/* Auth Debug Info */}
      <div className="border-t pt-2 mt-1">
        <div>Auth: {isAuthenticated ? 'Yes' : 'No'}</div>
        <div>Role: {user?.role || 'None'}</div>
        <div>User: {user?.name || 'None'}</div>
      </div>

      {socketError && (
        <div className="text-red-500 max-w-[200px] break-words">
          Err: {socketError}
        </div>
      )}
      <button
        onClick={() => {
          // Play sound
          playNotificationSound();

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
        className="px-3 py-1 mt-1 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors"
      >
        Test Notification
      </button>
      <div className="text-gray-400 text-[10px]">
        ID: {socket?.id || 'No ID'}
      </div>
    </div>
  );
};
