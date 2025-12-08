import React from 'react';
import { useChatContext } from '../../contexts/ChatContext';
import ChatWindow from './ChatWindow';

const ChatFooter = () => {
    const { openChats = [], minimizedChats = {} } = useChatContext();

    if (!openChats || openChats.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-0 right-4 flex gap-2 z-50" style={{ pointerEvents: 'none' }}>
            {openChats.map((chat) => (
                <div key={chat.roomId} style={{ pointerEvents: 'auto' }}>
                    <ChatWindow
                        roomId={chat.roomId}
                        name={chat.name}
                        type={chat.type}
                        isMinimized={minimizedChats[chat.roomId]}
                    />
                </div>
            ))}
        </div>
    );
};

export default ChatFooter;
