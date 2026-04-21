const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberOne = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const percentOne = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const form = document.querySelector("#dealForm");
const resultsTable = document.querySelector("#resultsTable");
const stressTable = document.querySelector("#stressTable");
const selectedScenarioName = document.querySelector("#selectedScenarioName");
const headlineTitle = document.querySelector("#headlineTitle");
const headlineNarrative = document.querySelector("#headlineNarrative");
const constraintBox = document.querySelector("#constraintBox");
const warningsBox = document.querySelector("#warningsBox");
const kpiGrid = document.querySelector("#kpiGrid");
const presetButtons = Array.from(document.querySelectorAll(".preset-button"));
const amountInputs = Array.from(document.querySelectorAll('input[data-format="amount"]'));

const CASE_KEYS = ["low", "plausible", "great"];

const PRESETS = {
  sellerCarry: {
    seniorEnabled: true,
    seniorAmount: 1000000,
    seniorRate: 9,
    seniorTermYears: 10,
    seniorType: "amortizing",
    seniorIoMonths: 0,
    seniorBalloonYears: 5,
    mezzEnabled: false,
    sellerEnabled: true,
    sellerAmount: 2500000,
    sellerRate: 8,
    sellerTermYears: 10,
    sellerType: "amortizing",
    sellerIoMonths: 12,
    sellerBalloonYears: 5,
    royaltyEnabled: false,
    earnoutEnabled: false,
  },
  hybrid: {
    seniorEnabled: true,
    seniorAmount: 1250000,
    seniorRate: 9.5,
    seniorTermYears: 10,
    seniorType: "amortizing",
    seniorIoMonths: 0,
    seniorBalloonYears: 5,
    mezzEnabled: true,
    mezzAmount: 500000,
    mezzRate: 13,
    mezzTermYears: 7,
    mezzType: "interest-only",
    mezzIoMonths: 12,
    mezzBalloonYears: 5,
    sellerEnabled: true,
    sellerAmount: 1500000,
    sellerRate: 8,
    sellerTermYears: 10,
    sellerType: "amortizing",
    sellerIoMonths: 12,
    sellerBalloonYears: 5,
    royaltyEnabled: false,
    earnoutEnabled: true,
    earnoutAmount: 250000,
    earnoutDelayMonths: 24,
  },
  royaltyBridge: {
    seniorEnabled: true,
    seniorAmount: 1000000,
    seniorRate: 9.25,
    seniorTermYears: 10,
    seniorType: "amortizing",
    seniorIoMonths: 0,
    seniorBalloonYears: 5,
    mezzEnabled: false,
    sellerEnabled: true,
    sellerAmount: 1000000,
    sellerRate: 8.25,
    sellerTermYears: 10,
    sellerType: "interest-only",
    sellerIoMonths: 24,
    sellerBalloonYears: 5,
    royaltyEnabled: true,
    royaltyAdvanceAmount: 1500000,
    royaltyRatePct: 6,
    royaltyCapMultiple: 1.6,
    royaltyMode: "preserve",
    earnoutEnabled: false,
  },
};

function formValue(name) {
  return form.elements.namedItem(name);
}

function readNumber(name) {
  const rawValue = String(formValue(name)?.value || "");
  const normalized = rawValue.replace(/,/g, "").replace(/[^\d.-]/g, "");
  return Number(normalized) || 0;
}

function readCheckbox(name) {
  return Boolean(formValue(name)?.checked);
}

