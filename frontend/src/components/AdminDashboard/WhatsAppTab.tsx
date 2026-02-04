import React from 'react';
import { motion } from 'framer-motion';
import WhatsAppInbox from '../WhatsApp/WhatsAppInbox';

export const WhatsAppTab: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="h-full w-full overflow-hidden"
    >
      {/* WhatsApp Inbox Container - Full Page */}
      <div className="h-full w-full overflow-hidden">
        <WhatsAppInbox />
      </div>
    </motion.div>
  );
};
