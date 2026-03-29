import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/api';
import { getDisplayName } from '../utils/displayName';

const FILTERS = [
  { value: null, label: 'All' },
  { value: true, label: 'Unread' },
  { value: false, label: 'Read' },
];

const LIMIT = 50;

function isNotificationRead(n) {
  if (n == null) return true;
  if (n.isRead === true || n.read === true) return true;
  if (n.isRead === false || n.read === false) return false;
  return false;
}

function getActorName(n) {
  const actor = n.actor ?? n.user ?? n.from;
  if (!actor) return 'Someone';
  return actor.name ?? getDisplayName(actor);
}

function getNotificationContent(n) {
  const msg = n.message ?? n.text ?? n.body ?? n.content;
  if (msg) return msg;

  const actorName = getActorName(n);
  const type = (n.type ?? n.kind ?? '').toLowerCase();
  const entityContent = n.entity?.content ?? n.entity?.body ?? n.entity?.text ?? '';

  switch (type) {
    case 'like_post':
    case 'like':
    case 'liked':
      return entityContent
        ? `${actorName} liked your post: "${entityContent.slice(0, 60)}${entityContent.length > 60 ? '...' : ''}"`
        : `${actorName} liked your post`;
    case 'comment':
    case 'comment_post':
      return entityContent
        ? `${actorName} commented on your post: "${entityContent.slice(0, 80)}${entityContent.length > 80 ? '...' : ''}"`
        : `${actorName} commented on your post`;
    case 'like_comment':
      return entityContent
        ? `${actorName} liked your comment: "${entityContent.slice(0, 60)}${entityContent.length > 60 ? '...' : ''}"`
        : `${actorName} liked your comment`;
    case 'follow':
    case 'follow_user':
      return `${actorName} started following you`;
    case 'share':
    case 'share_post':
      return `${actorName} shared your post`;
    default:
      return `${actorName} interacted with your content`;
  }
}

function getNotificationLink(n) {
  if (n.entityType === 'post' || n.entityType === 'comment') {
    const postId = n.entityId ?? n.entity?._id ?? n.entity?.id ?? n.post?._id ?? n.postId;
    if (postId) return `/post/${postId}`;
  }
  const actorId = n.actor?._id ?? n.actor?.id ?? n.user?._id;
  if (actorId) return `/user/${actorId}`;
  return null;
}

export function NotificationsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadFilter, setUnreadFilter] = useState(null);

  const load = async () => {
    try {
      setError('');
      const params = { limit: LIMIT, page: 1 };
      const { data } = await getNotifications(params);
      if (data?.success && data?.data) {
        const items = Array.isArray(data.data) ? data.data : data.data?.notifications ?? data.data ?? [];
        setList(items);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, []);

  const filteredList =
    unreadFilter === null
      ? list
      : list.filter((n) => (unreadFilter ? !isNotificationRead(n) : isNotificationRead(n)));

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      window.dispatchEvent(new Event('notifications-updated'));
      load();
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      window.dispatchEvent(new Event('notifications-updated'));
      load();
    } catch {}
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Notifications</h1>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={String(f.value)}
              type="button"
              onClick={() => setUnreadFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                unreadFilter === f.value
                  ? 'bg-cyan-500 text-slate-900'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {list.some((n) => !isNotificationRead(n)) && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm"
          >
            Mark all read
          </button>
        )}
      </div>
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-500/20 text-red-400">{error}</div>
      )}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500" />
        </div>
      ) : list.length === 0 ? (
        <p className="text-slate-400 text-center py-8">No notifications.</p>
      ) : filteredList.length === 0 ? (
        <p className="text-slate-400 text-center py-8">
          {unreadFilter === true ? 'No unread notifications.' : unreadFilter === false ? 'No read notifications.' : 'No notifications.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {filteredList.map((n) => {
            const link = getNotificationLink(n);
            const content = getNotificationContent(n);
            const isRead = isNotificationRead(n);
            const cardClass = `p-3 rounded-lg border flex justify-between items-start gap-3 transition ${
              isRead ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-800/60 border-cyan-500/30'
            } ${link ? 'hover:bg-slate-700/50 cursor-pointer' : ''}`;
            const actor = n.actor ?? n.user ?? n.from;
            const actorPhoto = actor?.photo ?? actor?.profileImage ?? actor?.avatar;
            const inner = (
              <>
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {actorPhoto && (
                    <img src={actorPhoto} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-200 text-sm">{content}</p>
                    {n.createdAt && (
                      <p className="text-slate-500 text-xs mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                {!isNotificationRead(n) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMarkRead(n._id ?? n.id);
                    }}
                    className="text-cyan-400 text-xs hover:underline shrink-0"
                  >
                    Mark read
                  </button>
                )}
              </>
            );
            return (
              <li key={n._id ?? n.id}>
                {link ? (
                  <Link to={link} className={`block ${cardClass}`}>
                    {inner}
                  </Link>
                ) : (
                  <div className={cardClass}>{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Layout>
  );
}