function readInputs() {
  return {
    purchasePrice: readNumber("purchasePrice"),
    downPaymentAmount: readNumber("downPaymentAmount"),
    targetDscr: readNumber("targetDscr") || 1.25,
    holdPeriodYears: readNumber("holdPeriodYears") || 7,
    exitMultiple: readNumber("exitMultiple") || 3,
    selectedCase: formValue("selectedCase")?.value || "plausible",
    cases: {
      low: {
        label: "Low",
        grossRevenue: readNumber("grossRevenueLow"),
        netProfit: readNumber("netProfitLow"),
      },
      plausible: {
        label: "Plausible",
        grossRevenue: readNumber("grossRevenuePlausible"),
        netProfit: readNumber("netProfitPlausible"),
      },
      great: {
        label: "Great",
        grossRevenue: readNumber("grossRevenueGreat"),
        netProfit: readNumber("netProfitGreat"),
      },
    },
    tranches: {
      senior: readDebtTranche("senior", "Senior Debt"),
      mezz: readDebtTranche("mezz", "Mezzanine"),
      seller: readDebtTranche("seller", "Seller Note"),
    },
    royalty: {
      enabled: readCheckbox("royaltyEnabled"),
      advanceAmount: readNumber("royaltyAdvanceAmount"),
      ratePct: readNumber("royaltyRatePct") / 100,
      capMultiple: readNumber("royaltyCapMultiple"),
      mode: formValue("royaltyMode")?.value || "stacked",
    },
    earnout: {
      enabled: readCheckbox("earnoutEnabled"),
      amount: readNumber("earnoutAmount"),
      delayMonths: readNumber("earnoutDelayMonths"),
    },
  };
}

function readDebtTranche(prefix, label) {
  return {
    key: prefix,
    label,
    enabled: readCheckbox(`${prefix}Enabled`),
    amount: readNumber(`${prefix}Amount`),
    annualRate: readNumber(`${prefix}Rate`) / 100,
    termYears: readNumber(`${prefix}TermYears`) || 1,
    structure: formValue(`${prefix}Type`)?.value || "amortizing",
    ioMonths: readNumber(`${prefix}IoMonths`),
    balloonYears: readNumber(`${prefix}BalloonYears`) || 5,
  };
}

function applyPreset(presetKey) {
  const preset = PRESETS[presetKey];
  if (!preset) {
    return;
  }

  Object.entries(preset).forEach(([name, value]) => {
    const field = formValue(name);
    if (!field) {
      return;
    }

    if (field.type === "checkbox") {
      field.checked = Boolean(value);
    } else {
      field.value = String(value);
    }
  });

  formatAmountInputs();
  render();
}

function formatAmount(value) {
  const numeric = Number(String(value).replace(/,/g, "").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(numeric)) {
    return "";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(numeric);
}

function formatAmountInputs() {
  amountInputs.forEach((input) => {
    if (document.activeElement === input) {
      return;
    }

    input.value = formatAmount(input.value);
  });
}

function monthlyPayment(principal, monthlyRate, months) {
  if (principal <= 0 || months <= 0) {
    return 0;
  }

  if (monthlyRate === 0) {
    return principal / months;
  }

  return principal * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)));
}

function buildDebtSchedule(tranche, holdMonths) {
  if (!tranche.enabled || tranche.amount <= 0) {
    return emptySchedule();
  }

  const monthlyRate = tranche.annualRate / 12;
  const totalMonths = Math.max(1, Math.round(tranche.termYears * 12));
  const ioMonths = Math.min(tranche.ioMonths, totalMonths - 1);
  const balloonMonths = Math.max(1, Math.round(tranche.balloonYears * 12));
  const amortMonths = Math.max(1, totalMonths - ioMonths);

  let balance = tranche.amount;
  let cumulativePayments = 0;
  const monthlyRows = [];
  const annualTotals = {};

  for (let month = 1; month <= holdMonths; month += 1) {
    let payment = 0;
    let interest = 0;
    let principal = 0;
    let balloon = 0;

    if (balance > 0) {
      interest = balance * monthlyRate;

      if (tranche.structure === "interest-only") {
        payment = interest;
        if (month === totalMonths || month === holdMonths) {
          balloon = balance;
          principal = balance;
          payment += balloon;
          balance = 0;
        }
      } else {
        if (month <= ioMonths) {
          payment = interest;
        } else {
          const remainingAmortMonths = Math.max(totalMonths - month + 1, 1);
          const amortPayment = monthlyPayment(
            balance,
            monthlyRate,
            tranche.structure === "balloon" ? amortMonths : remainingAmortMonths,
          );
          payment = amortPayment;
          principal = Math.min(balance, Math.max(payment - interest, 0));
          balance -= principal;
        }

        if (
          tranche.structure === "balloon" &&
          month === Math.min(balloonMonths, holdMonths) &&
          balance > 0
        ) {
          balloon = balance;
          principal += balance;
          payment += balance;
          balance = 0;
        }
      }
    }

    cumulativePayments += payment;
    const year = Math.ceil(month / 12);
    annualTotals[year] = (annualTotals[year] || 0) + payment;

    monthlyRows.push({
      month,
      year,
      payment,
      interest,
      principal,
      balloon,
      balance,
    });
  }

  const annualPayments = Array.from({ length: Math.ceil(holdMonths / 12) }, (_, index) =>
    annualTotals[index + 1] || 0,
  );

  return {
    monthlyRows,
    annualPayments,
    totalPaid: cumulativePayments,
    remainingBalance: balance,
    yearOnePayment: annualPayments[0] || 0,
    peakAnnualPayment: Math.max(...annualPayments, 0),
  };
}

