/* eslint-disable */
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import useAuthStore from "../../stores/auth.store";
import { getGroups, createGroup, updateGroup, deleteGroup, getGroupMessages, sendGroupMessage, getGroupInfo, addGroupMembers, removeGroupMembers, leaveGroup, deleteGroupMessage, reactGroupMessage, pinGroupMessage, getPinnedMessage, getAdmins, getDirectChats, getDirectMessages, sendDirectMessage, deleteDirectMessage, reactDirectMessage, extractApiError } from "../../lib/chat";
import { getSocietyDirectory } from "../../lib/directory";
import api, { getAccessToken, getSocketUrl } from "../../lib/api";
import { hasPermission } from "../../lib/permissions";

const EMOJIS = ["😀","😃","😄","😁","😆","😅","😂","🤣","🥲","🥹","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🥸","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😮‍💨","😤","😠","😡","🤬","😳","🥵","🥶","😶‍🌫️","😱","😨","😰","😥","😓","🤗","🤔","🫣","🤭","🫢","🫡","🤫","🫠","🤥","😶","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","😵‍💫","🤐","🥴","😷","🤒","🤕","🤢","🤮","🥴","🤧","😴","👍","👎","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👏","🙌","🫶","🙏","💪","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💝","💘","😺","😸","😹","🙏","🔥","⭐","🎉","✅","❌","💯"];

