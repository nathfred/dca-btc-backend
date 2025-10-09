<template>
  <div class="min-h-screen bg-gray-50 text-gray-800 font-sans">
    <!-- Header -->
    <header class="bg-white shadow-sm py-4">
      <div class="max-w-5xl mx-auto px-4">
        <h1 class="text-2xl font-bold text-gray-900">Bitcoin DCA Calculator</h1>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <!-- Input Form -->
      <section class="bg-white rounded-2xl shadow-sm p-6">
        <h2 class="text-lg font-semibold mb-4">Investment Settings</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1"
              >Amount (USDT)</label
            >
            <input
              v-model="amount"
              type="number"
              class="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1"
              >Frequency</label
            >
            <select
              v-model="frequency"
              class="w-full border rounded-lg px-3 py-2"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1"
              >Period (Months)</label
            >
            <input
              v-model="months"
              type="number"
              class="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button
            @click="simulateDCA"
            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
          >
            Simulate
          </button>
        </div>
      </section>

      <!-- Chart Section -->
      <section class="bg-white rounded-2xl shadow-sm p-6">
        <h2 class="text-lg font-semibold mb-4">Simulation Result</h2>
        <canvas id="dcaChart" height="100"></canvas>
      </section>

      <!-- Summary Cards -->
      <section class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white rounded-2xl shadow-sm p-6 text-center">
          <h3 class="text-sm text-gray-500">Total Invested</h3>
          <p class="text-xl font-bold mt-1">
            {{ totalInvested.toLocaleString() }} USDT
          </p>
        </div>

        <div class="bg-white rounded-2xl shadow-sm p-6 text-center">
          <h3 class="text-sm text-gray-500">Final Value</h3>
          <p class="text-xl font-bold mt-1">
            {{ finalValue.toLocaleString() }} USDT
          </p>
        </div>

        <div class="bg-white rounded-2xl shadow-sm p-6 text-center">
          <h3 class="text-sm text-gray-500">ROI</h3>
          <p
            class="text-xl font-bold mt-1"
            :class="{
              'text-green-600': roi >= 0,
              'text-red-600': roi < 0,
            }"
          >
            {{ roi.toFixed(2) }}%
          </p>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="text-center text-sm text-gray-500 py-6">
      Powered by Binance API • Built with Nuxt & Tailwind
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import Chart from "chart.js/auto";

const amount = ref(100);
const frequency = ref("weekly");
const months = ref(12);
const totalInvested = ref(0);
const finalValue = ref(0);
const roi = ref(0);

let chart: any = null;

async function simulateDCA() {
  const response = await fetch("http://localhost:3000/api/simulate-dca", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: parseFloat(amount.value),
      frequency: frequency.value,
      months: parseInt(months.value),
    }),
  });
  const data = await response.json();

  totalInvested.value = data.totalInvested;
  finalValue.value = data.finalValue;
  roi.value =
    ((data.finalValue - data.totalInvested) / data.totalInvested) * 100;

  const ctx = document.getElementById("dcaChart") as HTMLCanvasElement;

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.labels,
      datasets: [
        {
          label: "Portfolio Value (USDT)",
          data: data.portfolioValues,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.1)",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { display: true },
        y: { display: true },
      },
    },
  });
}
</script>
