import { useState } from 'react';
import { createComment } from '../services/api';

export function CommentForm({ postId, onSuccess }) {
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setError('');
    setLoading(true);
    const payload = { content: body.trim() };
    try {
      const res = await createComment(postId, payload);
      const createdComment = res?.data?.data;
      setBody('');
      onSuccess?.(createdComment);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0] || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="flex-1 px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        placeholder="Write a comment..."
      />
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-medium transition disabled:opacity-50"
      >
        {loading ? '...' : 'Comment'}
      </button>
      {error && <span className="text-red-400 text-sm self-center">{error}</span>}
    </form>
  );
}
