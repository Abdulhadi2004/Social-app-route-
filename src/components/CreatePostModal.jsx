import { useState, useRef } from 'react';
import { createPost, updatePost } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Avatar';
import { getDisplayName } from '../utils/displayName';

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', icon: 'globe' },
  { value: 'following', label: 'Followers', icon: 'users' },
  { value: 'only_me', label: 'Only me', icon: 'lock' },
];

function GlobeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.54 15H17a2 2 0 0 0-2 2v4.54" />
      <path d="M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17" />
      <path d="M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function UsersSmallIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
      <path d="m21.854 2.147-10.94 10.939" />
    </svg>
  );
}

function VisibilityIcon({ type }) {
  if (type === 'users') return <UsersSmallIcon />;
  if (type === 'lock') return <LockIcon />;
  return <GlobeIcon />;
}

export function CreatePostModal({ post, onClose, onSuccess }) {
  const isEdit = !!post;
  const { user } = useAuth();
  const [body, setBody] = useState(post?.content || post?.body || '');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(post?.image || '');
  const [visibility, setVisibility] = useState('public');
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const displayName = getDisplayName(user);
  const currentVis = VISIBILITY_OPTIONS.find((v) => v.value === visibility) || VISIBILITY_OPTIONS[0];

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!body.trim() && !imageFile && !imagePreview) {
      setError('Please add some text or an image');
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        const payload = {};
        if (body.trim()) payload.content = body.trim();
        if (imagePreview && !imageFile) payload.image = imagePreview;
        await updatePost(post._id, payload);
      } else {
        const form = new FormData();
        if (body.trim()) form.append('body', body.trim());
        if (imageFile) form.append('image', imageFile);
        if (visibility && visibility !== 'public') form.append('privacy', visibility);
        await createPost(form);
      }
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0] || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          <div className="flex items-center gap-3 mb-1">
            <Avatar user={user} size="lg" />
            <div>
              <p className="text-sm font-bold text-slate-100">{displayName}</p>
              <div className="relative mt-0.5">
                <button
                  type="button"
                  onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 px-2.5 py-0.5 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-300 transition"
                >
                  <VisibilityIcon type={currentVis.icon} />
                  <span>{currentVis.label}</span>
                  <ChevronDownIcon />
                </button>
                {showVisibilityMenu && (
                  <div className="absolute top-7 left-0 z-10 bg-slate-800 border border-slate-600 rounded-lg shadow-lg py-1 min-w-[140px]">
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setVisibility(opt.value); setShowVisibilityMenu(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition ${
                          visibility === opt.value
                            ? 'text-cyan-400 bg-cyan-500/10'
                            : 'text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <VisibilityIcon type={opt.icon} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mt-3 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-3 w-full bg-transparent text-slate-200 placeholder-slate-500 text-sm resize-none outline-none min-h-[120px]"
              rows={5}
              placeholder={`What's on your mind, ${displayName}?`}
              autoFocus
            />

            {imagePreview && (
              <div className="mt-2 relative rounded-lg overflow-hidden border border-slate-600">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-60 object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-slate-900/80 text-slate-300 rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-500/80 transition"
                >
                  X
                </button>
              </div>
            )}

            <div className="mt-3 border-t border-slate-700" />

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition"
                >
                  <ImageIcon />
                  <span>Photo/video</span>
                </button>
              </div>
              <button
                type="submit"
                disabled={loading || (!body.trim() && !imageFile && !imagePreview)}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2 text-sm font-bold text-slate-900 transition hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Posting...' : isEdit ? 'Update' : 'Post'}
                {!loading && !isEdit && <SendIcon />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
