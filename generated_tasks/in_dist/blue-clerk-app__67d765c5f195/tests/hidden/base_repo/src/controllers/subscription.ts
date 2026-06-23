import { Request, Response } from 'express';
import { Status, SubscriptionTypes, StripeEvents, CompanyType } from '../common/constants';
import { updatePaymentMethod, subscribe, updateSubscription, getCustomerCards, getSubscription, cancelSubscription, createStripeInvoice, payStripeInvoice } from '../services/stripe';
import * as Sentry from '@sentry/node';
import {CompanyInvoice} from '../models/CompanyInvoice';
import { Company, CompanyTypes, ICompany } from '../models/Company';
import { sendSubscriptionCreatedMail, sendSubscriptionCancelledMail, sendSubscriptionInvoiceMail, sendSubscriptionPaymentFail } from '../services/subscriptionMails';
import moment from 'moment';
import { sendAccountUpgradeEmail } from '../services/aws';

/* NEW CONTRACTOR SUBSCRIPTIONS */

const {
    STRIPE_SK_CONTRACTOR_MONTHLY,
    STRIPE_SK_CONTRACTOR_YEARLY,
    STRIPE_SK_SP_FULL_MONTHLY,
    STRIPE_SK_SP_FULL_YEARLY,
    STRIPE_SK_COMPLETED_JOB_PRICE,
    STRIPE_SK_SP_LIMITED_MONTHLY,
    STRIPE_SK_SP_LIMITED_YEARLY,
    STRIPE_SK_SP_FULL_MONTHLY_SUBSCRIPTION_PRICE,
    STRIPE_SK_CONTRACTOR_MONTHLY_SUBSCRIPTION_PRICE,
} = process.env;


export const createSubscription = async (req: Request, res: Response) => {
    
    const company = <ICompany>req.company;
    const {
        paymentMethodId,
        type,
    } = req.body

    let subscriptionIds = [];
    let fullSubscriptionPrice;
    let isSPFull = false;

    if(![CompanyTypes.CONTRACTOR, CompanyTypes.SERVICE_PROVIDER, CompanyTypes.SERVICE_PROVIDER_LIMITED].includes(company?.type)) {
        return res.json({status: Status.Error, message: "User must be a contractor or a Service Provider."})
    }

    switch(type) {
        case SubscriptionTypes.SPFullMonthly:
            subscriptionIds.push(STRIPE_SK_SP_FULL_MONTHLY, STRIPE_SK_COMPLETED_JOB_PRICE);
            isSPFull = true;
            if (isSPFull) {
                fullSubscriptionPrice = Number(STRIPE_SK_SP_FULL_MONTHLY_SUBSCRIPTION_PRICE);
            }
            break;
        case SubscriptionTypes.SPFullYearly:
            subscriptionIds.push(STRIPE_SK_SP_FULL_YEARLY, STRIPE_SK_COMPLETED_JOB_PRICE);
            isSPFull = true;
            break;
        case SubscriptionTypes.SPLimitedMonthly:
            subscriptionIds.push(STRIPE_SK_SP_LIMITED_MONTHLY, STRIPE_SK_COMPLETED_JOB_PRICE);
            break;
        case SubscriptionTypes.SPLimitedYearly:
            subscriptionIds.push(STRIPE_SK_SP_LIMITED_YEARLY, STRIPE_SK_COMPLETED_JOB_PRICE);
            break;
        case SubscriptionTypes.ContractorMonthly:
            subscriptionIds.push(STRIPE_SK_CONTRACTOR_MONTHLY, STRIPE_SK_COMPLETED_JOB_PRICE);
            fullSubscriptionPrice = Number(STRIPE_SK_CONTRACTOR_MONTHLY_SUBSCRIPTION_PRICE);
            break;
        case SubscriptionTypes.ContractorYearly:
            subscriptionIds.push(STRIPE_SK_CONTRACTOR_YEARLY, STRIPE_SK_COMPLETED_JOB_PRICE);
            break;
    }

    // Check company already has a subscription
    if(hasActiveSubscription(company)) {
        return res.json({status: 400, message: "Company already has a subscription."})
    }

    if(!company?.stripeInfo?.stripeUserId || company?.stripeInfo?.stripeUserId === '') {
        return res.json({status: Status.Error, message: "User payment method required."})
    }

    try {
        const newSubscription = await subscribe(
            company?.stripeInfo?.stripeUserId,
            subscriptionIds, 
            paymentMethodId,
            fullSubscriptionPrice
        );
        company.updateOne({ 
            'subscriptionInfo.stripeSubscriptionId': newSubscription.id,
            'subscriptionInfo.status': newSubscription.status,
            'subscriptionInfo.end': newSubscription.current_period_end,
            'subscriptionInfo.priceId': subscriptionIds[0],
            'subscriptionInfo.subscriptionType': type,
            'subscriptionInfo.jobUsageKey': isSPFull 
                ? (newSubscription.items?.data?.find(
                    item => item.price.id === STRIPE_SK_COMPLETED_JOB_PRICE
                )).id
                : '',
            'type': [SubscriptionTypes.ContractorMonthly, SubscriptionTypes.ContractorYearly].includes(type)
                ? CompanyTypes.CONTRACTOR 
                : [SubscriptionTypes.SPFullMonthly, SubscriptionTypes.SPFullYearly].includes(type)
                    ? CompanyTypes.SERVICE_PROVIDER
                    : CompanyTypes.SERVICE_PROVIDER_LIMITED 
        }, async () => {
            await sendSubscriptionCreatedMail(type, company.info.companyEmail)
            return res.json({'status': Status.Success, 'message': newSubscription})
        });
    }catch (err) {
        Sentry.captureException(err);
        return res.json({'status': Status.Error, 'message': err.message});
    }
};

