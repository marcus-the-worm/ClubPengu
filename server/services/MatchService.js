/**
 * MatchService - Manages active P2P matches with MongoDB persistence
 * Server-authoritative match state and wager handling
 */

import { Match as MatchModel } from '../db/models/index.js';
import { isDBConnected } from '../db/connection.js';

// Turn time limit (30 seconds)
const TURN_TIME_LIMIT_MS = 30 * 1000;

// Card Jitsu card definitions
const CARD_ELEMENTS = ['fire', 'water', 'snow'];
const CARD_EMOJIS = {
    fire: ['🔥', '🌋', '☀️', '💥', '🌶️'],
    water: ['💧', '🌊', '🌧️', '❄️', '🐚'],
    snow: ['❄️', '⛄', '🏔️', '🌨️', '🧊']
};

// Tic Tac Toe winning combinations
const TTT_WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

// Connect 4 constants
const C4_ROWS = 6;
const C4_COLS = 7;
const C4_WIN_LENGTH = 4;

// Normalize game type
const normalizeGameType = (gameType) => {
    const mapping = {
        'card_jitsu': 'cardJitsu',
        'tic_tac_toe': 'ticTacToe',
        'connect4': 'connect4',
        'pong': 'pong'
    };
    return mapping[gameType] || gameType;
};

// Reverse normalize for server messages
const denormalizeGameType = (gameType) => {
    const mapping = {
        'cardJitsu': 'card_jitsu',
        'ticTacToe': 'tic_tac_toe',
        'connect4': 'connect4'
    };
    return mapping[gameType] || gameType;
};

class MatchService {
    constructor(statsService, userService, broadcastToRoom, sendToPlayer) {
        this.statsService = statsService;
        this.userService = userService;
        this.broadcastToRoom = broadcastToRoom;
        this.sendToPlayer = sendToPlayer;
        
        // Active matches (matchId -> match)
        this.matches = new Map();
        // Player to match mapping (playerId -> matchId)
        this.playerMatches = new Map();
        // Wallet to match mapping (walletAddress -> matchId)
        this.walletMatches = new Map();
        
        this.nextMatchId = 1;
        
        // Turn timer interval
        this.timerInterval = setInterval(() => this.checkTurnTimers(), 1000);
    }

    /**
     * Create a match from an accepted challenge
     */
    async createMatch(challenge, player1Data, player2Data) {
        const matchId = `match_${Date.now()}_${this.nextMatchId++}`;
        const gameType = denormalizeGameType(challenge.gameType);
        
        const match = {
            id: matchId,
            gameType,
            player1: {
                id: challenge.challengerId,
                wallet: challenge.challengerWallet,
                name: challenge.challengerName,
                appearance: challenge.challengerAppearance,
                position: player1Data?.position || { x: 0, y: 0, z: 0 }
            },
            player2: {
                id: challenge.targetId,
                wallet: challenge.targetWallet,
                name: challenge.targetName,
                appearance: challenge.targetAppearance,
                position: player2Data?.position || { x: 0, y: 0, z: 0 }
            },
            wagerAmount: challenge.wagerAmount,
            room: challenge.room,
            status: 'active',
            state: this._createInitialState(gameType),
            createdAt: Date.now(),
            endedAt: null,
            winnerId: null,
            winnerWallet: null
        };
        
        // Store in memory
        this.matches.set(matchId, match);
        this.playerMatches.set(challenge.challengerId, matchId);
        this.playerMatches.set(challenge.targetId, matchId);
        
        if (challenge.challengerWallet) {
            this.walletMatches.set(challenge.challengerWallet, matchId);
        }
        if (challenge.targetWallet) {
            this.walletMatches.set(challenge.targetWallet, matchId);
        }

        // Save to database
        if (isDBConnected()) {
            try {
                const dbMatch = new MatchModel({
                    matchId,
                    challengeId: challenge.id || challenge.challengeId,
                    player1: {
                        wallet: challenge.challengerWallet,
                        name: challenge.challengerName,
                        playerId: challenge.challengerId
                    },
                    player2: {
                        wallet: challenge.targetWallet,
                        name: challenge.targetName,
                        playerId: challenge.targetId
                    },
                    gameType: normalizeGameType(gameType),
                    wagerAmount: challenge.wagerAmount,
                    room: challenge.room,
                    status: 'active',
                    gameState: match.state
                });
                await dbMatch.save();
            } catch (error) {
                console.error('Error saving match to DB:', error);
            }
        }
        
        console.log(`🎮 Match started: ${match.player1.name} vs ${match.player2.name} (${gameType}, ${challenge.wagerAmount} coins)`);
        
        return match;
    }
    
