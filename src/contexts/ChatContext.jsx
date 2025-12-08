import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useSubscription, useReactiveVar, useQuery } from '@apollo/client';
import { CHAT_MESSAGE_ADDED, GET_MY_CHAT_ROOMS } from '../graphql/chat';
import { userCacheVar } from '../cache/userCacheVar';
import NotificationService from '../services/NotificationService';

const ChatContext = createContext();

export const useChatContext = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChatContext must be used within ChatProvider');
    }
    return context;
};

export const ChatProvider = ({ children }) => {
    const [openChats, setOpenChats] = useState([]);
    const [minimizedChats, setMinimizedChats] = useState({});
    // Store unread counts keyed by roomId
    const [unreadCounts, setUnreadCounts] = useState({});
    const currentUser = useReactiveVar(userCacheVar);

    // Fetch chat rooms centrally
    const { data: chatData, loading: chatLoading, refetch: refetchChats } = useQuery(GET_MY_CHAT_ROOMS, {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        skip: !currentUser?.id,
        onCompleted: (data) => {
            // Initialize unread counts from server data
            if (data?.myChatRooms) {
                const counts = {};
                data.myChatRooms.forEach(room => {
                    counts[room.id] = room.unreadCount || 0;
                });
                setUnreadCounts(counts);
            }
        }
    });

    const chatRooms = chatData?.myChatRooms || [];

    // Calculate total unread count
    const totalUnreadCount = useMemo(() => {
        return Object.values(unreadCounts).reduce((sum, count) => sum + (count || 0), 0);
    }, [unreadCounts]);

    // Open chat window function (used by notification service)
    const openChatWindow = useCallback((chatInfo) => {
        setOpenChats(prev => {
            if (prev.find(chat => chat.roomId === chatInfo.roomId)) {
                // If already open, just unminimize it
                setMinimizedChats(prevMin => ({ ...prevMin, [chatInfo.roomId]: false }));
                return prev;
            }
            return [...prev, chatInfo];
        });
        // Clear minimized state when opening
        setMinimizedChats(prev => ({ ...prev, [chatInfo.roomId]: false }));

        // Reset unread count locally when opening
        setUnreadCounts(prev => ({ ...prev, [chatInfo.roomId]: 0 }));
    }, []);

    const incrementUnreadCount = useCallback((roomId) => {
        setUnreadCounts(prev => ({
            ...prev,
            [roomId]: (prev[roomId] || 0) + 1
        }));
    }, []);

    // Global subscription for all new messages
    // Automatically activates when user logs in (currentUser.id is available)
    useSubscription(CHAT_MESSAGE_ADDED, {
        skip: !currentUser?.id, // Only active when user is logged in
        onData: ({ data }) => {
            if (data?.data?.chatMessageAdded) {
                const newMessage = data.data.chatMessageAdded;
                const roomId = newMessage.chatRoom?.id;

                // Don't notify for own messages
                if (newMessage.sender?.id === currentUser?.id) {
                    return;
                }

                // Check if chat is already open
                const existingChat = openChats.find(chat => chat.roomId === roomId);

                // Auto-open chat window if not already open
                if (!existingChat && roomId) {
                    const chatName = newMessage.sender
                        ? `${newMessage.sender.firstName} ${newMessage.sender.lastName} `
                        : 'New Message';

                    openChatWindow({
                        roomId: roomId,
                        name: chatName,
                        type: newMessage.chatRoom?.type || 'direct'
                    });
                }

                // Use notification service for all notifications
                NotificationService.notifyNewMessage({
                    message: newMessage,
                    sender: newMessage.sender,
                    roomId: roomId,
                    onOpen: () => {
                        openChatWindow({
                            roomId: roomId,
                            name: `${newMessage.sender.firstName} ${newMessage.sender.lastName} `,
                            type: newMessage.chatRoom?.type || 'direct'
                        });
                    }
                });

                // Increment unread count if chat is closed or minimized
                if (!existingChat || minimizedChats[roomId]) {
                    incrementUnreadCount(roomId);
                }
            }
        },
        onError: (error) => {
            console.log('Chat subscription error:', error.message);
        },
    });

    const closeChatWindow = useCallback((roomId) => {
        setOpenChats(prev => prev.filter(chat => chat.roomId !== roomId));
        setMinimizedChats(prev => {
            const newState = { ...prev };
            delete newState[roomId];
            return newState;
        });
    }, []);

    const toggleMinimize = useCallback((roomId) => {
        setMinimizedChats(prev => ({
            ...prev,
            [roomId]: !prev[roomId]
        }));
    }, []);

    const updateUnreadCount = useCallback((roomId, count) => {
        setUnreadCounts(prev => ({
            ...prev,
            [roomId]: count
        }));
    }, []);

    const clearUnreadCount = useCallback((roomId) => {
        setUnreadCounts(prev => ({
            ...prev,
            [roomId]: 0
        }));
    }, []);

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
        currentUser
    };

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};