function emptySchedule() {
  return {
    monthlyRows: [],
    annualPayments: [],
    totalPaid: 0,
    remainingBalance: 0,
    yearOnePayment: 0,
    peakAnnualPayment: 0,
  };
}

function buildRoyaltySchedule(inputs, scenario, debtAnnualPayments) {
  if (!inputs.royalty.enabled || inputs.royalty.advanceAmount <= 0) {
    return {
      annualPayments: Array.from({ length: inputs.holdPeriodYears }, () => 0),
      totalPaid: 0,
      remainingCap: 0,
      yearOnePayment: 0,
      peakAnnualPayment: 0,
    };
  }

  const cap = inputs.royalty.advanceAmount * inputs.royalty.capMultiple;
  const scheduledAnnualRoyalty = scenario.grossRevenue * inputs.royalty.ratePct;
  const annualPayments = [];
  let cumulativePaid = 0;

  for (let yearIndex = 0; yearIndex < inputs.holdPeriodYears; yearIndex += 1) {
    const debtLoad = debtAnnualPayments[yearIndex] || 0;
    let annualRoyalty = scheduledAnnualRoyalty;

    if (inputs.royalty.mode === "preserve") {
      const maxObligations = scenario.netProfit / inputs.targetDscr;
      annualRoyalty = Math.max(0, maxObligations - debtLoad);
      annualRoyalty = Math.min(annualRoyalty, scheduledAnnualRoyalty);
    }

    const remainingCap = Math.max(0, cap - cumulativePaid);
    const actualPayment = Math.min(annualRoyalty, remainingCap);
    cumulativePaid += actualPayment;
    annualPayments.push(actualPayment);
  }

  return {
    annualPayments,
    totalPaid: cumulativePaid,
    remainingCap: Math.max(0, cap - cumulativePaid),
    yearOnePayment: annualPayments[0] || 0,
    peakAnnualPayment: Math.max(...annualPayments, 0),
  };
}

function buildEarnoutSchedule(inputs) {
  const annualPayments = Array.from({ length: inputs.holdPeriodYears }, () => 0);

  if (!inputs.earnout.enabled || inputs.earnout.amount <= 0) {
    return {
      annualPayments,
      totalPaid: 0,
      yearOnePayment: 0,
      peakAnnualPayment: 0,
    };
  }

  const targetYear = Math.min(
    inputs.holdPeriodYears,
    Math.max(1, Math.ceil((inputs.earnout.delayMonths || 0) / 12)),
  );
  annualPayments[targetYear - 1] = inputs.earnout.amount;

  return {
    annualPayments,
    totalPaid: inputs.earnout.amount,
    yearOnePayment: annualPayments[0] || 0,
    peakAnnualPayment: Math.max(...annualPayments, 0),
  };
}

function sumArrays(arrays, length) {
  return Array.from({ length }, (_, index) =>
    arrays.reduce((sum, array) => sum + (array[index] || 0), 0),
  );
}

