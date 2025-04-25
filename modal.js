/**
 * Site functionality manager - handles video player, FAQ, forms and modals
 */

// Load all functionality when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initVideoPlayers();
    initFaqAccordions();
    initRadioButtons();
    initModals();
});

// Video player functionality
function initVideoPlayers() {
    // Lazy load videos
    document.querySelectorAll('video.lazy').forEach((video) => {
        if (video.dataset.src) {
            video.src = video.dataset.src;
            video.removeAttribute('data-src');
            video.classList.remove('lazy');
        }
    });

    // Handle video play button clicks
    document.addEventListener('click', (event) => {
        const target = event.target.closest('.video-player__button');
        if (!target || !target.closest('.video-player')) return;

        event.preventDefault();
        const wrapper = target.closest('.video-player');
        wrapper.classList.add('active');
        wrapper.querySelector('.video-player__main')?.play();
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
        closeBtn: document.getElementById('close-step1'),
        overlay: document.getElementById('modal-step1'),
        formContainer: document.querySelector('#modal-step1 .form-container'),
        form: document.getElementById('store-info-form-step1'),
        submitBtn: document.getElementById('submit-step1'),
        successMessage: document.getElementById('success-step1')
    };

    const modal2Elements = {
        openBtns: document.querySelectorAll('.open-step2'),
        closeBtn: document.getElementById('close-step2'),
        overlay: document.getElementById('modal-step2'),
        formContainer: document.querySelector('#modal-step2 .form-container'),
        form: document.getElementById('store-info-form-step2'),
        submitBtn: document.getElementById('submit-step2'),
        successMessage: document.getElementById('success-step2')
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

    modal1Elements.closeBtn.addEventListener('click', () => toggleModal(modal1Elements, false));

    modal1Elements.overlay.addEventListener('click', (event) => {
        if (!modal1Elements.formContainer.contains(event.target)) {
            toggleModal(modal1Elements, false);
        }
    });

    modal1Elements.form.addEventListener('submit', (event) => {
        event.preventDefault();
        const formValues = getFormValues();
        saveFormValuesToLocalStorage(formValues);
        switchModals(modal1Elements, modal2Elements);
    });

    // Event Listeners for Modal 2
    modal2Elements.openBtns.forEach(btn => {
        btn.addEventListener('click', () => switchModals(modal1Elements, modal2Elements));
    });

    modal2Elements.closeBtn.addEventListener('click', () => toggleModal(modal2Elements, false));

    modal2Elements.overlay.addEventListener('click', (event) => {
        if (!modal2Elements.formContainer.contains(event.target)) {
            toggleModal(modal2Elements, false);
        }
    });

    modal2Elements.form.addEventListener('submit', async (event) => {
        event.preventDefault();
        setSubmitButtonState(true);

        try {
            const formData = createFormData();
            const formValues = getFormValues();
            saveFormValuesToLocalStorage(formValues);
            // await submitToGoogleForms(formData);

            modal2Elements.form.style.display = 'none';
            modal2Elements.successMessage.style.display = 'block';

            setTimeout(() => {
                toggleModal(modal2Elements, false);
                modal2Elements.form.style.display = 'block';
                modal2Elements.successMessage.style.display = 'none';
                modal2Elements.form.reset();
            }, 3000);
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
            const plans = await fetchPlanPrices();
            const visitorsNum = Number(fields.visitors);
            const aovNum = Number(fields.aov);
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

            // Set the values to the modal
            document.getElementById('traffic-value').textContent = fields.visitors;
            document.getElementById('aov-value').textContent = fields.aov;

            // Results
            const results = {
                ai: {
                    immerssAttributedAiSales: (visitorsNum * percentages.ai.engagementRate * percentages.ai.conversionRate) * aovNum,
                    numberOfImmerssSessions: visitorsNum * percentages.ai.engagementRate,
                    immerssCost: planTotals.ai.price,
                    costPerConversation: planTotals.ai.price / (visitorsNum * percentages.ai.engagementRate),
                },
                clienteling: {
                },
                streaming: {
                }
            }

            return results;
        } catch (error) {
            console.error('Error fetching plan prices:', error);
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