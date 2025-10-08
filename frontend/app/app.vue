<template>
  <div class="min-h-screen bg-gray-50 text-gray-800 py-10 px-6">
    <div class="max-w-3xl mx-auto bg-white rounded-2xl shadow p-8">
      <h1 class="text-3xl font-bold mb-6 text-center">
        💰 Bitcoin DCA Calculator
      </h1>

      <!-- Input Form -->
      <form @submit.prevent="simulateDCA" class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="block font-semibold mb-1">Start Date</label>
          <input
            v-model="startDate"
            type="date"
            class="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label class="block font-semibold mb-1">End Date</label>
          <input
            v-model="endDate"
            type="date"
            class="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label class="block font-semibold mb-1">Frequency</label>
          <select v-model="frequency" class="w-full border rounded px-3 py-2">
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div>
          <label class="block font-semibold mb-1">Amount per DCA ($)</label>
          <input
            v-model.number="amount"
            type="number"
            min="1"
            class="w-full border rounded px-3 py-2"
          />
        </div>

        <div class="sm:col-span-2 text-center">
          <button
            type="submit"
            :disabled="loading"
            class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
          >
            {{ loading ? "Simulating..." : "Simulate" }}
          </button>
        </div>
      </form>

      <!-- Results Section -->
      <div v-if="result" class="mt-10">
        <h2 class="text-xl font-bold mb-3">📊 Simulation Result</h2>
        <div class="grid sm:grid-cols-3 gap-4 text-center">
          <div>
            <p class="text-sm text-gray-500">Total Invested</p>
            <p class="text-lg font-semibold">
              ${{ result.totalInvested.toFixed(2) }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Average Buy Price</p>
            <p class="text-lg font-semibold">
              ${{ result.averageBuyPrice.toFixed(2) }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Current Value</p>
            <p class="text-lg font-semibold">
              ${{ result.currentValue.toFixed(2) }}
            </p>
          </div>
        </div>

        <p
          class="mt-4 text-center font-bold"
          :class="result.roi >= 0 ? 'text-green-600' : 'text-red-600'"
        >
          ROI: {{ result.roi.toFixed(2) }}%
        </p>

        <!-- Chart -->
        <div class="mt-8">
          <LineChart :chartData="chartData" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement
);

// Chart component
const LineChart = {
  props: ["chartData"],
  components: { Line },
  template: `
    <div>
      <Line
        v-if="chartData"
        :data="chartData"
        :options="{
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: false } }
        }"
      />
    </div>
  `,
};

// State
const startDate = ref(
  new Date(new Date().setFullYear(new Date().getFullYear() - 1))
    .toISOString()
    .split("T")[0]
);
const endDate = ref(new Date().toISOString().split("T")[0]);
const frequency = ref("weekly");
const amount = ref(100);
const loading = ref(false);
const result = ref(null);
const chartData = ref(null);

// Simulate DCA
const simulateDCA = async () => {
  loading.value = true;
  result.value = null;

  try {
    const url = `http://localhost:3000/api/simulate-dca?startDate=${startDate.value}&endDate=${endDate.value}&frequency=${frequency.value}&amount=${amount.value}`;
    const res = await fetch(url);
    const data = await res.json();

    result.value = data;

    // Prepare chart data
    chartData.value = {
      labels: data.data.map((x) => x.date),
      datasets: [
        {
          label: "BTC Price",
          data: data.data.map((x) => x.price),
          borderColor: "#3b82f6",
          tension: 0.3,
        },
      ],
    };
  } catch (err) {
    console.error("Error fetching DCA data:", err);
  } finally {
    loading.value = false;
  }
};
</script>

<style>
body {
  font-family: "Inter", sans-serif;
}
</style>
