import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-xl bg-gray-900/90 text-white px-3.5 py-2 text-xs font-medium shadow-xl backdrop-blur-md border border-gray-700 dark:bg-gray-800/95"
    >
      <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
      <span>Working Offline — All tools function 100% locally</span>
    </div>
  );
};
