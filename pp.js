let min = 1000; // Minimum value for the slider
let middle = min * 100; // Middle value for the slider range
let max = middle * 100; // Maximum value for the slider
let slider;
let lastCustomValue = 999999999; // Value representing a custom input
let sliderValue;
let customPrice;
let selectedAdditional = {
    premium_support: true
};
let additionalServices;
let period = 'monthly';
let columns = getColumns();
let plans;
let total = 0;
 // Create an array of values for the slider based on defined ranges
 let sliderValues = [];
let from = 0; // Initial value for the slider's starting point
let hideAiButtons = false;

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
    console.log('Success:', data);
    return data;
  } catch (error) {
    console.error('Error fetching plan prices:', error);
  }
}

// Initializes the pricing plans
async function initializePricing() {
    try {
        plans = await fetchPlanPrices();
        // Create slider values after getting plans data
        sliderValues = enrichSliderValue([
            ...splitNumberToChunks(min, middle),
            ...splitNumberToChunks(middle, max),
            lastCustomValue
        ]);
        
        // Check if DOM is already loaded
        if (document.readyState === 'loading') {
            // If DOM is still loading, add event listener
            document.addEventListener('DOMContentLoaded', initializeDOMContent);
        } else {
            // If DOM is already loaded, execute immediately
            initializeDOMContent();
        }
    } catch (error) {
        console.error('Failed to initialize pricing:', error);
    }
}

// Separate function for DOM initialization
function initializeDOMContent() {
    fillContent();
    initSlider();
    handlePeriod();
    handlePremiumSupport();
    handlePlanChecking();
    
    if (hideAiButtons && !location.pathname.startsWith('/testing')) {
        document.body.classList.add('hide-ai-buttons');
    }
}

// Start initialization
initializePricing();

function getUniqueSessionCounts() {
    return [...new Set(
        plans.response.plans.map(plan => plan.company.sessions_count)
    )].sort((a, b) => a - b);
}

function enrichSliderValue(sliderValues) {
    const sessionCounts = getUniqueSessionCounts();
    sessionCounts.forEach(count => {
        if (!sliderValues.includes(count)) {
            sliderValues.push(count);
        }
    });
    return sliderValues.sort((a, b) => a - b);
}

// Initializes the slider
function initSlider() {
    from = Math.floor(sliderValues.length / 3);
    slider = new TsIonRangeSlider.Slider(document.querySelector('.pricing-slider'), {
        grid: false,
        skin: 'round-2',
        from: from,
        values: sliderValues,
        hide_min_max: true,
        prettify: value => {
            if (value === max) {
                return '10M';
            }
            if (value > max) {
                return '10M+';
            }
            if (value < 1000000) {
                return String(value / 1000) + 'K';
            }
            const { millions, thousands } = countMillionsAndThousands(value);
            if (thousands > 0) {
                return `${millions}.${Math.floor(thousands/100)}M`;
            }
            return `${millions}M`;
        },
        onChange: obj => {
            onSliderChange(obj);
            // console.log(obj);
        },
        onStart: obj => {
            onSliderChange(obj);
        }
    });
}

function updateAnnualBadge() {
    document.querySelector('.annual-badge .label').innerHTML = `Save 20%`;
}

// Updates the premium support UI
function updatePremiumSupportUI() {
    document.querySelector('.premium-support-container .checkbox').classList.toggle('checked', !!selectedAdditional.premium_support);
}

// Handles the premium support toggle
function handlePremiumSupport() {
    document.querySelector('.premium-support-container').addEventListener('click', () => {
        selectedAdditional.premium_support = !selectedAdditional.premium_support;
        updatePremiumSupportUI();
        calcPricing();
    });

    updatePremiumSupportUI();
}

// Handles the period toggle
function handlePeriod() {
    document.querySelector('.annual-container').addEventListener('click', () => {
        period = 'annual';
        updatePeriodUI();
        calcPricing();
    });

    document.querySelector('.monthly-container').addEventListener('click', () => {
        period = 'monthly';
        updatePeriodUI();
        calcPricing();
    });
    updatePeriodUI();
}

