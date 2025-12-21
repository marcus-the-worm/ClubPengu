/**
 * Igloo Modal Component Tests
 * Tests IglooRentalModal, IglooEntryModal, and IglooSettingsPanel components
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock X402Service
const mockCreateRentPayment = vi.fn();
const mockCreateEntryFeePayment = vi.fn();

vi.mock('../wallet/X402Service.js', () => ({
    default: {
        getInstance: vi.fn(() => ({
            isReady: vi.fn(() => true),
            createRentPayment: mockCreateRentPayment,
            createEntryFeePayment: mockCreateEntryFeePayment
        }))
    }
}));

// Mock config
vi.mock('../config/solana.js', () => ({
    CPW3_TOKEN_ADDRESS: 'CPw3TEST',
    RENT_WALLET_ADDRESS: 'RentWallet123',
    IGLOO_CONFIG: {
        DAILY_RENT_CPW3: 10000,
        MINIMUM_BALANCE_CPW3: 70000,
        GRACE_PERIOD_HOURS: 12,
        RESERVED_IGLOOS: {}
    }
}));

// Mock roomConfig for banner styles
vi.mock('../config/roomConfig.js', () => ({
    IGLOO_BANNER_STYLES: [
        { bgGradient: ['#1a1a2e', '#16213e', '#0f3460'], textColor: '#fff', accentColor: '#0ff' },
        { bgGradient: ['#2d132c', '#801336', '#ee4540'], textColor: '#fff', accentColor: '#ff0' },
        { bgGradient: ['#1d2951', '#0d1b2a', '#1b263b'], textColor: '#fff', accentColor: '#0f0' },
        { bgGradient: ['#3c1642', '#086375', '#1dd3b0'], textColor: '#fff', accentColor: '#fff' }
    ]
}));

// ==================== RENTAL MODAL TESTS ====================
describe('IglooRentalModal', () => {
    const mockOnClose = vi.fn();
    const mockOnRentSuccess = vi.fn();
    
    beforeEach(() => {
        vi.clearAllMocks();
        mockCreateRentPayment.mockReset();
    });
    
    it('should render rental information when open', async () => {
        const { default: IglooRentalModal } = await import('../components/IglooRentalModal.jsx');
        
        render(
            <IglooRentalModal 
                isOpen={true}
                onClose={mockOnClose}
                iglooData={{ iglooId: 'igloo1', isRented: false }}
                walletAddress="TestWallet123"
            />
        );
        
        expect(screen.getByText(/Igloo 1/i)).toBeInTheDocument();
        expect(screen.getByText(/Rental Agreement/i)).toBeInTheDocument();
    });
    
    it('should show available status for unrented igloo', async () => {
        const { default: IglooRentalModal } = await import('../components/IglooRentalModal.jsx');
        
        render(
            <IglooRentalModal 
                isOpen={true}
                onClose={mockOnClose}
                iglooData={{ iglooId: 'igloo1', isRented: false }}
                walletAddress="TestWallet123"
            />
        );
        
        expect(screen.getByText(/Available for Rent/i)).toBeInTheDocument();
    });
    
    it('should show rented status when igloo is rented', async () => {
        const { default: IglooRentalModal } = await import('../components/IglooRentalModal.jsx');
        
        render(
            <IglooRentalModal 
                isOpen={true}
                onClose={mockOnClose}
                iglooData={{ 
                    iglooId: 'igloo1', 
                    isRented: true, 
                    ownerUsername: 'SomeOwner' 
                }}
                walletAddress="TestWallet123"
            />
        );
        
        expect(screen.getByText(/Currently Rented/i)).toBeInTheDocument();
        expect(screen.getByText(/SomeOwner/i)).toBeInTheDocument();
    });
    
    it('should close modal on close button click', async () => {
        const { default: IglooRentalModal } = await import('../components/IglooRentalModal.jsx');
        
        render(
            <IglooRentalModal 
                isOpen={true}
                onClose={mockOnClose}
                iglooData={{ iglooId: 'igloo1', isRented: false }}
                walletAddress="TestWallet123"
            />
        );
        
        // Find close button (×)
        const closeButton = screen.getByText('×');
        fireEvent.click(closeButton);
        
        expect(mockOnClose).toHaveBeenCalled();
    });
    
    it('should show rent cost information', async () => {
        const { default: IglooRentalModal } = await import('../components/IglooRentalModal.jsx');
        
        render(
            <IglooRentalModal 
                isOpen={true}
                onClose={mockOnClose}
                iglooData={{ iglooId: 'igloo1', isRented: false }}
                walletAddress="TestWallet123"
            />
        );
        
        // Should show daily rent cost - use more specific selector
        expect(screen.getByText('Daily Rent:')).toBeInTheDocument();
        // The cost appears in both the details and the rent button
        expect(screen.getAllByText(/10,000/i).length).toBeGreaterThanOrEqual(1);
    });
    
    it('should not render when closed', async () => {
        const { default: IglooRentalModal } = await import('../components/IglooRentalModal.jsx');
        
        const { container } = render(
            <IglooRentalModal 
                isOpen={false}
                onClose={mockOnClose}
                iglooData={{ iglooId: 'igloo1', isRented: false }}
                walletAddress="TestWallet123"
            />
        );
        
        expect(container.firstChild).toBeNull();
    });
});

// ==================== ENTRY MODAL TESTS ====================
describe('IglooEntryModal', () => {
    const mockOnClose = vi.fn();
    const mockOnEntrySuccess = vi.fn();
    
    beforeEach(() => {
        vi.clearAllMocks();
        mockCreateEntryFeePayment.mockReset();
    });
    
    it('should show locked message for private igloo', async () => {
        const { default: IglooEntryModal } = await import('../components/IglooEntryModal.jsx');
        
        render(
            <IglooEntryModal 
                isOpen={true}
                onClose={mockOnClose}
                iglooData={{ iglooId: 'igloo1', ownerUsername: 'SomeOwner' }}
                entryCheck={{
                    canEnter: false,
                    reason: 'IGLOO_LOCKED',
                    message: 'This igloo is private'
                }}
                walletAddress="TestWallet123"
            />
        );
        
        expect(screen.getByText(/Igloo Locked/i)).toBeInTheDocument();
        expect(screen.getByText(/private/i)).toBeInTheDocument();
    });
    
    it('should show token requirement for token-gated igloo', async () => {
        const { default: IglooEntryModal } = await import('../components/IglooEntryModal.jsx');
        
        render(
            <IglooEntryModal 
                isOpen={true}
                onClose={mockOnClose}
                iglooData={{ iglooId: 'igloo1', ownerUsername: 'SomeOwner' }}
                entryCheck={{
                    canEnter: false,
                    reason: 'TOKEN_REQUIRED',
                    tokenRequired: { symbol: '$COOL', minimum: 1000, address: 'Token123' }
                }}
                walletAddress="TestWallet123"
            />
        );
        
        expect(screen.getByText(/Token Required/i)).toBeInTheDocument();
        expect(screen.getByText(/\$COOL/i)).toBeInTheDocument();
    });
    
    it('should show entry fee payment option', async () => {
        const { default: IglooEntryModal } = await import('../components/IglooEntryModal.jsx');
        
        render(
            <IglooEntryModal 
                isOpen={true}
                onClose={mockOnClose}
                iglooData={{ 
                    iglooId: 'igloo1', 
                    ownerUsername: 'SomeOwner',
                    ownerWallet: 'OwnerWallet123' 
                }}
                entryCheck={{
                    canEnter: false,
                    reason: 'ENTRY_FEE_REQUIRED',
                    requiresPayment: true,
                    paymentAmount: 500
                }}
                walletAddress="TestWallet123"
            />
        );
        
        expect(screen.getByText(/Entry Fee Required/i)).toBeInTheDocument();
        // Fee amount appears in description and button - check the button specifically
        expect(screen.getByRole('button', { name: /Pay 500 CPw3/i })).toBeInTheDocument();
    });
    
    it('should close on close/cancel button click', async () => {
        const { default: IglooEntryModal } = await import('../components/IglooEntryModal.jsx');
        
        render(
            <IglooEntryModal 
                isOpen={true}
                onClose={mockOnClose}
                iglooData={{ iglooId: 'igloo1' }}
                entryCheck={{
                    canEnter: false,
                    reason: 'IGLOO_LOCKED'
                }}
                walletAddress="TestWallet123"
            />
        );
        
        const closeButton = screen.getByRole('button', { name: /Close/i });
        fireEvent.click(closeButton);
        
        expect(mockOnClose).toHaveBeenCalled();
    });
    
    it('should not render when closed', async () => {
        const { default: IglooEntryModal } = await import('../components/IglooEntryModal.jsx');
        
        const { container } = render(
            <IglooEntryModal 
                isOpen={false}
                onClose={mockOnClose}
                iglooData={{ iglooId: 'igloo1' }}
                entryCheck={{ canEnter: false, reason: 'IGLOO_LOCKED' }}
                walletAddress="TestWallet123"
            />
        );
        
        expect(container.firstChild).toBeNull();
    });
});

// ==================== SETTINGS PANEL TESTS ====================
describe('IglooSettingsPanel', () => {
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();
    
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });
    
    it('should render all access type options', async () => {
        const { default: IglooSettingsPanel } = await import('../components/IglooSettingsPanel.jsx');
        
        render(
            <IglooSettingsPanel 
                isOpen={true}
                onClose={mockOnClose}
                iglooData={{
                    iglooId: 'igloo1',
                    accessType: 'private',
                    tokenGate: { enabled: false },
                    entryFee: { enabled: false, amount: 0 },
                    banner: { title: '', ticker: '', shill: '' }
                }}
                onSave={mockOnSave}
            />
        );
        
        // Check access type dropdown has all options - use exact text to avoid duplicates
        expect(screen.getByText('🔒 Private (Owner Only)')).toBeInTheDocument();
        expect(screen.getByText('🌐 Public (Anyone)')).toBeInTheDocument();
        expect(screen.getByText('🪙 Token Gated')).toBeInTheDocument();
        expect(screen.getByText('💰 Entry Fee')).toBeInTheDocument();
    });
    
    it('should show token gate fields when token access selected', async () => {
        const { default: IglooSettingsPanel } = await import('../components/IglooSettingsPanel.jsx');
        
        render(
            <IglooSettingsPanel 
                isOpen={true}
                onClose={mockOnClose}
                iglooData={{
                    iglooId: 'igloo1',
                    accessType: 'token',
                    tokenGate: { enabled: true, tokenAddress: '', tokenSymbol: '', minimumBalance: 1 },
                    entryFee: { enabled: false, amount: 0 },
                    banner: {}
                }}
                onSave={mockOnSave}
            />
        );
        
        // Should show token gate settings section
        expect(screen.getByText(/Token Gate Settings/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Token contract address/i)).toBeInTheDocument();
    });
    
    it('should show entry fee field when fee access selected', async () => {
        const { default: IglooSettingsPanel } = await import('../components/IglooSettingsPanel.jsx');
        
        render(
            <IglooSettingsPanel 
                isOpen={true}
                onClose={mockOnClose}
                iglooData={{
                    iglooId: 'igloo1',
                    accessType: 'fee',
                    tokenGate: { enabled: false },
                    entryFee: { enabled: true, amount: 500 },
                    banner: {}
                }}
                onSave={mockOnSave}
            />
        );
        
        // Should show entry fee settings section
        expect(screen.getByText(/Entry Fee Settings/i)).toBeInTheDocument();
        expect(screen.getByText(/Fee Amount \(CPw3\)/i)).toBeInTheDocument();
    });
    
    it('should have save and cancel buttons', async () => {
        const { default: IglooSettingsPanel } = await import('../components/IglooSettingsPanel.jsx');
        
        render(
            <IglooSettingsPanel 
                isOpen={true}
                onClose={mockOnClose}
                iglooData={{
                    iglooId: 'igloo1',
                    accessType: 'private',
                    tokenGate: { enabled: false },
                    entryFee: { enabled: false, amount: 0 },
                    banner: { title: '', ticker: '', shill: '' }
                }}
                onSave={mockOnSave}
            />
        );
        
        expect(screen.getByRole('button', { name: /Save Settings/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });
    
    it('should call onClose when cancel clicked', async () => {
        const { default: IglooSettingsPanel } = await import('../components/IglooSettingsPanel.jsx');
        
        render(
            <IglooSettingsPanel 
                isOpen={true}
                onClose={mockOnClose}
                iglooData={{
                    iglooId: 'igloo1',
                    accessType: 'private',
                    tokenGate: { enabled: false },
                    entryFee: { enabled: false, amount: 0 },
                    banner: {}
                }}
                onSave={mockOnSave}
            />
        );
        
        const cancelButton = screen.getByRole('button', { name: /Cancel/i });
        fireEvent.click(cancelButton);
        
        expect(mockOnClose).toHaveBeenCalled();
    });
    
    it('should not render when closed', async () => {
        const { default: IglooSettingsPanel } = await import('../components/IglooSettingsPanel.jsx');
        
        const { container } = render(
            <IglooSettingsPanel 
                isOpen={false}
                onClose={mockOnClose}
                iglooData={{ iglooId: 'igloo1' }}
                onSave={mockOnSave}
            />
        );
        
        expect(container.firstChild).toBeNull();
    });
});
