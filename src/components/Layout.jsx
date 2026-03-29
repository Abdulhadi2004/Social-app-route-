import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Avatar';
import { getUnreadCount } from '../services/api';

function parseUnreadCount(data) {
  if (data?.success !== true || data?.data == null) return 0;
  const d = data.data;
  if (typeof d === 'number') return d;
  return d.count ?? d.unreadCount ?? d.unread_count ?? d.unread ?? 0;
}

export function Layout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = async () => {
    try {
      const { data } = await getUnreadCount();
      setUnreadCount(parseUnreadCount(data));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (location.pathname === '/notifications') fetchCount();
  }, [location.pathname]);

  useEffect(() => {
    const onNotificationUpdate = () => fetchCount();
    window.addEventListener('notifications-updated', onNotificationUpdate);
    return () => window.removeEventListener('notifications-updated', onNotificationUpdate);
  }, []);

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <nav className="border-b border-slate-700 bg-slate-800/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/home" className="text-xl font-bold text-cyan-400 hover:text-cyan-300">
            SocialHub
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/home"
              className="text-slate-300 hover:text-white transition"
            >
              Home
            </Link>
            <Link
              to="/people"
              className="text-slate-300 hover:text-white transition"
            >
              People
            </Link>
            <Link
              to="/bookmarks"
              className="text-slate-300 hover:text-white transition"
            >
              Bookmarks
            </Link>
            <Link
              to="/notifications"
              className="relative inline-flex items-center text-slate-300 hover:text-white transition"
            >
              Notifications
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            <Link
              to="/profile"
              className="text-slate-300 hover:text-white transition flex items-center gap-2"
            >
              <Avatar user={user} size="sm" />
              Profile
            </Link>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-red-600/80 text-sm transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
