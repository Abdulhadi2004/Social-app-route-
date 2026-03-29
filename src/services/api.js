import axios from 'axios';

// Route Academy Linked Posts API — https://documenter.getpostman.com/view/5709532/2sBXcBnNAq
// Spec (Auth = Bearer token unless noted):
//   Users: POST signup, POST signin (no auth), PATCH change-password, PUT upload-photo, GET profile-data, GET suggestions?page=&limit=
//   Posts: GET /posts, GET /posts/feed?only=&page=&limit=, POST/PUT /posts, PUT /posts/:id/like, GET /posts/:id/likes?page=&limit=, PUT bookmark, POST share
//   Comments: GET/POST /posts/:id/comments?page=&limit=, GET/POST replies, PUT/DELETE comment, PUT comment like
//   Notifications: GET ?page=&limit=, GET unread-count, PATCH :id/read, PATCH read-all
// Extra (used by UI, not in spec snippet): getPost, deletePost, getBookmarks, getUserProfile, followUser, getUserPosts, getUsers/getUserById
export const BASE_URL = 'https://route-posts.routemisr.com';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 - clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const signUp = (data) => api.post('/users/signup', data);
export const signIn = (data) => api.post('/users/signin', data);
export const changePassword = (data) => api.patch('/users/change-password', data);
export const getProfile = () => api.get('/users/profile-data');
export const getBookmarks = (params = {}) => api.get('/users/bookmarks', { params });
export const getSuggestions = (params = {}) => api.get('/users/suggestions', { params });
export const getUsers = (params = {}) => api.get('/users', { params });
export const getUsersList = (params = {}) => api.get('/users/list', { params });
export const getUserById = (userId) => api.get(`/users/${userId}`);
export const getUserProfile = (userId) => api.get(`/users/${userId}/profile`);
export const followUser = (userId) => api.put(`/users/${userId}/follow`);
export const getUserPosts = (userId, params = {}) => api.get(`/users/${userId}/posts`, { params });
export const uploadPhoto = (formData) =>
  api.put('/users/upload-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const uploadCover = (formData) =>
  api.put('/users/upload-cover', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
// Delete account: not in route-posts API docs; add and use when backend supports it:
// export const deleteAccount = () => api.delete('/users/me');

// Posts
export const getPosts = (params = {}) => api.get('/posts', { params });
export const getFeed = (params = {}) => api.get('/posts/feed', { params });
export const getPost = (postId) => api.get(`/posts/${postId}`);
export const createPost = (data) => {
  if (data instanceof FormData) {
    return api.post('/posts', data, { headers: { 'Content-Type': 'multipart/form-data' } });
  }
  return api.post('/posts', data);
};
export const updatePost = (postId, data) => api.put(`/posts/${postId}`, data);
export const deletePost = (postId) => api.delete(`/posts/${postId}`);
export const likePost = (postId) => api.put(`/posts/${postId}/like`);
export const bookmarkPost = (postId) => api.put(`/posts/${postId}/bookmark`);
export const getPostLikes = (postId, params = {}) => api.get(`/posts/${postId}/likes`, { params });
export const sharePost = (postId, data) => api.post(`/posts/${postId}/share`, data);

// Comments
export const getComments = (postId, params = {}) =>
  api.get(`/posts/${postId}/comments`, { params });
export const createComment = (postId, data) => {
  const form = new FormData();
  if (data.content != null) form.append('content', String(data.content));
  if (data.image != null) form.append('image', data.image);
  return api.post(`/posts/${postId}/comments`, form);
};
export const updateComment = (postId, commentId, data) =>
  api.put(`/posts/${postId}/comments/${commentId}`, data);
export const deleteComment = (postId, commentId) =>
  api.delete(`/posts/${postId}/comments/${commentId}`);
export const getCommentReplies = (postId, commentId, params = {}) =>
  api.get(`/posts/${postId}/comments/${commentId}/replies`, { params });
export const createCommentReply = (postId, commentId, data) =>
  api.post(`/posts/${postId}/comments/${commentId}/replies`, data);
export const likeComment = (postId, commentId) =>
  api.put(`/posts/${postId}/comments/${commentId}/like`);

// Notifications (same logic as demo/API)
export const getNotifications = (params = {}) =>
  api.get('/notifications', { params });
export const getUnreadCount = () => api.get('/notifications/unread-count');
export const markNotificationRead = (id) =>
  api.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () =>
  api.patch('/notifications/read-all');

export default api;
