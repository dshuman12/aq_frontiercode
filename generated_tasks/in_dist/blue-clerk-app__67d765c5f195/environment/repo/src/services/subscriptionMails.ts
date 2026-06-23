import AWS from 'aws-sdk'
import fs from 'fs';
import * as Sentry from '@sentry/node';
import { SubscriptionTypes } from '../common/constants';

const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, AWS_REGION, APP_EMAIL_NOREPLY, APP_EMAIL_SUPPORT } = process.env;
AWS.config.update({
    region: AWS_REGION,
    accessKeyId: AWS_SES_ACCESSKEYID,
    secretAccessKey: AWS_SES_SECRETACCESSKEY,
});
const ses = new AWS.SES({ apiVersion: '2012-10-17' });

export const sendSubscriptionCreatedMail = async (type: string, recipient: string) => {
    const subscriptionName = (() => {
        switch (type) {
            case SubscriptionTypes.SPFullYearly:
                return 'Service Provider Full Subscription (yearly)';
            case SubscriptionTypes.SPFullMonthly:
                return 'Service Provider Full Subscription (monthly)';
            case SubscriptionTypes.SPLimitedMonthly:
                return 'Service Provider Limited Subscription (monthly)';
            case SubscriptionTypes.SPLimitedYearly:
                return 'Service Provider Limited Subscription (yearly)';
            case SubscriptionTypes.ContractorMonthly:
                return 'Contractor Subscription (monthly)';
            default:
                return 'Contractor Subscription (yearly)';
        }
    })();

    const message = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; background-color: #f8f8f8; padding: 20px; border-radius: 5px;">
                <img src="https://blueclerk.com/wp-content/uploads/2020/07/logo.png" alt="BlueClerk Logo" style="max-width: 200px; margin-bottom: 20px;">
                <h2 style="color: #00AAFF;">New Subscription</h2>
                <p style="font-size: 16px;">You have successfully been subscribed to the <b>${subscriptionName}</b>. You will be billed on the third of each month. Remember you can manage your subscription status and credit card in the BlueClerk App (Admin > Subscription).</p>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 14px; color: #666;">
                <p>821 Grand Avenue Parkway, Suite 401-B, Pflugerville, Texas, 78660</p>
                <p>Need help? Contact our support team at <a href="mailto:${APP_EMAIL_SUPPORT}" style="color: #00AAFF; text-decoration: none;">Support</a></p>
                <p style="font-size: 12px;">&copy; 2024 - 2025 BlueClerk. All rights reserved.</p>
                <p><a href="https://app.blueclerk.com" style="color: #00AAFF; text-decoration: none;">Visit BlueClerk</a></p>
            </div>
        </div>
    `

    await sendSubscriptionEmail(
        message,
        recipient,
        'BlueClerk - New subscription',
    )
}

export const sendSubscriptionCancelledMail = async (recipient: string) => {

    const message = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; background-color: #f8f8f8; padding: 20px; border-radius: 5px;">
                <img src="https://blueclerk.com/wp-content/uploads/2020/07/logo.png" alt="BlueClerk Logo"
                    style="max-width: 200px; margin-bottom: 20px;">
                <h2 style="color: #00AAFF;">Subscription Cancelled</h2>
                <p style="font-size: 16px;">You have successfully cancelled your subscription to BlueClerk. Please note:
                    Your subscription will remain active until the end of the month/billing period, and you will continue to
                    incur charges for any completed jobs.</p>
            </div>
            <div
                style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 14px; color: #666;">
                <p>821 Grand Avenue Parkway, Suite 401-B, Pflugerville, Texas, 78660</p>
                <p>Need help? Contact our support team at <a href="mailto:${APP_EMAIL_SUPPORT}"
                        style="color: #00AAFF; text-decoration: none;">Support</a></p>
                <p style="font-size: 12px;">&copy; 2024 - 2025 BlueClerk. All rights reserved.</p>
                <p><a href="https://app.blueclerk.com" style="color: #00AAFF; text-decoration: none;">Visit BlueClerk</a>
                </p>
            </div>
        </div>
    `

    await sendSubscriptionEmail(
        message,
        recipient,
        'BlueClerk - Subscription cancelled',
    )
}

