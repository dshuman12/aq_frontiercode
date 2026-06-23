import { Request, Response } from 'express'
import { Status, Messages } from '../common/constants'
import { createCustomer, detachCustomerSource, createCard, addCustomerPaymentMethod } from '../services/stripe'
import { ObjectId } from 'mongodb';
import * as Sentry from '@sentry/node';
import { IUser } from 'src/models/User'
import { ICompany } from 'src/models/Company';
import { CompanyCard, ICompanyCard } from '../models/CompanyCard';

/**
 * Removes a payment method, detaching it from its user
 * @returns 
 */
export const removeCompanyCard = async(req: Request, res: Response) => {
    const params = req.body
    try {
        const deletedPaymentMethod = await detachCustomerSource(params.cardId);
        return res.json({ 'status': Status.Success, 'message': 'Deleted successfully', 'card': deletedPaymentMethod });
    }
    catch(err) {
        Sentry.captureException(err);
        return res.json({ 'status': Status.Error, 'message': err.message });
    }
  
}

/**
 * Creates a new payment methods and asigns it to a
 * new created or existing user
 */
export const createUserPaymentMethod = async (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    try {
        const newCard = await createCard(params.cardNumber, params.exp, params.cvc, params.name, params.address, params.city, params.state, params.zipcode);

        // Customer already exists in stripe
        if(company.stripeInfo?.stripeUserId) {
            addCustomerPaymentMethod(newCard.id, company.stripeInfo?.stripeUserId, (status : number, paymentMethod : any, message : string) => {
                return res.json({ 'status': status, 'message': message, 'card': paymentMethod });
            })
        }
        // Customer does not exist in stripe yet
        else {
            const newCustomer = await createCustomer(
                company.info?.companyEmail || user.auth.email,
                company.info?.companyName || user.profile.displayName
            );

            company.updateOne({ 'stripeInfo.stripeUserId': newCustomer.id }, () => {
                addCustomerPaymentMethod(newCard.id, newCustomer.id, (status : number, paymentMethod : any, message : string) => {
                    return res.json({ 'status': status, 'message': message, 'card': paymentMethod });
                })
            });
        }
    } catch (err) {
        Sentry.captureException(err);
        return res.json({ 'status': Status.Error, 'message': err.message });
    }
}

export const getCompanyCards = (req: Request, res: Response) => {

    CompanyCard.find(
        {company: new ObjectId(req.companyId)},
        '_id ending expirationMonth expirationYear name cardType',
        (err: any, cards: ICompanyCard[]) => {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            return res.json({'status': Status.Success, 'cards': cards});
        }
    );
};


