import React, { useEffect, useState } from 'react';
import { notificationApi } from '../services/api';
import * as mockDb from '../services/mockDb';
import { Bell, Check, Calendar, CheckSquare, MessageSquare, AlertCircle } from 'lucide-react';

interface NotificationDropdownProps {
  userId: number;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ userId }) => {
  const [notifications, setNotifications] = useState<mockDb.Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await notificationApi.listNotifications(userId);
      setNotifications(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 10 seconds for dynamic live updates
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead(userId);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: mockDb.Notification['type']) => {
    switch (type) {
      case 'scheduled':
        return <Calendar className="h-4 w-4 text-brand-400" />;
      case 'completed':
        return <CheckSquare className="h-4 w-4 text-emerald-400" />;
      case 'feedback':
        return <MessageSquare className="h-4 w-4 text-purple-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-amber-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 text-dark-400 hover:bg-dark-800 hover:text-white transition-colors duration-200"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl glass p-4 shadow-2xl ring-1 ring-black/5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="font-semibold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                  <Check className="mr-1 h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>

            <div className="mt-2 max-h-64 overflow-y-auto space-y-2 no-scrollbar">
              {notifications.length === 0 ? (
                <p className="py-8 text-center text-sm text-dark-500">No notifications yet.</p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors duration-200 ${
                      notif.read ? 'hover:bg-white/5' : 'bg-brand-500/5 hover:bg-brand-500/10'
                    }`}
                  >
                    <div className="mt-1 rounded-full bg-white/5 p-1">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-semibold truncate ${notif.read ? 'text-white/80' : 'text-white'}`}>
                          {notif.title}
                        </p>
                        {!notif.read && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                      </div>
                      <p className="mt-0.5 text-xs text-dark-400 line-clamp-2">
                        {notif.message}
                      </p>
                      <span className="mt-1 block text-[10px] text-dark-500">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