export const sendSubscriptionInvoiceMail = async (recipient: string, invoiceLink: string) => {

    const message = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; background-color: #f8f8f8; padding: 20px; border-radius: 5px;">
                <img src="https://blueclerk.com/wp-content/uploads/2020/07/logo.png" alt="BlueClerk Logo" style="max-width: 200px; margin-bottom: 20px;">
                <h2 style="color: #00AAFF;">New Invoice</h2>
                <p style="font-size: 16px;">A new invoice has been issued in connection with your <b>BlueClerk Subscription</b>. You can access your invoice's details by clicking <a href="${invoiceLink}" style="color: #00AAFF; text-decoration: none;">here</a>.</p>
                <p style="font-size: 16px;">Remember you can manage your subscription status and credit card in the BlueClerk App (Admin > Subscription).</p>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 14px; color: #666;">
                <p>821 Grand Avenue Parkway, Suite 401-B, Pflugerville, Texas, 78660</p>
                <p>Need help? Contact our support team at <a href="mailto:${APP_EMAIL_SUPPORT}" style="color: #00AAFF; text-decoration: none;">Support</a></p>
                <p style="font-size: 12px;">&copy; 2024 - 2025 BlueClerk. All rights reserved.</p>
                <p><a href="https://app.blueclerk.com" style="color: #00AAFF; text-decoration: none;">Visit BlueClerk</a></p>
            </div>
        </div>
    `

    await sendSubscriptionEmail(
        message,
        recipient,
        'BlueClerk - Subscription invoice',
    )
}

export const sendSubscriptionPaymentFail = async (recipient: string, invoiceLink: string) => {

    const message = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; background-color: #f8f8f8; padding: 20px; border-radius: 5px;">
                <img src="https://blueclerk.com/wp-content/uploads/2020/07/logo.png" alt="BlueClerk Logo" style="max-width: 200px; margin-bottom: 20px;">
                <h2 style="color: #cc0000;">Subscription Payment Failed</h2>
                <p style="font-size: 16px;">A new invoice has been issued in connection with your <b>BlueClerk Subscription</b> and <b>payment failed</b>. You can access your invoice's details by clicking <a href="${invoiceLink}" style="color: #00AAFF; text-decoration: none;">here</a>.</p>
                <p style="font-size: 16px;">Please, should you want to continue using BlueClerk, update your payment method. Remember you can manage your subscription status and credit card in the BlueClerk App (Admin > Subscription).</p>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 14px; color: #666;">
                <p>821 Grand Avenue Parkway, Suite 401-B, Pflugerville, Texas, 78660</p>
                <p>Need help? Contact our support team at <a href="mailto:${APP_EMAIL_SUPPORT}" style="color: #00AAFF; text-decoration: none;">Support</a></p>
                <p style="font-size: 12px;">&copy; 2024 - 2025 BlueClerk. All rights reserved.</p>
                <p><a href="https://app.blueclerk.com" style="color: #00AAFF; text-decoration: none;">Visit BlueClerk</a></p>
            </div>
        </div>
    `

    await sendSubscriptionEmail(
        message,
        recipient,
        'BlueClerk - Subscription invoice payment failed',
    )
}

const sendSubscriptionEmail = async (message: string, recipient: string, subject: string, attachment?: string, attachmentName?: string) => {
    const SENDER = APP_EMAIL_NOREPLY;
    const RECIPIENT = [recipient];
    const SUBJECT = eval('`' + subject + '`');

    // Check if there is an attachment to determine the email structure
    let rawMessage = [];

    if (attachment && attachmentName) {
        // console.log("Yeah, there is an attachment to determine the email")
        // If there's an attachment, use multipart/mixed
        const pdfFile = fs.readFileSync(attachment);
        const ATTACHMENT = pdfFile.toString("base64").replace(/([^\0]{76})/g, "$1\n");
        const boundary = `NextPart${Math.random().toString().substr(2)}`;
        rawMessage = [
            `From: ${SENDER}`,
            `To: ${RECIPIENT}`,
            `Subject: ${SUBJECT}`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/mixed; boundary=\"${boundary}\"\n`,
            `--${boundary}`,
            `Content-Type: text/html\n`,
            `${message}\n`,
            `--${boundary}`,
            `Content-Type: application/octet-stream; name=\"${attachmentName || 'file'}.pdf\"`,
            `Content-Transfer-Encoding: base64`,
            `Content-Disposition: attachment\n`,
            `${ATTACHMENT}\n`,
            `--${boundary}--`
        ];
    } else {
        // console.log("Yeah, there is no such an attachment to determine the email")
        // If no attachment, use a simpler Content-Type
        rawMessage = [
            `From: ${SENDER}`,
            `To: ${RECIPIENT}`,
            `Subject: ${SUBJECT}`,
            `MIME-Version: 1.0`,
            `Content-Type: text/html\n`,
            `${message}\n`
        ];
    }
    // Attachment PDF if provided
    // if (attachment && attachmentName) {
    //   const pdfFile = fs.readFileSync(attachment);
    //   const ATTACHMENT = pdfFile.toString("base64").replace(/([^\0]{76})/g, "$1\n");
    //   rawMessage.push(`Content-Type: application/octet-stream; name=\"${attachmentName || 'file'}.pdf\"`);
    //   rawMessage.push(`Content-Transfer-Encoding: base64`);
    //   rawMessage.push(`Content-Disposition: attachment\n`);
    //   rawMessage.push(`${ATTACHMENT}\n`);
    //   rawMessage.push(`--${boundary}--`);
    // }
    try {
        await ses.sendRawEmail({
            Source: SENDER,
            Destinations: RECIPIENT,
            RawMessage: { Data: rawMessage.join("\n") }
        }).promise();
    } catch (error) {
        Sentry.captureException(error);
        return;
    }
};