/**
 * Updates subscription renewal
 */
export const updateSubscriptionRenewal = async (req: Request, res: Response) => {
    
    const company = <ICompany>req.company;

    if(!isContratorOrSP(company.type)) {
        return res.json({status: Status.Error, message: "User must be a contractor or service provider."})
    }

    if(!company.subscriptionInfo?.stripeSubscriptionId) {
        return res.json({status: Status.NotFound, message: "Company has no subscription."})
    }

    try {
        const subscription = await updateSubscription(
            company.subscriptionInfo.stripeSubscriptionId,
            req.body.cancelAtPeriodEnd
        );
        return res.json({'status': Status.Success, 'subscription': subscription});
    }
    catch(err) {
        Sentry.captureException(err);
        return res.json({'status': Status.Error, 'message': err.message});
    };
};

/**
 * Updates the default payment method of a subscription
 */
export const updateSubscriptionPaymentMethod = async (req: Request, res: Response) => {

    const company = <ICompany>req.company;

    if(!isContratorOrSP(company.type)) {
        return res.json({status: Status.Error, message: "User must be a contractor or service provider."})
    }

    if(!company.subscriptionInfo?.stripeSubscriptionId) {
        return res.json({status: Status.NotFound, message: "Company has no subscription."})
    }

    try {
        const subscription = await updatePaymentMethod(company.subscriptionInfo?.stripeSubscriptionId, req.body.paymentMethodId);
        return res.json({'status': Status.Success, 'subscription': subscription});
    }
    catch(err) {
        Sentry.captureException(err);
        return res.json({'status': Status.Error, 'message': err.message});
    }
}

/**
 * Retrieves a user's subscription
 */
export const getMySubscription = async (req: Request, res: Response) => {

    const company = <ICompany>req.company;

    if(!isContratorOrSP(company.type)) {
        return res.json({status: Status.Error, message: "User must be a contractor or service provider."})
    }

    if(!company.subscriptionInfo?.stripeSubscriptionId) {
        return res.json({status: Status.NotFound, message: "Company has no subscription."})
    }

    try {
        const subscription = await getSubscription(company.subscriptionInfo?.stripeSubscriptionId);
        return res.json({'status': Status.Success, 'subscription': subscription});
    }catch (err) {
        Sentry.captureException(err);
        return res.json({'status': Status.Error, 'message': err.message});
    }
}

/**
 * Fetches the payment methods asigned to a user
 */
