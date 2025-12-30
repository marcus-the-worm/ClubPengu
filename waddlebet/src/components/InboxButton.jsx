/**
 * InboxButton - HUD button to open inbox with unread badge
 */

import React from 'react';
import { useChallenge } from '../challenge';

const InboxButton = ({ compact = false }) => {
    const { toggleInbox, unreadCount, showInbox } = useChallenge();
    
    return (
        <button
            data-inbox-button
            onClick={toggleInbox}
            className={`relative bg-gray-700/80 hover:bg-gray-600 active:bg-gray-500 backdrop-blur-sm text-white rounded-lg retro-text transition-all flex items-center justify-center ${
                showInbox ? 'ring-2 ring-cyan-400' : ''
            } ${compact ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 sm:px-3 sm:py-2 sm:w-auto sm:h-auto text-xs'}`}
            title="Inbox"
        >
            📥
            {unreadCount > 0 && (
                <span className={`absolute bg-red-500 rounded-full text-white flex items-center justify-center font-bold animate-pulse ${
                    compact 
                        ? '-top-1 -right-1 w-3 h-3 text-[8px]' 
                        : '-top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-5 sm:h-5 text-[10px] sm:text-xs'
                }`}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    );
};

export default InboxButton;