function computeIrr(cashFlows) {
  let low = -0.99;
  let high = 5;

  function npv(rate) {
    return cashFlows.reduce(
      (sum, flow, index) => sum + flow / Math.pow(1 + rate, index),
      0,
    );
  }

  let lowValue = npv(low);
  let highValue = npv(high);

  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue) || lowValue * highValue > 0) {
    return null;
  }

  for (let i = 0; i < 100; i += 1) {
    const mid = (low + high) / 2;
    const value = npv(mid);

    if (Math.abs(value) < 0.0001) {
      return mid;
    }

    if (value * lowValue > 0) {
      low = mid;
      lowValue = value;
    } else {
      high = mid;
      highValue = value;
    }
  }

  return (low + high) / 2;
}

function computePayback(cashFlows) {
  let cumulative = 0;

  for (let year = 0; year < cashFlows.length; year += 1) {
    cumulative += cashFlows[year];
    if (cumulative >= 0) {
      return year;
    }
  }

  return null;
}

function evaluateCase(inputs, caseKey) {
  const scenario = inputs.cases[caseKey];
  const holdMonths = inputs.holdPeriodYears * 12;

  const debtSchedules = Object.values(inputs.tranches).map((tranche) =>
    buildDebtSchedule(tranche, holdMonths),
  );

  const debtAnnualPayments = sumArrays(
    debtSchedules.map((schedule) => schedule.annualPayments),
    inputs.holdPeriodYears,
  );
  const royaltySchedule = buildRoyaltySchedule(inputs, scenario, debtAnnualPayments);
  const earnoutSchedule = buildEarnoutSchedule(inputs);
  const totalAnnualObligations = sumArrays(
    [debtAnnualPayments, royaltySchedule.annualPayments, earnoutSchedule.annualPayments],
    inputs.holdPeriodYears,
  );

  const exitValue = scenario.netProfit * inputs.exitMultiple;
  const remainingDebt = debtSchedules.reduce(
    (sum, schedule) => sum + schedule.remainingBalance,
    0,
  );
  const exitEquityValue = Math.max(exitValue - remainingDebt, 0);

  const annualCashFlows = [
    -inputs.downPaymentAmount,
    ...totalAnnualObligations.map((obligation) => scenario.netProfit - obligation),
  ];
  annualCashFlows[annualCashFlows.length - 1] += exitEquityValue;

  const irr = computeIrr(annualCashFlows);
  const payback = computePayback(annualCashFlows);
  const yearOneObligations = totalAnnualObligations[0] || 0;
  const peakAnnualObligations = Math.max(...totalAnnualObligations, 0);
  const dscrYearOne = yearOneObligations > 0 ? scenario.netProfit / yearOneObligations : Infinity;
  const sellerFinancingTotal =
    (inputs.tranches.seller.enabled ? inputs.tranches.seller.amount : 0) +
    (inputs.royalty.enabled ? inputs.royalty.advanceAmount : 0) +
    (inputs.earnout.enabled ? inputs.earnout.amount : 0);

  return {
    caseKey,
    label: scenario.label,
    grossRevenue: scenario.grossRevenue,
    netProfit: scenario.netProfit,
    debtSchedules,
    debtAnnualPayments,
    royaltySchedule,
    earnoutSchedule,
    totalAnnualObligations,
    yearOneObligations,
    peakAnnualObligations,
    dscrYearOne,
    irr,
    payback,
    exitValue,
    exitEquityValue,
    remainingDebt,
    annualCashFlows,
    sellerFinancingTotal,
  };
}

function buildSummary(inputs, selectedResult) {
  const closeSources =
    inputs.downPaymentAmount +
    Object.values(inputs.tranches)
      .filter((tranche) => tranche.enabled)
      .reduce((sum, tranche) => sum + tranche.amount, 0) +
    (inputs.royalty.enabled ? inputs.royalty.advanceAmount : 0);
  const cashNeededAtClose =
    inputs.purchasePrice - (inputs.earnout.enabled ? inputs.earnout.amount : 0);
  const fundingGap = closeSources - cashNeededAtClose;
  const yearOneRoyalty = selectedResult.royaltySchedule.yearOnePayment;
  const yearOneDebt = selectedResult.debtSchedules.reduce(
    (sum, schedule) => sum + schedule.yearOnePayment,
    0,
  );

  return {
    closeSources,
    cashNeededAtClose,
    fundingGap,
    yearOneDebt,
    yearOneRoyalty,
    sellerPaperAtRisk: inputs.purchasePrice - inputs.downPaymentAmount,
  };
}

