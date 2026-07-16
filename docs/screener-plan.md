# Screener plan for momentum, breakout, intraday, swing, and advanced setups

This plan is designed for an NSE-focused MCP server and fits the existing technical-analysis engine in [src/tools/technical.ts](src/tools/technical.ts) and the tool registration points in [src/server.ts](src/server.ts).

## 1. Screener categories worth building

For Indian markets, I would build a layered screener system instead of a single generic screen.

### A. Momentum / trend-following
Use this when you want stocks that are already moving and likely to continue.

Criteria:
- Price above 20-day EMA and 50-day EMA
- 20-day EMA above 50-day EMA
- 50-day EMA above 200-day EMA
- RSI above 55 or 60
- ADX above 20
- Volume above 1.2x average volume

Why it works:
- Good for strong trending names
- Works well in sectors that are rotating into leadership

### B. Breakout screen
Use this when you want stocks breaking out of a base or range.

Criteria:
- Close above recent 20-day or 50-day high
- Volume above 1.5x average of last 20 sessions
- Price is near the breakout level with a strong close
- Prefer breakout from a consolidation zone rather than a gap-only move

Why it works:
- Captures fresh trend initiation
- Best when used with volume confirmation and price acceptance

### C. Intraday momentum screen
Use this when you want short-term trading opportunities during the session.

Criteria:
- 15-minute breakout above opening range high
- Price above VWAP
- Volume spike above average intraday volume
- RSI(14) above 60 and rising
- Prefer stocks with low spread and decent liquidity

Why it works:
- Great for active traders who want immediate participation
- Best for high-liquidity stocks

### D. Swing trade pullback screen
Use this when you want stocks that are trending but are temporarily retracing.

Criteria:
- Price above 50-day EMA and 200-day EMA
- Pullback to 20-day EMA or 50-day EMA
- Bullish reversal candle or bullish engulfing
- Volume pickup during reversal
- RSI not deeply oversold

Why it works:
- Good for medium-term setups
- Better than chasing every breakout

### E. Mean reversion / oversold bounce screen
Use this when you want counter-trend setups.

Criteria:
- RSI below 30 or 35
- Price near support zone or 200-day EMA
- Positive divergence on RSI or MACD
- Bounce with volume confirmation
- Avoid stocks with strong downward momentum if the trend is still weak

Why it works:
- Useful for short-term reversal trades
- Best when the broader market is stable or recovering

### F. Volatility expansion / squeeze screen
Use this when you want stocks that are about to make a big move.

Criteria:
- Bollinger Bands widening sharply
- ATR rising significantly from its 20-day average
- Price emerging from a narrow band
- Volume spike

Why it works:
- Great for anticipating volatility breakouts
- Useful for options traders and swing traders

### G. Accumulation / distribution screen
Use this for institutional-style trend detection.

Criteria:
- Rising price with rising volume
- Accumulation days (up close with above-average volume)
- Money flow indicator positive
- Not overextended relative to recent range

Why it works:
- Helps filter for stocks with real participation rather than pure price action noise

### H. Sector rotation screen
Use this to find the market’s current leadership.

Criteria:
- The stock is outperforming its sector
- Sector itself is outperforming Nifty 50 or Nifty Bank
- Relative Strength vs sector average is improving
- Breakout on volume

Why it works:
- India often moves by leadership rotation, not just stock-specific setups

### I. Quality + trend screen
Use this for more durable setups.

Criteria:
- Price above 200-day EMA
- Positive operating cash flow / healthy ROCE if fundamentals are included
- Debt/equity reasonable
- Not too volatile for your risk profile

Why it works:
- Filters out weak stocks that look good technically but don’t have quality

### J. Risk-managed “avoid” screen
This is just as important as the buy screen.

Criteria to flag:
- Price below 50-day EMA and 200-day EMA
- RSI below 40 with negative divergence
- High ATR with no trend strength
- Low volume and low liquidity
- Large gap-downs and no follow-through

Why it works:
- Prevents you from forcing trades into weak names

## 2. Recommended screener basket for day 1
If you want a practical first version, I would implement these five screens first:

1. Momentum trend
2. Breakout confirmation
3. Swing pullback
4. Intraday breakout
5. Mean reversion bounce

These five cover most of the trading styles without overcomplicating the first build.

## 3. Technical analysis signals to use
The technical engine already has some of the right building blocks. I would reuse the following indicators:

- RSI
- MACD
- ADX
- SMA / EMA (10, 20, 50, 100, 200)
- ATR
- Bollinger width
- Volume trend / relative volume
- Candlestick pattern context from the existing pattern module

For each stock, the screener should compute:
- current price
- EMA/SMA alignment
- RSI and MACD state
- ADX strength
- ATR and volatility context
- recent breakout or breakdown status
- volume confirmation
- pattern note from the existing pattern analysis

