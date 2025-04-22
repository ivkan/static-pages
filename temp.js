/**
 * Video Player Helper
 * Handles the play button click and loading of lazy-loaded videos
 */
/* ========================
   VIDEO PLAYER FUNCTIONALITY
   ======================== */

   document.addEventListener('click', (event) => {
    // Find the clicked video button
    const target = event.target.closest('.video-player__button');
    if (!target || !target.closest('.video-player')) return;

    event.preventDefault();
    const wrapper = target.closest('.video-player');
    wrapper.classList.add('active');
    wrapper.querySelector('.video-player__main')?.play();
});

// Lazy load videos on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('video.lazy').forEach((video) => {
        // Replace data-src with actual src
        if (video.dataset.src) {
            video.src = video.dataset.src;
            video.removeAttribute('data-src');
            video.classList.remove('lazy');
        }
    });

    /* ======================
       FAQ FUNCTIONALITY
       ====================== */
    document.querySelectorAll('.faq-item').forEach((item) => {
        const toggle = item.querySelector('.faq-toggle');
        const answer = item.querySelector('.faq-answer');
        const questionWrapper = item.querySelector('.faq-question-wrapper');

        questionWrapper.addEventListener('click', () => {
            // Toggle the active class on the FAQ item
            item.classList.toggle('active');
            toggle.classList.toggle('open');
        });
    });

    /* ======================
       MODAL & FORM HANDLING
       ====================== */

    /* ======================
     RADIO BUTTON HANDLING
     ====================== */
    document.querySelectorAll('.radio-custom, .radio-label').forEach(element => {
        element.addEventListener('click', (event) => {
            const radioOption = event.target.closest('.radio-option');
            if (radioOption) {
                const radioInput = radioOption.querySelector('input[type="radio"]');
                if (radioInput) {
                    radioInput.checked = true;
                    // Trigger change event in case other code is listening
                    radioInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });
    });


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
        closeBtn: document.getElementById('close-step2'),
        overlay: document.getElementById('modal-step2'),
        formContainer: document.querySelector('#modal-step2 .form-container'),
        form: document.getElementById('store-info-form-step2'),
        submitBtn: document.getElementById('submit-step2'),
        successMessage: document.getElementById('success-step2')
    };

    // Event Listeners
    modal1Elements.openBtns.forEach(btn => {
        btn.addEventListener('click', openModal1);
    });
    modal1Elements.closeBtn.addEventListener('click', closeModal1);
    modal1Elements.overlay.addEventListener('click', handleOverlay1Click);
    document.addEventListener('keydown', handleEscapeKeyModal1);
    modal1Elements.form.addEventListener('submit', handleFormSubmit);

    document.querySelectorAll('.open-step2').forEach(btn => {
        btn.addEventListener('click', openStep2);
    });

    // Modal Functions
    function openModal1() {
        modal1Elements.overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    }

    function openModal2() {
        modal2Elements.overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    }

    // Close modal function
    function closeModal1() {
        modal1Elements.overlay.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }

    function closeModal2() {
        modal2Elements.overlay.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }

    function handleOverlay1Click(event) {
        if (!modal1Elements.formContainer.contains(event.target)) {
            closeModal1();
        }
    }

    // Close on escape key
    function handleEscapeKeyModal1(event) {
        if (event.key === 'Escape' && modal1Elements.overlay.classList.contains('active')) {
            closeModal1();
        }
    }

    // Form Handling
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

    async function handleFormSubmit(event) {
        event.preventDefault();
        // Comment out form submission logic
        // setSubmitButtonState(true);

        // try {
        //     const formData = createFormData();
        //     await submitToGoogleForms(formData);
        //     handleFormSuccess();
        // } catch (error) {
        //     handleFormError(error);
        // }

        // Close current modal and open modal-step2
        openStep2();
    }

    function openStep2() {
        closeModal1();
        openModal2();
    }

    function createFormData() {
        const formData = new FormData();
        const formValues = getFormValues();
        console.log('formValues', formValues);

        Object.entries(formValues).forEach(([key, value]) => {
            if (formFieldMappings[key]) {
                formData.append(formFieldMappings[key], value);
            }
        });

        return formData;
    }

    function getFormValues() {
        return Array.from(modal1Elements.form.elements).reduce((acc, element) => {
            if (shouldProcessElement(element)) {
                console.log(element);
                acc[element.name] = getElementValue(element);
            }
            return acc;
        }, {});
    }

    function shouldProcessElement(element) {
        return element.name && element.name !== '' && element.type !== 'submit';
    }

    function getElementValue(element) {
        return element.type === 'radio'
            ? (element.checked ? element.value : 'No')
            : element.value;
    }

    async function submitToGoogleForms(formData) {
      formData.append('entry.1294608064', 'Yes');
      formData.append('entry.791238747', 'Yes');
      formData.append('entry.407255559', 'Option 1');
      formData.append('submissionTimestamp', new Date().now().toString());


        // Google Form ID
        const formId = '1FAIpQLSenbkJwdDzLau9lJo6DzVjpicVI1J9HAdByNeW77yOnnnl4Hw';
        const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/' + formId + '/formResponse';
        await fetch(GOOGLE_FORM_URL, {
            method: 'POST',
            body: formData,
            mode: 'no-cors'
        });
    }

    function handleFormSuccess() {
        modal1Elements.successMessage.classList.add('active');
        setSubmitButtonState(false, 'Submitted');

        setTimeout(() => {
            modal1Elements.form.reset();
            modal1Elements.successMessage.classList.remove('active');
            setSubmitButtonState(false, 'See My Plan');
            closeModal1();
        }, 3000);
    }

    function handleFormError(error) {
        console.error('Error:', error);
        setSubmitButtonState(false, 'Error - Try Again');
        alert('There was an error submitting your information. Please try again.');
    }

    function setSubmitButtonState(isLoading, text = 'Processing...') {
        modal1Elements.submitBtn.disabled = isLoading;
        modal1Elements.submitBtn.textContent = text;
        modal1Elements.submitBtn.classList.toggle('loading', isLoading);
    }
});