function renderKpis(inputs, selectedResult, summary) {
  const items = [
    {
      label: "Year 1 Obligations",
      value: currency.format(selectedResult.yearOneObligations),
      note: `${selectedResult.label} case`,
    },
    {
      label: "DSCR",
      value:
        Number.isFinite(selectedResult.dscrYearOne)
          ? `${numberOne.format(selectedResult.dscrYearOne)}x`
          : "n/a",
      note: `Target ${numberOne.format(inputs.targetDscr)}x`,
    },
    {
      label: "Buyer IRR",
      value: selectedResult.irr === null ? "n/a" : percentOne.format(selectedResult.irr),
      note: `${inputs.holdPeriodYears}-year hold`,
    },
    {
      label: "Payback",
      value: selectedResult.payback === null ? "Beyond hold" : `${selectedResult.payback} yrs`,
      note: "Buyer equity recovery",
    },
    {
      label: "Exit Equity",
      value: currency.format(selectedResult.exitEquityValue),
      note: `Exit at ${numberOne.format(inputs.exitMultiple)}x NP`,
    },
    {
      label: "Funding Gap",
      value:
        summary.fundingGap >= 0
          ? `${currency.format(summary.fundingGap)} excess`
          : currency.format(Math.abs(summary.fundingGap)),
      note: "Close funding balance",
    },
  ];

  kpiGrid.innerHTML = items
    .map(
      (item) => `
        <article class="kpi-card">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
          <small>${item.note}</small>
        </article>
      `,
    )
    .join("");
}

