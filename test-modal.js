function getFormValuesFromLocalStorage() {
    return {
        visitors: '100000',
        aov: '150',
        conversion: '1',
    }
}

function calcTotal(plans, trafficValue, _period) {
    return ['ai', 'clienteling', 'streaming']
        .reduce((acc, column) => {
            acc[column] = calcPlanTotal(plans, trafficValue, column, _period);
            return acc;
        }, {});
}

function calcPlanTotal(plans, trafficValue, column, _period) {
    return getPlanForCurrentColumn(plans, trafficValue, column, _period);
}

// Gets the plan for the current column
function getPlanForCurrentColumn(plans, trafficValue, column, _period) {
    const storePeriod = _period || period;
    const currentPlans = plans.response.plans
        .filter(plan => plan.package.key === column)
        .sort((a, b) => {
            return a.company.sessions_count > b.company.sessions_count
                ? 1
                : b.company.sessions_count > a.company.sessions_count
                    ? -1
                    : 0;
        });

    // Find index of the plan with a greater number of sessions than the slider value
    let index = currentPlans.findIndex(plan => trafficValue < plan.company.sessions_count);

    const plan = index < 1
        ? currentPlans[0]
        : currentPlans[index - 1]; // Get previous plan

    return {
        plan,
        price: storePeriod === 'annual' ? plan.annual_price : plan.monthly_price
    };
}

