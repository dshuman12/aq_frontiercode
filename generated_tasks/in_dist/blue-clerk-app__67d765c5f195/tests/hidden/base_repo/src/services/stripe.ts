import Stripe from 'stripe';
import * as Sentry from '@sentry/node';
import { v4 as uuid } from 'uuid';
import moment from 'moment';

const { STRIPE_SK_SECRET } = process.env;

const stripe = new Stripe(STRIPE_SK_SECRET, {
    apiVersion: '2023-08-16',
});

/**
 * Creates a new card in Stripe
 * @param number
 * @param expiration
 * @param cvc
 * @param name
 * @param address
 * @param city
 * @param state
 * @param zipcode
 */
export const createCard = async (
    number: string,
    expiration: string,
    cvc: string,
    name: string,
    address: string,
    city: string,
    state: string,
    zipcode: string
) => {

    let expirationData = expiration.split('/');
    const billing_details = {
        name: name,
        address: {
            line1: address,
            city: city,
            state: state,
            postal_code: zipcode,
        }
    }
    const card: any = {
        number: number,
        exp_month: expirationData[0],
        exp_year: expirationData[1],
        cvc: cvc,
    };
    return await stripe.paymentMethods.create({
        type: 'card',
        card: card,
        billing_details: billing_details
    });

}

// Retrieves a user's cards, given its Stripe ID
export const getCustomerCards = async (customerId : string) => {
    
    const paymentMethods = await stripe.customers.listPaymentMethods(
        customerId,
        {type: 'card'}
    );
    return paymentMethods;

}

// Retrieves a card, given its ID and customer ID
export const checkCardExist = async (paymentMethodId: any, customerId: any) => {
    
    const paymentMethod = await stripe.customers.retrievePaymentMethod(
        customerId,
        paymentMethodId
    );
    return paymentMethod;

};

// Creates a new Stripe customer
export const createCustomer = (email: string, description: string) => {
    
    const newCustomer = stripe.customers.create({
        email: email,
        description: description,
    })
    return newCustomer;

}

// TODO this method is deprecated and no longer used. Delete it?
export const addCustomerAndCharge = (email: string, description: string, token: string, amount: number, callback: Function) => {
    
    stripe.customers.create({
        email: email,
        description: description,
        source: token

    }).then(function( customer: any) {
        // asynchronously called

        let total: number = amount * 100;
        total = Math.ceil(total);
        if(total < 100){
            return callback(0, null, 'Total amount must be greater then 1$');
        }

        stripe.charges.create({
            amount: total,
            currency: 'usd',
            customer: customer.id

        }).then(function( charge: any) {
            // asynchronously called
            return callback(1, customer, charge, '');

        }).catch(function(err: any) {
            Sentry.captureException(err);
            let message= '';
            switch (err.type) {
            case 'StripeCardError':
                // A declined card error
                message = err.message;
                break;
            default:
                message = err.message;
                break;
            }
            return callback(0, null, null, message);
        });

        // return callback(1, customer);

    }).catch(function(err: any) {
        // asynchronously called
        Sentry.captureException(err);
        let message= '';
        switch (err.type) {
        case 'StripeCardError':
            // A declined card error
            message = err.message;
            break;
        default:
            message = err.message;
            break;
        }
        return callback(0, null, null, message);
    });

};

// Detaches a card from a customer
export const detachCustomerSource = (paymentMethodId: string) => {
    
    const paymentMethod = stripe.paymentMethods.detach(
        paymentMethodId
    )
    return paymentMethod;

}

// Attaches a card to a customer
export const addCustomerPaymentMethod = (paymentMethodId: string, customerId: string, callback: Function) => {
    
    stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId // obtained with Stripe.js

    }).then(function( paymentMethod: any) {
        // asynchronously called
        return callback(1, paymentMethod, '');

        }).catch(function(err: any) {
            Sentry.captureException(err);
        // asynchronously called
            let message= '';
            switch (err.type) {
            case 'StripeCardError':
                // A declined card error
                message = err.message;
                break;
            default:
                message = err.message;
                break;
        }
        return callback(0, null, message);
    });

};

