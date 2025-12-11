/**
 * InboxButton - HUD button to open inbox with unread badge
 */

import React from 'react';
import { useChallenge } from '../challenge';

const InboxButton = () => {
    const { toggleInbox, unreadCount, showInbox } = useChallenge();
    
    return (
        <button
            data-inbox-button
            onClick={toggleInbox}
            className={`relative bg-gray-700/80 hover:bg-gray-600 active:bg-gray-500 backdrop-blur-sm text-white w-9 h-9 sm:px-3 sm:py-2 sm:w-auto sm:h-auto rounded-lg retro-text text-xs transition-all flex items-center justify-center ${
                showInbox ? 'ring-2 ring-cyan-400' : ''
            }`}
            title="Inbox"
        >
            📥
            {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full text-white text-[10px] sm:text-xs flex items-center justify-center font-bold animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    );
};

export default InboxButton;

