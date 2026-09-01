import api from "./api";

export const getGroups = () => api.get("/chat/groups");
export const createGroup = (payload) => api.post("/chat/groups", payload);
export const updateGroup = (groupId, payload) => api.patch(`/chat/groups/${groupId}`, payload);
export const deleteGroup = (groupId) => api.delete(`/chat/groups/${groupId}`);
export const getGroupMessages = (groupId) => api.get(`/chat/groups/${groupId}/messages`);
export const sendGroupMessage = (groupId, text, replyTo) => api.post(`/chat/groups/${groupId}/messages`, { text, replyTo });
export const getGroupInfo = (groupId) => api.get(`/chat/groups/${groupId}/info`);
export const addGroupMembers = (groupId, memberIds) => api.post(`/chat/groups/${groupId}/members`, { memberIds });
export const removeGroupMembers = (groupId, memberIds) => api.post(`/chat/groups/${groupId}/members/remove`, { memberIds });
export const leaveGroup = (groupId) => api.post(`/chat/groups/${groupId}/leave`);
export const deleteGroupMessage = (groupId, messageId) => api.delete(`/chat/groups/${groupId}/messages/${messageId}`);
export const reactGroupMessage = (groupId, messageId, emoji) => api.post(`/chat/groups/${groupId}/messages/${messageId}/react`, { emoji });
export const pinGroupMessage = (groupId, messageId) => api.post(`/chat/groups/${groupId}/pin`, { messageId });
export const getPinnedMessage = (groupId) => api.get(`/chat/groups/${groupId}/pinned`);
export const getAdmins = () => api.get("/chat/direct/admins");
export const getDirectChats = () => api.get("/chat/direct/list");
export const getDirectMessages = (userId) => api.get(`/chat/direct/${userId}/messages`);
export const sendDirectMessage = (receiverId, text, replyTo) => api.post("/chat/direct/messages", { receiverId, text, replyTo });
export const deleteDirectMessage = (messageId) => api.delete(`/chat/direct/messages/${messageId}`);
export const reactDirectMessage = (messageId, emoji) => api.post(`/chat/direct/messages/${messageId}/react`, { emoji });

export function extractApiError(error, fallback) {
  return error?.response?.data?.error?.message || error?.response?.data?.message || fallback;
}