## 4. Recommended data flow

### Step 1: Universe selection
Start with a list of active NSE stocks.

Possible input filters:
- sector
- market cap
- min volume
- exchange (NSE / BSE)
- price range
- max results

### Step 2: Historical data fetch
For each symbol, fetch daily data plus intraday 15-minute bars if intraday mode is enabled.

### Step 3: Indicator computation
For each symbol, compute all required indicators and store them in a normalized structure.

### Step 4: Rule evaluation
Evaluate screen rule sets and assign a score, such as:
- +20 for trend alignment
- +20 for volume confirmation
- +20 for breakout status
- +15 for momentum strength
- +15 for RSI / MACD confirmation
- +10 for pattern quality

### Step 5: Ranking and output
Return the top results sorted by score with a trader-friendly comment.

## 5. Suggested output schema

```ts
export interface ScreenerResult {
  symbol: string;
  exchange: "NSE" | "BSE";
  price: number;
  screenName: string;
  score: number; // 0-100
  reason: string;
  trend: "UP" | "DOWN" | "SIDEWAYS";
  momentum: "STRONG" | "WEAK" | "NEUTRAL";
  volume: "HIGH" | "NORMAL" | "LOW";
  risk: "LOW" | "MEDIUM" | "HIGH";
  indicators: {
    rsi?: number;
    adx?: number;
    ema20?: number;
    ema50?: number;
    ema200?: number;
    atr?: number;
    volumeAvg?: number;
    volumeCurrent?: number;
  };
  pattern?: string;
}
```

## 6. Implementation plan in the codebase

### A. Create a new module
Add a new file such as:
- [src/tools/screener.ts](src/tools/screener.ts)

This module should host:
- indicator helpers
- screen rule definitions
- scoring logic
- ranking output

### B. Register a new MCP tool
Expose a tool in [src/server.ts](src/server.ts) such as:
- `get_stock_screener`

Suggested parameters:
- `screenType`: `momentum | breakout | intraday | swing | mean-reversion | volatility | sector-rotation | all`
- `limit`: number
- `sector`: string
- `minVolume`: number
- `minPrice`: number
- `maxPrice`: number
- `marketCap`: optional filter

### C. Reuse the existing technical engine
Instead of re-implementing everything from scratch:
- reuse the indicator logic already present in [src/tools/technical.ts](src/tools/technical.ts)
- add a lightweight wrapper that evaluates a stock against one or more screens

### D. Add a watchlist mode
A useful next iteration is a watchlist mode:
- store watched symbols in memory or JSON
- rerun the screen automatically each minute or on request
- highlight symbols that entered the top-rated setups

## 7. Recommended screen logic by style

### Momentum screen logic
```ts
if (price > ema20 && ema20 > ema50 && ema50 > ema200 && rsi > 55 && adx > 20) {
  score += 35;
}
```

### Breakout screen logic
```ts
if (close > recentHigh20 && volume > avgVolume20 * 1.5) {
  score += 30;
}
```

### Intraday screen logic
```ts
if (price > vwap && price > orHigh && volume > avgVol15m * 1.5) {
  score += 30;
}
```

### Swing screen logic
```ts
if (price > ema50 && price < ema20 * 1.02 && bullishReversal && volume > avgVolume20) {
  score += 25;
}
```

## 8. Practical trading advice for the screens
In real markets, the best results usually come from this combination:

- Trend screen for strong directional names
- Breakout screen for fresh momentum
- Pullback screen for swing entries
- Intraday screen for quick setups
- Mean reversion for risk-managed counter-trend trades

Do not use only one screen. Combine at least two conditions:
- trend + volume
- breakout + momentum
- pullback + reversal candle
- intraday strength + VWAP support

That is the difference between a nice-looking screen and a usable one.

## 9. Suggested rollout plan

### Phase 1: MVP
Implement these screens:
- momentum
- breakout
- swing pullback
- intraday breakout
- mean reversion

Output:
- top 20 results
- score and reason
- supporting indicators

### Phase 2: Quality enhancements
Add:
- sector filter
- relative strength vs Nifty
- volume spike detection
- alert-friendly watchlist support

### Phase 3: Advanced screens
Add:
- volatility expansion
- accumulation/distribution
- gap-and-go
- support/retest setups
- earnings/event-aware screening

## 10. My professional recommendation
If your goal is to track stocks easily and consistently, build the screener around a small number of robust conditions rather than many noisy rules.

The strongest screen system for Indian markets is usually:
- trend alignment
- volume confirmation
- relative strength
- breakout confirmation
- risk filters for weak names

This will give you a system that is useful for both intraday and swing-style trading.