export const addCustomerSource = (stripeId: string, token: string, callback: Function) => {

    stripe.customers.createSource(stripeId, {
        source: token // obtained with Stripe.js

    }).then(function( source: any) {
        // asynchronously called
        return callback(1, source, '');

    }).catch(function(err: any) {
        Sentry.captureException(err);
        // asynchronously called
        let message= '';
        switch (err.type) {
        case 'StripeCardError':
            // A declined card error
            message = err.message;
            break;
        default:
            message = err.message;
            break;
        }
        return callback(0, null, message);
    }
    );

};

export const chargeSubscription = function (amount: any, customerId: string, callback: Function) {

    const tax = (amount * 0.8)*0.0825;
    let total: number = (amount + tax) * 100;
    total = Math.ceil(total);
    if(total < 100){
        total = 100;
    }

    stripe.charges.create({
        amount: total,
        currency: 'usd',
        customer: customerId

    }).then(function( charge: any) {
        // asynchronously called
        return callback(1, charge,tax, '');

    }).catch(function(err: any) {
        Sentry.captureException(err);
        let message= '';
        switch (err.type) {
        case 'StripeCardError':
            // A declined card error
            message = err.message;
            break;
        default:
            message = err.message;
            break;
        }

        return callback(0, null, message);
    });

};

// TODO DEPRECATED should be deleted (?)
export const chargeCustomer = function (amount: any, customerId: string, cardId: string, callback: Function) {
    
    let total: number = amount * 100;
    total = Math.ceil(total);
    if(total < 100){
        return callback(0, null, 'Total amount must be greater then 1$');
    }

    stripe.charges.create({
        amount: total,
        currency: 'usd',
        customer: customerId,
        source: cardId

    }).then(function( charge: any) {
        // asynchronously called
        return callback(1, charge, '');

    }).catch(function(err: any) {
        Sentry.captureException(err);
        let message= '';
        switch (err.type) {
        case 'StripeCardError':
            // A declined card error
            message = err.message;
            break;
        default:
            message = err.message;
            break;
        }
        return callback(0, null, message);
    });

};

// Creates a new subscription for a user
export const subscribe = async (customerId: string, priceIds: string[], paymentMethodId: string, fullSubscriptionPrice: number) => {
 
    // Billing 5th day of next month, adjust for time zone
    const today = new Date();
    const fifthDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 5, 12, 0, 0, 0); // Set billing at noon UTC to ensure it's Oct 5th everywhere
    const timestamp = Math.floor(fifthDayOfNextMonth.getTime() / 1000);

    // Create the subscription with a delayed billing start and proration
    const newSubscription = await stripe.subscriptions.create({
        customer: customerId,
        items: priceIds.map(item => ({
            price: item
        })),
        currency: 'usd',
        default_payment_method: paymentMethodId,
        billing_cycle_anchor: timestamp, // Start billing on October 5th, adjusted for UTC
        proration_behavior: 'none'
    });

    // Throw an error if the subscription has not been created
    if (!newSubscription) {
        console.log("Error while creating subscription")
        throw new Error('Failed to create subscription');
    }
    // console.log("Subscription has created successfully")
    
    // If the full subscription price is greater than 0, calculate the prorated amount
    if (fullSubscriptionPrice > 0) {

        // Calculate the prorated amount ( from sign-up date to the end of the month)
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const daysUsed = daysInMonth - today.getDate();
        const proratedAmount = (fullSubscriptionPrice / daysInMonth) * daysUsed;

        // Add the prorated amount to the next invoice as an InvoiceItem
        await stripe.invoiceItems.create({
            customer: customerId,
            amount: ~~(proratedAmount * 100),
            currency: 'usd',
            description: `Prorated Charges for ${today.getMonth() + 1}/${today.getDate()} to ${today.getMonth() + 1}/${daysInMonth}`,
        })
    }
    return newSubscription;
};



// Changes one subscription to be cancelled on period end
export const updateSubscription = async function (subscriptionId: string, cancelAtPeriodEnd : boolean) {
    
    const subscription = await stripe.subscriptions.update(
        subscriptionId,
        {cancel_at_period_end: cancelAtPeriodEnd}
    );
    return subscription;
}

// Changes one subscription to be cancelled on period end
export const updatePaymentMethod = async function (subscriptionId : string, paymentMethodId: string) {
    
    const subscription = await stripe.subscriptions.update(
        subscriptionId,
        {default_payment_method: paymentMethodId}
    );
    return subscription;
}

