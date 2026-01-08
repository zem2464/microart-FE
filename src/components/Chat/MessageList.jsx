import React, { useEffect, useRef, useState } from "react";
import { useQuery, useSubscription, useMutation } from "@apollo/client";
import { Spin, Empty, List, Typography } from "antd";
import Message from "./Message";
import {
  GET_CHAT_MESSAGES,
  CHAT_MESSAGE_ADDED,
  CHAT_MESSAGE_UPDATED,
  CHAT_MESSAGE_DELETED,
  MARK_CHAT_AS_READ,
} from "../../graphql/chat";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const { Text } = Typography;

const MessageList = ({ roomId, onReply, onEdit, members }) => {
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([]);

  // Mutation to mark chat as read
  const [markChatAsRead] = useMutation(MARK_CHAT_AS_READ, {
    onError: (error) => {
      console.error("Error marking chat as read:", error);
    },
  });

  // Mark as read when messages change
  useEffect(() => {
    if (roomId && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      markChatAsRead({
        variables: {
          roomId,
          messageId: lastMessage.id,
        },
      }).catch((e) => console.error("Failed to mark as read:", e));
    }
  }, [messages, roomId, markChatAsRead]);

  // Fetch initial messages
  const { loading, error, refetch: refetchMessages } = useQuery(GET_CHAT_MESSAGES, {
    variables: { roomId, limit: 50 },
    skip: !roomId,
    fetchPolicy: 'network-only', // Always fetch fresh data from server
    onCompleted: (data) => {
      if (data?.chatMessages) {
        setMessages(data.chatMessages);
      }
    },
  });

  // Subscribe to new messages
  useSubscription(CHAT_MESSAGE_ADDED, {
    variables: { roomId },
    skip: !roomId,
    onData: ({ data }) => {
      if (data?.data?.chatMessageAdded) {
        const newMessage = data.data.chatMessageAdded;
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
        // Auto-scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    },
    onError: (error) => {
      console.log("Subscription error (non-critical):", error.message);
    },
  });

  // Subscribe to message updates (for edits)
  useSubscription(CHAT_MESSAGE_UPDATED, {
    variables: { roomId },
    skip: !roomId,
    onData: ({ data }) => {
      if (data?.data?.chatMessageUpdated) {
        const updatedMessage = data.data.chatMessageUpdated;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m
          )
        );
      }
    },
    onError: (error) => {
      console.log("Update subscription error (non-critical):", error.message);
    },
  });

  // Subscribe to message deletes
  useSubscription(CHAT_MESSAGE_DELETED, {
    variables: { roomId },
    skip: !roomId,
    onData: ({ data }) => {
      if (data?.data?.chatMessageDeleted) {
        const deletedInfo = data.data.chatMessageDeleted;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === deletedInfo.id
              ? { ...m, isDeleted: true, content: "This message was deleted" }
              : m
          )
        );
      }
    },
    onError: (error) => {
      console.log("Delete subscription error (non-critical):", error.message);
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages]);

  // Refetch messages when roomId changes
  useEffect(() => {
    if (roomId && refetchMessages) {
      refetchMessages();
    }
  }, [roomId, refetchMessages]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ padding: "24px" }}
      >
        <Spin />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center h-full text-red-500"
        style={{ padding: "24px" }}
      >
        Error loading messages
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ padding: "24px" }}
      >
        <Empty
          description="No messages yet"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  // Group messages by date
  const groupedMessages = messages.reduce((acc, message) => {
    const dateKey = dayjs(message.createdAt).format("YYYY-MM-DD");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(message);
    return acc;
  }, {});

  const formatDateSeparator = (dateString) => {
    const date = dayjs(dateString);
    const today = dayjs();
    const yesterday = dayjs().subtract(1, "day");

    if (date.isSame(today, "day")) {
      return "Today";
    } else if (date.isSame(yesterday, "day")) {
      return "Yesterday";
    } else if (date.isSame(today, "year")) {
      return date.format("DD MMM");
    } else {
      return date.format("DD MMM YYYY");
    }
  };

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "16px",
        backgroundColor: "#e5ddd5",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <div style={{ backgroundColor: "transparent", margin: 0, padding: 0 }}>
        {Object.keys(groupedMessages)
          .sort((a, b) => new Date(a) - new Date(b))
          .map((dateKey) => (
            <div key={dateKey}>
              {/* Date Separator */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  margin: "16px 0",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    backgroundColor: "rgba(0,0,0,0.1)",
                  }}
                />
                <Text
                  type="secondary"
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    color: "rgba(0,0,0,0.45)",
                  }}
                >
                  {formatDateSeparator(dateKey)}
                </Text>
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    backgroundColor: "rgba(0,0,0,0.1)",
                  }}
                />
              </div>

              {/* Messages for this date */}
              {groupedMessages[dateKey].map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  onReply={onReply}
                  onEdit={onEdit}
                  members={members}
                />
              ))}
            </div>
          ))}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
