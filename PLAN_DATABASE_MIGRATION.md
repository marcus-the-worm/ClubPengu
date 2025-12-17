# Club Pengu Database Migration Plan

## Overview
This document outlines the phased migration from localStorage + in-memory storage to MongoDB Atlas with proper authentication.

---

## Phase 1: Foundation (Week 1-2)
**Goal**: Establish database connection and authentication layer

### 1.1 Infrastructure Setup
- [ ] Create MongoDB Atlas cluster (M10+ for production)
- [ ] Set up connection pooling (min: 10, max: 100 connections)
- [ ] Configure network access (whitelist Render IPs)
- [ ] Create database users (read-only for analytics, read-write for app)

### 1.2 Server Dependencies
```bash
cd server
npm install mongoose dotenv jsonwebtoken @solana/web3.js bs58
```

### 1.3 Environment Configuration
```env
# server/.env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-256-bit-secret
JWT_EXPIRY=7d
NODE_ENV=production
```

### 1.4 Database Connection Module
Create `server/db/connection.js`:
```javascript
import mongoose from 'mongoose';

const connectDB = async () => {
  const options = {
    maxPoolSize: 100,
    minPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };
  
  await mongoose.connect(process.env.MONGODB_URI, options);
  console.log('🗄️ MongoDB connected');
};

export default connectDB;
```

### 1.5 Create Mongoose Models
Priority order:
1. `User` - Core identity
2. `AuthSession` - JWT sessions  
3. `Puffle` - Pet data
4. `Challenge` - P2P challenges
5. `Match` - Game history

---

## Phase 2: Authentication (Week 2-3)
**Goal**: Implement Solana wallet authentication

### 2.1 Authentication Flow
```
1. Client connects to WebSocket
2. Server sends challenge nonce
3. Client signs nonce with Phantom wallet
4. Server verifies signature against wallet address
5. Server creates/updates User document
6. Server issues JWT token
7. Client includes JWT in subsequent messages
```

### 2.2 Wallet Verification Service
Create `server/services/AuthService.js`:
```javascript
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import jwt from 'jsonwebtoken';

class AuthService {
  generateNonce() {
    return `Sign this message to authenticate with Club Pengu: ${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  verifySignature(message, signature, walletAddress) {
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = bs58.decode(signature);
      const publicKey = new PublicKey(walletAddress);
      
      return nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes()
      );
    } catch (e) {
      return false;
    }
  }

  generateToken(walletAddress, sessionId) {
    return jwt.sign(
      { walletAddress, sessionId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return null;
    }
  }
}
```

### 2.3 New WebSocket Message Types
```javascript
// Client -> Server
{ type: 'auth_request' }

// Server -> Client  
{ type: 'auth_challenge', nonce: string }

// Client -> Server
{ type: 'auth_verify', walletAddress: string, signature: string }

// Server -> Client
{ type: 'auth_success', token: string, user: {...} }
{ type: 'auth_failure', error: string }
```

### 2.4 Client Integration
Update `MultiplayerContext.jsx` to:
1. Request auth challenge on connect
2. Prompt Phantom wallet to sign
3. Send signature for verification
4. Store JWT token in memory (not localStorage)
5. Include token in `join` message

---

## Phase 3: Data Migration (Week 3-4)
**Goal**: Migrate from localStorage to database

### 3.1 Migration Strategy
```
1. User connects with wallet
2. Check if wallet exists in DB
3. If NO: Check for localStorage data
   a. If localStorage has data → Migrate to DB
   b. If no localStorage → Create fresh user
