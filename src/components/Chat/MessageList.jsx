import React, { useEffect, useRef, useState } from "react";
import { useQuery, useSubscription, useMutation } from "@apollo/client";
import { Spin, Empty, List } from "antd";
import Message from "./Message";
import {
  GET_CHAT_MESSAGES,
  CHAT_MESSAGE_ADDED,
  CHAT_MESSAGE_UPDATED,
  CHAT_MESSAGE_DELETED,
  MARK_CHAT_AS_READ,
} from "../../graphql/chat";

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
  const { loading, error } = useQuery(GET_CHAT_MESSAGES, {
    variables: { roomId, limit: 50 },
    skip: !roomId,
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

  // Auto-scroll on mount and when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      <List
        dataSource={messages}
        renderItem={(message) => (
          <Message
            key={message.id}
            message={message}
            onReply={onReply}
            onEdit={onEdit}
            members={members}
          />
        )}
        split={false}
        style={{ backgroundColor: "transparent", margin: 0, padding: 0 }}
      />
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
