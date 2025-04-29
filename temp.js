// Setup module
// ------------------------------

var validator1, validator2, loading;
var Registration = function () {

    //
    // Setup module components
    //

    // International Telephone Input reference
    window.iti = null;

    const baseValidationConfigs = {
        ignore: 'input[type=hidden]', // ignore hidden fields
        errorElement: 'span',
        errorClass: 'invalid-feedback',
        successClass: 'valid-feedback',
        validClass: 'valid-feedback',
        success: function (label) {
            label.parent().find('input, select').removeClass('is-invalid').addClass('is-valid'); // mark the input as success
        },
        showErrors: function (errorMap, errorList) {
            errorList.forEach(function (item) {
                $(item.element).removeClass('is-valid').addClass('is-invalid'); // mark the input has having errors
            });
            this.defaultShowErrors();
        },
    };

    const _getParamValueQueryString = function (name, url) {
        url = url || window.location.href;
        name = name.replace(/[\[\]]/g, '\\$&');
        const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
        const results = regex.exec(url);
        if (!results) {
            return null;
        }
        if (!results[2]) {
            return '';
        }
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    };

    const _getFormData = function (selector) {
        const obj = {};
        const formData = $(selector).serializeArray();

        formData.forEach(item => {
            if (item.name) {
                obj[item.name] = item.value;
            }
        });

        return obj;
    };

    const _goToAdminArea = function (token) {
        window.location.href = window.themeVariables.backofficeUrl + '?jwt=' + token;
    };

    const _beforeSend = function (request) {
        const authorizationToken = 'Basic ' + btoa('backoffice:uIH5428BhdfENOv1y52nm7f');
        request.setRequestHeader("Authorization", authorizationToken);
    };

    /**
     * Init International Telephone Input
     */
    const _componentIntlTelInput = function () {
        if (!window.intlTelInput) {
            console.warn('Warning - intlTelInput is not loaded.');
            return;
        }

        const telInput = document.querySelector('#phone');
        if (!telInput) {
            console.warn('Warning - #phone input not found.');
            return;
        }

        // Initialize
        window.iti = window.intlTelInput(telInput, {
            initialCountry: "us",
            separateDialCode: true,
            autoPlaceholder: 'off',
            utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.15/js/utils.js",
        });
    };

    const _signUpStep1Valid = () => {
        const validCompany = $('#name').valid();
        const validWebsite = $('#website_url').valid();
        const validFirst = $('#first_name').valid();
        const validLast = $('#last_name').valid();
        const validPhone = $('#phone').valid();
        const validEmail = $('#email').valid();
        const validPassword = $('#password').valid();

        return !!(validCompany
            && validWebsite
            && validFirst
            && validLast
            && validPhone
            && validEmail
            && validPassword);
    };

    const _signUpStep2Valid = () => {
        const address = $('#address').valid();
        const timezone = $('#manually_set_timezone').valid();
        const storesQuantity = $('#stores_quantity').valid();
        const platform = $('#platform').valid();

        return !!(address
            && timezone
            && storesQuantity
            && platform);

    };

    /**
     * Adding reCAPTCHA token to form
     */
    const _appendCaptchaInput = () => new Promise(resolve => {
        try {
            const id = 'recaptcha_token_' + Math.random().toString(36).slice(-8);
            $("form.step-1").append('<input name="recaptcha_token" type="hidden" id="' + id + '" />');

            if (grecaptcha) {
                grecaptcha.ready(function () {
                    grecaptcha
                        .execute(themeVariables.reCAPTCHA_key, { action: 'submit' })
                        .then(token => {
                            document.getElementById(id).value = token;
                            resolve();
                        })
                        .catch(() => resolve());
                });
            } else {
                resolve();
            }
        } catch (e) {
            console.error(e);
            resolve();
        }
    });

    /**
     * Sign Up form
     */
    const _signUpStepper = function () {
        const stepperContentEl = document.querySelector('.stepper-content');
        const stepEls = document.querySelectorAll('.stepper .step');

        stepEls.forEach(stepEl => {
            stepEl.addEventListener('click', evt => {
                const step = parseFloat(stepEl.getAttribute('data-step'));

                if (!_signUpStep1Valid() && step > 1) {
                    return;
                } else if (!_signUpStep2Valid() && step > 2) {
                    return;
                }

                // Dots
                stepEls.forEach(_stepEl => _stepEl.classList.remove('active'));
                stepEl.classList.add('active');

                // Content
                document.querySelectorAll('.stepper-content-item').forEach(_el => {
                    _el.classList.remove('active');
                    _el.classList.toggle('disabled', true);
                });
                const stepContentEl = document.querySelector('.step-' + step + '-content');
                stepContentEl.classList.remove('disabled');
                stepContentEl.classList.add('active');

                if (step === 1) {
                    const promoImage = stepperContentEl.querySelector('.promo-image');
                    if (promoImage) {
                        promoImage.classList.remove('disabled');
                    }
                }

                setTimeout(() => {
                    _resetStep2Form();
                }, 10);

                // Container
                stepperContentEl.classList.remove('step-1', 'step-2', 'step-3');
                stepperContentEl.classList.add('step-' + step)
            });
        });
    };

    const specialPattern = /[`!@#$%^&*()+\=\[\]{};':"\\|,.<>\/?~]/;
    const isNumeric = str => {
        if (typeof str != "string") return false; // we only process strings!
        return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
            !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
    };

    const testUppercaseLowercase = function (strings) {
        let i = 0;
        strings = strings.replace(/\s/g, '');
        let character = '';
        let hasLower = false;
        let hasUpper = false;
        while (i <= strings.length) {
            character = strings.charAt(i);

            if (specialPattern.test(character)) {
                // character is special symbol
            } else if (!isNaN(character * 1)) {
                // character is numeric
            } else {
                if (character === character.toUpperCase()) {
                    hasUpper = true;
                }
                if (character === character.toLowerCase()) {
                    hasLower = true;
                }
            }
            i++;
        }
        return hasLower && hasUpper;
    };

    const testLetterNumber = function (strings) {
        let i = 0;
        strings = strings.replace(/\s/g, '');
        let character = '';
        let hasLetter = false;
        let hasNumber = false;
        while (i <= strings.length) {
            character = strings.charAt(i);

            if (specialPattern.test(character)) {
                // character is special symbol
            } else if (isNumeric(character)) {
                hasNumber = true;
            } else {
                hasLetter = true;
            }
            i++;
        }
        return hasNumber && hasLetter;
    };

    /**
     * Extend validation config
     */
    const _extendValidation = function () {
        if (!$().validate) {
            console.warn('Warning - validate.min.js is not loaded.');
            return;
        }
        if (!window.iti) {
            console.warn('Warning - intlTelInput is not loaded.');
            return;
        }

        $.validator.addMethod('validateName', function (value) {
            const pattern = /[`!@#$%^&*()+\=\[\]{};':"\\|<>\/?~]/;
            return typeof value === 'string' ? !pattern.test(value) : false;
        }, 'Please enter a valid value');

        $.validator.addMethod('validateCompanyName', function (value) {
            const pattern = /[<>]/;
            return typeof value === 'string' ? !pattern.test(value) : false;
        }, 'Please enter a valid value');

        $.validator.addMethod('validatePhone', function () {
            if (window.iti.isValidNumber()) {
                return true;
            } else {
                return false;
            }
        }, 'Invalid phone number.');

        $.validator.addMethod('validUrl', function (value, element) {
            const url = $.validator.methods.url.bind(this);
            const pattern = /[ `!@#$%^&*()+\=\[\]{};'"\\|,<>\?~]/;
            const isString = typeof value === 'string';

            if (isString && pattern.test(value)) {
                return false;
            }

            return url(value, element) || url('http://' + value, element);
        }, 'Please enter a valid URL');

        $.validator.addMethod('validEmail', function (value, element) {
            const isString = typeof value === 'string';
            const pattern1 = /[ `!#$%^&*()\=\[\]{};':"\\|,<>\?~]/;

            if (isString && pattern1.test(value)) {
                return false;
            }

            const pattern = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return isString ? pattern.test(value) : false;
        }, 'Please enter a valid email address.');

        $.validator.addMethod('uppercaseLowercase', function (value, element) {
            const pattern = /(?=.*[a-z])(?=.*[A-Z])/;
            return typeof value === 'string' ? testUppercaseLowercase(value) : false;
        }, 'Should contain uppercase and lowercase letters.');

        $.validator.addMethod('letterNumber', function (value, element) {
            const pattern = /(?=.*[a-zA-Z])(?=.*[0-9])/;
            return typeof value === 'string' ? testLetterNumber(value) : false;
        }, 'Should contain letters and numbers.');

        $.validator.addMethod('specialCharacters', function (value, element) {
            const pattern = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;
            return pattern.test(value);

        }, 'Should contain special characters.');

        $.validator.addMethod('users_email_exists', function (value, element) {

            const method = 'remote';
            const previous = this.previousValue(element, method);
            const validator = this;

            if (!this.settings.messages[element.name]) {
                this.settings.messages[element.name] = {};
            }

            previous.originalMessage = previous.originalMessage || this.settings.messages[element.name][method];
            this.settings.messages[element.name][method] = previous.message;

            const optionDataString = $.param({ data: value });
            if (previous.old === optionDataString) {
                return previous.valid;
            }
            previous.old = optionDataString;

            this.startRequest(element);

            const params = new URLSearchParams({ email: $("#email").val() });

            new Promise(function (fulfill) {
                $.ajax({
                    type: 'POST',
                    url: window.themeVariables.apiUrl + 'users/check_email?' + params,
                    data: {},
                    dataType: 'json',
                    beforeSend: _beforeSend,
                    success: () => fulfill(false),
                    error: () => fulfill(true)
                });
            }).then(function (valid) {

                validator.settings.messages[element.name][method] = previous.originalMessage;
                const errors = {};

                if (valid) {
                    errors[element.name] = null;
                    validator.invalid[element.name] = false;
                } else {
                    errors[element.name] = previous.message = 'This email address is already being used.';
                    validator.invalid[element.name] = true;
                    validator.showErrors(errors);
                }
                previous.valid = valid;
                validator.stopRequest(element, valid);
            });

            return "pending";
        },
            "This email address is already being used."
        );
    };

    function partnerStackSignUp() {
        if (window.growsumo && typeof growsumo.createSignup === 'function') {
            // 1. Populate the growsumo.data object
            growsumo.data.name = document.getElementById('name').value;
            growsumo.data.email = document.getElementById('email').value;
            // In this case, email is how I uniquely identify my customers
            growsumo.data.customer_key = document.getElementById('email').value;

            // Register the signup with PartnerStack
            growsumo.createSignup();
        }
    }

    const objectToQueryUrl = function (object) {

        Object.keys(object).forEach(key => {
            if (!object[key]) {
                delete object[key];
            }
        });

        return new URLSearchParams(object).toString();
    };

    const _getErrorMessage = function (value) {
        const defaultMessage = 'An error has occurred';
        try {
            const json = JSON.parse(value).message;
            const message = Object.keys(json).map(key => json[key])[0];

            return message || defaultMessage;
        }
        catch (e) {
            return defaultMessage;
        }
    };

    const _sendRequest = function () {

        const step1Data = _getFormData('form.step-1');
        const step2Data = _getFormData('form.step-2');
        const formData = { ...step1Data, ...step2Data };

        if (Number(_getParamValueQueryString('shopify')) === 1) {
            formData['shopify'] = 1;
        }

        // Update the phone field before submitting the form
        formData['phone'] = window.iti.getNumber();
        // recaptcha_token

        $.ajax({
            type: 'POST',
            url: window.themeVariables.apiUrl + window.themeVariables.sign_up_url,
            data: formData,
            dataType: 'json',
            beforeSend: _beforeSend,
            success: response => {
                partnerStackSignUp();
                _formSubmitToggle(false);
                setTimeout(() => {
                    const force_password_reset = response?.response?.force_password_reset;
                    const confirmed = response?.response?.confirmed;
                    const enabled = response?.response?.enabled;
                    const params = {};

                    if (force_password_reset) {
                        params.need_change_password = true;
                    }
                    if (!confirmed) {
                        params.need_email_confirm = true;
                    }
                    if (!enabled) {
                        params.need_admin_confirm = true;
                    }

                    window.location.href = window.themeVariables.backofficeUrl + '?' + objectToQueryUrl({
                        ...params,
                        refresh_token: response.response.refresh_token,
                        access_token: response.response.access_token,
                    });
                }, 50);
            },
            error: function (jqXHR, textStatus, err) {

                const message = _getErrorMessage(jqXHR.responseText);
                window.showNotification(message, {
                    error: true,
                    closeTimeout: 10000
                });
                // $('form.step-1').trigger('reset');
                // $('form.step-2').trigger('reset');
                console.log(jqXHR, '\n', textStatus, '\n', err);
                _formSubmitToggle(false);
            }
        });
    };

    const _resetStep2Form = function () {
        validator2.resetForm();
        $('form.step-2').find('input, select').removeClass('is-invalid').addClass('is-valid');
        console.log('resetForm 2');
    };

    /**
     * First step validation
     */
    const _signUpStep1Validate = function () {

        const submitEl = $('form.step-1 button');
        const formEl = $('form.step-1');
        const formIsValid = () => formEl.validate().checkForm();

        validator1 = formEl.validate({
            ...baseValidationConfigs,
            rules: {
                name: {
                    required: true,
                    minlength: 2,
                    validateCompanyName: true,
                },
                website_url: {
                    required: true,
                    validUrl: true
                },
                first_name: {
                    required: true,
                    minlength: 2,
                    validateName: true,
                },
                last_name: {
                    required: true,
                    minlength: 2,
                    validateName: true,
                },
                phone: {
                    required: true,
                    validatePhone: true
                },
                email: {
                    required: true,
                    validEmail: true,
                    users_email_exists: true
                },
                password: {
                    required: true,
                    uppercaseLowercase: true,
                    letterNumber: true,
                    specialCharacters: true,
                    minlength: 8,
                    maxlength: 48
                },
            },
            messages: {
                website_url: {
                    required: 'This field is required.',
                    validUrl: 'Please enter a valid URL.'
                },
                phone: {
                    required: 'This field is required.',
                    validatePhone: 'Please enter a valid phone number.'
                },
                name: {
                    required: 'This field is required.',
                    minlength: 'Please enter at least 2 characters.'
                },
                email: {
                    required: 'This field is required.',
                    validEmail: 'Please enter a valid email address.',
                    users_email_exists: 'This email address is already being used.'
                },
                first_name: {
                    required: 'This field is required.',
                    minlength: 'Please enter at least 2 characters.'
                },
                last_name: {
                    required: 'This field is required.',
                    minlength: 'Please enter at least 2 characters.'
                },
                password: {
                    required: 'This field is required.',
                    minlength: 'Please enter at least 8 characters.',
                    maxlength: 'Please enter less than 48 characters.',
                    uppercaseLowercase: 'Should contain uppercase and lowercase letters.',
                    letterNumber: 'Should contain letters and numbers.',
                    specialCharacters: 'Should contain special characters.'
                },
            },
        });

        // Watch button disabled
        $('form.step-1 input, form.step-1 select').on('input change', e => {
            if (formIsValid() && submitEl.hasClass("disabled")) {
                submitEl.toggleClass('disabled', false);
            } else if (!formIsValid() && !submitEl.hasClass("disabled")) {
                submitEl.toggleClass('disabled', true);
            }
        });

        submitEl.on('click', (e) => {
            e.preventDefault();

            if (_signUpStep1Valid()) {
                // Move next step
                $('.stepper .step-2').click();

                setTimeout(() => {
                    _resetStep2Form();
                }, 10);
            }
        });
    };

    const _formSubmitToggle = function (_loading) {
        loading = _loading;
        const submitEl = document.querySelector('form.step-2 button');
        if (submitEl) {
            submitEl.disabled = _loading;
            submitEl.classList.toggle('btn-loading', _loading);
        }
    };

    /**
     * Second step validation
     */
    const _signUpStep2Validate = function () {
        const submitEl = $('form.step-2 button');
        const formEl = $('form.step-1');
        const formIsValid = () => formEl.validate().checkForm();

        validator2 = $('form.step-2').validate({
            ...baseValidationConfigs,
            rules: {
                address: {
                    minlength: 10,
                    required: true,
                },
                manually_set_timezone: {
                    required: true,
                },
                stores_quantity: {
                    required: true,
                    min: 0,
                },
                platform: {
                    required: true,
                },
            },
            messages: {
                address: {
                    minlength: 'Please enter at least 10 characters.'
                },
                manually_set_timezone: {
                    required: 'This field is required.',
                },
                stores_quantity: {
                    required: 'This field is required.',
                    min: 'Please enter a value greater than or equal to 0',
                    integer: 'Please select whole number (ex. 1,2,3,4)'
                },
                platform: {
                    required: 'This field is required.',
                },
            }
        });

        // Watch button disabled
        $('form.step-2 input, form.step-2 select').on('input change', e => {
            if (formIsValid() && submitEl.hasClass("disabled")) {
                submitEl.toggleClass('disabled', false);
            } else if (!formIsValid() && !submitEl.hasClass("disabled")) {
                submitEl.toggleClass('disabled', true);
            }
        });

        submitEl.on('click', (e) => {
            e.preventDefault();

            if (_signUpStep2Valid() && !loading) {
                // Move next step
                // $('.stepper .step-3').click();

                _formSubmitToggle(true);

                _appendCaptchaInput().finally(() => {
                    setTimeout(() => _sendRequest(), 100);
                });
            }
        });
    };

    const _togglePasswordVisibility = function () {
        $("body").on('click', '.toggle-password', function () {
            $(this).toggleClass("ion-ios-eye ion-ios-eye-off");
            const input = document.querySelector("#password");
            if (input.type === "password") {
                input.type = "text";
            } else {
                input.type = "password";
            }
        });
    };

    const _signUpStep3Validate = function () {
        $('#sign-up-submit').on('click', function (e) {
            e.preventDefault();

            const btn = $(this);
            btn.find('.text').css('display', 'none');
            btn.addClass("btn-loading");

            // Sign Up here...

        });
    };

    const _handleInputs = function () {
        function inputProcess() {
            $(this).toggleClass('has-value', !!$(this).val());
            $(this).parent().toggleClass('has-value', !!$(this).val());
            const formDiv = $(this).closest('.im-form-control-wrap');
            if (formDiv) {
                $(formDiv).toggleClass('has-value', !!$(this).val());
            }
        }

        $('form').each(function () {
            $(this).find('input, textarea, select').on('input change', inputProcess);
            setTimeout(() => {
                $(this).find('input, textarea, select').each(inputProcess);
            }, 2000);
        });
    };

    const _deselectInput = function (selector) {
        $(selector).closest('.float-input').removeClass('select has-value');
    };

    const _setSelectEmptyValue = function (selector) {
        $(selector).prop("selectedIndex", -1);
        _deselectInput(selector);
    };

    const _fixSelectInitialValues = function () {
        _setSelectEmptyValue('#platform');
        _setSelectEmptyValue('#manually_set_timezone');
        _deselectInput('#stores_quantity');
    };

    const _fixBrowserException = function () {
        const userAgentString = navigator.userAgent;
        const edgeAgent = userAgentString.indexOf('Edg/') > -1 || userAgentString.indexOf('Edge/') > -1;

        if (edgeAgent) {
            const togglePassButton = document.querySelector('.toggle-password');

            if (togglePassButton) {
                togglePassButton.classList.add('hidden');
            }
        }
    };

    const _clearForm = function () {
        try {
            document.querySelector('form.step-1').reset();
            document.querySelector('form.step-2').reset();
        } catch (e) {
        }
    };

    const _fillFormValues = function () {
        // Parse URL query parameters
        const queryParams = new URLSearchParams(window.location.search);

        // Handle website parameter
        if (queryParams.has('website')) {
            const websiteInput = document.getElementById('website_url');
            if (websiteInput) {
                websiteInput.value = queryParams.get('website');
            }
        }

        // Handle name parameter (split into first_name and last_name if possible)
        if (queryParams.has('name')) {
            const nameValue = queryParams.get('name');
            const firstNameInput = document.getElementById('first_name');
            const lastNameInput = document.getElementById('last_name');

            if (nameValue.includes(' ')) {
                // Split by first space
                const spaceIndex = nameValue.indexOf(' ');
                const firstName = nameValue.substring(0, spaceIndex);
                const lastName = nameValue.substring(spaceIndex + 1);

                if (firstNameInput) firstNameInput.value = firstName;
                if (lastNameInput) lastNameInput.value = lastName;
            } else {
                // Can't split, only fill first_name
                if (firstNameInput) firstNameInput.value = nameValue;
            }
        }

        // Handle email parameter
        if (queryParams.has('email')) {
            const emailInput = document.getElementById('email');
            if (emailInput) {
                emailInput.value = queryParams.get('email');
            }
        }

        // Handle platform parameter
        if (queryParams.has('platform')) {
            const platformSelect = document.getElementById('platform');
            if (platformSelect) {
                platformSelect.value = queryParams.get('platform');
            }
        }

        // Handle stores parameter (convert to positive number)
        if (queryParams.has('stores')) {
            const storesInput = document.getElementById('stores_quantity');
            if (storesInput) {
                let storesValue = parseInt(queryParams.get('stores'), 10);
                // Convert negative to positive
                if (storesValue < 0) {
                    storesValue = Math.abs(storesValue);
                }
                storesInput.value = storesValue;
            }
        }
    }

    //
    // Return objects assigned to module
    //

    return {
        initComponents: function () {
            _clearForm();
            _componentIntlTelInput();
            _signUpStepper();
            _extendValidation();
            _signUpStep1Validate();
            _signUpStep2Validate();
            _togglePasswordVisibility();
            _signUpStep3Validate();
            _handleInputs();
            _fixSelectInitialValues();
            _fixBrowserException();
            _fillFormValues();
            
            // window.testSubmit = function () {
            //     _appendCaptchaInput().finally(() =>
            //     {
            //         setTimeout(() =>
            //         {
            //             const step1Data = _getFormData('form.step-1');
            //             const step2Data = _getFormData('form.step-2');
            //             const formData = {...step1Data, ...step2Data};
            //             console.log(formData);
            //         }, 100);
            //     });
            // }
        }
    }
}();

// Initialize module
// ------------------------------

document.addEventListener('DOMContentLoaded', function () {
    Registration.initComponents();
});
