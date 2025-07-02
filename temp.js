/**
 * Site functionality manager - handles video player, FAQ, forms and modals
 */

// Load all functionality when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initVideoPlayers();
    initFaqAccordions();
    initRadioButtons();
    initModals();
    fixInputs();
});

function fixInputs() {
    document.querySelectorAll('input[type="number"]').forEach((input) => {
        input.addEventListener('wheel', (e) => {
            e.preventDefault();
        });
    });
}

// Video player functionality
function initVideoPlayers() {
    // Lazy load videos
//     document.querySelectorAll('video.lazy').forEach((video) => {
//         if (video.dataset.src) {
//             video.src = video.dataset.src;
//             video.removeAttribute('data-src');
//             video.classList.remove('lazy');
//         }
//     });

    // Handle video play button clicks
    document.addEventListener('click', (event) => {
        const target = event.target.closest('.video-player__button');
        if (!target || !target.closest('.video-player')) return;

        event.preventDefault();
        const wrapper = target.closest('.video-player');
        wrapper.classList.add('active');
        const mainVideo = wrapper.querySelector('.video-player__main');
        mainVideo?.play();
    });
}

// FAQ accordion functionality
function initFaqAccordions() {
    document.querySelectorAll('.faq-item').forEach((item) => {
        const toggle = item.querySelector('.faq-toggle');
        const questionWrapper = item.querySelector('.faq-question-wrapper');

        questionWrapper.addEventListener('click', () => {
            item.classList.toggle('active');
            toggle.classList.toggle('open');
        });
    });
}

