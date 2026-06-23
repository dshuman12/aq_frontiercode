import moment from "moment";
import { Request, Response } from 'express';
import { ICompany } from "../models/Company";
import { getStripeInvoicesFromPreviousMonth } from '../services/stripe';
import * as Sentry from '@sentry/node';
import { Status } from '../common/constants';
import { getCompletedCurrentMonthAndPreviousMonthJobs } from "./job";

export const getBillingReport = async (req: Request, res: Response) => {
    const company: ICompany = req.company;
    try {
        const stripeId = company.stripeInfo?.stripeUserId;
        if (!stripeId) {
            return res.json({ status: Status.Error, message: "No stripe account found." });
        }
        
        // Get completed jobs for this month and last month
        const jobs = await getCompletedCurrentMonthAndPreviousMonthJobs(company._id);
        let currentMonthCompletedJobs = 0;
        let previousMonthCompletedJobs = 0;
        
        if (jobs.length === 0) {
            return res.json({
                status: Status.NotFound,
                message: "Completed jobs not found for current month and previous month.",
            })
        }
        // Get Invoices from the current and previous month
        const invoices = await getStripeInvoicesFromPreviousMonth(stripeId);
        let thisMonthTotal = 0;
        let lastMonthTotal = 0;
        let lastMonthToDateTotal = 0;

        if (invoices.length === 0) {
            return res.json({
                status: Status.NotFound,
                message: "Invoices not found for current month and previous month.",
            })
        }
        
        const today = moment();
        const currentMonthStart = moment().startOf('month');
        const previousMonthStart = moment().subtract(1, 'month').startOf('month');
        const previousMonthEnd = moment().subtract(1, 'month').endOf('month');
        
        // Count the completed jobs for this month and last month
        jobs.forEach((job: any) => {
            const jobDate = moment.unix(job.createdAt); // MongoDB stores `createdAt` as a Unix timestamp

            // For current month's jobs
            if (jobDate.isSameOrAfter(currentMonthStart)) {
                currentMonthCompletedJobs++;
            }
            
            // For previous month's jobs
            if (jobDate.isBetween(previousMonthStart, previousMonthEnd, null, '[]')) {
                previousMonthCompletedJobs++;
            }
        })

        // console.log("All company invoices: ", invoices);

        // Calculate totals for this month and last month's invoices
        invoices.forEach((invoice: any) => {
            const invoiceDate = moment.unix(invoice.created); // Stripe stores `created` as a Unix timestamp

            // For current month's invoices
            if (invoiceDate.isSameOrAfter(currentMonthStart)) {
                thisMonthTotal += invoice.total / 100; // convert from cents to dollars
            }

            // For last month's invoices
            if (invoiceDate.isBetween(previousMonthStart, previousMonthEnd, null, '[]')) {
                lastMonthTotal += invoice.total / 100; // convert from cents to dollars
            }

            // For the to-date total of last month's invoices
            if (invoiceDate.isBetween(previousMonthStart, previousMonthStart.clone().add(today.date(), 'days'))) {
                lastMonthToDateTotal += invoice.total / 100; // convert from cents to dollars
            }
        });

        // Calculate projected total for this month based on the average daily revenue
        const daysElapsed = today.date();
        const daysInMonth = today.daysInMonth();
        const projectedTotalForThisMonth = (thisMonthTotal / daysElapsed) * daysInMonth;

        return res.json({
            status: Status.Success,
            message: "Sending Billing Reports",
            currentMonthCompletedJobs,
            previousMonthCompletedJobs,
            billingSummary: {
                thisMonthTotal: thisMonthTotal.toFixed(2),
                lastMonthTotal: lastMonthTotal.toFixed(2),
                lastMonthToDateTotal: lastMonthToDateTotal.toFixed(2),
                projectedTotalForThisMonth: projectedTotalForThisMonth.toFixed(2),
                percentageChange: thisMonthTotal && lastMonthToDateTotal
                    ? (((thisMonthTotal - lastMonthToDateTotal) / lastMonthToDateTotal) * 100).toFixed(2)
                    : 0,
            },
        });
    } catch (error) {
        Sentry.captureException(error);
        console.error("Error while getting billing reports:", error);
        return res.json({
            status: Status.Error,
            message: error.message ?? "An error occurred while fetching billing reports.",
        });
    }
};