function renderResultsTable(inputs, selectedResult, summary) {
  selectedScenarioName.textContent = `${selectedResult.label} Case`;
  headlineTitle.textContent = "Seller-Structured Hybrid";
  headlineNarrative.textContent =
    "The structure is judged first on whether the buyer can carry the obligations under the selected operating case, then on how quickly your paper gets taken out.";

  const rows = [
    ["Purchase price", currency.format(inputs.purchasePrice)],
    ["Buyer down payment", currency.format(inputs.downPaymentAmount)],
    ["Cash required at close", currency.format(summary.cashNeededAtClose)],
    ["Total close sources", currency.format(summary.closeSources)],
    ["Seller note principal", currency.format(inputs.tranches.seller.enabled ? inputs.tranches.seller.amount : 0)],
    ["Royalty advance", currency.format(inputs.royalty.enabled ? inputs.royalty.advanceAmount : 0)],
    ["Royalty repayment cap", inputs.royalty.enabled ? `${numberOne.format(inputs.royalty.capMultiple)}x` : "Off"],
    ["Earnout", currency.format(inputs.earnout.enabled ? inputs.earnout.amount : 0)],
    ["Year 1 debt service", currency.format(summary.yearOneDebt)],
    ["Year 1 royalty burden", currency.format(summary.yearOneRoyalty)],
    ["Peak annual obligations", currency.format(selectedResult.peakAnnualObligations)],
    ["Year 1 DSCR", Number.isFinite(selectedResult.dscrYearOne) ? `${numberOne.format(selectedResult.dscrYearOne)}x` : "n/a"],
    ["Buyer IRR", selectedResult.irr === null ? "n/a" : percentOne.format(selectedResult.irr)],
    ["Payback period", selectedResult.payback === null ? "Beyond hold" : `${selectedResult.payback} years`],
    ["Exit value assumption", currency.format(selectedResult.exitValue)],
    ["Debt outstanding at exit", currency.format(selectedResult.remainingDebt)],
    ["Buyer exit equity", currency.format(selectedResult.exitEquityValue)],
  ];

  resultsTable.innerHTML = rows
    .map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`)
    .join("");
}

function renderStressTable(results) {
  const rows = [
    ["Gross revenue", (result) => currency.format(result.grossRevenue)],
    ["Net profit", (result) => currency.format(result.netProfit)],
    ["Year 1 obligations", (result) => currency.format(result.yearOneObligations)],
    ["Peak annual obligations", (result) => currency.format(result.peakAnnualObligations)],
    ["DSCR", (result) => (Number.isFinite(result.dscrYearOne) ? `${numberOne.format(result.dscrYearOne)}x` : "n/a")],
    ["Buyer IRR", (result) => (result.irr === null ? "n/a" : percentOne.format(result.irr))],
    ["Payback", (result) => (result.payback === null ? "Beyond hold" : `${result.payback} yrs`)],
    ["Exit equity", (result) => currency.format(result.exitEquityValue)],
    ["Royalty remaining cap", (result) => currency.format(result.royaltySchedule.remainingCap)],
  ];

  stressTable.innerHTML = rows
    .map(
      ([label, formatter]) => `
        <tr>
          <td>${label}</td>
          ${CASE_KEYS.map((key) => `<td>${formatter(results[key])}</td>`).join("")}
        </tr>
      `,
    )
    .join("");
}

function renderConstraintSummary(inputs, results, summary) {
  const passingCases = CASE_KEYS.filter(
    (key) => results[key].dscrYearOne >= inputs.targetDscr,
  );
  const weakestCase = CASE_KEYS.reduce((worst, key) =>
    results[key].dscrYearOne < results[worst].dscrYearOne ? key : worst,
  );

  constraintBox.textContent =
    `${passingCases.length} of ${CASE_KEYS.length} operating cases clear the ` +
    `${numberOne.format(inputs.targetDscr)}x DSCR floor. ${results[weakestCase].label} ` +
    `is the tightest case at ${numberOne.format(results[weakestCase].dscrYearOne)}x. ` +
    `Close funding is ${summary.fundingGap >= 0 ? "overfunded" : "short"} by ` +
    `${currency.format(Math.abs(summary.fundingGap))}.`;
}

function renderWarnings(inputs, results, summary) {
  const warnings = [];

  if (summary.fundingGap < 0) {
    warnings.push("Close sources do not fully cover cash due at closing. Increase funding or reduce upfront seller cash.");
  }

  CASE_KEYS.forEach((key) => {
    if (results[key].dscrYearOne < inputs.targetDscr) {
      warnings.push(`${results[key].label} case falls below the ${numberOne.format(inputs.targetDscr)}x DSCR target.`);
    }
  });

  if (inputs.royalty.enabled && inputs.royalty.mode === "stacked") {
    warnings.push("Royalty payments are currently stacking on top of debt service. If that feels too aggressive, switch royalty treatment to preserve DSCR.");
  }

  warningsBox.innerHTML = warnings.length
    ? warnings.map((warning) => `<p>${warning}</p>`).join("")
    : "<p>No immediate structural warnings. The current paper clears the minimum checks in each case.</p>";
}

function render() {
  const inputs = readInputs();
  const results = Object.fromEntries(
    CASE_KEYS.map((key) => [key, evaluateCase(inputs, key)]),
  );
  const selectedResult = results[inputs.selectedCase];
  const summary = buildSummary(inputs, selectedResult);

  renderKpis(inputs, selectedResult, summary);
  renderResultsTable(inputs, selectedResult, summary);
  renderStressTable(results);
  renderConstraintSummary(inputs, results, summary);
  renderWarnings(inputs, results, summary);
}

form.addEventListener("input", render);
amountInputs.forEach((input) => {
  input.addEventListener("focus", () => {
    input.value = input.value.replace(/,/g, "");
  });

  input.addEventListener("blur", () => {
    input.value = formatAmount(input.value);
    render();
  });
});
presetButtons.forEach((button) => {
  button.addEventListener("click", () => applyPreset(button.dataset.preset));
});

formatAmountInputs();
render();