// Retrieves a single subscription data, given its ID
export const getSubscription = async function (subscriptionId: string) {
    
    const subscription = await stripe.subscriptions.retrieve(
        subscriptionId
    );

    return subscription;
}

export const cancelSubscription = async function (subscriptionId: string) {
    const subscription = await stripe.subscriptions.update(
        subscriptionId,
        {cancel_at_period_end: true}
    );

    return subscription;
}

export const registerUsage = async function (itemId: string, quantity: number) {

    // The idempotency key allows you to retry this usage record call if it fails.
    const idempotencyKey = uuid();
    const timestamp = Math.floor(Date.now() / 1000); // Timestamp in seconds

    const res = await stripe.subscriptionItems.createUsageRecord(
        itemId,
        {
            quantity: quantity,
            timestamp: timestamp,
            action: 'set',
        },
        {
            idempotencyKey,
        }
    );
    return res;
}

// STRIPE INVOICE STUFF BELLOW

/**
 * To list all invoices by the company's stripeId,
 * the invoices are returned sorted by creation date,
 * with the most recently created invoices appearing first
 */
export const getStripeInvoices = async (stripeCustId: string, pageSize: number): Promise<any> => {

    try {
        const invoices = await stripe.invoices.list({
            customer: stripeCustId,
            limit: pageSize,  
        });
        const filteredInvoice = invoices.data.filter(invoice => invoice.total > 0);
        return filteredInvoice;
    } catch (error) {
        throw new Error(`Failed to retrieve invoices: ${error}`);
    }
};

export const getStripeInvoicesFromPreviousMonth = async (stripeCustId: string): Promise<any> => {

    try {
        // Get the current and previous month's start date
        const previousMonthStart = moment().subtract(1, 'month').startOf('month').unix();

        // Fetch invoices from Stripe for the company
        const invoices = await stripe.invoices.list({
            customer: stripeCustId,  // Assuming you have the Stripe customer ID for the company
            created: {
                gte: previousMonthStart,  // Fetch invoices from the start of the previous month
            }
        });
        return invoices.data;
    } catch (error) {
        throw new Error(`Failed to retrieve invoices: ${error}`);
    }
};

/**
 * To list all pending invoice items by the company's stripeId,
 * invoice items are returned sorted by creation date,
 * with the most recently created invoice items appearing first
 */
export const getStripeInvoiceItems = async (stripeCustId: string): Promise<any> => {
    
    const invoiceItems = await stripe.invoiceItems.list({ customer: stripeCustId });

    return invoiceItems;

};

/**
 * To create a pending invoice items,
 * in the end of each day cron job will run to create the invoice,
 * then finalize it
 */
export const createStripeInvoiceItem = async (stripeCustId: string, amount: number, vendorName: string): Promise<any> => {
    
    const invoiceItem = await stripe.invoiceItems.create({
        customer: stripeCustId,
        amount: ~~(amount * 100), // Send the amount as integer cents
        currency: 'usd',
        description: `Contractor/vendor added: ${vendorName}`
    });

    return invoiceItem;

};

/**
 * To create invoice for any pending invoice items on Stripe,
 * then pay the invoice to pay & finalize on Stripe
 */
export const createStripeInvoice = async (stripeCustId: string): Promise<any> => {
    
    // Create a draft Stripe invoice based on company's stripeId
    const stripeInvoice = await stripe.invoices.create({ customer: stripeCustId });

    return stripeInvoice;

};

/**
 * To pay invoice on Stripe,
 * using payment method stored in Stripe
 */
export const payStripeInvoice = async (stripeInvId: string): Promise<any> => {
    
    // Pay stripe invoice
    const paidInvoice = await stripe.invoices.pay(stripeInvId);

    return paidInvoice;

};

/**
 * To get invoice pdf on Stripe,
 */
export const generateStripeInvoicePdf = async (invoiceId: string): Promise<any> => {
    
    // Retrieve stripe invoice
    const invoice = await stripe.invoices.retrieve(invoiceId)

    // GET the pdf URL
    const pdf_url = invoice.invoice_pdf;

    return pdf_url;
};

export const _getCustomerCard = async (stripeCustomer: string, stripeCardId: string): Promise<any> => {

    return await stripe.customers.retrieveSource(
        stripeCustomer,
        stripeCardId
    );
};