import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { deletePost, likePost, bookmarkPost, updatePost } from '../services/api';
import { CreatePostModal } from './CreatePostModal';
import { ImageLightbox } from './ImageLightbox';
import { Avatar } from './Avatar';
import { getDisplayName } from '../utils/displayName';
import { useState, useRef, useEffect } from 'react';

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(dateStr).toLocaleDateString();
}

const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21.54 15H17a2 2 0 0 0-2 2v4.54" /><path d="M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17" /><path d="M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05" /><circle cx="12" cy="12" r="10" />
  </svg>
);
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', Icon: GlobeIcon },
  { value: 'following', label: 'Followers', Icon: UsersIcon },
  { value: 'only_me', label: 'Only me', Icon: LockIcon },
];

function normalizeVisibility(v) {
  const lower = typeof v === 'string' ? v.toLowerCase() : 'public';
  if (lower === 'following' || lower === 'followers' || lower === 'friends') return 'following';
  if (lower === 'private' || lower === 'only me' || lower === 'onlyme' || lower === 'only_me') return 'only_me';
  return 'public';
}

function VisibilityBadge({ post, editable, onUpdate }) {
  const raw = post?.visibility ?? post?.privacy ?? 'public';
  const current = normalizeVisibility(raw);
  const opt = VISIBILITY_OPTIONS.find((o) => o.value === current) || VISIBILITY_OPTIONS[0];
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const handleChange = async (newVal) => {
    setOpen(false);
    if (newVal === current) return;
    setSaving(true);
    try {
      await updatePost(post._id, { privacy: newVal });
      onUpdate?.();
    } catch {}
    setSaving(false);
  };

  if (!editable) {
    return <span className="inline-flex items-center gap-1"><opt.Icon />{opt.label}</span>;
  }

  return (
    <span className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={saving}
        className="inline-flex items-center gap-1 hover:text-cyan-400 transition cursor-pointer disabled:opacity-50"
      >
        <opt.Icon />{saving ? '...' : opt.label}
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border border-slate-600 bg-slate-800 py-1 shadow-lg">
          {VISIBILITY_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => handleChange(o.value)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition ${
                current === o.value ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <o.Icon />{o.label}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

function isPostOwnerByCurrentUser(post, currentUser) {
  if (!currentUser) return false;
  const uid = currentUser._id ?? currentUser.id;
  if (!uid) return false;
  const author = post?.author ?? post?.user ?? post?.creator;
  if (typeof author === 'object' && author !== null) {
    const aid = author._id ?? author.id;
    return aid != null && String(aid) === String(uid);
  }
  const authorId = post?.authorId ?? post?.creator;
  if (authorId != null) return String(authorId) === String(uid);
  return false;
}

export function PostCard({ post, onUpdate, onDelete }) {
  const { user } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [postImageError, setPostImageError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const isOwner = isPostOwnerByCurrentUser(post, user);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleDelete = async () => {
    setMenuOpen(false);
    if (!confirm('Are you sure you want to delete this post?')) return;
    setDeleting(true);
    try {
      await deletePost(post._id);
      onDelete?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handleLike = async () => {
    try {
      await likePost(post._id);
      onUpdate?.();
    } catch {}
  };

  const handleBookmark = async () => {
    setMenuOpen(false);
    try {
      await bookmarkPost(post._id);
      onUpdate?.();
    } catch {}
  };

  const originalPost = post?.sharedPost ?? post?.originalPost ?? post?.post ?? post?.shared;
  const isShared = originalPost && typeof originalPost === 'object';
  const displayPost = isShared ? originalPost : post;

  const author = post?.author ?? post?.user ?? post?.creator;
  const authorObj = typeof author === 'object' && author !== null ? author : null;
  const authorIdRaw =
    post?.creatorId ?? post?.authorId ?? post?.userId
    ?? (authorObj ? (authorObj._id ?? authorObj.id ?? authorObj.user?._id ?? authorObj.user?.id) : (typeof author === 'string' ? author : null));
  const currentUserId = user?._id ?? user?.id;
  const isCurrentUserPost = currentUserId != null && authorIdRaw != null && String(authorIdRaw) === String(currentUserId);
  const authorForDisplay = isCurrentUserPost ? user : author;
  let authorName = getDisplayName(authorForDisplay);
  if (authorName === 'Unknown') authorName = getDisplayName(post);
  const postImageUrl = displayPost?.image ?? displayPost?.imageUrl ?? post?.image ?? post?.imageUrl;
  const showPostImage = postImageUrl && !postImageError;
  const shareComment = (post?.content || post?.body || '').trim();
  const originalAuthor = displayPost?.author ?? displayPost?.user ?? displayPost?.creator;
  const originalAuthorName = getDisplayName(originalAuthor);
  const originalPostId = displayPost?._id ?? displayPost?.id;
  const originalAuthorId = (() => {
    const oa = originalAuthor;
    if (typeof oa === 'object' && oa != null) return oa._id ?? oa.id ?? oa.user?._id ?? oa.user?.id;
    if (typeof oa === 'string') return oa;
    return displayPost?.creatorId ?? displayPost?.authorId ?? displayPost?.userId;
  })();

  return (
    <article className="overflow-visible rounded-xl border border-slate-700 bg-slate-800/50 shadow-sm w-full shrink-0">
      <div className="p-4">
        <div className="flex items-center gap-3">
          {(authorIdRaw || isCurrentUserPost) ? (
            <Link to={isCurrentUserPost ? '/profile' : `/user/${authorIdRaw}`} className="shrink-0">
              <Avatar user={authorForDisplay} size="md" />
            </Link>
          ) : (
            <div className="shrink-0"><Avatar user={authorForDisplay} size="md" /></div>
          )}
          <div className="min-w-0 flex-1">
            {(authorIdRaw || isCurrentUserPost) ? (
              <Link
                to={isCurrentUserPost ? '/profile' : `/user/${authorIdRaw}`}
                className="truncate text-sm font-bold text-slate-100 hover:underline block"
              >
                {authorName}
              </Link>
            ) : (
              <span className="truncate text-sm font-bold text-slate-100 block">{authorName}</span>
            )}
            <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
              {authorForDisplay?.username && <span>@{authorForDisplay.username} ·</span>}
              <span>{relativeTime(post.createdAt)}</span>
              <span className="mx-0.5">·</span>
              <VisibilityBadge post={post} editable={isOwner} onUpdate={onUpdate} />
            </div>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-xl border border-slate-600 bg-slate-800 py-1 shadow-lg">
                <button
                  type="button"
                  onClick={handleBookmark}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition text-left"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z" />
                  </svg>
                  {post.bookmarked ? 'Unsave post' : 'Save post'}
                </button>
                {isOwner && (
                  <>
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); setShowEditModal(true); }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition text-left"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                      </svg>
                      Edit post
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-slate-700/50 transition text-left disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                      Delete post
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {post.bookmarked && (
          <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold text-cyan-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z" />
            </svg>
            Saved
          </div>
        )}

        <div className="mt-3">
          {isShared && shareComment && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{shareComment}</p>
          )}
          {!isShared && (post.content || post.body) && (
            <Link to={`/post/${post._id}`} className="block">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300 hover:text-slate-200 transition">{post.content || post.body}</p>
            </Link>
          )}
          {isShared && (
            <div className="mt-3 rounded-xl border border-slate-600 bg-slate-800/80 overflow-hidden">
              <div className="p-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {originalAuthorId ? (
                    <Link to={`/user/${originalAuthorId}`} className="shrink-0">
                      <Avatar user={originalAuthor} size="sm" />
                    </Link>
                  ) : (
                    <Avatar user={originalAuthor} size="sm" />
                  )}
                  <div>
                    {originalAuthorId ? (
                      <Link to={`/user/${originalAuthorId}`} className="font-medium text-slate-200 text-sm hover:underline block">
                        {originalAuthorName}
                      </Link>
                    ) : (
                      <p className="font-medium text-slate-200 text-sm">{originalAuthorName}</p>
                    )}
                    <p className="text-xs text-slate-500">Original post</p>
                  </div>
                </div>
                <Link to={originalPostId ? `/post/${originalPostId}` : `/post/${post._id}`} className="text-cyan-400 text-xs hover:underline flex-shrink-0">Original Post ↗</Link>
              </div>
              {(displayPost.content || displayPost.body) && (
                <p className="px-3 pb-2 text-slate-300 text-sm whitespace-pre-wrap">{displayPost.content || displayPost.body}</p>
              )}
              {showPostImage && (
                <div className="max-h-[620px] overflow-hidden border-t border-slate-600">
                  <button type="button" className="group relative block w-full cursor-zoom-in" onClick={(e) => { e.preventDefault(); setShowImageLightbox(true); }}>
                    <img src={postImageUrl} alt="" className="w-full object-cover" onError={() => setPostImageError(true)} />
                    <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!isShared && showPostImage && (
        <div className="max-h-[620px] overflow-hidden border-y border-slate-700">
          <button type="button" className="group relative block w-full cursor-zoom-in" onClick={(e) => { e.preventDefault(); setShowImageLightbox(true); }}>
            <img src={postImageUrl} alt="" className="w-full object-cover" onError={() => setPostImageError(true)} />
            <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
          </button>
        </div>
      )}

      <div className="px-4 pb-2 pt-3 text-sm text-slate-500">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /><path d="M7 10v12" />
              </svg>
            </span>
            <Link to={`/post/${post._id}`} className="font-semibold hover:text-cyan-400 hover:underline transition cursor-pointer">
              {post.likesCount ?? 0} likes
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:gap-3 sm:text-sm">
            <span className="inline-flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m2 9 3-3 3 3" /><path d="M13 18H7a2 2 0 0 1-2-2V6" /><path d="m22 15-3 3-3-3" /><path d="M11 6h6a2 2 0 0 1 2 2v10" />
              </svg>
              {post.sharesCount ?? 0} shares
            </span>
            <span>{post.commentsCount ?? 0} comments</span>
            <Link to={`/post/${post._id}`} className="rounded-md px-2 py-1 text-xs font-bold text-cyan-400 hover:bg-cyan-500/10 transition">View details</Link>
          </div>
        </div>
      </div>

      <div className="mx-4 border-t border-slate-700" />
      <div className="grid grid-cols-3 gap-1 p-1">
        <button onClick={handleLike} className={`cursor-pointer flex items-center justify-center gap-1.5 rounded-md p-2 text-xs font-semibold sm:gap-2 sm:text-sm transition-colors ${post.liked ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-400 hover:bg-slate-700/50'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /><path d="M7 10v12" />
          </svg>
          <span>Like</span>
        </button>
        <Link to={`/post/${post._id}`} className="cursor-pointer flex items-center justify-center gap-1.5 rounded-md p-2 text-xs font-semibold sm:gap-2 sm:text-sm text-slate-400 hover:bg-slate-700/50 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
          </svg>
          <span>Comment</span>
        </Link>
        <Link to={`/post/${post._id}`} className="cursor-pointer flex items-center justify-center gap-1.5 rounded-md p-2 text-xs font-semibold sm:gap-2 sm:text-sm text-slate-400 hover:bg-slate-700/50 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
          </svg>
          <span>Share</span>
        </Link>
      </div>

      {showImageLightbox && postImageUrl && (
        <ImageLightbox src={postImageUrl} onClose={() => setShowImageLightbox(false)} />
      )}
      {showEditModal && (
        <CreatePostModal
          post={post}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            onUpdate?.();
          }}
        />
      )}
    </article>
  );
}
