// src/priceService.js
const axios = require("axios");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const NodeCache = require("node-cache");

dayjs.extend(utc);

const cache = new NodeCache({ stdTTL: 60 * 60 }); // 1 hour default cache
const BINANCE_BASE = "https://api.binance.com";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const BINANCE_EARLIEST = dayjs.utc("2017-09-01").startOf("day");

async function fetchDailyKlines(symbol = "BTCUSDT", rawStartDate, rawEndDate) {
  // Input dates can be strings (YYYY-MM-DD) or Date
  let start = dayjs.utc(rawStartDate).startOf("day");
  if (!start.isValid() || start.isBefore(BINANCE_EARLIEST)) {
    start = BINANCE_EARLIEST;
  }
  let end = dayjs.utc(rawEndDate).endOf("day");
  if (!end.isValid()) end = dayjs.utc().endOf("day");

  const cacheKey = `klines:${symbol}:${start.valueOf()}:${end.valueOf()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const limit = 1000; // max candles per Binance request
  const results = [];

  let currentStart = start;

  while (currentStart.isBefore(end) || currentStart.isSame(end, "day")) {
    // compute current chunk end (limit candles)
    const chunkEndMs = Math.min(
      end.valueOf(),
      currentStart.valueOf() + (limit - 1) * MS_PER_DAY
    );
    const params = {
      symbol,
      interval: "1d",
      startTime: currentStart.valueOf(),
      endTime: chunkEndMs,
      limit,
    };

    const url = `${BINANCE_BASE}/api/v3/klines`;
    const resp = await axios.get(url, { params, timeout: 15000 });
    const data = resp.data || [];

    // Each item: [ openTime, open, high, low, close, volume, closeTime, ... ]
    data.forEach((item) => {
      results.push({
        openTime: Number(item[0]),
        open: Number(item[1]),
        high: Number(item[2]),
        low: Number(item[3]),
        close: Number(item[4]),
        volume: Number(item[5]),
        closeTime: Number(item[6]),
      });
    });

    // advance to next chunk
    currentStart = dayjs.utc(chunkEndMs + MS_PER_DAY);
    // NOTE: no extra sleep here — Binance public endpoints should be fine for MVP
  }

  // ensure sorted ascending by openTime
  results.sort((a, b) => a.openTime - b.openTime);

  cache.set(cacheKey, results);
  return results;
}

async function getLatestPrice(symbol = "BTCUSDT") {
  const cacheKey = `ticker:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const url = `${BINANCE_BASE}/api/v3/ticker/price`;
  const resp = await axios.get(url, { params: { symbol }, timeout: 8000 });
  const price = Number(resp.data && resp.data.price);
  // very short TTL for latest price
  cache.set(cacheKey, price, 10); // 10 seconds
  return price;
}

module.exports = {
  fetchDailyKlines,
  getLatestPrice,
  BINANCE_EARLIEST,
};