4. If YES: Load from DB, ignore localStorage
5. Clear localStorage after successful DB sync
```

### 3.2 User Migration Handler
```javascript
async migrateLocalStorageUser(walletAddress, localData) {
  const existingUser = await User.findOne({ walletAddress });
  if (existingUser) {
    return existingUser; // Already migrated
  }

  // Create user with migrated data
  const user = new User({
    walletAddress,
    username: localData.penguin_name || `Penguin${Math.floor(Math.random() * 10000)}`,
    coins: localData.clubpenguin_save?.coins || 0,
    customization: localData.penguin_customization || {},
    unlockedCosmetics: localData.unlocked_cosmetics || [],
    unlockedMounts: localData.unlocked_mounts || ['none'],
    stamps: localData.clubpenguin_save?.stamps || [],
    // Mark as migrated
    migrationSource: 'localStorage',
    migratedAt: new Date()
  });

  await user.save();
  return user;
}
```

### 3.3 Client Migration Prompt
```javascript
// In client, after auth success
if (response.isNewUser && hasLocalStorageData()) {
  // Show modal: "We found existing progress. Migrate to your wallet?"
  if (userConfirms) {
    send({ type: 'migrate_data', localData: getLocalStorageData() });
  }
  clearLocalStorage();
}
```

---

## Phase 4: Server-Authoritative State (Week 4-5)
**Goal**: Remove client trust, make server authoritative

### 4.1 Changes Required

| Data | Current Source | New Source |
|------|---------------|------------|
| Coins | Client localStorage | MongoDB `users.coins` |
| Inventory | Client localStorage | MongoDB `users.inventory` |
| Unlocks | Client localStorage | MongoDB `users.unlockedCosmetics` |
| Stats | In-memory Map | MongoDB `users.stats` |
| Puffles | Client state | MongoDB `puffles` |

### 4.2 Coin Operations
```javascript
// BEFORE (trusting client)
if (message.coins !== undefined) {
  playerCoins.set(playerId, message.coins);
}

// AFTER (server-authoritative)
// Coins only change via:
// - Match wins/losses (MatchService)
// - Purchases (ShopService)
// - Promo codes (PromoService)
// - Admin adjustments (AdminService)

async addCoins(walletAddress, amount, reason, proof = {}) {
  const user = await User.findOneAndUpdate(
    { walletAddress },
    { 
      $inc: { 
        coins: amount,
        'stats.economy.totalCoinsEarned': amount > 0 ? amount : 0,
        'stats.economy.totalCoinsSpent': amount < 0 ? -amount : 0
      }
    },
    { new: true }
  );

  // Audit log
  await Transaction.create({
    toWallet: walletAddress,
    amount,
    type: reason,
    proof,
    toBalanceAfter: user.coins
  });

  return user.coins;
}
```

### 4.3 Validation Middleware
```javascript
// Validate cosmetic ownership before equipping
async validateCosmetic(walletAddress, cosmeticId) {
  const user = await User.findOne({ walletAddress });
  return user.unlockedCosmetics.includes(cosmeticId) || 
         user.unlockedMounts.includes(cosmeticId);
}
```

---

## Phase 5: Real-Time State Sync (Week 5-6)
**Goal**: Maintain state across server restarts

### 5.1 Player Session Management
```javascript
// On player connect (after auth)
async onPlayerJoin(walletAddress, playerId, ws) {
  // Check for existing connection (single-session enforcement)
  const existingUser = await User.findOne({ 
    walletAddress, 
    isConnected: true 
  });
  
  if (existingUser && existingUser.currentPlayerId !== playerId) {
    // Kick existing session
    notifyExistingSession(existingUser.currentPlayerId, 'KICKED_OTHER_SESSION');
  }

  // Update connection state
  await User.findOneAndUpdate(
    { walletAddress },
    {
      isConnected: true,
      currentPlayerId: playerId,
      lastLoginAt: new Date(),
      lastIpAddress: getClientIP(ws)
    }
  );
}

// On player disconnect
async onPlayerLeave(walletAddress) {
  await User.findOneAndUpdate(
    { walletAddress },
    {
      isConnected: false,
      lastLogoutAt: new Date(),
      lastActiveAt: new Date()
    }
  );
}
```

### 5.2 Stats Batching Service
High-frequency stats (movement, jumps) should be batched:

```javascript
class StatsBatcher {
  constructor() {
    this.pendingUpdates = new Map(); // walletAddress -> { stats }
    this.FLUSH_INTERVAL = 30000; // 30 seconds
    
    setInterval(() => this.flush(), this.FLUSH_INTERVAL);
  }

  queue(walletAddress, statPath, increment) {
    if (!this.pendingUpdates.has(walletAddress)) {
      this.pendingUpdates.set(walletAddress, {});
    }
    const updates = this.pendingUpdates.get(walletAddress);
    updates[statPath] = (updates[statPath] || 0) + increment;
  }

