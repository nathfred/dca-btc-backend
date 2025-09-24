const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const {
  fetchDailyKlines,
  getLatestPrice,
  BINANCE_EARLIEST,
} = require("./priceService");
const { calculateDCA, generateBuyDates } = require("./dcaCalculator");

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const DEFAULT_AMOUNT = 100;
const DEFAULT_FREQ = "weekly";

app.get("/api/simulate-dca", async (req, res) => {
  try {
    // Accept either query string or JSON body (query preferred for quick testing)
    const {
      startDate = null,
      endDate = null,
      frequency = DEFAULT_FREQ,
      amount = DEFAULT_AMOUNT,
    } = req.query;

    // default end = today, start = 1 year ago
    const end = endDate || new Date().toISOString().slice(0, 10);
    const defaultStart = new Date();
    defaultStart.setFullYear(defaultStart.getFullYear() - 1);
    const start = startDate || defaultStart.toISOString().slice(0, 10);

    // Clamp start to BINANCE_EARLIEST if earlier
    const startClamped =
      new Date(start) < new Date(BINANCE_EARLIEST.toISOString())
        ? BINANCE_EARLIEST.toISOString().slice(0, 10)
        : start;

    // Fetch candles
    const candles = await fetchDailyKlines("BTCUSDT", startClamped, end);

    // Fetch latest price
    const latestPrice = await getLatestPrice("BTCUSDT");

    // Calculate
    const result = calculateDCA({
      startDate: startClamped,
      endDate: end,
      frequency,
      amount: Number(amount),
      candles,
      latestPrice,
    });

    // Also return metadata
    res.json({
      startDate: startClamped,
      endDate: end,
      frequency,
      amount: Number(amount),
      ...result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "internal error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`DCA backend listening on http://localhost:${PORT}`)
);
