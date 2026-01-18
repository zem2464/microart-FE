import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import {
  useReactiveVar,
  useQuery,
  useSubscription,
  useMutation,
} from "@apollo/client";
import { useLocation } from "react-router-dom";
import { GET_MY_CHAT_ROOMS } from "../graphql/chat";
import { userCacheVar } from "../cache/userCacheVar";
import {
  NOTIFICATION_CREATED_SUBSCRIPTION,
  MARK_ROOM_NOTIFICATIONS_AS_READ,
  GET_UNREAD_NOTIFICATION_COUNT,
} from "../graphql/notifications";
import notificationService, {
  isElectronEnv,
} from "../services/NotificationService";

// Debug marker to confirm bundle version and that this file is executing
console.log("[ChatContext] Module loaded - build marker 2026-01-03T2");

const ChatContext = createContext();

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const location = useLocation();
  const [openChats, setOpenChats] = useState([]);
  const [minimizedChats, setMinimizedChats] = useState({});
  // Store unread counts keyed by roomId
  const [unreadCounts, setUnreadCounts] = useState({});
  const currentUser = useReactiveVar(userCacheVar);

  // Fetch chat rooms centrally
  const {
    data: chatData,
    loading: chatLoading,
    refetch: refetchChats,
  } = useQuery(GET_MY_CHAT_ROOMS, {
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    skip: !currentUser?.id,
    onCompleted: (data) => {
      // Initialize unread counts from server data
      if (data?.myChatRooms) {
        const counts = {};
        data.myChatRooms.forEach((room) => {
          counts[room.id] = room.unreadCount || 0;
        });
        setUnreadCounts(counts);
      }
    },
  });

  const chatRooms = chatData?.myChatRooms || [];

  // Mutation to mark room notifications as read
  const [markRoomNotificationsAsRead] = useMutation(
    MARK_ROOM_NOTIFICATIONS_AS_READ,
    {
      refetchQueries: [{ query: GET_UNREAD_NOTIFICATION_COUNT }],
      awaitRefetchQueries: false,
    }
  );

  // Calculate total unread count
  const totalUnreadCount = useMemo(() => {
    return Object.values(unreadCounts).reduce(
      (sum, count) => sum + (count || 0),
      0
    );
  }, [unreadCounts]);

  // Open chat window function (used by notification service)
  const openChatWindow = useCallback(
    (chatInfo) => {
      console.log(
        "[ChatContext] Opening chat window for room:",
        chatInfo.roomId
      );

      setOpenChats((prev) => {
        if (prev.find((chat) => chat.roomId === chatInfo.roomId)) {
          // If already open, just unminimize it
          setMinimizedChats((prevMin) => ({
            ...prevMin,
            [chatInfo.roomId]: false,
          }));
          return prev;
        }
        return [...prev, chatInfo];
      });
      // Clear minimized state when opening
      setMinimizedChats((prev) => ({ ...prev, [chatInfo.roomId]: false }));

      // Reset unread count locally when opening
      setUnreadCounts((prev) => ({ ...prev, [chatInfo.roomId]: 0 }));

      // Mark all notifications from this room as read
      markRoomNotificationsAsRead({
        variables: { roomId: chatInfo.roomId },
        refetchQueries: [{ query: GET_UNREAD_NOTIFICATION_COUNT }],
        awaitRefetchQueries: false,
      })
        .then(({ data }) => {
          const count = data?.markRoomNotificationsAsRead || 0;
          console.log(
            `[ChatContext] Marked ${count} notification(s) as read for room:`,
            chatInfo.roomId
          );
        })
        .catch((error) => {
          console.error(
            "[ChatContext] Failed to mark room notifications as read:",
            error
          );
        });
    },
    [markRoomNotificationsAsRead]
  );

  const incrementUnreadCount = useCallback((roomId) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [roomId]: (prev[roomId] || 0) + 1,
    }));
  }, []);

  // Subscribe to message notifications (for sound and popup)
  // Only triggers for message-type notifications, filters by current user
  useSubscription(NOTIFICATION_CREATED_SUBSCRIPTION, {
    skip: !currentUser?.id,
    onData: ({ data: subData }) => {
      const notification = subData?.data?.notificationCreated;

      if (notification && notification.type === "message") {
        const roomId = notification.metadata?.roomId;
        const sender = notification.fromUser;
        const messageContent = notification.message;

        // Check if chat window is already open for this room
        const isChatWindowOpen = openChats.some(
          (chat) => chat.roomId === roomId
        );

        // Check if user is on the Messages page viewing THIS specific room
        const isViewingThisRoom = location.pathname === `/messages/${roomId}`;

        // Don't send notifications only if user is actively viewing this specific chat
        const shouldSendNotification = !isChatWindowOpen && !isViewingThisRoom;

        if (shouldSendNotification) {
          // Early visibility into env before any branching or errors
          const title = `New message from ${sender?.firstName || "Unknown"} ${
            sender?.lastName || ""
          }`;
          const electronBridge = window?.electron;

          // Play sound for new message
          notificationService.playSound();

          if (electronBridge?.showNotification) {
            // Native path (Electron): send to main process; skip AntD toast
            electronBridge.showNotification(title, {
              body: messageContent,
              icon: "/images/logo192.png",
              silent: false,
              data: {
                url: `/messages/${roomId}`,
                roomId,
              },
            });
          } else if (window.electron || window.isElectron) {
            console.warn(
              "[ChatContext] Electron detected but showNotification bridge missing; skipping web/SW notifications"
            );
            return;
          } else {
            // Web path: AntD toast + browser notification when not focused
            notificationService.showNotification({
              sender,
              message: messageContent,
              roomId,
              onClick: () =>
                openChatWindow({ roomId, name: sender?.firstName || "Chat" }),
            });

            if (document.hidden) {
              notificationService.showBrowserNotification({
                title,
                body: messageContent,
                icon: "/images/logo192.png",
                badge: "/images/favicon-96x96.png",
                tag: `chat-${roomId}`,
                data: {
                  url: `/messages/${roomId}`,
                  roomId,
                },
              });
            }
          }

          // Increment unread count
          if (roomId) {
            incrementUnreadCount(roomId);
          }
        } else {
          console.log(
            "[ChatContext] Skipping notifications - user is actively viewing this chat room"
          );
        }
      }
    },
  });

  // NOTE: We don't use a global CHAT_MESSAGE_ADDED subscription here because:
  // 1. It would receive ALL messages, including from rooms the user isn't in
  // 2. Room-specific subscriptions in MessageList handle real-time updates for open chats
  // 3. The NOTIFICATION_CREATED subscription handles notifications for closed chats
  // 4. This prevents the bug where User B gets popup for messages between A and C

  const closeChatWindow = useCallback((roomId) => {
    setOpenChats((prev) => prev.filter((chat) => chat.roomId !== roomId));
    setMinimizedChats((prev) => {
      const newState = { ...prev };
      delete newState[roomId];
      return newState;
    });
  }, []);

  const toggleMinimize = useCallback((roomId) => {
    setMinimizedChats((prev) => ({
      ...prev,
      [roomId]: !prev[roomId],
    }));
  }, []);

  const updateUnreadCount = useCallback((roomId, count) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [roomId]: count,
    }));
  }, []);

  const clearUnreadCount = useCallback((roomId) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [roomId]: 0,
    }));
  }, []);

  // Listen for service worker messages to open chat
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === "OPEN_CHAT" && event.data.roomId) {
        const roomId = event.data.roomId;
        // Find the room details
        const room = chatRooms.find((r) => r.id === roomId);
        if (room) {
          openChatWindow({
            roomId: room.id,
            name: room.name || "Chat",
            type: room.type,
          });
        }
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, [chatRooms, openChatWindow]);

  const value = {
    openChats,
    setOpenChats,
    minimizedChats,
    setMinimizedChats,
    unreadCounts,
    totalUnreadCount,
    openChatWindow,
    closeChatWindow,
    toggleMinimize,
    incrementUnreadCount,
    updateUnreadCount,
    clearUnreadCount,
    chatRooms,
    chatLoading,
    refetchChats,
    currentUser,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