  async flush() {
    const batch = this.pendingUpdates;
    this.pendingUpdates = new Map();

    const bulkOps = [];
    for (const [wallet, updates] of batch) {
      const $inc = {};
      for (const [path, value] of Object.entries(updates)) {
        $inc[path] = value;
      }
      bulkOps.push({
        updateOne: {
          filter: { walletAddress: wallet },
          update: { $inc }
        }
      });
    }

    if (bulkOps.length > 0) {
      await User.bulkWrite(bulkOps);
      console.log(`📊 Flushed stats for ${bulkOps.length} users`);
    }
  }
}
```

---

## Phase 6: Horizontal Scaling (Week 6-8)
**Goal**: Support multiple WebSocket servers

### 6.1 Redis Pub/Sub Setup
```bash
npm install ioredis
```

```javascript
import Redis from 'ioredis';

const pub = new Redis(process.env.REDIS_URL);
const sub = new Redis(process.env.REDIS_URL);

// Subscribe to player events
sub.subscribe('player:moved', 'player:chat', 'player:emote', 'match:update');

sub.on('message', (channel, message) => {
  const data = JSON.parse(message);
  // Broadcast to local clients in same room
  broadcastToRoom(data.room, data.payload, data.excludePlayerId);
});

// Publish events for other servers
function publishEvent(channel, data) {
  pub.publish(channel, JSON.stringify(data));
}
```

### 6.2 Architecture Diagram
```
                    ┌──────────────┐
                    │ Load Balancer │
                    │   (sticky)    │
                    └──────┬───────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  WS Server  │ │  WS Server  │ │  WS Server  │
    │    (1)      │ │    (2)      │ │    (3)      │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           ▼
                    ┌─────────────┐
                    │    Redis    │
                    │  (pub/sub)  │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │   MongoDB   │
                    │   Atlas     │
                    └─────────────┘
```

### 6.3 Sticky Sessions
Configure load balancer for WebSocket sticky sessions based on wallet address or session ID.

---

## Phase 7: Monitoring & Alerts (Week 8+)

### 7.1 Health Checks
```javascript
app.get('/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'ok' : 'error';
  const redisStatus = await redis.ping() === 'PONG' ? 'ok' : 'error';
  
  res.json({
    status: dbStatus === 'ok' && redisStatus === 'ok' ? 'healthy' : 'degraded',
    database: dbStatus,
    redis: redisStatus,
    connections: players.size,
    uptime: process.uptime()
  });
});
```

### 7.2 Key Metrics to Track
- Active WebSocket connections
- MongoDB query latency (p50, p95, p99)
- Redis pub/sub latency
- Auth success/failure rates
- Match completion rates
- Coin transaction volume

---

## Rollback Plan

### If Migration Fails:
1. Keep localStorage client-side code in place (feature flag)
2. Database writes are additive - existing data preserved
3. Can toggle back to localStorage mode per-client
4. All migrations logged in `audit_logs` for replay

### Feature Flags:
```javascript
const FEATURES = {
  USE_DATABASE: process.env.FEATURE_USE_DB === 'true',
  REQUIRE_WALLET_AUTH: process.env.FEATURE_REQUIRE_AUTH === 'true',
  ENABLE_STATS_BATCHING: process.env.FEATURE_STATS_BATCH === 'true'
};
```

---

## Testing Strategy

### 1. Unit Tests
- AuthService signature verification
- StatsBatcher batching logic
- Coin transfer validation

### 2. Integration Tests
- Full auth flow (challenge → sign → verify → token)
- Migration flow (localStorage → DB)
- Match creation and completion

### 3. Load Tests
- 1,000 concurrent WebSocket connections
- 100 concurrent matches
- Stats batching under load

### 4. Chaos Tests
- MongoDB failover
- Redis connection loss
- Server restart mid-match

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| 1. Foundation | 1-2 weeks | MongoDB Atlas account |
| 2. Authentication | 1-2 weeks | Phase 1 |
| 3. Data Migration | 1 week | Phase 2 |
| 4. Server Authority | 1 week | Phase 3 |
| 5. Real-Time Sync | 1-2 weeks | Phase 4 |
| 6. Horizontal Scale | 2 weeks | Phase 5 + Redis |
| 7. Monitoring | Ongoing | All phases |

**Total: 8-12 weeks for full production readiness**

---

## Cost Estimates (Monthly)

| Service | Tier | Cost |
|---------|------|------|
| MongoDB Atlas | M10 (dedicated) | $57 |
| Redis Cloud | 250MB | $7 |
| Render (3x servers) | Starter Plus | $75 |
| **Total** | | **~$140/month** |

Scale up to M30 ($210) and larger Redis as you grow.
