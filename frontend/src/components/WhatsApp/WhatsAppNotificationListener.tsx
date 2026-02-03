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

  // Helper to play disconnect alert sound (lower tone, different pattern)
  const playDisconnectSound = () => {
    try {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        audioContextRef.current = new AudioContextClass();
      }

      const ctx = audioContextRef.current;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Play two descending tones to indicate disconnect
      const playTone = (startTime: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, startTime + 0.2);

        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

        osc.start(startTime);
        osc.stop(startTime + 0.3);
      };

      playTone(ctx.currentTime, 600);
      playTone(ctx.currentTime + 0.35, 400);
    } catch (e) {
      console.error('Disconnect sound failed', e);
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

  useEffect(() => {
    if (!socket) return;

    const handleDisconnect = () => {
      playDisconnectSound();
      toast.error('Socket disconnected! Trying to reconnect...', {
        duration: 5000,
        icon: '🔌',
      });
    };

    const handleReconnect = () => {
      toast.success('Socket reconnected!', {
        duration: 3000,
        icon: '✅',
      });
    };

    socket.on('disconnect', handleDisconnect);
    socket.on('connect', handleReconnect);

    return () => {
      socket.off('disconnect', handleDisconnect);
      socket.off('connect', handleReconnect);
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
          icon: '/logo192.png',
          tag: 'whatsapp-message',
        });

        notification.onclick = () => {
          window.focus();
        };
      }

      // 3. Update Tab Title
      const originalTitle = document.title;
      document.title = `(1) New Message! | ${originalTitle}`;

      // Reset title after 5 seconds
      setTimeout(() => {
        document.title = originalTitle.replace(/^\(\d+\) New Message! \| /, '');
      }, 5000);

      // 4. In-App Toast
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

  // This component doesn't render any visible UI
  return null;
};
