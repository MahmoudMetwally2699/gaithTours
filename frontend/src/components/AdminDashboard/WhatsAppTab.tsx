import React from 'react';
import WhatsAppInbox from '../WhatsApp/WhatsAppInbox';

export const WhatsAppTab: React.FC = () => {
  return (
    <div
      className="h-full w-full overflow-hidden"
    >
      {/* WhatsApp Inbox Container - Full Page */}
      <div className="h-full w-full overflow-hidden">
        <WhatsAppInbox />
      </div>
    </div>
  );
};
