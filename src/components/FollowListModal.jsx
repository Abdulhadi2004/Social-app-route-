import { Link } from 'react-router-dom';
import { Avatar } from './Avatar';
import { getDisplayName } from '../utils/displayName';

export function FollowListModal({ title, users = [], onClose }) {
  const list = Array.isArray(users) ? users : [];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-slate-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-xl leading-none px-2"
          >
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {list.length === 0 ? (
            <p className="text-slate-400 text-center py-8 text-sm">No users to show.</p>
          ) : (
            <div className="space-y-2">
              {list.map((u) => {
                const userObj = u?.user ?? u;
                const id = userObj?._id ?? userObj?.id;
                return (
                  <Link
                    key={id ?? Math.random()}
                    to={id ? `/user/${id}` : '#'}
                    onClick={onClose}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition"
                  >
                    <Avatar user={userObj} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-100 truncate">
                        {getDisplayName(userObj)}
                      </p>
                      {userObj?.username && (
                        <p className="text-xs text-slate-500 truncate">@{userObj.username}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