export const getCustomerPaymentMethods = async(req: Request, res: Response) => {

    const company = <ICompany>req.company;

    if(!company?.stripeInfo?.stripeUserId || company?.stripeInfo?.stripeUserId === '') {
        return res.json({status: Status.NotFound, message: "No cards found."})
    }

    try {
        const cards = await getCustomerCards(company?.stripeInfo?.stripeUserId);
        res.json({status: Status.Success, message: cards})
    }catch (err) {
        Sentry.captureException(err);
        return res.json({'status': Status.Error, 'message': err.message});
    }
}

export const stripeWebhook = async (req: Request, res: Response) => {

    const event = req.body;
    // Check event is supported by the function
    if(!Object.values(StripeEvents).includes(event.type)) {
        return res.json({received: true});
    }

    Company.findOne(
        { 'stripeInfo.stripeUserId': event.data?.object?.customer},
        async (err: any, company: ICompany) => {

            if (err) {
                Sentry.captureException(err);
            }

            if (company) {
                switch (event.type) {
                    case StripeEvents.INVOICE_CREATED:
                        await sendSubscriptionInvoiceMail(company.info.companyEmail, event.data.object.invoice_pdf);
                        break;
                    case StripeEvents.INVOICE_PAYMENT_SUCCESS:
                        if(event.data.object.subscription && event.data.object.billing_reason !== 'subscription_create') {
                            await sendSubscriptionInvoiceMail(company.info.companyEmail, event.data.object.invoice_pdf);
                        }
                        return res.json({received: true});
                    case StripeEvents.INVOICE_PAYMENT_FAIL:
                        await sendSubscriptionPaymentFail(company.info.companyEmail, event.data.object.invoice_pdf)
                        return res.json({received: true});
                    case StripeEvents.SUBSCRIPTION_UPDATE:
                        company.updateOne({ 
                            'subscriptionInfo.status': event.data?.object?.status,
                            'subscriptionInfo.end': event.data?.object?.current_period_end + 86400,
                        }, () => {
                            return res.json({received: true});
                        });
                }
            }
        }
    )
}
const isContratorOrSP = (type: CompanyTypes) => {
    return (
        [
            CompanyTypes.SERVICE_PROVIDER,
            CompanyTypes.SERVICE_PROVIDER_LIMITED,
            CompanyTypes.CONTRACTOR
        ].includes(type)
    );
}

/**
 * A user contractor or SP upgrades or downgrades its subscription
 */
