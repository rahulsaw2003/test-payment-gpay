/**
 * Google Pay UPI Intent Flow Implementation
 * Reference: https://developers.google.com/pay/india/api/web/create-payment-method
 */

// DOM Elements
const gpayButton = document.getElementById('gpay-button');
const statusMessage = document.getElementById('status-message');

// Payment Configuration
const AMOUNT = '1.00';  // Fixed amount in INR

// Merchant Configuration
const MERCHANT_CONFIG = {
    pa: '9110190178@okbizaxis',  // Payee VPA (Virtual Payment Address)
    pn: 'Ms. Priya Kumari',          // Payee Name
    mc: '5977',                   // Merchant Category Code
    tn: 'Payment'                // Transaction Note (max 80 chars)
};

/**
 * Generate a unique transaction reference ID
 * @returns {string} Unique transaction ID
 */
function generateTransactionReferenceID() {
    return 'TXN' + Date.now();
}

/**
 * Display status message to user
 * @param {string} message - Message to display
 * @param {string} type - Type of message: 'success', 'error', or 'info'
 */
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = type;
}

/**
 * Check if the device supports Google Pay
 * @returns {boolean} True if supported
 */
function isGPaySupported() {
    if (!globalThis.PaymentRequest) {
        return false;
    }
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isChrome = /Chrome/i.test(navigator.userAgent);
    return isAndroid && isChrome;
}

/**
 * Handle case when user cannot pay with Google Pay
 */
function handleNotReadyToPay() {
    // Fallback to GPay deep link
    const deepLink = `gpay://upi/pay?pa=${encodeURIComponent(MERCHANT_CONFIG.pa)}&pn=${encodeURIComponent(MERCHANT_CONFIG.pn)}&am=${AMOUNT}&cu=INR&tr=${generateTransactionReferenceID()}`;
    globalThis.location.href = deepLink;
}

/**
 * Show payment UI
 * @param {PaymentRequest} request - The payment request object
 * @param {boolean} canMakePayment - Whether user can make payment
 */
function showPaymentUI(request, canMakePayment) {
    if (!canMakePayment) {
        // handleNotReadyToPay();
        return;
    }

    // Set payment timeout (20 minutes)
    let paymentTimeout = globalThis.setTimeout(function() {
        globalThis.clearTimeout(paymentTimeout);
        request.abort()
            .then(function() {
                console.log('Payment timed out after 20 minutes.');
                showStatus('Payment timed out.', 'error');
            })
            .catch(function() {
                console.log('Unable to abort, user is in the process of paying.');
            });
    }, 20 * 60 * 1000);

    request.show()
        .then(function(paymentResponse) {
            globalThis.clearTimeout(paymentTimeout);
            processResponse(paymentResponse);
        })
        .catch(function(err) {
            globalThis.clearTimeout(paymentTimeout);
            if (err.name === 'NotSupportedError') {
                // Fallback to deep link
                handleNotReadyToPay();
            } else if (err.name === 'AbortError') {
                showStatus('Payment was cancelled.', 'info');
            } else {
                console.log(err);
                showStatus('Payment failed: ' + err.message, 'error');
            }
        })
        .finally(function() {
            gpayButton.disabled = false;
        });
}

/**
 * Process the payment response
 * @param {PaymentResponse} paymentResponse - Response from Google Pay
 */
function processResponse(paymentResponse) {
    const responseData = paymentResponse.details;
    console.log('Payment Response:', responseData);

    // In production, send this to your server for verification
    // For demo, just complete the payment
    paymentResponse.complete('success')
        .then(function() {
            showStatus('Payment successful!', 'success');
        })
        .catch(function(err) {
            console.error('Error completing payment:', err);
            showStatus('Error completing payment.', 'error');
        });
}

/**
 * Launches payment request flow when user taps on buy button
 */
function onBuyClicked() {
    if (!globalThis.PaymentRequest) {
        console.log('Web payments are not supported in this browser.');
        showStatus('Web payments are not supported in this browser.', 'error');
        return;
    }

    const transactionId = generateTransactionReferenceID();

    // Create supported payment method as per Google Pay India docs
    const supportedInstruments = [{
        supportedMethods: ['https://tez.google.com/pay'],
        data: {
            pa: MERCHANT_CONFIG.pa,
            pn: MERCHANT_CONFIG.pn,
            tr: transactionId,
            url: "https://google.com",
            mc: MERCHANT_CONFIG.mc,
            tn: MERCHANT_CONFIG.tn
        }
    }];

    // Create order detail data
    const details = {
        total: {
            label: 'Total',
            amount: {
                currency: 'INR',
                value: AMOUNT
            }
        }
    };

    let request;
    try {
        request = new PaymentRequest(supportedInstruments, details);
        console.log('Payment Request: ' + JSON.stringify(request));
        console.log('Payment Request: ' + JSON.stringify(supportedInstruments));
        console.log('Payment Request: ' + JSON.stringify(details));
    } catch (e) {
        console.log('Payment Request Error: ' + e.message);
        showStatus('Payment Request Error: ' + e.message, 'error');
        return;
    }

    gpayButton.disabled = true;
    showStatus('Checking payment availability...', 'info');

    // Check if user can make payment
    request.canMakePayment()
        .then(function(result) {
            showPaymentUI(request, result);
        })
        .catch(function(err) {
            console.log('Error calling canMakePayment: ' + err);
            showStatus('Error checking payment availability.', 'error');
            gpayButton.disabled = false;
        });
}

// Attach click event to Google Pay button
gpayButton.addEventListener('click', onBuyClicked);

// Check compatibility on page load
document.addEventListener('DOMContentLoaded', function() {
    if (!isGPaySupported()) {
        showStatus('Note: Google Pay UPI Intent is only supported on Chrome for Android.', 'info');
    }
});