// Updates the period UI
function updatePeriodUI() {
    document.querySelector('.annual-container .default-radio').classList.toggle('checked', period === 'annual');
    document.querySelector('.monthly-container .default-radio').classList.toggle('checked', period === 'monthly');
}

// Fills the content with the pricing plans
function fillContent() {
    const aiAgentFeatures = document.querySelector('#ai-agent-features');
    const clientelingFeatures = document.querySelector('#clienteling-features');
    const streamingFeatures = document.querySelector('#streaming-features');

    // Get a specific feature element
    const getFeatureElement = (element, key) => element.querySelector(`.${key}`);

    // Set all feature data
    const setAllFeatureData = (featureElement, columnData) => {
        getFeatureElement(featureElement, 'feature-title').innerHTML = columnData.title;
        getFeatureElement(featureElement, 'feature-points').innerHTML = columnData.listItems
            .map(item => `<li><span class="feature-icon"></span> ${item}</li>`)
            .join('');
        getFeatureElement(featureElement, 'feature-description').innerHTML = columnData.footerDescription;
    }

    setAllFeatureData(aiAgentFeatures, columns.ai);
    setAllFeatureData(clientelingFeatures, columns.clienteling);
    setAllFeatureData(streamingFeatures, columns.streaming);
}

// Handles the checkbox click events
function handlePlanChecking() {
    calcPricing();
    if (columns.ai.checked) {
        getElements(['.pricing-checkbox-ai', '#ai-agent-features'], elements => {
          elements.forEach(element => {
            element.classList.toggle('checked', true);
          });
        });
    }
    if (columns.clienteling.checked) {
        getElements(['.pricing-checkbox-client', '#clienteling-features'], elements => {
          elements.forEach(element => {
            element.classList.toggle('checked', true);
          });
        });
    }
    if (columns.streaming.checked) {
        getElements(['.pricing-checkbox-streaming', '#streaming-features'], elements => {
          elements.forEach(element => {
            element.classList.toggle('checked', true);
          });
        });
    }
    console.log('columns.ai.checked', columns.ai.checked);

    addEventListeners(['.pricing-checkbox-ai', '#ai-agent-features'], elements => {
        columns.ai.checked = !columns.ai.checked;
        elements.forEach(element => {
            element.classList.toggle('checked', columns.ai.checked);
            calcPricing();
        });
    });

    addEventListeners(['.pricing-checkbox-client', '#clienteling-features'], elements => {
        columns.clienteling.checked = !columns.clienteling.checked;
        elements.forEach(element => {
            element.classList.toggle('checked', columns.clienteling.checked);
            calcPricing();
        });
    });

    addEventListeners(['.pricing-checkbox-streaming', '#streaming-features'], elements => {
        columns.streaming.checked = !columns.streaming.checked;
        elements.forEach(element => {
            element.classList.toggle('checked', columns.streaming.checked);
            calcPricing();
        });
    });
}

function calcTotal(_period) {
    const { additional_services } = plans.response;

    // Calculate pricing total
    const plansTotal = columnsToArray()
        .filter(col => col.checked)
        .map(col => getPlanForCurrentColumn(col, _period))
        .reduce((accum, price) => {
            return accum + price.price;
        }, 0);

    total = plansTotal;

    // Calculate additional values
    additional_services.forEach(service => {
        if (selectedAdditional[service.key]) {
            let additionalValue = 0;
            if (service.amount_type === 'percent') {
                additionalValue = (plansTotal / 100) * service.amount;
            } else {
                additionalValue = service.amount;
            }
            total = total + additionalValue;
        }
    });
    return total;
}

// Calculates the pricing based on the slider value
function calcPricing() {
    const total = calcTotal();

    // Calculate monthly cost for 12 months
    const yearlyTotalIfPaidMonthly = calcTotal('monthly') * 12;
    // Calculate the annual total
    const yearlyTotal = period === 'annual'
        ? total
        : calcTotal('annual');
    // Calculate the discount percentage
    const annualPercent = yearlyTotalIfPaidMonthly > 0 
        ? Math.round(((yearlyTotalIfPaidMonthly - yearlyTotal) / yearlyTotalIfPaidMonthly) * 100)
        : 0;

    document.querySelector('#annual-pervent-value').innerHTML = `Save ${annualPercent}%`;
    document.querySelector('#total-price').innerHTML = customPrice ? 'Custom' : formatCurrency(total);
}

