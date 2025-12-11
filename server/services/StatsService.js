/**
 * StatsService - Player statistics tracking
 * Tracks wins, losses, coins won/lost per game type
 */

class StatsService {
    constructor() {
        // In-memory stats storage (playerId -> stats)
        // TODO: Replace with database for persistence
        this.stats = new Map();
    }

    /**
     * Get or create stats for a player
     */
    getStats(playerId) {
        if (!this.stats.has(playerId)) {
            this.stats.set(playerId, this._createDefaultStats(playerId));
        }
        return this.stats.get(playerId);
    }

    /**
     * Create default stats object
     */
    _createDefaultStats(playerId) {
        return {
            playerId,
            cardJitsu: {
                wins: 0,
                losses: 0,
                coinsWon: 0,
                coinsLost: 0
            },
            // Extensible for future games
            connect4: { wins: 0, losses: 0, coinsWon: 0, coinsLost: 0 },
            pong: { wins: 0, losses: 0, coinsWon: 0, coinsLost: 0 },
            ticTacToe: { wins: 0, losses: 0, coinsWon: 0, coinsLost: 0 }
        };
    }

    /**
     * Record a match result
     */
    recordResult(playerId, gameType, won, coinsAmount) {
        const stats = this.getStats(playerId);
        const gameStats = stats[gameType];
        
        if (!gameStats) {
            console.warn(`Unknown game type: ${gameType}`);
            return;
        }

        if (won) {
            gameStats.wins++;
            gameStats.coinsWon += coinsAmount;
            console.log(`📊 Stats updated: ${playerId} won ${gameType} (+${coinsAmount} coins) - Total wins: ${gameStats.wins}`);
        } else {
            gameStats.losses++;
            gameStats.coinsLost += coinsAmount;
            console.log(`📊 Stats updated: ${playerId} lost ${gameType} (-${coinsAmount} coins) - Total losses: ${gameStats.losses}`);
        }
    }

    /**
     * Get public stats for display
     */
    getPublicStats(playerId) {
        const stats = this.getStats(playerId);
        return {
            playerId,
            cardJitsuWins: stats.cardJitsu.wins,
            cardJitsuLosses: stats.cardJitsu.losses,
            totalWins: stats.cardJitsu.wins + stats.connect4.wins + stats.pong.wins + stats.ticTacToe.wins,
            totalLosses: stats.cardJitsu.losses + stats.connect4.losses + stats.pong.losses + stats.ticTacToe.losses
        };
    }
}

export default StatsService;