    /**
     * Create initial game state based on game type
     */
    _createInitialState(gameType) {
        switch (gameType) {
            case 'tic_tac_toe':
                return {
                    board: Array(9).fill(null),
                    currentTurn: 'player1',
                    phase: 'playing',
                    winner: null,
                    winningLine: null,
                    turnStartedAt: Date.now()
                };
            
            case 'connect4':
                return {
                    board: Array(C4_ROWS * C4_COLS).fill(null),
                    currentTurn: 'player1',
                    phase: 'playing',
                    winner: null,
                    winningCells: null,
                    lastMove: null,
                    turnStartedAt: Date.now()
                };
            
            case 'card_jitsu':
            default:
                return {
                    round: 1,
                    phase: 'select',
                    player1Hand: this._generateHand(),
                    player2Hand: this._generateHand(),
                    player1SelectedCard: null,
                    player2SelectedCard: null,
                    player1Wins: { fire: 0, water: 0, snow: 0 },
                    player2Wins: { fire: 0, water: 0, snow: 0 },
                    turnStartedAt: Date.now(),
                    lastRoundResult: null
                };
        }
    }

    _generateCard() {
        const element = CARD_ELEMENTS[Math.floor(Math.random() * 3)];
        const power = Math.floor(Math.random() * 5) + 1;
        const emoji = CARD_EMOJIS[element][Math.floor(Math.random() * 5)];
        return {
            id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            element,
            power,
            emoji
        };
    }

    _generateHand() {
        return Array(5).fill(null).map(() => this._generateCard());
    }

    getMatch(matchId) {
        return this.matches.get(matchId);
    }

    getPlayerMatch(playerId) {
        const matchId = this.playerMatches.get(playerId);
        return matchId ? this.matches.get(matchId) : null;
    }

    isPlayerInMatch(playerId) {
        return this.playerMatches.has(playerId);
    }

    isWalletInMatch(walletAddress) {
        return walletAddress && this.walletMatches.has(walletAddress);
    }

    /**
     * Play a card/make a move
     */
    playCard(matchId, playerId, cardIndex) {
        const match = this.matches.get(matchId);
        if (!match) return { error: 'MATCH_NOT_FOUND' };
        if (match.status !== 'active') return { error: 'MATCH_NOT_ACTIVE' };

        if (match.gameType === 'tic_tac_toe') {
            return this._playTicTacToe(match, playerId, cardIndex);
        }
        if (match.gameType === 'connect4') {
            return this._playConnect4(match, playerId, cardIndex);
        }
        return this._playCardJitsu(match, playerId, cardIndex);
    }

    _playTicTacToe(match, playerId, cellIndex) {
        const state = match.state;
        if (state.phase !== 'playing') return { error: 'GAME_OVER' };

        const isPlayer1 = playerId === match.player1.id;
        const isPlayer2 = playerId === match.player2.id;
        if (!isPlayer1 && !isPlayer2) return { error: 'NOT_IN_MATCH' };

        const isMyTurn = (state.currentTurn === 'player1' && isPlayer1) || 
                         (state.currentTurn === 'player2' && isPlayer2);
        if (!isMyTurn) return { error: 'NOT_YOUR_TURN' };

        if (cellIndex < 0 || cellIndex > 8) return { error: 'INVALID_CELL' };
        if (state.board[cellIndex] !== null) return { error: 'CELL_TAKEN' };

        const symbol = isPlayer1 ? 'X' : 'O';
        state.board[cellIndex] = symbol;

        const winResult = this._checkTicTacToeWinner(state.board);
        
        if (winResult.winner) {
            state.phase = 'complete';
            state.winner = winResult.winner;
            state.winningLine = winResult.line;
            match.status = 'complete';
            match.winnerId = winResult.winner === 'X' ? match.player1.id : match.player2.id;
            match.winnerWallet = winResult.winner === 'X' ? match.player1.wallet : match.player2.wallet;
            match.endedAt = Date.now();
            return { success: true, gameComplete: true };
        }

        if (state.board.every(cell => cell !== null)) {
            state.phase = 'complete';
            state.winner = 'draw';
            match.status = 'complete';
            match.endedAt = Date.now();
            return { success: true, gameComplete: true, isDraw: true };
        }

        state.currentTurn = state.currentTurn === 'player1' ? 'player2' : 'player1';
        state.turnStartedAt = Date.now();
        return { success: true };
    }