// Gets the columns
function columnsToArray() {
    return Object.keys(columns)
        .map(id => {
            const column = columns[id];
            column.id = id;
            return column;
        })
        .sort((a, b) => (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0));
}

// Formats the currency
function formatCurrency(number, prefix = '$') {
    const roundedNumber = Number(number.toFixed(2));
    const hasDecimals = roundedNumber % 1 !== 0;
    if (!hasDecimals) {
        return prefix + roundedNumber.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return prefix + roundedNumber.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}


// Updates the slider value and recalculates the pricing
function onSliderChange(obj) {
    // Update the store with the new slider values
    sliderValue = obj.from_value;
    customPrice = obj.from_value === lastCustomValue; // Check if the custom value is selected
    calcPricing(); // Recalculate the pricing based on the new slider value
}

// Gets the plan for the current column
function getPlanForCurrentColumn(column, _period) {
    const storePeriod = _period || period;
    const currentPlans = plans.response.plans
        .filter(plan => plan.package.key === column.id)
        .sort((a, b) => {
            return a.company.sessions_count > b.company.sessions_count
                ? 1
                : b.company.sessions_count > a.company.sessions_count
                    ? -1
                    : 0;
        });

    // Find index of the plan with a greater number of sessions than the slider value
    let index = currentPlans.findIndex(plan => sliderValue < plan.company.sessions_count);

    const plan = index < 1
        ? currentPlans[0]
        : currentPlans[index - 1]; // Get previous plan

    return {
        plan,
        price: storePeriod === 'annual' ? plan.annual_price : plan.monthly_price
    };
}

function getElements(selectors, handler) {
    selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
            handler(selectors.map(selector => [...document.querySelectorAll(selector)]).flat());
        });
    });
}

// Adds an event listener to multiple elements
function addEventListeners(selectors, handler) {
    selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
            element.addEventListener('click', () => {
                handler(selectors.map(selector => [...document.querySelectorAll(selector)]).flat());
            });
        });
    });
}

// Splits a number range into equal chunks
function splitNumberToChunks(step, total) {
    let value = step; // Initialize the current value
    const result = [value]; // Start the result array with the first value

    // Loop to create chunks until reaching the total
    while (value !== total) {
        value = value + step; // Increment the value by the step size
        result.push(value); // Add the new value to the result array
    }

    return result; // Return the array of chunk boundaries
}

// Function to count millions and thousands from a number
function countMillionsAndThousands(num) {
    const millions = Math.floor(num / 1000000); // Calculate millions
    const thousands = Math.floor((num % 1000000) / 1000); // Calculate thousands
    return { millions, thousands }; // Return the counts
}

function getColumns() {
    return {
        ai: {
            checked: true,
            order: 1,
            price: 0,
            title: 'Custom-Built <br>AI Sales Agent',
            listItems: [
                '24/7 Live Sales Agent',
                'Customized To Your Brand',
                'Product Recommendation',
                'No Exaggeration',
                'Simple Set-up'
            ],
            footerDescription: 'Immerss AI Agent includes unlimited<br> customer interactions with no hidden<br> costs or commissions.'
        },
        clienteling: {
            checked: false,
            order: 2,
            price: 0,
            title: 'Comprehensive <br>Clienteling',
            listItems: [
                'Live Chat, Video or Voice',
                'Shopper Journey Insights',
                'Guided Shopping',
                'Sales Tracking',
                'SMS Messaging'
            ],
            footerDescription: 'Immerss Clienteling includes unlimited<br> users and customer engagements with<br> no hidden costs or commissions.'
        },
        streaming: {
            checked: false,
            order: 3,
            price: 0,
            title: 'Video <br>Shopping',
            listItems: [
                'Shoppable Videos',
                'Customized Video Player',
                'Live & Recorded Events',
                'Sales & Viewership Tracking',
                'Influencer Enablement'
            ],
            footerDescription: 'Immerss Video Shopping includes<br> unlimited shows and viewers with no<br> hidden costs or commissions.'
        }
    }
}

