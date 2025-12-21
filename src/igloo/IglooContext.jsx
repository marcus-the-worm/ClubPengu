/**
 * IglooContext - Client-side state management for igloo system
 * Handles igloo data fetching, rental UI state, and entry access checks
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useMultiplayer } from '../multiplayer/MultiplayerContext.jsx';
import { IGLOO_CONFIG } from '../config/solana.js';

const IglooContext = createContext(null);

export const useIgloo = () => {
    const context = useContext(IglooContext);
    if (!context) {
        throw new Error('useIgloo must be used within an IglooProvider');
    }
    return context;
};

export const IglooProvider = ({ children }) => {
    const { send, onMessage, isAuthenticated, walletAddress } = useMultiplayer();
    
    // Igloo data
    const [igloos, setIgloos] = useState([]); // All igloos public info
    const [myRentals, setMyRentals] = useState([]); // User's rented igloos
    const [selectedIgloo, setSelectedIgloo] = useState(null); // Currently selected igloo for modal
    
    // UI state
    const [showRentalModal, setShowRentalModal] = useState(false);
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);
    const [showEntryModal, setShowEntryModal] = useState(false);
    const [entryCheckResult, setEntryCheckResult] = useState(null);
    const [pendingIglooEntry, setPendingIglooEntry] = useState(null);
    
    // Loading states
    const [isLoading, setIsLoading] = useState(false);
    
    // Fetch all igloos on mount
    useEffect(() => {
        if (send) {
            send({ type: 'igloo_list' });
        }
    }, [send]);
    
    // Fetch user's rentals when authenticated
    useEffect(() => {
        if (send && isAuthenticated && walletAddress) {
            send({ type: 'igloo_my_rentals' });
        }
    }, [send, isAuthenticated, walletAddress]);
    
    // Handle server messages
    useEffect(() => {
        if (!onMessage) return;
        
        const unsubscribe = onMessage((msg) => {
            switch (msg.type) {
                case 'igloo_list':
                    setIgloos(msg.igloos || []);
                    break;
                    
                case 'igloo_my_rentals':
                    setMyRentals(msg.igloos || []);
                    break;
                    
                case 'igloo_info':
                    // Update specific igloo in list
                    if (msg.igloo) {
                        setIgloos(prev => prev.map(i => 
                            i.iglooId === msg.igloo.iglooId ? msg.igloo : i
                        ));
                    }
                    break;
                    
                case 'igloo_can_enter':
                    setEntryCheckResult({
                        iglooId: msg.iglooId,
                        igloo: msg.igloo,
                        canEnter: msg.canEnter,
                        reason: msg.reason,
                        message: msg.message,
                        requiresPayment: msg.requiresPayment,
                        paymentAmount: msg.paymentAmount,
                        tokenRequired: msg.tokenRequired,
                        isOwner: msg.isOwner
                    });
                    
                    // If can't enter and not owner, show modal
                    if (!msg.canEnter && !msg.isOwner) {
                        setSelectedIgloo(msg.igloo);
                        setShowEntryModal(true);
                    }
                    break;
                    
                case 'igloo_can_rent':
                    // Update rental modal with affordability info
                    break;
                    
                case 'igloo_rent_result':
                    if (msg.success) {
                        // Refresh igloos list and user's rentals
                        send({ type: 'igloo_list' });
                        send({ type: 'igloo_my_rentals' });
                    }
                    setIsLoading(false);
                    break;
                    
                case 'igloo_pay_entry_result':
                    if (msg.success) {
                        // Entry fee paid - can now enter
                        setShowEntryModal(false);
                        // Trigger the pending room change
                        if (pendingIglooEntry) {
                            pendingIglooEntry.callback();
                            setPendingIglooEntry(null);
                        }
                    }
                    setIsLoading(false);
                    break;
                    
                case 'igloo_settings_result':
                    if (msg.success && msg.igloo) {
                        setMyRentals(prev => prev.map(i =>
                            i.iglooId === msg.igloo.iglooId ? msg.igloo : i
                        ));
                    }
                    setIsLoading(false);
                    break;
                    
                case 'igloo_owner_info':
                    if (msg.igloo) {
                        setSelectedIgloo(msg.igloo);
                    }
                    break;
            }
        });
        
        return unsubscribe;
    }, [onMessage, send, pendingIglooEntry]);
    
    /**
     * Check if user can enter an igloo
     * @param {string} iglooId 
     * @param {Function} onSuccess - Called if entry is allowed
     * @returns {boolean} - True if immediate entry allowed, false if blocked
     */
    const checkIglooEntry = useCallback(async (iglooId, onSuccess) => {
        if (!send) return true; // Allow in offline mode
        
        // Store the pending callback
        setPendingIglooEntry({ iglooId, callback: onSuccess });
        
        // Request entry check from server
        send({ 
            type: 'igloo_can_enter', 
            iglooId,
            tokenBalance: 0 // TODO: Get actual token balance
        });
        
        // Return false to indicate we need to wait for response
        return false;
    }, [send]);
    
    /**
     * Process entry check result
     * Called after server responds to igloo_can_enter
     */
    const processEntryCheck = useCallback(() => {
        if (!entryCheckResult) return;
        
        if (entryCheckResult.canEnter) {
            // Allowed - execute pending callback
            if (pendingIglooEntry && pendingIglooEntry.iglooId === entryCheckResult.iglooId) {
                pendingIglooEntry.callback();
                setPendingIglooEntry(null);
            }
            return true;
        }
        
        // Not allowed - modal will show
        return false;
    }, [entryCheckResult, pendingIglooEntry]);
    
    // Process entry check when result arrives
    useEffect(() => {
        if (entryCheckResult) {
            processEntryCheck();
        }
    }, [entryCheckResult, processEntryCheck]);
    
    /**
     * Open rental modal for an igloo
     */
    const openRentalModal = useCallback((iglooId) => {
        const igloo = igloos.find(i => i.iglooId === iglooId);
        setSelectedIgloo(igloo);
        setShowRentalModal(true);
        
        // Request can_rent check
        if (send) {
            send({ type: 'igloo_can_rent', iglooId });
        }
    }, [igloos, send]);
    
    /**
     * Open settings panel for owned igloo
     */
    const openSettingsPanel = useCallback((iglooId) => {
        const igloo = myRentals.find(i => i.iglooId === iglooId);
        setSelectedIgloo(igloo);
        setShowSettingsPanel(true);
        
        // Request full owner info
        if (send) {
            send({ type: 'igloo_owner_info', iglooId });
        }
    }, [myRentals, send]);
    
    /**
     * Update igloo settings
     */
    const updateSettings = useCallback((iglooId, settings) => {
        if (!send) return;
        setIsLoading(true);
        send({ type: 'igloo_update_settings', iglooId, settings });
    }, [send]);
    
    /**
     * Get igloo data by ID
     */
    const getIgloo = useCallback((iglooId) => {
        return igloos.find(i => i.iglooId === iglooId);
    }, [igloos]);
    
    /**
     * Check if user owns an igloo
     */
    const isOwner = useCallback((iglooId) => {
        return myRentals.some(i => i.iglooId === iglooId);
    }, [myRentals]);
    
    /**
     * Get banner info for an igloo (for rendering)
     */
    const getBannerInfo = useCallback((iglooId) => {
        const igloo = igloos.find(i => i.iglooId === iglooId);
        if (!igloo) return null;
        
        return {
            ...igloo.banner,
            ownerUsername: igloo.ownerUsername,
            accessType: igloo.accessType,
            hasEntryFee: igloo.hasEntryFee,
            entryFeeAmount: igloo.entryFeeAmount,
            hasTokenGate: igloo.hasTokenGate,
            tokenGateInfo: igloo.tokenGateInfo,
            isRented: igloo.isRented,
            isPermanent: igloo.isPermanent
        };
    }, [igloos]);
    
    const value = {
        // Data
        igloos,
        myRentals,
        selectedIgloo,
        entryCheckResult,
        
        // UI State
        showRentalModal,
        showSettingsPanel,
        showEntryModal,
        isLoading,
        
        // UI Controls
        setShowRentalModal,
        setShowSettingsPanel,
        setShowEntryModal,
        
        // Actions
        checkIglooEntry,
        openRentalModal,
        openSettingsPanel,
        updateSettings,
        getIgloo,
        isOwner,
        getBannerInfo,
        
        // Config
        config: IGLOO_CONFIG
    };
    
    return (
        <IglooContext.Provider value={value}>
            {children}
        </IglooContext.Provider>
    );
};

export default IglooContext;