// Radio button handling
function initRadioButtons() {
    document.querySelectorAll('.radio-custom, .radio-label').forEach(element => {
        element.addEventListener('click', (event) => {
            const radioOption = event.target.closest('.radio-option');
            if (radioOption) {
                const radioInput = radioOption.querySelector('input[type="radio"]');
                if (radioInput) {
                    radioInput.checked = true;
                    radioInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });
    });
}

// Fetch plan prices
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

// Modal and form handling
function initModals() {
    // DOM Elements
    const modal1Elements = {
        openBtns: document.querySelectorAll('.open-step1'),
        closeBtns: document.querySelectorAll('.close-step1'),
        overlay: document.getElementById('modal-step1'),
        formContainer: document.querySelector('#modal-step1 .form-container'),
        form: document.getElementById('store-info-form-step1'),
        submitBtn: document.getElementById('submit-step1'),
        successMessage: document.getElementById('success-step1')
    };

    const modal2Elements = {
        openBtns: document.querySelectorAll('.open-step2'),
        closeBtns: document.querySelectorAll('.close-step2'),
        overlay: document.getElementById('modal-step2'),
        formContainer: document.querySelector('#modal-step2 .form-container'),
        form: document.getElementById('store-info-form-step2'),
        submitBtn: document.querySelectorAll('.open-onboarding'),
        successMessage: document.getElementById('success-step2'),
        goToStep1: document.querySelectorAll('.go-to-step1')
    };

    // Form field mappings for Google Forms
    const formFieldMappings = {
        name: 'entry.471539537',
        email: 'entry.374767219',
        website: 'entry.117746647',
        visitors: 'entry.1923945033',
        conversion: 'entry.975304481',
        aov: 'entry.1387067881',
        platform: 'entry.2046960856',
        support: 'entry.1482702442',
        stores: 'entry.1117824563',
        social: 'entry.2086550072',
        crm: 'entry.1781165083'
    };

    // Event Listeners for Modal 1
    modal1Elements.openBtns.forEach(btn => {
        btn.addEventListener('click', () => toggleModal(modal1Elements, true));
    });

    modal1Elements.closeBtns.forEach(btn => {
        btn.addEventListener('click', () => toggleModal(modal1Elements, false));
    });

    // modal1Elements.overlay.addEventListener('click', (event) => {
    //     if (!modal1Elements.formContainer.contains(event.target)) {
    //         toggleModal(modal1Elements, false);
    //     }
    // });

    //     modal1Elements.form.addEventListener('submit', (event) => {
    //         event.preventDefault();
    //         const formValues = getFormValues();
    //         saveFormValuesToLocalStorage(formValues);
    //         switchModals(modal1Elements, modal2Elements);
    //     });

    // Event Listeners for Modal 2
    modal2Elements.openBtns.forEach(btn => {
        btn.addEventListener('click', () => switchModals(modal1Elements, modal2Elements));
    });

    modal2Elements.closeBtns.forEach(btn => {
        btn.addEventListener('click', () => toggleModal(modal2Elements, false));
    });

    modal2Elements.goToStep1.forEach(btn => {
        btn.addEventListener('click', () => switchModals(modal2Elements, modal1Elements));
    });

    // modal2Elements.overlay.addEventListener('click', (event) => {
    //     if (!modal2Elements.formContainer.contains(event.target)) {
    //         toggleModal(modal2Elements, false);
    //     }
    // });

    modal2Elements.submitBtn.forEach(btn => {
        btn.addEventListener('click', async (event) => {
            event.preventDefault();
            const formValues = getFormValuesFromLocalStorage();
            const params = new URLSearchParams();

            if (formValues) {
                Object.entries(formValues).forEach(([key, value]) => {
                    params.append(key, value);
                });
            }

            window.location.href = `/onboarding?${params.toString()}`;
        });
    });

    modal1Elements.form.addEventListener('submit', async (event) => {
        event.preventDefault();
        setSubmitButtonState(true);

        try {
            const formData = createFormData();
            const formValues = getFormValues();
            saveFormValuesToLocalStorage(formValues);
            await submitToGoogleForms(formData);
            await beforeModal2Init();
            setSubmitButtonState(false, 'Submit');
            switchModals(modal1Elements, modal2Elements);
            // modal1Elements.form.reset();
        } catch (error) {
            console.error('Form submission error:', error);
        } finally {
            setSubmitButtonState(false, 'Submit');
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (modal1Elements.overlay.classList.contains('active')) {
                toggleModal(modal1Elements, false);
            } else if (modal2Elements.overlay.classList.contains('active')) {
                toggleModal(modal2Elements, false);
            }
        }
    });

    // Modal Helper Functions
    function toggleModal(modalElements, isOpen) {
        modalElements.overlay.classList.toggle('active', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    function switchModals(fromModal, toModal) {
        toggleModal(fromModal, false);
        toggleModal(toModal, true);
    }

    // Form Processing Functions
    function createFormData() {
        const formData = new FormData();
        const formValues = getFormValues();

        Object.entries(formValues).forEach(([key, value]) => {
            if (formFieldMappings[key]) {
                formData.append(formFieldMappings[key], value);
            }
        });

        return formData;
    }

    function getFormValues() {
        return Array.from(modal1Elements.form.elements).reduce((acc, element) => {
            if (element.name && element.name !== '' && element.type !== 'submit') {
                acc[element.name] = element.type === 'radio'
                    ? (element.checked ? element.value : 'No')
                    : element.value;
            }
            return acc;
        }, {});
    }

    async function submitToGoogleForms(formData) {
        formData.append('entry.1294608064', 'Yes');
        formData.append('entry.791238747', 'Yes');
        formData.append('entry.407255559', 'Option 1');
        formData.append('submissionTimestamp', Date.now().toString());

        const formId = '1FAIpQLSenbkJwdDzLau9lJo6DzVjpicVI1J9HAdByNeW77yOnnnl4Hw';
        const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/' + formId + '/formResponse';

        await fetch(GOOGLE_FORM_URL, {
            method: 'POST',
            body: formData,
            mode: 'no-cors'
        });
    }

    function setSubmitButtonState(isLoading, text = 'Processing...') {
        const activeModal = document.querySelector('.modal-overlay.active');
        const submitBtn = activeModal?.querySelector('button[type="submit"]');

        if (submitBtn) {
            submitBtn.disabled = isLoading;
            submitBtn.textContent = text;
            submitBtn.classList.toggle('loading', isLoading);
        }
    }

    function saveFormValuesToLocalStorage(formValues) {
        localStorage.setItem('formData', JSON.stringify(formValues));
    }

    async function beforeModal2Init() {
        try {
            // name, email, website, visitors, conversion, aov, platform, support, stores, social, crm
            const fields = getFormValuesFromLocalStorage();
            console.log('Form values:', fields);

            const plans = await fetchPlanPrices();
            console.log('Fetched plans:', plans);

            const visitorsNum = Number(fields.visitors);
            const aovNum = Number(fields.aov);
            const conversionRate = Number(fields.conversion) / 100; // Convert percentage to decimal
            const period = 'monthly';

            console.log('Base values:', {
                visitors: visitorsNum,
                aov: aovNum,
                conversionRate,
                period
            });

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
                    outboundCustomersReachedPerMonth: visitorsNum * 0.005,
                },
                streaming: {
                    eventEngagement: 0.01,
                    eventConversions: 0.03,
                    pdpEngagement: 0.05,
                    pdpConversions: 0.03,
                }
            };

            console.log('Using percentages:', percentages);

            // Calculate the total
            // ai, clienteling, streaming
            const planTotals = calcTotal(plans, visitorsNum, period);
            console.log('Plan totals:', planTotals);

            // AI calculations
            const aiAttributedSales = visitorsNum * percentages.ai.engagementRate * percentages.ai.conversionRate * aovNum;
            const aiSessions = visitorsNum * percentages.ai.engagementRate;
            const aiCost = planTotals.ai.price;
            const aiCostPerConversation = planTotals.ai.price / aiSessions;
            const aiROI = aiAttributedSales / aiCost;

            console.log('AI calculations:', {
                aiAttributedSales,
                aiSessions,
                aiCost,
                aiCostPerConversation,
                aiROI
            });

            // Clienteling calculations
            const clientelingInboundSales = visitorsNum * percentages.clienteling.engagementRate * percentages.clienteling.inboundConversionRate * (aovNum * (1 + percentages.clienteling.aovUplift));
            const clientelingOutboundSales = percentages.clienteling.outboundCustomersReachedPerMonth * percentages.clienteling.outboundConversionRate * aovNum;
            const clientelingSessions = visitorsNum * percentages.clienteling.engagementRate;
            const clientelingCost = planTotals.clienteling.price;
            const clientelingCostPerConversation = planTotals.clienteling.price / clientelingSessions;
            const clientelingROI = (clientelingInboundSales + clientelingOutboundSales) / clientelingCost;

            console.log('Clienteling calculations:', {
                clientelingInboundSales,
                clientelingOutboundSales,
                clientelingSessions,
                clientelingCost,
                clientelingCostPerConversation,
                clientelingROI
            });

            // Streaming calculations
            const streamingEventViews = visitorsNum * percentages.streaming.eventEngagement;
            const streamingPdpViews = 2 * visitorsNum * percentages.streaming.pdpEngagement;
            const streamingTotalOrders = (streamingEventViews * percentages.streaming.eventConversions) + (streamingPdpViews * percentages.streaming.pdpConversions);
            const streamingTotalRevenue = streamingTotalOrders * aovNum;
            const streamingImmerssCost = planTotals.streaming.price;
            const streamingROI = streamingTotalRevenue / streamingImmerssCost;

            console.log('Streaming calculations:', {
                streamingEventViews,
                streamingPdpViews,
                streamingTotalOrders,
                streamingTotalRevenue,
                streamingImmerssCost,
                streamingROI
            });

            const immerssAttributedSales = aiAttributedSales + clientelingInboundSales + clientelingOutboundSales + streamingTotalRevenue;
            const immerssAttributedCost = aiCost + clientelingCost + streamingImmerssCost;
            const immerssBundleDiscount = immerssAttributedCost * 0.9;
            const annualSavings = (immerssAttributedCost - immerssBundleDiscount) * 12;
            const immerssBundleROI = immerssAttributedSales / immerssBundleDiscount;

            console.log('Total calculations:', {
                immerssAttributedSales,
                immerssAttributedCost,
                immerssBundleDiscount,
                annualSavings,
                immerssBundleROI
            });

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

            console.log('Formatted results:', results);

            const elementIds = {
                default: {
                    traffic: 'traffic-value',
                    conversionRate: 'conversion-rate-value',
                    aov: 'aov-value',
                    revenue: 'revenue-value',
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
                    cost: ['total-cost-value', 'cost-value'],
                    discountedCost: 'total-discounted-cost-value',
                    roi: 'total-roi-value',
                    annualSavings: ['total-annual-savings-value', 'total-annual-savings-value-2'],
                }
            }

            console.log('Using element IDs mapping:', elementIds);

            // Fill the elements with the results
            let elementUpdates = [];
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
                                elementUpdates.push({ id, value });
                            } else {
                                console.warn(`Element not found: ${id}`);
                            }
                        });
                    } else {
                        const element = document.getElementById(ids);
                        if (element) {
                            element.innerHTML = value;
                            elementUpdates.push({ id: ids, value });
                        } else {
                            console.warn(`Element not found: ${ids}`);
                        }
                    }
                });
            });

            console.log('Updated DOM elements:', elementUpdates);
            console.log('Results calculation complete.');

            return results;
        } catch (error) {
            console.error('Error in beforeModal2Init:', error);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }

    function getFormValuesFromLocalStorage() {
        try {
            return JSON.parse(localStorage.getItem('formData'));
        } catch (error) {
            console.error('Error parsing form data:', error);
            return null;
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
}