async function fetchPlanPrices() {
    try {
        const response = await fetch('https://portal.immerss.live/vece/api/integration/v1/plans/prices', {
            method: 'GET', // GET is the default, but explicitly stating it here
            headers: {
                // Include any required headers here
                'Content-Type': 'application/json',
                'x-platform-id': 'hubspot'
                // 'Authorization': 'Bearer your-token' // if authentication is required
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching plan prices:', error);
    }
}

async function beforeModal2Init() {
    try {
        // name, email, website, visitors, conversion, aov, platform, support, stores, social, crm
        const fields = getFormValuesFromLocalStorage();
        const plans = await fetchPlanPrices();
        const visitorsNum = Number(fields.visitors);
        const aovNum = Number(fields.aov);
        const conversionRate = Number(fields.conversion) / 100; // Convert percentage to decimal
        const period = 'monthly';

        const percentages = {
            ai: {
                engagementRate: 0.02,
                conversionRate: 0.07,
            },
            clienteling: {
                engagementRate: 0.01,
                inboundConversionRate: 0.20,
                aovUplift: 0.30,
                outboundConversionRate: 0.05,
                outboundCustomersReachedPerMonth: 500,
            },
            streaming: {
                eventEngagement: 0.01,
                eventConversions: 0.03,
                pdpEngagement: 0.05,
                pdpConversions: 0.03,
            }
        };

        // Calculate the total
        // ai, clienteling, streaming
        const planTotals = calcTotal(plans, visitorsNum, period);

        // AI calculations
        const aiAttributedSales = visitorsNum * percentages.ai.engagementRate * percentages.ai.conversionRate * aovNum;
        const aiSessions = visitorsNum * percentages.ai.engagementRate;
        const aiCost = planTotals.ai.price;
        const aiCostPerConversation = planTotals.ai.price / aiSessions;
        const aiROI = aiAttributedSales / aiCost;

        // Clienteling calculations
        const clientelingInboundSales = visitorsNum * percentages.clienteling.engagementRate * percentages.clienteling.inboundConversionRate * (aovNum * (1 + percentages.clienteling.aovUplift));
        const clientelingOutboundSales = percentages.clienteling.outboundCustomersReachedPerMonth * percentages.clienteling.outboundConversionRate * aovNum;
        const clientelingSessions = visitorsNum * percentages.clienteling.engagementRate;
        const clientelingCost = planTotals.clienteling.price;
        const clientelingCostPerConversation = planTotals.clienteling.price / clientelingSessions;
        const clientelingROI = (clientelingInboundSales + clientelingOutboundSales) / clientelingCost;

        // Streaming calculations
        const streamingEventViews = visitorsNum * percentages.streaming.eventEngagement;
        const streamingPdpViews = 2 * visitorsNum * percentages.streaming.pdpEngagement;
        const streamingTotalOrders = (streamingEventViews * percentages.streaming.eventConversions) + (streamingPdpViews * percentages.streaming.pdpConversions);
        const streamingTotalRevenue = streamingTotalOrders * aovNum;
        const streamingImmerssCost = planTotals.streaming.price;
        const streamingROI = streamingTotalRevenue / streamingImmerssCost;

        const immerssAttributedSales = aiAttributedSales + clientelingInboundSales + clientelingOutboundSales + streamingTotalRevenue;
        const immerssAttributedCost = aiCost + clientelingCost + streamingImmerssCost;
        const immerssBundleDiscount = immerssAttributedCost * 0.9;
        const annualSavings = (immerssAttributedCost - immerssBundleDiscount) * 12;
        const immerssBundleROI = immerssAttributedSales / immerssBundleDiscount;

        // Format number with commas
        const formatNumber = (value) => {
            if (typeof value !== 'number') return value;
            return value.toLocaleString('en-US', {
                maximumFractionDigits: 2,
                minimumFractionDigits: 0
            });
        };
        const formatCurrency = (value, decimals = 0) => {
            if (typeof value !== 'number') return value;
            const roundedValue = Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
            return roundedValue.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
        };
        const formatPercentage = (value) => {
            return value + '%';
        };
        const formatX = (value) => {
            if (typeof value !== 'number') return value;
            return Math.round(value) + 'x';
        };
        const results = {
            default: {
                traffic: formatNumber(visitorsNum),
                conversionRate: formatPercentage(fields.conversion),
                aov: formatCurrency(aovNum),
                revenue: formatCurrency(visitorsNum * conversionRate * aovNum),
            },
            ai: {
                revenue: formatCurrency(aiAttributedSales),
                sessions: formatNumber(aiSessions),
                cost: formatCurrency(aiCost),
                costPerSession: formatCurrency(aiCostPerConversation),
                roi: formatX(aiROI),
            },
            clienteling: {
                inboundRevenue: formatCurrency(clientelingInboundSales),
                outboundRevenue: formatCurrency(clientelingOutboundSales),
                revenue: formatCurrency(clientelingInboundSales + clientelingOutboundSales),
                sessions: formatNumber(clientelingSessions),
                cost: formatCurrency(clientelingCost),
                costPerSession: formatCurrency(clientelingCostPerConversation),
                roi: formatX(clientelingROI),
            },
            streaming: {
                eventViews: formatNumber(streamingEventViews),
                pdpViews: formatNumber(streamingPdpViews),
                orders: formatNumber(streamingTotalOrders),
                revenue: formatCurrency(streamingTotalRevenue),
                cost: formatCurrency(streamingImmerssCost),
                roi: formatX(streamingROI),
            },
            total: {
                revenue: formatCurrency(immerssAttributedSales),
                cost: formatCurrency(immerssAttributedCost),
                discountedCost: formatCurrency(immerssBundleDiscount),
                roi: formatX(immerssBundleROI),
                annualSavings: formatCurrency(annualSavings),
            }
        };

        const elementIds = {
            default: {
                traffic: 'traffic-value',
                conversionRate: 'conversion-rate-value',
                aov: 'aov-value',
                revenue: ['revenue-value', 'total-revenue-value'],
            },
            ai: {
                revenue: 'ai-revenue-value',
                cost: 'ai-cost-value',
                roi: 'ai-roi-value',
            },
            clienteling: {
                inboundRevenue: 'clienteling-revenue-value',
                cost: 'clienteling-cost-value',
                roi: 'clienteling-roi-value',
            },
            streaming: {
                revenue: 'streaming-revenue-value',
                cost: 'streaming-cost-value',
                roi: 'streaming-roi-value',
            },
            total: {
                revenue: 'expected-revenue-value',
                cost: ['total-cost-value', 'summary-cost-value'],
                discountedCost: 'total-discounted-cost-value',
                roi: 'total-roi-value',
                annualSavings: 'total-annual-savings-value',
            }
        }

        // Fill the elements with the results
        Object.keys(results).forEach(key => {
            Object.keys(results[key]).forEach(subKey => {
                const ids = elementIds[key][subKey];
                if (!ids) return;
                
                const value = results[key][subKey];
                
                // Handle both single string ID and array of IDs
                if (Array.isArray(ids)) {
                    ids.forEach(id => {
                        const element = document.getElementById(id);
                        if (element) {
                            element.innerHTML = value;
                        }
                    });
                } else {
                    const element = document.getElementById(ids);
                    if (element) {
                        element.innerHTML = value;
                    }
                }
            });
        });

        return results;
    } catch (error) {
        console.error('Error fetching plan prices:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    beforeModal2Init().then(results => {
        console.log(results);
    });
});