// Transform fakeData to async
async function fakeData() {
    // Simulating API call with Promise
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                'status': 'OK',
                'response': {
                    'plans': [
                        {
                            'package': {
                                'name': 'Clienteling Module',
                                'key': 'clienteling'
                            },
                            'company': {
                                'name': 'Startup Small',
                                'key': 'startup_small',
                                'sessions_count': 5000
                            },
                            'monthly_price': 110,
                            'annual_price': 1200
                        },
                        {
                            'package': {
                                'name': 'Streaming Module',
                                'key': 'streaming'
                            },
                            'company': {
                                'name': 'Startup Small',
                                'key': 'startup_small',
                                'sessions_count': 5000
                            },
                            'monthly_price': 110,
                            'annual_price': 1200
                        },
                        {
                            'package': {
                                'name': 'AI Module',
                                'key': 'ai'
                            },
                            'company': {
                                'name': 'Startup Small',
                                'key': 'startup_small',
                                'sessions_count': 5000
                            },
                            'monthly_price': 33,
                            'annual_price': 360
                        },
                        {
                            'package': {
                                'name': 'Clienteling Module',
                                'key': 'clienteling'
                            },
                            'company': {
                                'name': 'Startup Med',
                                'key': 'startup_med',
                                'sessions_count': 25000
                            },
                            'monthly_price': 165,
                            'annual_price': 1800
                        },
                        {
                            'package': {
                                'name': 'Streaming Module',
                                'key': 'streaming'
                            },
                            'company': {
                                'name': 'Startup Med',
                                'key': 'startup_med',
                                'sessions_count': 25000
                            },
                            'monthly_price': 165,
                            'annual_price': 1800
                        },
                        {
                            'package': {
                                'name': 'AI Module',
                                'key': 'ai'
                            },
                            'company': {
                                'name': 'Startup Med',
                                'key': 'startup_med',
                                'sessions_count': 25000
                            },
                            'monthly_price': 110,
                            'annual_price': 1200
                        },
                        {
                            'package': {
                                'name': 'Clienteling Module',
                                'key': 'clienteling'
                            },
                            'company': {
                                'name': 'Startup Large',
                                'key': 'startup_large',
                                'sessions_count': 50000
                            },
                            'monthly_price': 275,
                            'annual_price': 3000
                        },
                        {
                            'package': {
                                'name': 'Streaming Module',
                                'key': 'streaming'
                            },
                            'company': {
                                'name': 'Startup Large',
                                'key': 'startup_large',
                                'sessions_count': 50000
                            },
                            'monthly_price': 220,
                            'annual_price': 2400
                        },
                        {
                            'package': {
                                'name': 'AI Module',
                                'key': 'ai'
                            },
                            'company': {
                                'name': 'Startup Large',
                                'key': 'startup_large',
                                'sessions_count': 50000
                            },
                            'monthly_price': 220,
                            'annual_price': 2400
                        },
                        {
                            'package': {
                                'name': 'Clienteling Module',
                                'key': 'clienteling'
                            },
                            'company': {
                                'name': 'SMB Small',
                                'key': 'smb_small',
                                'sessions_count': 100000
                            },
                            'monthly_price': 385,
                            'annual_price': 4200
                        },
                        {
                            'package': {
                                'name': 'Streaming Module',
                                'key': 'streaming'
                            },
                            'company': {
                                'name': 'SMB Small',
                                'key': 'smb_small',
                                'sessions_count': 100000
                            },
                            'monthly_price': 275,
                            'annual_price': 3000
                        },
                        {
                            'package': {
                                'name': 'AI Module',
                                'key': 'ai'
                            },
                            'company': {
                                'name': 'SMB Small',
                                'key': 'smb_small',
                                'sessions_count': 100000
                            },
                            'monthly_price': 275,
                            'annual_price': 3000
                        },
                        {
                            'package': {
                                'name': 'Clienteling Module',
                                'key': 'clienteling'
                            },
                            'company': {
                                'name': 'SMB Med',
                                'key': 'smb_med',
                                'sessions_count': 250000
                            },
                            'monthly_price': 2200,
                            'annual_price': 24000
                        },
                        {
                            'package': {
                                'name': 'Streaming Module',
                                'key': 'streaming'
                            },
                            'company': {
                                'name': 'SMB Med',
                                'key': 'smb_med',
                                'sessions_count': 250000
                            },
                            'monthly_price': 1100,
                            'annual_price': 12000
                        },
                        {
                            'package': {
                                'name': 'AI Module',
                                'key': 'ai'
                            },
                            'company': {
                                'name': 'SMB Med',
                                'key': 'smb_med',
                                'sessions_count': 250000
                            },
                            'monthly_price': 825,
                            'annual_price': 9000
                        },
                        {
                            'package': {
                                'name': 'Clienteling Module',
                                'key': 'clienteling'
                            },
                            'company': {
                                'name': 'SMB Large',
                                'key': 'smb_large',
                                'sessions_count': 500000
                            },
                            'monthly_price': 3575,
                            'annual_price': 39000
                        },
                        {
                            'package': {
                                'name': 'Streaming Module',
                                'key': 'streaming'
                            },
                            'company': {
                                'name': 'SMB Large',
                                'key': 'smb_large',
                                'sessions_count': 500000
                            },
                            'monthly_price': 1650,
                            'annual_price': 18000
                        },
                        {
                            'package': {
                                'name': 'AI Module',
                                'key': 'ai'
                            },
                            'company': {
                                'name': 'SMB Large',
                                'key': 'smb_large',
                                'sessions_count': 500000
                            },
                            'monthly_price': 1650,
                            'annual_price': 18000
                        },
                        {
                            'package': {
                                'name': 'Clienteling Module',
                                'key': 'clienteling'
                            },
                            'company': {
                                'name': 'MidMarket Small',
                                'key': 'mid_market_small',
                                'sessions_count': 1000000
                            },
                            'monthly_price': 4950,
                            'annual_price': 54000
                        },
                        {
                            'package': {
                                'name': 'Streaming Module',
                                'key': 'streaming'
                            },
                            'company': {
                                'name': 'MidMarket Small',
                                'key': 'mid_market_small',
                                'sessions_count': 1000000
                            },
                            'monthly_price': 2200,
                            'annual_price': 24000
                        },
                        {
                            'package': {
                                'name': 'AI Module',
                                'key': 'ai'
                            },
                            'company': {
                                'name': 'MidMarket Small',
                                'key': 'mid_market_small',
                                'sessions_count': 1000000
                            },
                            'monthly_price': 2200,
                            'annual_price': 24000
                        },
                        {
                            'package': {
                                'name': 'Clienteling Module',
                                'key': 'clienteling'
                            },
                            'company': {
                                'name': 'MidMarket Med',
                                'key': 'mid_market_med',
                                'sessions_count': 2500000
                            },
                            'monthly_price': 7242,
                            'annual_price': 79000
                        },
                        {
                            'package': {
                                'name': 'Streaming Module',
                                'key': 'streaming'
                            },
                            'company': {
                                'name': 'MidMarket Med',
                                'key': 'mid_market_med',
                                'sessions_count': 2500000
                            },
                            'monthly_price': 3575,
                            'annual_price': 39000
                        },
                        {
                            'package': {
                                'name': 'AI Module',
                                'key': 'ai'
                            },
                            'company': {
                                'name': 'MidMarket Med',
                                'key': 'mid_market_med',
                                'sessions_count': 2500000
                            },
                            'monthly_price': 3300,
                            'annual_price': 36000
                        },
                        {
                            'package': {
                                'name': 'Clienteling Module',
                                'key': 'clienteling'
                            },
                            'company': {
                                'name': 'MidMarket Large',
                                'key': 'mid_market_large',
                                'sessions_count': 5000000
                            },
                            'monthly_price': 9350,
                            'annual_price': 102000
                        },
                        {
                            'package': {
                                'name': 'Streaming Module',
                                'key': 'streaming'
                            },
                            'company': {
                                'name': 'MidMarket Large',
                                'key': 'mid_market_large',
                                'sessions_count': 5000000
                            },
                            'monthly_price': 4950,
                            'annual_price': 54000
                        },
                        {
                            'package': {
                                'name': 'AI Module',
                                'key': 'ai'
                            },
                            'company': {
                                'name': 'MidMarket Large',
                                'key': 'mid_market_large',
                                'sessions_count': 5000000
                            },
                            'monthly_price': 4400,
                            'annual_price': 48000
                        },
                        {
                            'package': {
                                'name': 'Clienteling Module',
                                'key': 'clienteling'
                            },
                            'company': {
                                'name': 'Enterprise Small',
                                'key': 'enterprise_small',
                                'sessions_count': 7500000
                            },
                            'monthly_price': 15033,
                            'annual_price': 164000
                        },
                        {
                            'package': {
                                'name': 'Streaming Module',
                                'key': 'streaming'
                            },
                            'company': {
                                'name': 'Enterprise Small',
                                'key': 'enterprise_small',
                                'sessions_count': 7500000
                            },
                            'monthly_price': 7242,
                            'annual_price': 79000
                        },
                        {
                            'package': {
                                'name': 'AI Module',
                                'key': 'ai'
                            },
                            'company': {
                                'name': 'Enterprise Small',
                                'key': 'enterprise_small',
                                'sessions_count': 7500000
                            },
                            'monthly_price': 5500,
                            'annual_price': 60000
                        },
                        {
                            'package': {
                                'name': 'Clienteling Module',
                                'key': 'clienteling'
                            },
                            'company': {
                                'name': 'Enterprise Med',
                                'key': 'enterprise_med',
                                'sessions_count': 10000000
                            },
                            'monthly_price': 21450,
                            'annual_price': 234000
                        },
                        {
                            'package': {
                                'name': 'Streaming Module',
                                'key': 'streaming'
                            },
                            'company': {
                                'name': 'Enterprise Med',
                                'key': 'enterprise_med',
                                'sessions_count': 10000000
                            },
                            'monthly_price': 10450,
                            'annual_price': 114000
                        },
                        {
                            'package': {
                                'name': 'AI Module',
                                'key': 'ai'
                            },
                            'company': {
                                'name': 'Enterprise Med',
                                'key': 'enterprise_med',
                                'sessions_count': 10000000
                            },
                            'monthly_price': 6600,
                            'annual_price': 72000
                        },
                        {
                            'package': {
                                'name': 'Clienteling Module',
                                'key': 'clienteling'
                            },
                            'company': {
                                'name': 'Enterprise Large',
                                'key': 'enterprise_large',
                                'sessions_count': 999999999
                            },
                            'monthly_price': 999999,
                            'annual_price': 999999
                        },
                        {
                            'package': {
                                'name': 'Streaming Module',
                                'key': 'streaming'
                            },
                            'company': {
                                'name': 'Enterprise Large',
                                'key': 'enterprise_large',
                                'sessions_count': 999999999
                            },
                            'monthly_price': 999999,
                            'annual_price': 999999
                        },
                        {
                            'package': {
                                'name': 'AI Module',
                                'key': 'ai'
                            },
                            'company': {
                                'name': 'Enterprise Large',
                                'key': 'enterprise_large',
                                'sessions_count': 999999999
                            },
                            'monthly_price': 999999,
                            'annual_price': 999999
                        }
                    ],
                    'additional_services': [
                        {
                            'amount_type': 'percent',
                            'amount': 20.0,
                            'name': 'Premium support',
                            'key': 'premium_support',
                            'hint': 'Includes a dedicated account manager, ongoing training, and a 2-hour guaranteed response time during business hours.'
                        }
                    ]
                }
            });
        }, 100);
    });
}