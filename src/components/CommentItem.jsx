import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  updateComment,
  deleteComment,
  getCommentReplies,
  createCommentReply,
  likeComment,
} from '../services/api';
import { Avatar } from './Avatar';
import { ImageLightbox } from './ImageLightbox';
import { getDisplayName } from '../utils/displayName';

export function CommentItem({ comment, postId, onUpdate, onDelete, onReplyCreated }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.content || comment.body || '');
  const [loading, setLoading] = useState(false);
  const [commentImageError, setCommentImageError] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);

  const author = comment.author ?? comment.user ?? comment.commentCreator ?? comment.creator ?? comment.createdBy;
  const authorObj = typeof author === 'object' && author !== null ? author : null;
  const authorIdRaw =
    comment.userId ?? comment.authorId ?? comment.creatorId
    ?? (authorObj ? (authorObj._id ?? authorObj.id ?? authorObj.user?._id ?? authorObj.user?.id) : (typeof author === 'string' ? author : null));
  const currentUserId = user?._id ?? user?.id;
  const isCurrentUserComment = currentUserId != null && authorIdRaw != null && String(authorIdRaw) === String(currentUserId);
  const authorForDisplay = isCurrentUserComment ? user : author;
  let authorName = getDisplayName(authorForDisplay);
  if (authorName === 'Unknown') authorName = getDisplayName(comment);
  const isOwner = isCurrentUserComment;
  const profileLink = isCurrentUserComment ? '/profile' : (authorIdRaw ? `/user/${authorIdRaw}` : null);
  const commentImageUrl = comment?.image ?? comment?.imageUrl;
  const showCommentImage = commentImageUrl && !commentImageError;
  const replyCount = comment.repliesCount ?? comment.replies?.length ?? replies.length;

  const loadReplies = async () => {
    setRepliesLoading(true);
    try {
      const { data } = await getCommentReplies(postId, comment._id, { limit: 20 });
      const list = Array.isArray(data?.data) ? data.data : data?.data?.replies ?? data?.data ?? [];
      setReplies(list);
    } catch {
      setReplies([]);
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleToggleReplies = () => {
    if (!showReplies && replies.length === 0) loadReplies();
    setShowReplies((s) => !s);
  };

  const handleReplySubmit = async (e) => {
    e?.preventDefault?.();
    if (!replyBody.trim()) return;
    setReplyLoading(true);
    try {
      await createCommentReply(postId, comment._id, { content: replyBody.trim() });
      setReplyBody('');
      loadReplies();
      onReplyCreated?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reply');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleLike = async () => {
    setLikeLoading(true);
    try {
      await likeComment(postId, comment._id);
      onUpdate?.();
    } catch {
      // ignore
    } finally {
      setLikeLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (editBody.trim() === (comment.content || comment.body || '').trim()) {
      setEditing(false);
      return;
    }
    setLoading(true);
    try {
      await updateComment(postId, comment._id, { content: editBody.trim() });
      setEditing(false);
      onUpdate?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this comment?')) return;
    setLoading(true);
    try {
      await deleteComment(postId, comment._id);
      onDelete?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-2 min-w-0">
          {profileLink ? (
            <Link to={profileLink} className="flex-shrink-0">
              <Avatar user={authorForDisplay} size="sm" />
            </Link>
          ) : (
            <Avatar user={authorForDisplay} size="sm" className="flex-shrink-0" />
          )}
          <div className="min-w-0">
            {profileLink ? (
              <Link to={profileLink} className="font-medium text-slate-200 text-sm hover:underline block">
                {authorName}
              </Link>
            ) : (
              <p className="font-medium text-slate-200 text-sm">{authorName}</p>
            )}
            {editing ? (
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-600 text-sm text-white"
                />
                <button
                  onClick={handleUpdate}
                  disabled={loading}
                  className="text-cyan-400 text-sm hover:underline disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="text-slate-400 text-sm hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <p className="text-slate-300 text-sm">{comment.content || comment.body}</p>
                {showCommentImage && (
                  <div className="flex justify-start mt-2">
                    <div
                      className="inline-block rounded-xl overflow-hidden border border-slate-600 cursor-pointer hover:border-cyan-500/50 transition"
                      onClick={() => setShowImageLightbox(true)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setShowImageLightbox(true)}
                    >
                      <img
                        src={commentImageUrl}
                        alt=""
                        className="block max-w-full max-h-[70vh] w-auto h-auto"
                        onError={() => setCommentImageError(true)}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {!editing && (
          <div className="flex gap-2 flex-shrink-0 items-center">
            <button
              type="button"
              onClick={handleLike}
              disabled={likeLoading}
              className="text-slate-400 hover:text-cyan-400 text-xs disabled:opacity-50"
            >
              Like {comment.likesCount > 0 ? `(${comment.likesCount})` : ''}
            </button>
            {isOwner && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="text-slate-400 hover:text-cyan-400 text-xs"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="text-slate-400 hover:text-red-400 text-xs disabled:opacity-50"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="mt-2 ml-10">
        <button
          type="button"
          onClick={handleToggleReplies}
          className="text-slate-400 hover:text-cyan-400 text-xs"
        >
          {showReplies ? 'Hide replies' : `Replies ${replyCount > 0 ? `(${replyCount})` : ''}`}
        </button>
        {showReplies && (
          <div className="mt-2 space-y-2">
            {user && (
              <form onSubmit={handleReplySubmit} className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm"
                />
                <button
                  type="submit"
                  disabled={replyLoading}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/30 disabled:opacity-50"
                >
                  Reply
                </button>
              </form>
            )}
            {repliesLoading ? (
              <p className="text-slate-500 text-xs">Loading replies...</p>
            ) : (
              replies.map((reply) => {
                const rAuthor = reply.author ?? reply.user ?? reply.commentCreator;
                const rAuthorObj = typeof rAuthor === 'object' && rAuthor !== null ? rAuthor : null;
                const rAuthorId = reply.userId ?? reply.authorId ?? reply.creatorId
                  ?? (rAuthorObj ? (rAuthorObj._id ?? rAuthorObj.id) : null);
                const rIsMe = currentUserId && rAuthorId && String(rAuthorId) === String(currentUserId);
                const rLink = rIsMe ? '/profile' : (rAuthorId ? `/user/${rAuthorId}` : null);
                return (
                  <div key={reply._id} className="flex gap-2 pl-2 border-l-2 border-slate-600">
                    {rLink ? (
                      <Link to={rLink} className="flex-shrink-0">
                        <Avatar user={rIsMe ? user : rAuthor} size="sm" />
                      </Link>
                    ) : (
                      <Avatar user={rAuthor} size="sm" />
                    )}
                    <div>
                      {rLink ? (
                        <Link to={rLink} className="text-slate-400 text-xs font-medium hover:underline block">
                          {getDisplayName(rIsMe ? user : rAuthor)}
                        </Link>
                      ) : (
                        <p className="text-slate-400 text-xs font-medium">
                          {getDisplayName(rAuthor)}
                        </p>
                      )}
                      <p className="text-slate-300 text-sm">{reply.content ?? reply.body}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
      {showImageLightbox && commentImageUrl && (
        <ImageLightbox src={commentImageUrl} onClose={() => setShowImageLightbox(false)} />
      )}
    </div>
  );
}
