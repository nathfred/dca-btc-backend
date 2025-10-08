const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);

/**
 * Generate buy dates array (YYYY-MM-DD UTC) from start to end inclusive.
 * frequency: 'daily' | 'weekly' | 'monthly'
 */
function generateBuyDates(startDate, endDate, frequency = "weekly") {
  const start = dayjs.utc(startDate).startOf("day");
  const end = dayjs.utc(endDate).startOf("day");
  const dates = [];
  let cur = start.clone();

  while (cur.isBefore(end) || cur.isSame(end, "day")) {
    dates.push(cur.format("YYYY-MM-DD"));
    if (frequency === "daily") cur = cur.add(1, "day");
    else if (frequency === "weekly")
      cur = cur.add(7, "day"); // simple weekly step
    else if (frequency === "monthly") cur = cur.add(1, "month");
    else cur = cur.add(7, "day");
  }
  return dates;
}

/**
 * Binary search to find the latest candle with openTime <= targetMs
 * candles must be sorted by openTime ascending
 */
function findClosestCandle(candles, targetMs) {
  let lo = 0,
    hi = candles.length - 1,
    best = null;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (candles[mid].openTime <= targetMs) {
      best = candles[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best; // may be null if no candle <= targetMs
}

/**
 * Main DCA calculator
 * - candles: array returned from priceService.fetchDailyKlines (openTime, close, ...)
 * - returns object with totals and chartData
 */
function calculateDCA({
  startDate,
  endDate,
  frequency = "weekly",
  amount = 100,
  candles = [],
  latestPrice = null,
}) {
  if (!Array.isArray(candles) || candles.length === 0) {
    throw new Error("candles array required (non-empty)");
  }

  const buyDates = generateBuyDates(startDate, endDate, frequency);
  let totalInvested = 0;
  let btcAccumulated = 0;
  const chartData = []; // entries per buy-date

  for (const dateStr of buyDates) {
    // target at UTC midnight of buy date
    const buyMs = dayjs.utc(dateStr).startOf("day").valueOf();
    const candle = findClosestCandle(candles, buyMs);

    if (!candle) {
      // no candle before this date — skip (shouldn't happen with proper clamping)
      continue;
    }

    const priceAtBuy = candle.close;
    const btcBought = amount / priceAtBuy;

    totalInvested += amount;
    btcAccumulated += btcBought;

    const portfolioValueAtDate = btcAccumulated * priceAtBuy;

    chartData.push({
      date: dateStr,
      priceAtBuy,
      invested: Number(totalInvested.toFixed(2)),
      btcAccumulated: Number(btcAccumulated.toFixed(8)),
      portfolioValueAtDate: Number(portfolioValueAtDate.toFixed(2)),
    });
  }

  if (btcAccumulated === 0) {
    throw new Error(
      "No purchases were made in the selected date range/frequency."
    );
  }

  const avgBuyPrice = totalInvested / btcAccumulated;
  const currentValue = latestPrice ? btcAccumulated * latestPrice : null;
  const roi = currentValue
    ? (currentValue - totalInvested) / totalInvested
    : null;

  // Lump sum: invest the same totalInvested on start date price
  const firstCandle = findClosestCandle(
    candles,
    dayjs.utc(buyDates[0]).startOf("day").valueOf()
  );
  const lumpSumValue =
    firstCandle && latestPrice
      ? (totalInvested / firstCandle.close) * latestPrice
      : null;

  return {
    totalInvested: Number(totalInvested.toFixed(2)),
    btcAccumulated: Number(btcAccumulated.toFixed(8)),
    avgBuyPrice: Number(avgBuyPrice.toFixed(2)),
    latestPrice: latestPrice ? Number(latestPrice.toFixed(2)) : null,
    currentValue: currentValue ? Number(currentValue.toFixed(2)) : null,
    roi: roi !== null ? Number(roi) : null,
    lumpSumValue:
      lumpSumValue !== null ? Number(lumpSumValue.toFixed(2)) : null,
    chartData,
  };
}

module.exports = { generateBuyDates, calculateDCA };