function EmojiPicker({ onSelect, onClose }) {
  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 max-h-48 overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-label-sm font-semibold text-on-surface">Emojis</p>
        <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-surface-container-high"><span className="material-symbols-outlined text-[18px]">close</span></button>
      </div>
      <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
        {EMOJIS.map((e, i) => (
          <button key={i} type="button" onClick={() => onSelect(e)} className="flex h-9 w-9 items-center justify-center rounded-lg text-[22px] hover:bg-surface-container-high active:bg-surface-container-highest">
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function formatListTime(date) {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  if (diff < 24 * 60 * 60 * 1000 && d.getDate() === now.getDate()) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  if (diff < 7 * 24 * 60 * 60 * 1000) return d.toLocaleDateString("en-IN", { weekday: "short" });
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function ChatPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);
  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canManageChat = hasPermission(membership?.role, "manage_amenities", permissionsQuery.data);
  const isAdmin = canManageChat;
  const queryClient = useQueryClient();

  const [tab, setTab] = useState("groups"); // groups | direct
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedAdminChat, setSelectedAdminChat] = useState(null);
  const [newText, setNewText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [reactionPicker, setReactionPicker] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingSocketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const groupsQuery = useQuery({
    queryKey: ["chat-groups", activeSociety?.id],
    queryFn: async () => (await getGroups()).data.data,
    enabled: Boolean(activeSociety),
  });

  const adminsQuery = useQuery({
    queryKey: ["chat-admins", activeSociety?.id],
    queryFn: async () => (await getAdmins()).data.data,
    enabled: Boolean(activeSociety),
  });

  const directListQuery = useQuery({
    queryKey: ["chat-direct-list", activeSociety?.id],
    queryFn: async () => (await getDirectChats()).data.data,
    enabled: Boolean(activeSociety) && tab === "direct",
  });

  const groupMessagesQuery = useQuery({
    queryKey: ["chat-messages", selectedGroup?.id],
    queryFn: async () => (await getGroupMessages(selectedGroup.id)).data.data,
    enabled: Boolean(selectedGroup),
    refetchInterval: 3000,
  });

  const directMessagesQuery = useQuery({
    queryKey: ["chat-direct-messages", selectedAdminChat?.id || selectedAdminChat?.userId],
    queryFn: async () => (await getDirectMessages(selectedAdminChat?.id || selectedAdminChat?.userId)).data.data,
    enabled: Boolean(selectedAdminChat),
    refetchInterval: 3000,
  });

  const pinnedQuery = useQuery({
    queryKey: ["chat-pinned", selectedGroup?.id],
    queryFn: async () => (await getPinnedMessage(selectedGroup.id)).data.data,
    enabled: Boolean(selectedGroup),
  });

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [groupMessagesQuery.data, directMessagesQuery.data, pinnedQuery.data]);

  // Typing indicator socket
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = getAccessToken();
    if (!t) return;
    const socketUrl = getSocketUrl();
    let socket;
    try {
      const { io } = require("socket.io-client");
      socket = io(socketUrl, { auth: { token: t, societyId: activeSociety?.id }, transports: ["websocket"] });
      typingSocketRef.current = socket;
      socket.on("chat:typing", (data) => {
        const isGroup = selectedGroup && String(data.groupId) === String(selectedGroup.id);
        const isDirect = selectedAdminChat && String(data.senderId) === String(selectedAdminChat.id || selectedAdminChat.userId);
        if (isGroup || isDirect) {
          setTypingUser(data.senderName || "Someone");
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 2500);
        }
      });
    } catch (_) {}
    return () => { try { socket?.disconnect(); } catch (_) {} clearTimeout(typingTimeoutRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSociety?.id, selectedGroup?.id, selectedAdminChat?.id, selectedAdminChat?.userId]);

  const handleTyping = (type) => {
    const s = typingSocketRef.current;
    if (!s) return;
    if (type === "group" && selectedGroup) s.emit("chat:typing", { groupId: selectedGroup.id });
    if (type === "direct" && selectedAdminChat) s.emit("chat:typing", { receiverId: selectedAdminChat.id || selectedAdminChat.userId });
  };

  const sendGroupMut = useMutation({
    mutationFn: ({ groupId, text, replyTo }) => sendGroupMessage(groupId, text, replyTo).then((r) => r.data.data),
    onSuccess: () => {
      setNewText("");
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedGroup?.id] });
      queryClient.invalidateQueries({ queryKey: ["chat-groups"] });
    },
  });

  const sendDirectMut = useMutation({
    mutationFn: ({ receiverId, text, replyTo }) => sendDirectMessage(receiverId, text, replyTo).then((r) => r.data.data),
    onSuccess: () => {
      setNewText("");
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["chat-direct-messages"] });
      queryClient.invalidateQueries({ queryKey: ["chat-direct-list"] });
    },
  });

  const deleteGroupMut = useMutation({
    mutationFn: ({ groupId, messageId }) => deleteGroupMessage(groupId, messageId).then((r) => r.data.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedGroup?.id] }); queryClient.invalidateQueries({ queryKey: ["chat-pinned", selectedGroup?.id] }); },
  });
  const reactGroupMut = useMutation({
    mutationFn: ({ groupId, messageId, emoji }) => reactGroupMessage(groupId, messageId, emoji).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedGroup?.id] }),
  });
  const pinMut = useMutation({
    mutationFn: ({ groupId, messageId }) => pinGroupMessage(groupId, messageId).then((r) => r.data.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["chat-pinned", selectedGroup?.id] }); queryClient.invalidateQueries({ queryKey: ["chat-groups"] }); },
  });
  const deleteDirectMut = useMutation({
    mutationFn: ({ messageId }) => deleteDirectMessage(messageId).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-direct-messages"] }),
  });
  const reactDirectMut = useMutation({
    mutationFn: ({ messageId, emoji }) => reactDirectMessage(messageId, emoji).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-direct-messages"] }),
  });

  const handleEmoji = (emoji) => {
    if (reactionPicker) {
      // Reaction mode
      if (selectedGroup && reactionPicker) reactGroupMut.mutate({ groupId: selectedGroup.id, messageId: reactionPicker, emoji });
      else if (selectedAdminChat && reactionPicker) reactDirectMut.mutate({ messageId: reactionPicker, emoji });
      setReactionPicker(null);
      return;
    }
    setNewText((prev) => prev + emoji);
    setShowEmoji(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSendGroup = (e) => {
    e.preventDefault();
    if (!newText.trim() || !selectedGroup) return;
    sendGroupMut.mutate({ groupId: selectedGroup.id, text: newText.trim(), replyTo: replyTo?.id || null });
    setReplyTo(null);
    setShowEmoji(false);
  };

  const handleSendDirect = (e) => {
    e.preventDefault();
    if (!newText.trim() || !selectedAdminChat) return;
    const receiverId = selectedAdminChat.id || selectedAdminChat.userId;
    sendDirectMut.mutate({ receiverId, text: newText.trim(), replyTo: replyTo?.id || null });
    setReplyTo(null);
    setShowEmoji(false);
  };

  const currentUser = useAuthStore((s) => s.user);
  const [showInfo, setShowInfo] = useState(false);

  if (selectedGroup) {
    const msgs = groupMessagesQuery.data || [];
    const filteredMsgs = searchQuery.trim()
      ? msgs.filter((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()) || m.senderName.toLowerCase().includes(searchQuery.toLowerCase()))
      : msgs;
    const pinned = pinnedQuery.data;
    return (
      <div className="mx-auto flex h-[80vh] max-w-3xl flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
        {/* Header - website theme - tap to open info like WhatsApp */}
        <div onClick={() => setShowInfo(true)} className="flex cursor-pointer items-center gap-3 bg-primary px-4 py-3 text-on-primary hover:bg-primary/90">
          <button onClick={(e) => { e.stopPropagation(); setSelectedGroup(null); }} className="rounded-full p-1.5 hover:bg-white/10">
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-body-md font-bold">{selectedGroup.name[0]?.toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-body-md font-semibold leading-none">{selectedGroup.name}</h3>
            <p className="truncate text-label-sm text-on-primary/80">{selectedGroup.memberCount} members · tap for info</p>
          </div>
          <span className="material-symbols-outlined text-[22px] text-on-primary/90">info</span>
        </div>
        {showInfo && <GroupInfoModal groupId={selectedGroup.id} onClose={() => setShowInfo(false)} onLeft={() => { setShowInfo(false); setSelectedGroup(null); queryClient.invalidateQueries({ queryKey: ["chat-groups"] }); }} />}
        {/* Search bar */}
        <div className="flex items-center gap-2 border-b border-outline-variant bg-surface-container-lowest px-3 py-2">
          <span className="material-symbols-outlined text-[18px] text-outline">search</span>
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search messages..." className="flex-1 bg-transparent text-body-sm placeholder:text-outline focus:outline-none" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="text-label-sm text-primary">Clear</button>}
          {searchQuery && <span className="text-label-sm text-outline">{filteredMsgs.length} found</span>}
        </div>
        {/* Pinned announcement banner like WhatsApp pin */}
        {pinned && (
          <div className="flex items-center gap-3 bg-primary-fixed px-4 py-2.5 border-b border-primary-fixed-dim">
            <span className="material-symbols-outlined text-[18px] text-primary">push_pin</span>
            <p className="flex-1 truncate text-body-sm font-medium text-on-primary-fixed">{pinned.text} <span className="font-normal text-on-primary-fixed-variant">· {pinned.senderName}</span></p>
            {isAdmin && <button onClick={() => pinMut.mutate({ groupId: selectedGroup.id, messageId: pinned.id })} className="text-label-sm font-semibold text-primary">Unpin</button>}
          </div>
        )}
        <div className="flex-1 overflow-y-auto space-y-3 bg-surface-container-low p-3 sm:p-4">
          {groupMessagesQuery.isLoading && <p className="text-center text-label-sm text-outline">Loading messages...</p>}
          {filteredMsgs.length === 0 && !groupMessagesQuery.isLoading && (
            <div className="mx-auto mt-8 max-w-xs rounded-lg bg-primary-fixed px-3 py-2 text-center text-label-sm text-on-primary-fixed shadow-sm">
              {searchQuery ? `No messages matching "${searchQuery}"` : "Messages are inside this society only. Admin created this group."}
            </div>
          )}
          {filteredMsgs.map((m) => {
            const isMine = String(m.senderId) === String(currentUser?.id || currentUser?._id);
            const canDelete = isMine || isAdmin;
            return (
              <div key={m.id} className={`group/message flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`relative max-w-[78%] rounded-2xl px-4 py-2.5 text-body-sm shadow-sm ${
                    isMine ? "bg-primary-fixed text-on-primary-fixed border border-primary-fixed-dim" : "bg-surface-container-lowest text-on-surface border border-outline-variant"
                  } ${m.isPinned ? "ring-2 ring-primary/30" : ""}`}
                >
                  {!isMine && <p className="text-label-sm font-bold text-primary">{m.senderName}</p>}
                  {m.replyTo && (
                    <div className="mb-2 rounded-lg border-l-4 border-primary bg-surface-container-high px-2 py-1">
                      <p className="text-label-sm font-semibold text-primary">{m.replyTo.senderName}</p>
                      <p className="truncate text-label-sm text-on-surface-variant">{m.replyTo.text}</p>
                    </div>
                  )}
                  <p className={`whitespace-pre-wrap leading-[19px] ${m.isDeleted ? "italic text-outline" : ""}`}>{m.text}</p>
                  {m.reactions && m.reactions.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {Object.entries(m.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {})).map(([emoji, count]) => (
                        <span key={emoji} className="rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm border border-outline-variant">{emoji} {count}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className={`text-[11px] ${isMine ? "text-on-primary-fixed-variant" : "text-outline"}`}>
                      {formatTime(m.createdAt)} {isMine && <span className="ml-1">✓</span>} {m.isPinned && <span className="ml-1 text-primary">📌</span>}
                    </p>
                    {!m.isDeleted && (
                      <div className="hidden gap-1 group-hover/message:flex">
                        <button onClick={() => setReplyTo({ id: m.id, text: m.text, senderName: m.senderName })} className="rounded-full p-1 hover:bg-black/5" title="Reply"><span className="material-symbols-outlined text-[16px]">reply</span></button>
                        <button onClick={() => setReactionPicker(reactionPicker === m.id ? null : m.id)} className="rounded-full p-1 hover:bg-black/5" title="React"><span className="material-symbols-outlined text-[16px]">add_reaction</span></button>
                        {isAdmin && <button onClick={() => pinMut.mutate({ groupId: selectedGroup.id, messageId: m.id })} className="rounded-full p-1 hover:bg-black/5" title="Pin"><span className="material-symbols-outlined text-[16px]">push_pin</span></button>}
                        {canDelete && <button onClick={() => { if (window.confirm("Delete this message?")) deleteGroupMut.mutate({ groupId: selectedGroup.id, messageId: m.id }); }} className="rounded-full p-1 hover:bg-black/5 text-error" title="Delete"><span className="material-symbols-outlined text-[16px]">delete</span></button>}
                      </div>
                    )}
                  </div>
                  {reactionPicker === m.id && (
                    <div className="absolute bottom-full left-1/2 z-20 mb-2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-outline-variant bg-surface-container-lowest p-1.5 shadow-lg">
                      {["❤️","👍","😂","😮","😢","🙏"].map((e) => (
                        <button key={e} onClick={() => handleEmoji(e)} className="flex h-8 w-8 items-center justify-center rounded-full text-[18px] hover:bg-surface-container-high active:bg-surface-container-highest">{e}</button>
                      ))}
                      <button onClick={() => { setShowEmoji(true); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed hover:bg-primary-fixed-dim" title="More emojis">
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                      <button onClick={() => setReactionPicker(null)} className="ml-1 rounded-full px-2 py-1 text-label-sm hover:bg-surface-container-high">✕</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {typingUser && <p className="text-label-sm italic text-on-surface-variant">{typingUser} is typing...</p>}
          <div ref={messagesEndRef} />
        </div>
        {replyTo && (
          <div className="flex items-center justify-between border-l-4 border-primary bg-primary-fixed px-3 py-2">
            <div className="min-w-0">
              <p className="text-label-sm font-semibold text-primary">Replying to {replyTo.senderName}</p>
              <p className="truncate text-body-sm text-on-primary-fixed">{replyTo.text}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="rounded-full p-1 hover:bg-primary-fixed-dim"><span className="material-symbols-outlined text-[18px]">close</span></button>
          </div>
        )}
        <form onSubmit={handleSendGroup} className="relative flex items-end gap-2 border-t border-outline-variant bg-surface-container-lowest px-3 py-3">
          {showEmoji && !reactionPicker && <EmojiPicker onSelect={handleEmoji} onClose={() => setShowEmoji(false)} />}
          {showEmoji && reactionPicker && (
            <div className="absolute bottom-full left-0 right-0 mb-2">
              <EmojiPicker onSelect={handleEmoji} onClose={() => { setShowEmoji(false); setReactionPicker(null); }} />
            </div>
          )}
          <div className="flex flex-1 items-center rounded-full border border-outline-variant bg-surface-container-low px-3 py-1.5">
            <button type="button" onClick={() => { setReactionPicker(null); setShowEmoji((v) => !v); }} className="mr-2 rounded-full p-1 hover:bg-surface-container-high">
              <span className="material-symbols-outlined text-[22px] text-outline">mood</span>
            </button>
            <input
              ref={inputRef}
              value={newText}
              onChange={(e) => { setNewText(e.target.value); handleTyping("group"); }}
              placeholder="Type a message"
              maxLength={2000}
              className="flex-1 bg-transparent py-2 text-body-sm text-on-surface placeholder:text-outline focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={sendGroupMut.isPending || !newText.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">{newText.trim() ? "send" : "mic"}</span>
          </button>
        </form>
      </div>
    );
  }

  if (selectedAdminChat) {
    const msgs = directMessagesQuery.data || [];
    const filteredDirect = searchQuery.trim() ? msgs.filter((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase())) : msgs;
    const otherName = selectedAdminChat.name || "Admin";
    return (
      <div className="mx-auto flex h-[80vh] max-w-3xl flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
        <div className="flex items-center gap-3 bg-primary px-4 py-3 text-on-primary">
          <button onClick={() => { setSelectedAdminChat(null); setSearchQuery(""); }} className="rounded-full p-1.5 hover:bg-white/10">
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white font-semibold text-primary">{otherName[0]?.toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <h3 className="text-body-md font-semibold leading-none">{otherName}</h3>
            <p className="text-label-sm text-on-primary/80">Personal chat with admin</p>
          </div>
          <div className="flex items-center gap-1">
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search" className="hidden sm:block w-32 rounded-full bg-white/15 px-3 py-1 text-body-sm placeholder:text-white/70 focus:outline-none" />
            <span className="material-symbols-outlined text-[22px] text-on-primary/90">more_vert</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 bg-surface-container-low p-3 sm:p-4">
          <div className="mx-auto mt-2 max-w-xs rounded-lg bg-primary-fixed px-3 py-2 text-center text-label-sm text-on-primary-fixed shadow-sm">This chat is only between you and admin.</div>
          {searchQuery && <p className="text-label-sm text-outline">{filteredDirect.length} messages found for "{searchQuery}"</p>}
          {directMessagesQuery.isLoading && <p className="text-center text-label-sm text-outline">Loading...</p>}
          {filteredDirect.length === 0 && !directMessagesQuery.isLoading && <p className="py-8 text-center text-body-sm text-on-surface-variant">{searchQuery ? "No matching messages" : "No messages yet. Say hi to admin."}</p>}
          {filteredDirect.map((m) => (
            <div key={m.id} className={`group/message flex ${m.isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`relative max-w-[78%] rounded-2xl px-4 py-2.5 text-body-sm shadow-sm ${m.isMine ? "bg-primary-fixed text-on-primary-fixed border border-primary-fixed-dim" : "bg-surface-container-lowest text-on-surface border border-outline-variant"} ${m.isDeleted ? "opacity-60" : ""}`}
              >
                {m.replyTo && (
                  <div className="mb-2 rounded-lg border-l-4 border-primary bg-surface-container-high px-2 py-1">
                    <p className="text-label-sm font-semibold text-primary">{m.replyTo.senderName}</p>
                    <p className="truncate text-label-sm text-on-surface-variant">{m.replyTo.text}</p>
                  </div>
                )}
                <p className={`whitespace-pre-wrap ${m.isDeleted ? "italic text-outline" : ""}`}>{m.text}</p>
                {m.reactions && m.reactions.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Object.entries(m.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {})).map(([emoji, count]) => (
                      <span key={emoji} className="rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm border border-outline-variant">{emoji} {count}</span>
                    ))}
                  </div>
                )}
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className={`text-[11px] ${m.isMine ? "text-on-primary-fixed-variant" : "text-outline"}`}>{formatTime(m.createdAt)} {m.isMine && <span className={`ml-1 ${m.isRead ? "text-primary" : "text-outline"}`}>{m.isRead ? "✓✓" : "✓"}</span>}</p>
                  {!m.isDeleted && (
                    <div className="hidden gap-1 group-hover/message:flex">
                      <button onClick={() => setReplyTo({ id: m.id, text: m.text, senderName: m.isMine ? "You" : otherName })} className="rounded-full p-1 hover:bg-black/5" title="Reply"><span className="material-symbols-outlined text-[16px]">reply</span></button>
                      <button onClick={() => setReactionPicker(reactionPicker === m.id ? null : m.id)} className="rounded-full p-1 hover:bg-black/5" title="React"><span className="material-symbols-outlined text-[16px]">add_reaction</span></button>
                      <button onClick={() => { if (window.confirm("Delete this message?")) deleteDirectMut.mutate({ messageId: m.id }); }} className="rounded-full p-1 hover:bg-black/5 text-error" title="Delete"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                    </div>
                  )}
                </div>
                {reactionPicker === m.id && (
                  <div className="absolute bottom-full left-1/2 z-20 mb-2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-outline-variant bg-surface-container-lowest p-1.5 shadow-lg">
                    {["❤️","👍","😂","😮","😢","🙏"].map((e) => (
                      <button key={e} onClick={() => handleEmoji(e)} className="flex h-8 w-8 items-center justify-center rounded-full text-[18px] hover:bg-surface-container-high active:bg-surface-container-highest">{e}</button>
                    ))}
                    <button onClick={() => { setShowEmoji(true); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed hover:bg-primary-fixed-dim" title="More emojis">
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                    <button onClick={() => setReactionPicker(null)} className="ml-1 rounded-full px-2 py-1 text-label-sm hover:bg-surface-container-high">✕</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {typingUser && <p className="text-label-sm italic text-on-surface-variant">{typingUser} is typing...</p>}
          <div ref={messagesEndRef} />
        </div>
        {replyTo && (
          <div className="flex items-center justify-between border-l-4 border-primary bg-primary-fixed px-3 py-2">
            <div className="min-w-0">
              <p className="text-label-sm font-semibold text-primary">Replying to {replyTo.senderName}</p>
              <p className="truncate text-body-sm text-on-primary-fixed">{replyTo.text}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="rounded-full p-1 hover:bg-primary-fixed-dim"><span className="material-symbols-outlined text-[18px]">close</span></button>
          </div>
        )}
        <form onSubmit={handleSendDirect} className="relative flex items-end gap-2 border-t border-outline-variant bg-surface-container-lowest px-3 py-3">
          {showEmoji && !reactionPicker && <EmojiPicker onSelect={handleEmoji} onClose={() => setShowEmoji(false)} />}
          {showEmoji && reactionPicker && (
            <div className="absolute bottom-full left-0 right-0 mb-2">
              <EmojiPicker onSelect={handleEmoji} onClose={() => { setShowEmoji(false); setReactionPicker(null); }} />
            </div>
          )}
          <div className="flex flex-1 items-center rounded-full border border-outline-variant bg-surface-container-low px-3 py-1.5">
            <button type="button" onClick={() => { setReactionPicker(null); setShowEmoji((v) => !v); }} className="mr-2 rounded-full p-1 hover:bg-surface-container-high">
              <span className="material-symbols-outlined text-[22px] text-outline">mood</span>
            </button>
            <input ref={inputRef} value={newText} onChange={(e) => { setNewText(e.target.value); handleTyping("direct"); }} placeholder="Type a message" maxLength={2000} className="flex-1 bg-transparent py-2 text-body-sm placeholder:text-outline focus:outline-none" />
          </div>
          <button type="submit" disabled={sendDirectMut.isPending || !newText.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary disabled:opacity-50">
            <span className="material-symbols-outlined text-[20px]">{newText.trim() ? "send" : "mic"}</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-0 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
      <section className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-on-primary">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="rounded-full p-1.5 text-on-primary hover:bg-white/10">
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </Link>
          <h1 className="text-title-md font-semibold">Chats</h1>
        </div>
        {isAdmin && tab === "groups" && (
          <button onClick={() => setShowCreate(true)} className="rounded-full bg-white/15 p-2 hover:bg-white/20">
            <span className="material-symbols-outlined text-[22px]">group_add</span>
          </button>
        )}
      </section>

      <div className="flex gap-0 bg-surface-container-lowest">
        <button onClick={() => setTab("groups")} className={`flex-1 px-4 py-3 text-label-md font-semibold border-b-2 ${tab === "groups" ? "border-primary text-primary" : "border-transparent text-on-surface-variant"}`}>GROUPS</button>
        <button onClick={() => setTab("direct")} className={`flex-1 px-4 py-3 text-label-md font-semibold border-b-2 ${tab === "direct" ? "border-primary text-primary" : "border-transparent text-on-surface-variant"}`}>{isAdmin ? "DIRECT" : "ADMIN CHAT"}</button>
      </div>
      <div className="h-[1px] bg-outline-variant" />

      {tab === "groups" && (
        <section>
          {groupsQuery.isLoading && <div className="divide-y divide-outline-variant">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="flex gap-3 p-3"><div className="h-12 w-12 animate-pulse rounded-full bg-surface-container-high" /><div className="flex-1 space-y-2"><div className="h-4 w-32 animate-pulse bg-surface-container-high" /><div className="h-3 w-48 animate-pulse bg-surface-container-high" /></div></div>)}</div>}
          {groupsQuery.isError && <p className="p-4 text-body-sm text-error">{extractApiError(groupsQuery.error, "Failed to load groups")}</p>}
          {groupsQuery.isSuccess && (groupsQuery.data || []).length === 0 && (
            <div className="py-16 text-center">
              <span className="material-symbols-outlined text-[56px] text-outline">groups</span>
              <p className="mt-3 text-body-md font-semibold text-on-surface">No groups yet</p>
              <p className="mt-1 text-body-sm text-on-surface-variant">{isAdmin ? "Tap add to create a group." : "Admin has not created any groups."}</p>
            </div>
          )}
          <div className="divide-y divide-outline-variant">
            {(groupsQuery.data || []).map((g) => (
              <button key={g.id} onClick={() => setSelectedGroup(g)} className="flex w-full items-center gap-3 bg-surface-container-lowest px-3 py-3 text-left hover:bg-surface-container-low active:bg-surface-container-high">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed"><span className="material-symbols-outlined text-[24px]">groups</span></span>
                <div className="min-w-0 flex-1 border-b border-outline-variant pb-3 pr-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-body-md font-medium text-on-surface">{g.name}</p>
                    <span className="shrink-0 text-[11px] text-outline">{formatListTime(g.lastAt)}</span>
                  </div>
                  <p className="truncate text-body-sm text-on-surface-variant">{g.lastMessage || g.description || `${g.memberCount} members`}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {tab === "direct" && (
        <section>
          {!isAdmin ? (
            <>
              {adminsQuery.isLoading && <p className="p-4 text-label-sm text-outline">Loading admins...</p>}
              {(adminsQuery.data || []).map((a) => (
                <button key={a.id} onClick={() => setSelectedAdminChat(a)} className="flex w-full items-center gap-3 bg-surface-container-lowest px-3 py-3 text-left hover:bg-surface-container-low active:bg-surface-container-high border-b border-outline-variant">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary font-semibold">{a.name[0]?.toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-md font-medium text-on-surface">{a.name}</p>
                    <p className="truncate text-body-sm text-primary">Tap to message admin</p>
                  </div>
                  <span className="material-symbols-outlined text-primary">chat</span>
                </button>
              ))}
              {adminsQuery.isSuccess && (adminsQuery.data || []).length === 0 && <p className="p-6 text-center text-body-sm text-on-surface-variant">No admin found.</p>}
            </>
          ) : (
            <div className="divide-y divide-outline-variant">
              {directListQuery.isLoading && <p className="p-4 text-label-sm text-outline">Loading chats...</p>}
              {(directListQuery.data || []).length === 0 && !directListQuery.isLoading && <p className="py-12 text-center text-body-sm text-on-surface-variant">No direct messages yet. Residents will appear here after messaging.</p>}
              {(directListQuery.data || []).map((c) => (
                <button key={c.userId} onClick={() => setSelectedAdminChat(c)} className="flex w-full items-center gap-3 bg-surface-container-lowest px-3 py-3 text-left hover:bg-surface-container-low">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-semibold text-on-primary-fixed">{c.name[0]?.toUpperCase()}</span>
                  <div className="min-w-0 flex-1 border-b border-outline-variant pb-3">
                    <div className="flex items-baseline justify-between">
                      <p className="truncate text-body-md font-medium text-on-surface">{c.name}</p>
                      <span className="text-[11px] text-outline">{formatListTime(c.lastAt)}</span>
                    </div>
                    <p className="truncate text-body-sm text-on-surface-variant">{c.lastText || "Tap to chat"}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function GroupInfoModal({ groupId, onClose, onLeft }) {
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);
  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canManageChat = hasPermission(membership?.role, "manage_amenities", permissionsQuery.data);
  const isAdmin = canManageChat;
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const wrapperRef = useRef(null);

  const infoQuery = useQuery({
    queryKey: ["chat-group-info", groupId],
    queryFn: async () => (await getGroupInfo(groupId)).data.data,
    enabled: Boolean(groupId),
  });

  const directoryQuery = useQuery({
    queryKey: ["directory", activeSociety?.id],
    queryFn: async () => (await getSocietyDirectory()).data.data,
    enabled: Boolean(activeSociety) && isAdmin,
  });

  const members = directoryQuery.data || [];
  const info = infoQuery.data;

  useEffect(() => {
    if (info) {
      setEditName(info.name || "");
      setEditDesc(info.description || "");
    }
  }, [info]);

  useEffect(() => {
    const h = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const addMut = useMutation({
    mutationFn: (ids) => addGroupMembers(groupId, ids).then((r) => r.data.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["chat-group-info", groupId] }); queryClient.invalidateQueries({ queryKey: ["chat-groups"] }); setSearch(""); setShowDropdown(false); },
    onError: (e) => setError(extractApiError(e, "Failed to add")),
  });
  const removeMut = useMutation({
    mutationFn: (ids) => removeGroupMembers(groupId, ids).then((r) => r.data.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["chat-group-info", groupId] }); queryClient.invalidateQueries({ queryKey: ["chat-groups"] }); },
    onError: (e) => setError(extractApiError(e, "Failed to remove")),
  });
  const updateMut = useMutation({
    mutationFn: (payload) => updateGroup(groupId, payload).then((r) => r.data.data),
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["chat-group-info", groupId] });
      queryClient.invalidateQueries({ queryKey: ["chat-groups"] });
    },
    onError: (e) => setError(extractApiError(e, "Failed to update group")),
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteGroup(groupId).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-groups"] });
      onLeft();
    },
    onError: (e) => setError(extractApiError(e, "Failed to delete group")),
  });
  const leaveMut = useMutation({
    mutationFn: () => leaveGroup(groupId).then((r) => r.data.data),
    onSuccess: () => onLeft(),
    onError: (e) => setError(extractApiError(e, "Failed to leave")),
  });

  const filtered = search.trim().length === 0 ? [] : members.filter((m) => {
    const q = search.trim().toLowerCase();
    const already = info?.members?.some((mem) => String(mem.id) === String(m.userId));
    if (already) return false;
    return m.name.toLowerCase().includes(q) || String(m.house || "").toLowerCase().includes(q);
  }).slice(0, 6);

  if (infoQuery.isLoading) return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-surface-container-lowest p-6 text-center">Loading group info...</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-xl">
        <div className="bg-primary px-5 py-4 text-on-primary">
          <div className="flex items-center justify-between">
            <h3 className="text-title-md font-semibold">Group Info</h3>
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-white/10 cursor-pointer"><span className="material-symbols-outlined">close</span></button>
          </div>
          {!isEditing ? (
            <>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-label-md font-bold text-on-primary">{info?.name} · {info?.members?.length || 0} members</p>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setEditName(info?.name || "");
                      setEditDesc(info?.description || "");
                      setIsEditing(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[12px] font-semibold text-white hover:bg-white/30 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span> Edit
                  </button>
                )}
              </div>
              {info?.description && <p className="mt-1 text-body-sm text-on-primary/90">{info.description}</p>}
              <p className="mt-2 text-label-sm text-on-primary/70">Created by {info?.createdByName} · {info?.createdAt ? new Date(info.createdAt).toLocaleDateString("en-IN") : ""}</p>
            </>
          ) : (
            <div className="mt-2 space-y-2 text-on-surface">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Group Name"
                className="w-full rounded-lg bg-white px-3 py-1.5 text-body-sm text-black focus:outline-none"
              />
              <input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Description"
                className="w-full rounded-lg bg-white px-3 py-1.5 text-body-sm text-black focus:outline-none"
              />
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg bg-white/20 px-3 py-1 text-label-sm text-white hover:bg-white/30 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => updateMut.mutate({ name: editName, description: editDesc })}
                  disabled={updateMut.isPending || !editName.trim()}
                  className="rounded-lg bg-white px-3 py-1 text-label-sm font-semibold text-primary hover:bg-white/90 disabled:opacity-50 cursor-pointer"
                >
                  {updateMut.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <p className="rounded-lg bg-error/10 p-3 text-body-sm text-error">{error}</p>}

          {isAdmin && (
            <div ref={wrapperRef} className="relative">
              <label className="text-label-md font-medium text-on-surface">Add members</label>
              <div className="relative mt-1">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">person_add</span>
                <input value={search} onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} placeholder="Type name or house to add..." className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2.5 pl-9 pr-4 text-body-sm placeholder:text-outline focus:border-primary focus:outline-none" />
              </div>
              {showDropdown && search.trim().length > 0 && (
                <div className="absolute left-0 right-0 z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest shadow-lg">
                  {filtered.length === 0 ? <p className="px-3 py-2 text-label-sm text-outline">No members found</p> : filtered.map((m) => (
                    <button key={m.id} type="button" onClick={() => addMut.mutate([m.userId])} className="flex w-full items-center gap-3 px-3 py-2 hover:bg-surface-container-high text-left cursor-pointer">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary-fixed text-primary text-label-md">{m.name[0]?.toUpperCase()}</span>
                      <span className="text-body-sm">{m.name} {m.house ? `· ${m.house}` : ""}</span>
                      <span className="ml-auto text-primary text-label-sm">Add</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <h4 className="text-label-md font-semibold text-on-surface">{info?.members?.length || 0} members</h4>
            <div className="mt-2 divide-y divide-outline-variant rounded-lg border border-outline-variant">
              {(info?.members || []).map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-semibold text-on-primary-fixed">{m.name[0]?.toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-medium text-on-surface">{m.name}</p>
                    <p className="text-label-sm text-on-surface-variant">{m.phoneMasked || ""}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => { if (window.confirm(`Remove ${m.name} from group?`)) removeMut.mutate([m.id]); }} className="rounded-full p-2 text-error hover:bg-error/10 cursor-pointer">
                      <span className="material-symbols-outlined text-[20px]">person_remove</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-outline-variant p-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-full border border-outline-variant py-2.5 text-label-md cursor-pointer">Close</button>
          {isAdmin ? (
            <button onClick={() => { if (window.confirm("Delete this group channel for everyone? This cannot be undone.")) deleteMut.mutate(); }} className="flex-1 rounded-full bg-error py-2.5 text-label-md font-semibold text-on-error cursor-pointer">
              {deleteMut.isPending ? "Deleting..." : "Delete Group"}
            </button>
          ) : (
            <button onClick={() => { if (window.confirm("Leave this group?")) leaveMut.mutate(); }} className="flex-1 rounded-full bg-error py-2.5 text-label-md font-semibold text-on-error cursor-pointer">
              {leaveMut.isPending ? "Leaving..." : "Leave group"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateGroupModal({ onClose }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const wrapperRef = useRef(null);

  const directoryQuery = useQuery({
    queryKey: ["directory", activeSociety?.id],
    queryFn: async () => (await getSocietyDirectory()).data.data,
    enabled: Boolean(activeSociety),
  });

  const members = directoryQuery.data || [];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const mutation = useMutation({
    mutationFn: (payload) => createGroup(payload).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-groups"] });
      onClose();
    },
    onError: (e) => setError(extractApiError(e, "Failed to create group")),
  });

  const filtered = search.trim().length === 0
    ? []
    : members.filter((m) => {
        const q = search.trim().toLowerCase();
        return m.name.toLowerCase().includes(q) || String(m.house || "").toLowerCase().includes(q);
      }).filter((m) => !selected.includes(m.id)).slice(0, 8);

  const addMember = (id) => {
    setSelected((prev) => [...prev, id]);
    setSearch("");
    setShowDropdown(false);
  };
  const removeMember = (id) => setSelected((prev) => prev.filter((x) => x !== id));

  const selectedMembers = members.filter((m) => selected.includes(m.id));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || name.trim().length < 2) return setError("Name must be at least 2 characters");
    if (selected.length === 0) return setError("Select at least 1 member");
    const idToUserId = new Map(members.map((m) => [m.id, m.userId]));
    const userIds = [...new Set(selected.map((cid) => idToUserId.get(cid)).filter(Boolean))];
    if (userIds.length === 0) return setError("No valid members selected");
    mutation.mutate({ name: name.trim(), description: description.trim(), memberIds: userIds });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-surface-container-lowest p-6 shadow-xl">
        <h3 className="text-title-md font-semibold text-on-surface">Create Group</h3>
        <p className="mt-1 text-body-sm text-on-surface-variant">Only admin can create. Search name or house to add members.</p>
        {error && <p className="mt-3 rounded-lg bg-error/10 p-3 text-body-sm text-error">{error}</p>}
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-label-md font-medium">Group Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., A Block Residents" maxLength={80} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-body-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-label-md font-medium">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" maxLength={300} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-body-sm focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="text-label-md font-medium">Members *</label>
            {selectedMembers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedMembers.map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed px-3 py-1.5 text-label-sm font-medium text-on-primary-fixed">
                    {m.name} {m.house ? `· ${m.house}` : ""}
                    <button type="button" onClick={() => removeMember(m.id)} className="rounded-full p-0.5 hover:bg-black/10">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div ref={wrapperRef} className="relative mt-2">
              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Type name or house number..."
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2.5 pl-9 pr-4 text-body-sm placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {showDropdown && search.trim().length > 0 && (
                <div className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest shadow-lg">
                  {filtered.length === 0 ? (
                    <p className="px-3 py-3 text-label-sm text-outline">No members found for "{search.trim()}"</p>
                  ) : (
                    filtered.map((m) => (
                      <button key={m.id} type="button" onClick={() => addMember(m.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-container-high">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-fixed text-label-md font-semibold text-primary">{m.name[0]?.toUpperCase()}</span>
                        <span className="min-w-0">
                          <span className="block text-body-sm font-medium text-on-surface">{m.name}</span>
                          <span className="block text-label-sm text-on-surface-variant">{m.house ? `House ${m.house}` : "No house"} · {m.phoneMasked || ""}</span>
                        </span>
                        <span className="ml-auto material-symbols-outlined text-[18px] text-primary">add</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <p className="mt-1 text-label-sm text-outline">{selected.length} selected · type name/house to add</p>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-full border border-outline-variant py-2.5 text-label-md">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 rounded-full bg-primary py-2.5 text-label-md font-semibold text-on-primary disabled:opacity-50">{mutation.isPending ? "Creating..." : "Create"}</button>
        </div>
      </form>
    </div>
  );
}