    _checkTicTacToeWinner(board) {
        for (const line of TTT_WIN_LINES) {
            const [a, b, c] = line;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return { winner: board[a], line };
            }
        }
        return { winner: null, line: null };
    }

    _playConnect4(match, playerId, column) {
        const state = match.state;
        if (state.phase !== 'playing') return { error: 'GAME_OVER' };

        const isPlayer1 = playerId === match.player1.id;
        const isPlayer2 = playerId === match.player2.id;
        if (!isPlayer1 && !isPlayer2) return { error: 'NOT_IN_MATCH' };

        const isMyTurn = (state.currentTurn === 'player1' && isPlayer1) || 
                         (state.currentTurn === 'player2' && isPlayer2);
        if (!isMyTurn) return { error: 'NOT_YOUR_TURN' };

        if (column < 0 || column >= C4_COLS) return { error: 'INVALID_COLUMN' };

        const row = this._getConnect4LowestRow(state.board, column);
        if (row === -1) return { error: 'COLUMN_FULL' };

        const disc = isPlayer1 ? 'R' : 'Y';
        const cellIndex = row * C4_COLS + column;
        state.board[cellIndex] = disc;
        state.lastMove = { row, col: column };

        const winResult = this._checkConnect4Winner(state.board, row, column);
        
        if (winResult.winner) {
            state.phase = 'complete';
            state.winner = winResult.winner;
            state.winningCells = winResult.cells;
            match.status = 'complete';
            match.winnerId = winResult.winner === 'R' ? match.player1.id : match.player2.id;
            match.winnerWallet = winResult.winner === 'R' ? match.player1.wallet : match.player2.wallet;
            match.endedAt = Date.now();
            return { success: true, gameComplete: true };
        }

        if (state.board.every(cell => cell !== null)) {
            state.phase = 'complete';
            state.winner = 'draw';
            match.status = 'complete';
            match.endedAt = Date.now();
            return { success: true, gameComplete: true, isDraw: true };
        }

        state.currentTurn = state.currentTurn === 'player1' ? 'player2' : 'player1';
        state.turnStartedAt = Date.now();
        return { success: true };
    }

    _getConnect4LowestRow(board, column) {
        for (let row = 0; row < C4_ROWS; row++) {
            if (board[row * C4_COLS + column] === null) return row;
        }
        return -1;
    }

    _checkConnect4Winner(board, lastRow, lastCol) {
        const player = board[lastRow * C4_COLS + lastCol];
        if (!player) return { winner: null, cells: null };

        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        
        for (const [dr, dc] of directions) {
            const cells = this._countConnect4Line(board, lastRow, lastCol, dr, dc, player);
            if (cells.length >= C4_WIN_LENGTH) {
                return { winner: player, cells };
            }
        }
        return { winner: null, cells: null };
    }

    _countConnect4Line(board, row, col, dr, dc, player) {
        const cells = [[row, col]];
        
        let r = row + dr, c = col + dc;
        while (r >= 0 && r < C4_ROWS && c >= 0 && c < C4_COLS && board[r * C4_COLS + c] === player) {
            cells.push([r, c]);
            r += dr;
            c += dc;
        }
        
        r = row - dr;
        c = col - dc;
        while (r >= 0 && r < C4_ROWS && c >= 0 && c < C4_COLS && board[r * C4_COLS + c] === player) {
            cells.push([r, c]);
            r -= dr;
            c -= dc;
        }
        
        return cells;
    }

    _playCardJitsu(match, playerId, cardIndex) {
        if (match.state.phase !== 'select') return { error: 'NOT_SELECT_PHASE' };

        const isPlayer1 = playerId === match.player1.id;
        const isPlayer2 = playerId === match.player2.id;
        if (!isPlayer1 && !isPlayer2) return { error: 'NOT_IN_MATCH' };

        const hand = isPlayer1 ? match.state.player1Hand : match.state.player2Hand;
        if (cardIndex < 0 || cardIndex >= hand.length) return { error: 'INVALID_CARD' };

        if (isPlayer1) {
            if (match.state.player1SelectedCard !== null) return { error: 'ALREADY_SELECTED' };
            match.state.player1SelectedCard = cardIndex;
        } else {
            if (match.state.player2SelectedCard !== null) return { error: 'ALREADY_SELECTED' };
            match.state.player2SelectedCard = cardIndex;
        }

        if (match.state.player1SelectedCard !== null && match.state.player2SelectedCard !== null) {
            this._resolveRound(match);
        }

        return { success: true, bothSelected: match.state.phase === 'reveal' };
    }

    _resolveRound(match) {
        match.state.phase = 'reveal';
        
        const p1Card = match.state.player1Hand[match.state.player1SelectedCard];
        const p2Card = match.state.player2Hand[match.state.player2SelectedCard];
        
        let roundWinner = this._determineWinner(p1Card, p2Card);
        
        if (roundWinner === 'player1') {
            match.state.player1Wins[p1Card.element]++;
        } else if (roundWinner === 'player2') {
            match.state.player2Wins[p2Card.element]++;
        }
        
        match.state.lastRoundResult = { player1Card: p1Card, player2Card: p2Card, winner: roundWinner };

        const p1Won = this._checkWinCondition(match.state.player1Wins);
        const p2Won = this._checkWinCondition(match.state.player2Wins);
        
        if (p1Won || p2Won) {
            match.state.phase = 'complete';
            match.status = 'complete';
            match.winnerId = p1Won ? match.player1.id : match.player2.id;
            match.winnerWallet = p1Won ? match.player1.wallet : match.player2.wallet;
            match.endedAt = Date.now();
        } else {
            setTimeout(() => {
                if (match.status === 'active' || match.state.phase === 'reveal') {
                    this._startNextRound(match);
                }
            }, 2000);
        }

        return match.state.lastRoundResult;
    }

    _determineWinner(card1, card2) {
        const wins = { fire: 'snow', snow: 'water', water: 'fire' };
        
        if (wins[card1.element] === card2.element) return 'player1';
        if (wins[card2.element] === card1.element) return 'player2';
        
        if (card1.power > card2.power) return 'player1';
        if (card2.power > card1.power) return 'player2';
        return 'tie';
    }

    _checkWinCondition(wins) {
        if (wins.fire >= 3 || wins.water >= 3 || wins.snow >= 3) return true;
        if (wins.fire >= 1 && wins.water >= 1 && wins.snow >= 1) return true;
        return false;
    }

    _startNextRound(match) {
        if (match.state.player1SelectedCard !== null) {
            match.state.player1Hand.splice(match.state.player1SelectedCard, 1);
            match.state.player1Hand.push(this._generateCard());
        }
        if (match.state.player2SelectedCard !== null) {
            match.state.player2Hand.splice(match.state.player2SelectedCard, 1);
            match.state.player2Hand.push(this._generateCard());
        }
        
        match.state.round++;
        match.state.phase = 'select';
        match.state.player1SelectedCard = null;
        match.state.player2SelectedCard = null;
        match.state.turnStartedAt = Date.now();
        match.state.lastRoundResult = null;
        
        while (match.state.player1Hand.length < 5) match.state.player1Hand.push(this._generateCard());
        while (match.state.player2Hand.length < 5) match.state.player2Hand.push(this._generateCard());
        
        this._notifyMatchState(match);
    }

    checkTurnTimers() {
        const now = Date.now();
        
        for (const [matchId, match] of this.matches) {
            if (match.status !== 'active') continue;
            
            const elapsed = now - match.state.turnStartedAt;
            if (elapsed < TURN_TIME_LIMIT_MS) continue;
            
            if (match.gameType === 'tic_tac_toe') {
                this._handleTicTacToeTimeout(match);
            } else if (match.gameType === 'connect4') {
                this._handleConnect4Timeout(match);
            } else {
                this._handleCardJitsuTimeout(match);
            }
            
            this._notifyMatchState(match);
        }
    }

    _handleTicTacToeTimeout(match) {
        const state = match.state;
        if (state.phase !== 'playing') return;
        
        const emptyCells = state.board.map((cell, i) => cell === null ? i : -1).filter(i => i !== -1);
        if (emptyCells.length === 0) return;
        
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const currentPlayerId = state.currentTurn === 'player1' ? match.player1.id : match.player2.id;
        
        console.log(`⏰ Auto-play for ${state.currentTurn === 'player1' ? match.player1.name : match.player2.name}`);
        this._playTicTacToe(match, currentPlayerId, randomCell);
    }

    _handleConnect4Timeout(match) {
        const state = match.state;
        if (state.phase !== 'playing') return;
        
        const availableCols = [];
        for (let col = 0; col < C4_COLS; col++) {
            if (state.board[(C4_ROWS - 1) * C4_COLS + col] === null) availableCols.push(col);
        }
        if (availableCols.length === 0) return;
        
        const column = availableCols.includes(3) ? 3 : availableCols[Math.floor(Math.random() * availableCols.length)];
        const currentPlayerId = state.currentTurn === 'player1' ? match.player1.id : match.player2.id;
        
        console.log(`⏰ Auto-play for ${state.currentTurn === 'player1' ? match.player1.name : match.player2.name}`);
        this._playConnect4(match, currentPlayerId, column);
    }

    _handleCardJitsuTimeout(match) {
        if (match.state.phase !== 'select') return;
        
        if (match.state.player1SelectedCard === null) {
            match.state.player1SelectedCard = 0;
            console.log(`⏰ Auto-play for ${match.player1.name}`);
        }
        if (match.state.player2SelectedCard === null) {
            match.state.player2SelectedCard = 0;
            console.log(`⏰ Auto-play for ${match.player2.name}`);
        }
        
        this._resolveRound(match);
    }

    _notifyMatchState(match) {
        const state1 = this.getMatchState(match.id, match.player1.id);
        this.sendToPlayer(match.player1.id, { type: 'match_state', matchId: match.id, state: state1 });
        
        const state2 = this.getMatchState(match.id, match.player2.id);
        this.sendToPlayer(match.player2.id, { type: 'match_state', matchId: match.id, state: state2 });
        
        this._broadcastSpectatorUpdate(match);
    }

    _broadcastSpectatorUpdate(match) {
        if (!match.room) return;
        
        let spectatorState;
        if (match.gameType === 'tic_tac_toe') {
            spectatorState = {
                board: [...match.state.board],
                currentTurn: match.state.currentTurn,
                phase: match.state.phase,
                winner: match.state.winner,
                winningLine: match.state.winningLine,
                status: match.status,
                winnerId: match.winnerId
            };
        } else if (match.gameType === 'connect4') {
            spectatorState = {
                board: [...match.state.board],
                currentTurn: match.state.currentTurn,
                phase: match.state.phase,
                winner: match.state.winner,
                winningCells: match.state.winningCells,
                lastMove: match.state.lastMove,
                status: match.status,
                winnerId: match.winnerId
            };
        } else {
            spectatorState = {
                round: match.state.round,
                phase: match.state.phase,
                player1Wins: match.state.player1Wins,
                player2Wins: match.state.player2Wins,
                lastRoundResult: match.state.lastRoundResult ? {
                    player1Card: { element: match.state.lastRoundResult.player1Card?.element, emoji: match.state.lastRoundResult.player1Card?.emoji },
                    player2Card: { element: match.state.lastRoundResult.player2Card?.element, emoji: match.state.lastRoundResult.player2Card?.emoji },
                    winner: match.state.lastRoundResult.winner
                } : null,
                status: match.status,
                winnerId: match.winnerId
            };
        }
        
        this.broadcastToRoom(match.room, {
            type: 'match_spectate',
            matchId: match.id,
            gameType: match.gameType,
            players: [
                { id: match.player1.id, name: match.player1.name, position: match.player1.position },
                { id: match.player2.id, name: match.player2.name, position: match.player2.position }
            ],
            state: spectatorState,
            wagerAmount: match.wagerAmount
        }, match.player1.id, match.player2.id);
    }

    getMatchState(matchId, playerId) {
        const match = this.matches.get(matchId);
        if (!match) return null;

        const isPlayer1 = playerId === match.player1.id;
        const timeRemaining = Math.max(0, Math.ceil(
            (TURN_TIME_LIMIT_MS - (Date.now() - match.state.turnStartedAt)) / 1000
        ));

        if (match.gameType === 'tic_tac_toe') {
            return this._getTicTacToeState(match, playerId, isPlayer1, timeRemaining);
        }
        if (match.gameType === 'connect4') {
            return this._getConnect4State(match, playerId, isPlayer1, timeRemaining);
        }
        return this._getCardJitsuState(match, playerId, isPlayer1, timeRemaining);
    }

    _getTicTacToeState(match, playerId, isPlayer1, timeRemaining) {
        const state = match.state;
        const isMyTurn = (state.currentTurn === 'player1' && isPlayer1) || 
                         (state.currentTurn === 'player2' && !isPlayer1);
        
        return {
            board: [...state.board],
            currentTurn: state.currentTurn,
            isMyTurn,
            mySymbol: isPlayer1 ? 'X' : 'O',
            opponentSymbol: isPlayer1 ? 'O' : 'X',
            phase: state.phase,
            winner: state.winner,
            winningLine: state.winningLine,
            turnTimeRemaining: timeRemaining,
            isPlayer1,
            status: match.status,
            winnerId: match.winnerId
        };
    }

    _getConnect4State(match, playerId, isPlayer1, timeRemaining) {
        const state = match.state;
        const isMyTurn = (state.currentTurn === 'player1' && isPlayer1) || 
                         (state.currentTurn === 'player2' && !isPlayer1);
        
        return {
            board: [...state.board],
            currentTurn: state.currentTurn,
            isMyTurn,
            myColor: isPlayer1 ? 'R' : 'Y',
            opponentColor: isPlayer1 ? 'Y' : 'R',
            phase: state.phase,
            winner: state.winner,
            winningCells: state.winningCells,
            lastMove: state.lastMove,
            turnTimeRemaining: timeRemaining,
            isPlayer1,
            status: match.status,
            winnerId: match.winnerId
        };
    }

    _getCardJitsuState(match, playerId, isPlayer1, timeRemaining) {
        const myHand = isPlayer1 ? match.state.player1Hand : match.state.player2Hand;
        const mySelection = isPlayer1 ? match.state.player1SelectedCard : match.state.player2SelectedCard;
        const opponentSelection = isPlayer1 ? match.state.player2SelectedCard : match.state.player1SelectedCard;

        return {
            round: match.state.round,
            phase: match.state.phase,
            myHand,
            mySelectedCard: mySelection,
            opponentHasSelected: opponentSelection !== null,
            player1Wins: match.state.player1Wins,
            player2Wins: match.state.player2Wins,
            turnTimeRemaining: timeRemaining,
            lastRoundResult: match.state.lastRoundResult,
            isPlayer1,
            status: match.status,
            winnerId: match.winnerId
        };
    }

    /**
     * Void a match and save to DB
     */
    async voidMatch(matchId, reason = 'disconnect') {
        const match = this.matches.get(matchId);
        if (!match) return null;

        match.status = 'void';
        match.endedAt = Date.now();
        
        // Clean up mappings
        this.playerMatches.delete(match.player1.id);
        this.playerMatches.delete(match.player2.id);
        if (match.player1.wallet) this.walletMatches.delete(match.player1.wallet);
        if (match.player2.wallet) this.walletMatches.delete(match.player2.wallet);
        
        // Update in database
        if (isDBConnected()) {
            try {
                await MatchModel.updateOne(
                    { matchId },
                    { 
                        status: 'void',
                        endedAt: match.endedAt,
                        gameState: null
                    }
                );
            } catch (error) {
                console.error('Error voiding match in DB:', error);
            }
        }
        
        console.log(`🚫 Match voided: ${match.player1.name} vs ${match.player2.name} (${reason})`);
        
        return {
            matchId,
            player1Id: match.player1.id,
            player2Id: match.player2.id,
            player1Wallet: match.player1.wallet,
            player2Wallet: match.player2.wallet,
            wagerAmount: match.wagerAmount,
            reason
        };
    }

    /**
     * End a match and persist to DB
     */
    async endMatch(matchId) {
        const match = this.matches.get(matchId);
        if (!match) return null;

        // Clean up mappings
        this.playerMatches.delete(match.player1.id);
        this.playerMatches.delete(match.player2.id);
        if (match.player1.wallet) this.walletMatches.delete(match.player1.wallet);
        if (match.player2.wallet) this.walletMatches.delete(match.player2.wallet);

        // Update in database
        if (isDBConnected()) {
            try {
                const winnerName = match.winnerId === match.player1.id ? match.player1.name : match.player2.name;
                const loserWallet = match.winnerId === match.player1.id ? match.player2.wallet : match.player1.wallet;
                const loserName = match.winnerId === match.player1.id ? match.player2.name : match.player1.name;

                await MatchModel.updateOne(
                    { matchId },
                    { 
                        status: match.status,
                        endedAt: match.endedAt,
                        winnerWallet: match.winnerWallet,
                        winnerName: winnerName,
                        loserWallet: loserWallet,
                        loserName: loserName,
                        payoutProcessed: true,
                        payoutAmount: match.wagerAmount * 2,
                        gameState: null,
                        duration: Math.floor((match.endedAt - match.createdAt) / 1000)
                    }
                );
            } catch (error) {
                console.error('Error ending match in DB:', error);
            }
        }

        return match;
    }

    handleDisconnect(playerId) {
        const matchId = this.playerMatches.get(playerId);
        if (!matchId) return null;

        const match = this.matches.get(matchId);
        if (!match || match.status !== 'active') return null;

        return this.voidMatch(matchId, 'disconnect');
    }

    getMatchesInRoom(room) {
        const matches = [];
        for (const [, match] of this.matches) {
            if (match.room === room && match.status === 'active') {
                let spectatorState;
                if (match.gameType === 'tic_tac_toe') {
                    spectatorState = {
                        board: [...match.state.board],
                        currentTurn: match.state.currentTurn,
                        phase: match.state.phase,
                        winner: match.state.winner,
                        winningLine: match.state.winningLine,
                        status: match.status
                    };
                } else if (match.gameType === 'connect4') {
                    spectatorState = {
                        board: [...match.state.board],
                        currentTurn: match.state.currentTurn,
                        phase: match.state.phase,
                        winner: match.state.winner,
                        winningCells: match.state.winningCells,
                        lastMove: match.state.lastMove,
                        status: match.status
                    };
                } else {
                    spectatorState = {
                        round: match.state.round,
                        phase: match.state.phase,
                        player1Wins: match.state.player1Wins,
                        player2Wins: match.state.player2Wins,
                        status: match.status
                    };
                }
                
                matches.push({
                    matchId: match.id,
                    players: [
                        { id: match.player1.id, name: match.player1.name, position: match.player1.position },
                        { id: match.player2.id, name: match.player2.name, position: match.player2.position }
                    ],
                    gameType: match.gameType,
                    wagerAmount: match.wagerAmount,
                    state: spectatorState
                });
            }
        }
        return matches;
    }

    dispose() {
        clearInterval(this.timerInterval);
    }
}

export default MatchService;