export const changeSubscription = async(req: Request, res: Response) => {

    const company = <ICompany>req.company;

    const {
        paymentMethodId,
        type,
    } = req.body
    // Process stripe subscriptions IDs depending on subscription type
    let isSPFull = false;
    let fullSubscriptionPrice;
    const subscriptionIds = (() => {
        switch(type) {
            case SubscriptionTypes.SPFullYearly:
                isSPFull = true;
                return [STRIPE_SK_SP_FULL_YEARLY, STRIPE_SK_COMPLETED_JOB_PRICE];
            case SubscriptionTypes.SPFullMonthly:
                isSPFull = true;
                if (isSPFull) {
                    fullSubscriptionPrice = Number(STRIPE_SK_SP_FULL_MONTHLY_SUBSCRIPTION_PRICE);
                }
                return [STRIPE_SK_SP_FULL_MONTHLY, STRIPE_SK_COMPLETED_JOB_PRICE];
            case SubscriptionTypes.SPLimitedMonthly:
                return [STRIPE_SK_SP_LIMITED_MONTHLY, STRIPE_SK_COMPLETED_JOB_PRICE];
            case SubscriptionTypes.SPLimitedYearly:
                return [STRIPE_SK_SP_LIMITED_YEARLY, STRIPE_SK_COMPLETED_JOB_PRICE];
            case SubscriptionTypes.ContractorMonthly:
                fullSubscriptionPrice = Number(STRIPE_SK_CONTRACTOR_MONTHLY_SUBSCRIPTION_PRICE);
                return [STRIPE_SK_CONTRACTOR_MONTHLY, STRIPE_SK_COMPLETED_JOB_PRICE];
            default:
                return [STRIPE_SK_CONTRACTOR_YEARLY, STRIPE_SK_COMPLETED_JOB_PRICE];
        }
    })()
    // Check user is contractor or service provider
    if(!isContratorOrSP(company.type)) {
        return res.json({status: Status.Error, message: "User must be a contractor or service provider."})
    }
    // Check user has stripe payment info
    if(!company?.stripeInfo?.stripeUserId || company?.stripeInfo?.stripeUserId === '') {
        return res.json({status: Status.Error, message: "User payment method required."})
    }
    // Check user already has a subscription
    if(!hasActiveSubscription(company)) {
        return res.json({status: Status.NotFound, message: "Company has no active subscription."})
    }
    // Check new subscription is distinct to the new one
    if(company.subscriptionInfo?.priceId === subscriptionIds[0]) {
        return res.json({status: Status.Error, message: "New subscription must be distinct to the old one"})
    }
    // Create new subscription to the new plan
    try {
        const newSubscription = await subscribe(
            company?.stripeInfo?.stripeUserId,
            subscriptionIds, 
            paymentMethodId, 
            fullSubscriptionPrice
        );
        // Cancel current subscription
        await cancelSubscription(company.subscriptionInfo.stripeSubscriptionId);
        company.updateOne({ 
            'subscriptionInfo.stripeSubscriptionId': newSubscription.id,
            'subscriptionInfo.status': newSubscription.status,
            'subscriptionInfo.end': newSubscription.current_period_end,
            'subscriptionInfo.priceId': subscriptionIds[0],
            'subscriptionInfo.subscriptionType': type,
            'subscriptionInfo.jobUsageKey': isSPFull 
                ? (newSubscription.items?.data?.find(
                    item => item.price.id === STRIPE_SK_COMPLETED_JOB_PRICE
                )).id
                : '',
            'type': [SubscriptionTypes.ContractorMonthly, SubscriptionTypes.ContractorYearly].includes(type)
                    ? CompanyTypes.CONTRACTOR 
                    : [SubscriptionTypes.SPFullMonthly, SubscriptionTypes.SPFullYearly].includes(type)
                        ? CompanyTypes.SERVICE_PROVIDER
                        : CompanyTypes.SERVICE_PROVIDER_LIMITED 

        }, async () => {
            await sendSubscriptionCreatedMail(type, company.info.companyEmail)
            return res.json({'status': Status.Success, 'message': newSubscription})
        });
    }catch (err) {
        Sentry.captureException(err);
        return res.json({'status': Status.Error, 'message': err.message});
    }
}

/**
 * 
 * User cancels his subscription inmediatly
 */
export const cancelMySubscription = async (req: Request, res: Response) => {
    const company = <ICompany>req.company;

    // Check user already has a subscription
    if(!company.subscriptionInfo?.stripeSubscriptionId) {
        return res.json({status: Status.NotFound, message: "Company has no subscription."})
    }
    if(
        [
            SubscriptionTypes.SPFullYearly,
            SubscriptionTypes.ContractorYearly,
            SubscriptionTypes.SPLimitedYearly
        ].includes(company.subscriptionInfo?.subscriptionType)
    ) {
        return res.json({status: 400, message: "Yearly subscriptions cannot be cancelled."})
    }
    console.log("Subscription id: ", company.subscriptionInfo.stripeSubscriptionId)
    try {
        const canceledSubscription = await cancelSubscription(company.subscriptionInfo.stripeSubscriptionId);
        company.updateOne({ 
            'subscriptionInfo.status': canceledSubscription.status,
            'subscriptionInfo.end': canceledSubscription.current_period_end,
        }, async () => {
            await sendSubscriptionCancelledMail(company.info.companyEmail)
            return res.json({'status': Status.Success, 'message': canceledSubscription})
        });
    }catch (err) {
        Sentry.captureException(err);
        return res.json({'status': Status.Error, 'message': err.message});
    }
}

const hasActiveSubscription = (company: ICompany) : boolean => {
    return (
        company.subscriptionInfo?.stripeSubscriptionId 
        && company.subscriptionInfo.status === 'active'
        && company.subscriptionInfo.end > Date.now() / 1000
    );
}