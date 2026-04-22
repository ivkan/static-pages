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
const drawerBackdrop = document.querySelector("#drawerBackdrop");
const detailDrawer = document.querySelector("#detailDrawer");
const drawerClose = document.querySelector("#drawerClose");
const drawerTitle = document.querySelector("#drawerTitle");
const drawerSubtitle = document.querySelector("#drawerSubtitle");
const drawerBody = document.querySelector("#drawerBody");

const CASE_KEYS = ["low", "plausible", "great"];
let currentRenderState = null;
let currentDetail = null;

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
    royaltyTermYears: 7,
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
      termYears: readNumber("royaltyTermYears") || 1,
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
    const beginningBalance = balance;

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
      beginningBalance,
      endingBalance: balance,
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
      annualRows: Array.from({ length: inputs.holdPeriodYears }, (_, index) => ({
        year: index + 1,
        scheduled: 0,
        actual: 0,
        balloon: 0,
        remainingCap: 0,
      })),
      totalPaid: 0,
      remainingCap: 0,
      yearOnePayment: 0,
      peakAnnualPayment: 0,
      cap: 0,
      scheduledAnnualRoyalty: 0,
    };
  }

  const cap = inputs.royalty.advanceAmount * inputs.royalty.capMultiple;
  const scheduledAnnualRoyalty = scenario.grossRevenue * inputs.royalty.ratePct;
  const annualPayments = [];
  const annualRows = [];
  let cumulativePaid = 0;
  const maturityYear = Math.min(inputs.holdPeriodYears, Math.max(1, inputs.royalty.termYears));

  for (let yearIndex = 0; yearIndex < inputs.holdPeriodYears; yearIndex += 1) {
    const debtLoad = debtAnnualPayments[yearIndex] || 0;
    const year = yearIndex + 1;
    let annualRoyalty = year <= maturityYear ? scheduledAnnualRoyalty : 0;

    if (inputs.royalty.mode === "preserve") {
      const maxObligations = scenario.netProfit / inputs.targetDscr;
      annualRoyalty = Math.max(0, maxObligations - debtLoad);
      annualRoyalty = Math.min(annualRoyalty, scheduledAnnualRoyalty);
      if (year > maturityYear) {
        annualRoyalty = 0;
      }
    }

    let remainingCap = Math.max(0, cap - cumulativePaid);
    let actualPayment = Math.min(annualRoyalty, remainingCap);
    let balloon = 0;

    if (year === maturityYear && remainingCap - actualPayment > 0) {
      balloon = remainingCap - actualPayment;
      actualPayment += balloon;
    }

    cumulativePaid += actualPayment;
    remainingCap = Math.max(0, cap - cumulativePaid);
    annualPayments.push(actualPayment);
    annualRows.push({
      year,
      scheduled: annualRoyalty,
      actual: actualPayment,
      balloon,
      remainingCap,
    });
  }

  return {
    annualPayments,
    annualRows,
    totalPaid: cumulativePaid,
    remainingCap: Math.max(0, cap - cumulativePaid),
    yearOnePayment: annualPayments[0] || 0,
    peakAnnualPayment: Math.max(...annualPayments, 0),
    cap,
    scheduledAnnualRoyalty,
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
      targetYear: 0,
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
    targetYear,
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
  const activeTranches = Object.values(inputs.tranches).filter(
    (tranche) => tranche.enabled && tranche.amount > 0,
  );

  const trancheSchedules = Object.fromEntries(
    activeTranches.map((tranche) => [tranche.key, buildDebtSchedule(tranche, holdMonths)]),
  );
  const debtSchedules = activeTranches.map((tranche) => trancheSchedules[tranche.key]);

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
  const yearOneDebt = debtSchedules.reduce((sum, schedule) => sum + schedule.yearOnePayment, 0);

  return {
    caseKey,
    label: scenario.label,
    grossRevenue: scenario.grossRevenue,
    netProfit: scenario.netProfit,
    activeTranches,
    trancheSchedules,
    debtSchedules,
    debtAnnualPayments,
    royaltySchedule,
    earnoutSchedule,
    totalAnnualObligations,
    yearOneDebt,
    yearOneObligations,
    peakAnnualObligations,
    dscrYearOne,
    irr,
    payback,
    exitValue,
    exitEquityValue,
    remainingDebt,
    annualCashFlows,
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

  return {
    closeSources,
    cashNeededAtClose,
    fundingGap,
    yearOneDebt: selectedResult.yearOneDebt,
    yearOneRoyalty,
    sellerPaperAtRisk: inputs.purchasePrice - inputs.downPaymentAmount,
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDscr(value) {
  return Number.isFinite(value) ? `${numberOne.format(value)}x` : "n/a";
}

function formatIrr(value) {
  return value === null ? "n/a" : percentOne.format(value);
}

function formatPayback(value) {
  return value === null ? "Beyond hold" : `${value} yrs`;
}

function toSentenceStructure(structure) {
  if (structure === "interest-only") {
    return "Interest-only";
  }
  if (structure === "balloon") {
    return "Balloon";
  }
  return "Amortizing";
}

function infoButton(fieldKey, caseKey) {
  const meta = getMetricMeta(fieldKey, caseKey);
  return `<button type="button" class="info-button" data-open-detail="${fieldKey}" data-case="${caseKey || ""}" title="${escapeHtml(meta.tooltip)}" aria-label="${escapeHtml(meta.title)} info">i</button>`;
}

function clickableValue(value, fieldKey, caseKey) {
  return `<button type="button" class="value-button" data-open-detail="${fieldKey}" data-case="${caseKey || ""}">${value}</button>`;
}

function summaryTable(rows) {
  return `
    <div class="drawer-table-wrap">
      <table class="drawer-table">
        <tbody>
          ${rows.map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function scheduleTable(headers, rows) {
  return `
    <div class="drawer-table-wrap">
      <table class="drawer-table">
        <thead>
          <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function trancheSummaryTable(state) {
  const { inputs } = state;
  const active = Object.values(inputs.tranches).filter((tranche) => tranche.enabled && tranche.amount > 0);
  if (!active.length) {
    return "<p class=\"drawer-empty\">No debt tranches are currently enabled.</p>";
  }

  return scheduleTable(
    ["Tranche", "Amount", "Rate", "Structure", "Year 1 Payment", "Exit Balance"],
    active.map((tranche) => {
      const schedule = state.selectedResult.trancheSchedules[tranche.key];
      return [
        tranche.label,
        currency.format(tranche.amount),
        percentOne.format(tranche.annualRate),
        toSentenceStructure(tranche.structure),
        currency.format(schedule.yearOnePayment),
        currency.format(schedule.remainingBalance),
      ];
    }),
  );
}

function amortizationSections(state) {
  const { inputs, selectedResult } = state;
  const active = Object.values(inputs.tranches).filter((tranche) => tranche.enabled && tranche.amount > 0);
  if (!active.length) {
    return "<p class=\"drawer-empty\">No amortization schedule is available because no debt tranche is on.</p>";
  }

  return active
    .map((tranche) => {
      const schedule = selectedResult.trancheSchedules[tranche.key];
      const sampleRows = schedule.monthlyRows
        .filter((row) => row.month <= Math.min(inputs.holdPeriodYears * 12, 12))
        .map((row) => [
          `M${row.month}`,
          currency.format(row.beginningBalance),
          currency.format(row.payment),
          currency.format(row.interest),
          currency.format(row.principal),
          currency.format(row.balloon),
          currency.format(row.endingBalance),
        ]);

      return `
        <section class="drawer-section">
          <h3>${tranche.label} Amortization</h3>
          <p class="drawer-note">${toSentenceStructure(tranche.structure)} at ${percentOne.format(tranche.annualRate)} over ${tranche.termYears} years.</p>
          ${summaryTable([
            ["Principal", currency.format(tranche.amount)],
            ["Year 1 payment", currency.format(schedule.yearOnePayment)],
            ["Peak annual payment", currency.format(schedule.peakAnnualPayment)],
            ["Balance at hold end", currency.format(schedule.remainingBalance)],
          ])}
          ${scheduleTable(
            ["Month", "Begin", "Payment", "Interest", "Principal", "Balloon", "End"],
            sampleRows,
          )}
        </section>
      `;
    })
    .join("");
}

function annualObligationRows(result) {
  return Array.from({ length: currentRenderState.inputs.holdPeriodYears }, (_, index) => [
    `Year ${index + 1}`,
    currency.format(result.debtAnnualPayments[index] || 0),
    currency.format(result.royaltySchedule.annualPayments[index] || 0),
    currency.format(result.earnoutSchedule.annualPayments[index] || 0),
    currency.format(result.totalAnnualObligations[index] || 0),
    currency.format(result.netProfit - (result.totalAnnualObligations[index] || 0)),
  ]);
}

function cashFlowRows(result) {
  return result.annualCashFlows.map((flow, index) => {
    if (index === 0) {
      return ["Close", "Buyer down payment", currency.format(flow)];
    }

    const operatingCash = result.netProfit - (result.totalAnnualObligations[index - 1] || 0);
    const exitAdd = index === result.annualCashFlows.length - 1 ? result.exitEquityValue : 0;
    return [
      `Year ${index}`,
      `${currency.format(operatingCash)} operating ${exitAdd ? `+ ${currency.format(exitAdd)} exit` : ""}`,
      currency.format(flow),
    ];
  });
}

function buildRoyaltyCapBody(state, result) {
  return `
    <section class="drawer-section">
      ${summaryTable([
        ["Advance amount", currency.format(state.inputs.royalty.advanceAmount)],
        ["Cap multiple", `${numberOne.format(state.inputs.royalty.capMultiple)}x`],
        ["Royalty term", `${state.inputs.royalty.termYears} years`],
        ["Total cap", currency.format(result.royaltySchedule.cap)],
        ["Paid by hold end", currency.format(result.royaltySchedule.totalPaid)],
        ["Remaining cap", currency.format(result.royaltySchedule.remainingCap)],
      ])}
    </section>
    <section class="drawer-section">
      <h3>Royalty Schedule</h3>
      ${scheduleTable(
        ["Year", "Scheduled", "Actual", "Balloon", "Remaining Cap"],
        result.royaltySchedule.annualRows.map((row) => [
          `Year ${row.year}`,
          currency.format(row.scheduled),
          currency.format(row.actual),
          currency.format(row.balloon),
          currency.format(row.remainingCap),
        ]),
      )}
    </section>
  `;
}

function getMetricMeta(fieldKey, caseKey = currentRenderState?.inputs?.selectedCase || "plausible") {
  const state = currentRenderState;
  if (!state) {
    return {
      title: "Detail unavailable",
      tooltip: "Render the model first.",
      subtitle: "",
      body: "<p class=\"drawer-empty\">No detail is available yet.</p>",
    };
  }

  const result = state.results[caseKey] || state.selectedResult;
  const selectedResult = state.selectedResult;
  const detailMap = {
    yearOneObligations: {
      title: "Year 1 Obligations",
      tooltip: "Total year-one burden from debt service, royalty payments, and earnout.",
      subtitle: `${result.label} case`,
      body: `
        <section class="drawer-section">
          <p>Year 1 obligations combine debt service, royalty, and any delayed earnout due in the first year.</p>
          ${summaryTable([
            ["Debt service", currency.format(result.yearOneDebt)],
            ["Royalty", currency.format(result.royaltySchedule.yearOnePayment)],
            ["Earnout", currency.format(result.earnoutSchedule.yearOnePayment)],
            ["Total", currency.format(result.yearOneObligations)],
          ])}
        </section>
        <section class="drawer-section">
          <h3>Annual Obligation Schedule</h3>
          ${scheduleTable(
            ["Year", "Debt", "Royalty", "Earnout", "Total", "Net after obligations"],
            annualObligationRows(result),
          )}
        </section>
        <section class="drawer-section">
          <h3>Debt Tranche Support</h3>
          ${trancheSummaryTable(state)}
        </section>
        ${amortizationSections(state)}
      `,
    },
    dscr: {
      title: "Debt Service Coverage Ratio",
      tooltip: "Net profit divided by year-one obligations for the selected case.",
      subtitle: `${result.label} case`,
      body: `
        <section class="drawer-section">
          <p>DSCR here is based on net profit from your operating case divided by year-one obligations.</p>
          ${summaryTable([
            ["Net profit", currency.format(result.netProfit)],
            ["Year 1 obligations", currency.format(result.yearOneObligations)],
            ["Computed DSCR", formatDscr(result.dscrYearOne)],
            ["Target floor", formatDscr(state.inputs.targetDscr)],
          ])}
        </section>
        <section class="drawer-section">
          <h3>Coverage by Case</h3>
          ${scheduleTable(
            ["Case", "Net Profit", "Year 1 Obligations", "DSCR"],
            CASE_KEYS.map((key) => {
              const row = state.results[key];
              return [row.label, currency.format(row.netProfit), currency.format(row.yearOneObligations), formatDscr(row.dscrYearOne)];
            }),
          )}
        </section>
      `,
    },
    buyerIrr: {
      title: "Buyer IRR",
      tooltip: "Internal rate of return on buyer equity, including annual cash flow and exit proceeds.",
      subtitle: `${result.label} case over ${state.inputs.holdPeriodYears} years`,
      body: `
        <section class="drawer-section">
          <p>IRR uses the buyer down payment at close, annual cash flow after obligations, and the modeled exit equity at the end of the hold period.</p>
          ${summaryTable([
            ["Buyer down payment", currency.format(state.inputs.downPaymentAmount)],
            ["Exit equity", currency.format(result.exitEquityValue)],
            ["Hold period", `${state.inputs.holdPeriodYears} years`],
            ["Calculated IRR", formatIrr(result.irr)],
          ])}
        </section>
        <section class="drawer-section">
          <h3>Cash Flow Support</h3>
          ${scheduleTable(["Period", "Drivers", "Cash Flow"], cashFlowRows(result))}
        </section>
      `,
    },
    payback: {
      title: "Payback Period",
      tooltip: "Years until cumulative buyer cash flow turns positive.",
      subtitle: `${result.label} case`,
      body: `
        <section class="drawer-section">
          <p>Payback is the first year in which cumulative buyer cash flow recovers the original down payment.</p>
          ${summaryTable([
            ["Buyer down payment", currency.format(state.inputs.downPaymentAmount)],
            ["Payback", formatPayback(result.payback)],
          ])}
        </section>
        <section class="drawer-section">
          <h3>Cumulative Cash Flow</h3>
          ${scheduleTable(
            ["Period", "Cash Flow", "Cumulative"],
            (() => {
              let cumulative = 0;
              return result.annualCashFlows.map((flow, index) => {
                cumulative += flow;
                return [index === 0 ? "Close" : `Year ${index}`, currency.format(flow), currency.format(cumulative)];
              });
            })(),
          )}
        </section>
      `,
    },
    exitEquity: {
      title: "Buyer Exit Equity",
      tooltip: "Exit value minus debt still outstanding at the modeled exit date.",
      subtitle: `${result.label} case`,
      body: `
        <section class="drawer-section">
          <p>Exit equity equals resale value at exit minus any debt still unpaid when the buyer exits.</p>
          ${summaryTable([
            ["Net profit", currency.format(result.netProfit)],
            ["Exit multiple", `${numberOne.format(state.inputs.exitMultiple)}x`],
            ["Exit value", currency.format(result.exitValue)],
            ["Debt outstanding", currency.format(result.remainingDebt)],
            ["Exit equity", currency.format(result.exitEquityValue)],
          ])}
        </section>
        <section class="drawer-section">
          <h3>Debt at Exit</h3>
          ${trancheSummaryTable(state)}
        </section>
      `,
    },
    fundingGap: {
      title: "Funding Gap",
      tooltip: "Difference between close sources and cash needed at closing.",
      subtitle: "Sources and uses at close",
      body: `
        <section class="drawer-section">
          <p>Funding gap shows whether the structure covers closing needs after any earnout deferred beyond close.</p>
          ${summaryTable([
            ["Purchase price", currency.format(state.inputs.purchasePrice)],
            ["Less earnout deferred", currency.format(state.inputs.earnout.enabled ? state.inputs.earnout.amount : 0)],
            ["Cash needed at close", currency.format(state.summary.cashNeededAtClose)],
            ["Buyer down payment", currency.format(state.inputs.downPaymentAmount)],
            ["Debt + seller paper + royalty", currency.format(state.summary.closeSources - state.inputs.downPaymentAmount)],
            ["Funding gap / excess", state.summary.fundingGap >= 0 ? `${currency.format(state.summary.fundingGap)} excess` : currency.format(Math.abs(state.summary.fundingGap))],
          ])}
        </section>
      `,
    },
    purchasePrice: {
      title: "Purchase Price",
      tooltip: "Total enterprise value used for the transaction.",
      subtitle: "Deal input",
      body: summaryTable([["Purchase price", currency.format(state.inputs.purchasePrice)]]),
    },
    buyerDownPayment: {
      title: "Buyer Down Payment",
      tooltip: "Fixed cash contribution required from the buyer at closing.",
      subtitle: "Deal input",
      body: summaryTable([["Buyer cash in", currency.format(state.inputs.downPaymentAmount)]]),
    },
    cashNeededAtClose: {
      title: "Cash Needed at Close",
      tooltip: "Purchase price less any amount deferred into earnout.",
      subtitle: "Use of funds at closing",
      body: summaryTable([
        ["Purchase price", currency.format(state.inputs.purchasePrice)],
        ["Deferred earnout", currency.format(state.inputs.earnout.enabled ? state.inputs.earnout.amount : 0)],
        ["Cash needed", currency.format(state.summary.cashNeededAtClose)],
      ]),
    },
    closeSources: {
      title: "Total Close Sources",
      tooltip: "All dollars available at close from buyer cash, debt, seller paper, and royalty advance.",
      subtitle: "Sources of funds",
      body: summaryTable([
        ["Buyer down payment", currency.format(state.inputs.downPaymentAmount)],
        ["Senior debt", currency.format(state.inputs.tranches.senior.enabled ? state.inputs.tranches.senior.amount : 0)],
        ["Mezzanine", currency.format(state.inputs.tranches.mezz.enabled ? state.inputs.tranches.mezz.amount : 0)],
        ["Seller note", currency.format(state.inputs.tranches.seller.enabled ? state.inputs.tranches.seller.amount : 0)],
        ["Royalty advance", currency.format(state.inputs.royalty.enabled ? state.inputs.royalty.advanceAmount : 0)],
        ["Total", currency.format(state.summary.closeSources)],
      ]),
    },
    sellerNotePrincipal: {
      title: "Seller Note Principal",
      tooltip: "Face amount of the seller note you are carrying in the structure.",
      subtitle: "Seller paper at close",
      body: `
        <section class="drawer-section">
          ${summaryTable([
            ["Principal", currency.format(state.inputs.tranches.seller.enabled ? state.inputs.tranches.seller.amount : 0)],
            ["Rate", percentOne.format(state.inputs.tranches.seller.annualRate || 0)],
            ["Term", `${state.inputs.tranches.seller.termYears || 0} years`],
            ["Structure", toSentenceStructure(state.inputs.tranches.seller.structure || "amortizing")],
          ])}
        </section>
        ${amortizationSections(state)}
      `,
    },
    royaltyAdvance: {
      title: "Royalty Advance",
      tooltip: "Upfront capital funded by the royalty stream instead of standard amortizing debt.",
      subtitle: "Royalty financing",
      body: `
        <section class="drawer-section">
          ${summaryTable([
            ["Advance amount", currency.format(state.inputs.royalty.enabled ? state.inputs.royalty.advanceAmount : 0)],
            ["Royalty rate", percentOne.format(state.inputs.royalty.ratePct || 0)],
            ["Cap multiple", `${numberOne.format(state.inputs.royalty.capMultiple || 0)}x`],
            ["Royalty term", `${state.inputs.royalty.termYears || 0} years`],
            ["Treatment", state.inputs.royalty.mode === "preserve" ? "Preserve DSCR" : "Stack on top"],
          ])}
        </section>
      `,
    },
    royaltyRepaymentCap: {
      title: "Royalty Repayment Cap",
      tooltip: "Maximum cumulative royalty repayment allowed before the royalty shuts off.",
      subtitle: `${result.label} case`,
      body: buildRoyaltyCapBody(state, result),
    },
    earnout: {
      title: "Earnout",
      tooltip: "Deferred purchase price paid later instead of at close.",
      subtitle: "Earnout timing",
      body: summaryTable([
        ["Earnout amount", currency.format(state.inputs.earnout.enabled ? state.inputs.earnout.amount : 0)],
        ["Delay", `${state.inputs.earnout.delayMonths} months`],
        ["Modeled payment year", state.selectedResult.earnoutSchedule.targetYear ? `Year ${state.selectedResult.earnoutSchedule.targetYear}` : "Off"],
      ]),
    },
    yearOneDebtService: {
      title: "Year 1 Debt Service",
      tooltip: "Debt-only payments due in year one, excluding royalty and earnout.",
      subtitle: `${selectedResult.label} case`,
      body: `
        <section class="drawer-section">
          ${summaryTable([["Year 1 debt service", currency.format(state.summary.yearOneDebt)]])}
        </section>
        <section class="drawer-section">
          <h3>Debt Breakdown</h3>
          ${trancheSummaryTable(state)}
        </section>
        ${amortizationSections(state)}
      `,
    },
    yearOneRoyaltyBurden: {
      title: "Year 1 Royalty Burden",
      tooltip: "Royalty expected in year one under the chosen operating case.",
      subtitle: `${selectedResult.label} case`,
      body: buildRoyaltyCapBody(state, selectedResult),
    },
    peakAnnualObligations: {
      title: "Peak Annual Obligations",
      tooltip: "Highest annual total of debt, royalty, and earnout within the hold period.",
      subtitle: `${result.label} case`,
      body: `
        <section class="drawer-section">
          ${summaryTable([["Peak obligations", currency.format(result.peakAnnualObligations)]])}
        </section>
        <section class="drawer-section">
          <h3>Annual Obligation Schedule</h3>
          ${scheduleTable(
            ["Year", "Debt", "Royalty", "Earnout", "Total"],
            annualObligationRows(result).map((row) => row.slice(0, 5)),
          )}
        </section>
        ${amortizationSections(state)}
      `,
    },
    exitValueAssumption: {
      title: "Exit Value Assumption",
      tooltip: "Resale value modeled at the end of the hold period using a net-profit multiple.",
      subtitle: `${result.label} case`,
      body: summaryTable([
        ["Net profit", currency.format(result.netProfit)],
        ["Exit multiple", `${numberOne.format(state.inputs.exitMultiple)}x`],
        ["Exit value", currency.format(result.exitValue)],
      ]),
    },
    debtOutstandingAtExit: {
      title: "Debt Outstanding at Exit",
      tooltip: "Remaining unpaid debt across active tranches at the modeled exit date.",
      subtitle: `${result.label} case`,
      body: `
        <section class="drawer-section">
          ${summaryTable([["Total debt outstanding", currency.format(result.remainingDebt)]])}
        </section>
        <section class="drawer-section">
          <h3>Tranche Balances</h3>
          ${trancheSummaryTable(state)}
        </section>
        ${amortizationSections(state)}
      `,
    },
    grossRevenue: {
      title: "Gross Revenue",
      tooltip: "Revenue assumption for the selected operating case.",
      subtitle: `${result.label} operating case`,
      body: summaryTable([
        ["Gross revenue", currency.format(result.grossRevenue)],
        ["Royalty based on revenue", state.inputs.royalty.enabled ? "Yes" : "No"],
      ]),
    },
    netProfit: {
      title: "Net Profit",
      tooltip: "Profit assumption used for DSCR, buyer cash flow, and exit value.",
      subtitle: `${result.label} operating case`,
      body: summaryTable([
        ["Net profit", currency.format(result.netProfit)],
        ["Used in DSCR", "Yes"],
        ["Used in exit value", "Yes"],
      ]),
    },
    royaltyRemainingCap: {
      title: "Royalty Remaining Cap",
      tooltip: "Amount still collectible before the royalty repayment ceiling is hit.",
      subtitle: `${result.label} case`,
      body: buildRoyaltyCapBody(state, result),
    },
  };

  return (
    detailMap[fieldKey] || {
      title: "Metric detail",
      tooltip: "Click to inspect the supporting math.",
      subtitle: result.label,
      body: "<p class=\"drawer-empty\">This metric does not have a custom detail card yet.</p>",
    }
  );
}

function openDetail(fieldKey, caseKey) {
  currentDetail = { fieldKey, caseKey };
  const meta = getMetricMeta(fieldKey, caseKey);
  drawerTitle.textContent = meta.title;
  drawerSubtitle.textContent = meta.subtitle;
  drawerBody.innerHTML = meta.body;
  detailDrawer.classList.add("is-open");
  detailDrawer.setAttribute("aria-hidden", "false");
  drawerBackdrop.hidden = false;
  document.body.classList.add("drawer-open");
}

function closeDetail() {
  currentDetail = null;
  detailDrawer.classList.remove("is-open");
  detailDrawer.setAttribute("aria-hidden", "true");
  drawerBackdrop.hidden = true;
  document.body.classList.remove("drawer-open");
}

function renderKpis(inputs, selectedResult, summary) {
  const items = [
    {
      fieldKey: "yearOneObligations",
      label: "Year 1 Obligations",
      value: currency.format(selectedResult.yearOneObligations),
      note: `${selectedResult.label} case`,
    },
    {
      fieldKey: "dscr",
      label: "DSCR",
      value: formatDscr(selectedResult.dscrYearOne),
      note: `Target ${numberOne.format(inputs.targetDscr)}x`,
    },
    {
      fieldKey: "buyerIrr",
      label: "Buyer IRR",
      value: formatIrr(selectedResult.irr),
      note: `${inputs.holdPeriodYears}-year hold`,
    },
    {
      fieldKey: "payback",
      label: "Payback",
      value: formatPayback(selectedResult.payback),
      note: "Buyer equity recovery",
    },
    {
      fieldKey: "exitEquity",
      label: "Exit Equity",
      value: currency.format(selectedResult.exitEquityValue),
      note: `Exit at ${numberOne.format(inputs.exitMultiple)}x NP`,
    },
    {
      fieldKey: "fundingGap",
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
          <div class="metric-label-row">
            <span>${item.label}</span>
            ${infoButton(item.fieldKey, inputs.selectedCase)}
          </div>
          ${clickableValue(`<strong>${item.value}</strong>`, item.fieldKey, inputs.selectedCase)}
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
    ["purchasePrice", "Purchase price", currency.format(inputs.purchasePrice)],
    ["buyerDownPayment", "Buyer down payment", currency.format(inputs.downPaymentAmount)],
    ["cashNeededAtClose", "Cash required at close", currency.format(summary.cashNeededAtClose)],
    ["closeSources", "Total close sources", currency.format(summary.closeSources)],
    ["sellerNotePrincipal", "Seller note principal", currency.format(inputs.tranches.seller.enabled ? inputs.tranches.seller.amount : 0)],
    ["royaltyAdvance", "Royalty advance", currency.format(inputs.royalty.enabled ? inputs.royalty.advanceAmount : 0)],
    ["royaltyRepaymentCap", "Royalty repayment cap", inputs.royalty.enabled ? `${numberOne.format(inputs.royalty.capMultiple)}x` : "Off"],
    ["earnout", "Earnout", currency.format(inputs.earnout.enabled ? inputs.earnout.amount : 0)],
    ["yearOneDebtService", "Year 1 debt service", currency.format(summary.yearOneDebt)],
    ["yearOneRoyaltyBurden", "Year 1 royalty burden", currency.format(summary.yearOneRoyalty)],
    ["peakAnnualObligations", "Peak annual obligations", currency.format(selectedResult.peakAnnualObligations)],
    ["dscr", "Year 1 DSCR", formatDscr(selectedResult.dscrYearOne)],
    ["buyerIrr", "Buyer IRR", formatIrr(selectedResult.irr)],
    ["payback", "Payback period", selectedResult.payback === null ? "Beyond hold" : `${selectedResult.payback} years`],
    ["exitValueAssumption", "Exit value assumption", currency.format(selectedResult.exitValue)],
    ["debtOutstandingAtExit", "Debt outstanding at exit", currency.format(selectedResult.remainingDebt)],
    ["exitEquity", "Buyer exit equity", currency.format(selectedResult.exitEquityValue)],
  ];

  resultsTable.innerHTML = rows
    .map(
      ([fieldKey, label, value]) => `
        <tr>
          <td><div class="metric-label-row"><span>${label}</span>${infoButton(fieldKey, inputs.selectedCase)}</div></td>
          <td>${clickableValue(value, fieldKey, inputs.selectedCase)}</td>
        </tr>
      `,
    )
    .join("");
}

function renderStressTable(results) {
  const rows = [
    ["grossRevenue", "Gross revenue", (result) => currency.format(result.grossRevenue)],
    ["netProfit", "Net profit", (result) => currency.format(result.netProfit)],
    ["yearOneObligations", "Year 1 obligations", (result) => currency.format(result.yearOneObligations)],
    ["peakAnnualObligations", "Peak annual obligations", (result) => currency.format(result.peakAnnualObligations)],
    ["dscr", "DSCR", (result) => formatDscr(result.dscrYearOne)],
    ["buyerIrr", "Buyer IRR", (result) => formatIrr(result.irr)],
    ["payback", "Payback", (result) => formatPayback(result.payback)],
    ["exitEquity", "Exit equity", (result) => currency.format(result.exitEquityValue)],
    ["royaltyRemainingCap", "Royalty remaining cap", (result) => currency.format(result.royaltySchedule.remainingCap)],
  ];

  stressTable.innerHTML = rows
    .map(
      ([fieldKey, label, formatter]) => `
        <tr>
          <td><div class="metric-label-row"><span>${label}</span>${infoButton(fieldKey, currentRenderState.inputs.selectedCase)}</div></td>
          ${CASE_KEYS.map((key) => `<td>${clickableValue(formatter(results[key]), fieldKey, key)}</td>`).join("")}
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

  currentRenderState = {
    inputs,
    results,
    selectedResult,
    summary,
  };

  renderKpis(inputs, selectedResult, summary);
  renderResultsTable(inputs, selectedResult, summary);
  renderStressTable(results);
  renderConstraintSummary(inputs, results, summary);
  renderWarnings(inputs, results, summary);

  if (currentDetail) {
    openDetail(currentDetail.fieldKey, currentDetail.caseKey);
  }
}

form.addEventListener("input", render);
form.addEventListener("click", (event) => {
  const target = event.target.closest("[data-open-detail]");
  if (!target) {
    return;
  }

  openDetail(target.dataset.openDetail, target.dataset.case || undefined);
});

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-open-detail]");
  if (!target || form.contains(target)) {
    return;
  }

  openDetail(target.dataset.openDetail, target.dataset.case || undefined);
});

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

drawerClose.addEventListener("click", closeDetail);
drawerBackdrop.addEventListener("click", closeDetail);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDetail();
  }
});

formatAmountInputs();
render();
