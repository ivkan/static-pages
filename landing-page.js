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
        switchModals(modal1Elements, modal2Elements);
    });

    // Event Listeners for Modal 2
    modal2Elements.openBtns.forEach(btn => {
        btn.addEventListener('click', () => switchModals(modal1Elements, modal2Elements));
    });
    
    modal2Elements.closeBtn.addEventListener('click', () => toggleModal(modal2Elements, false));
    
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
        modal1Elements.submitBtn.disabled = isLoading;
        modal1Elements.submitBtn.textContent = text;
        modal1Elements.submitBtn.classList.toggle('loading', isLoading);
    }
}