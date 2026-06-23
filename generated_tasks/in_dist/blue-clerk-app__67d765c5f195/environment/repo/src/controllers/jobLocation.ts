import { Request, Response } from 'express';
import { Status } from '../common/constants';

import { JobLocation, IJobLocation } from '../models/JobLocation';
import { IUser } from '../models/User';
import { Company, ICompany } from '../models/Company';
import { Customer } from '../models/Customer';
import { Contact } from '../models/Contact';
import { _createQBCustomerJob, _updateQBCustomerJob } from './quickbook.customer';
import * as Sentry from '@sentry/node';
import escapeStringRegexp from 'escape-string-regexp';


import { ObjectId } from 'mongodb';
import mongoose from "mongoose"

/**
 * To reset Job Location quickbookId,
 * used when /disconnectQB API called
 */
export const _resetJobLocationQB = (company: ICompany): void => {

    JobLocation.updateMany(
        { companyId: company._id, quickbookId: { $ne: null } },
        { $set: { quickbookId: null } }
    ).exec();

    return;

};


interface JobLocationQuery {
    _id?: mongoose.Types.ObjectId;
    builderId?: mongoose.Types.ObjectId;
    customerIds?: mongoose.Types.ObjectId;
    $or?: Array<{[key: string]: boolean | { $exists: boolean }}>;
    isActive?: boolean;
  }
  
  export const get = async (req: Request, res: Response) => {
      const { id } = req.params;
      const { query: queryParams = {} } = req;
      const loggedInCompanyId = req.companyId;
      const { isActive } = queryParams;
      let { customerId, builderId } = queryParams;
      let query: JobLocationQuery = {};
  
      // Check if customerId is provided
      if (!customerId) {
          return res.status(400).json({ 'status': Status.Error, 'message': 'customerId is required' });
      }
  
      // If no id, customerId, but we have loggedInCompanyId, use loggedInCompanyId
      if (!id && !customerId && loggedInCompanyId) {
          customerId = loggedInCompanyId;
      }
  
      // Construct the query based on builderId and customerId
      if (id) {
          query._id = new mongoose.Types.ObjectId(id);
      }
      if (builderId) {
          query.builderId = new mongoose.Types.ObjectId(builderId);
      }
      if (customerId) {
          query.customerIds = new mongoose.Types.ObjectId(customerId);
      }
  
      // Handle the isActive flag in the query
      if (isActive !== undefined) {
          if (isActive === 'true' || isActive === true) {
              query.$or = [{ isActive: true }, { isActive: { $exists: false } }];
          } else if (isActive === 'false' || isActive === false) {
              query.isActive = false;
          }
      }
  
      const projection = {
          customerIds: 0  // Exclude customerIds from the result
      };
  
      try {
          const jobLocations = await JobLocation.find(query, projection)
              .populate('jobSites', '-__v -locationId -customerId -homeOwner')
              .populate('contacts', '-__v')
              .lean();
  
          return res.json(jobLocations);
      } catch (err) {
          Sentry.captureException(err);
          return res.status(500).json({ 'status': Status.Error, 'message': err.message });
      }
  };


  
export const create = async (req: Request, res: Response) => {
    try {
        const params = req.body;
        const company = req.company;
        const companyId = new mongoose.Types.ObjectId(req.companyId);
        const customerId = new mongoose.Types.ObjectId(params.customerId);
        const jobLocationId = params.jobLocationId ? new mongoose.Types.ObjectId(params.jobLocationId) : null;

        const name = params.name;
        const contact = params.contact ? JSON.parse(params.contact) : {};
        const locationLat = params.locationLat;
        const locationLong = params.locationLong;
        const street = params.street;
        const city = params.city;
        const state = params.state;
        const zipcode = params.zipcode;

        if (!(locationLat && locationLong) && !(street && city && state && zipcode)) {
            return res.status(400).json({'status': Status.Error, 'message': 'Either location or address is required.'});
        }

        if (!customerId) {
            return res.status(400).json({ status: Status.Error, message: 'BuilderId should be provided'});
        }

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ status: Status.Error, message: 'Customer not found' });
        }

        if (jobLocationId) {
            const checkIfExistsAlready = await JobLocation.find({_id: jobLocationId , customerIds: customerId});
            if(checkIfExistsAlready.length > 0) {
                return res.status(400).json({ status: Status.Error, message: 'Subdivision already added'});
            } else {
                const updatedJobLocation = await JobLocation.findOneAndUpdate(
                    { _id: jobLocationId },
                    { $addToSet: { customerIds: customerId } },
                    { new: true }
                )
                .populate({ path: 'jobSites', select: '-__v -locationId -customerId' })
                .populate({ path: 'contacts', select: '-__v' });

                if (!updatedJobLocation) {
                    return res.status(404).json({ status: Status.Error, message: 'Job location not found' });
                }

                await customer.save();

                if (company.qbAuthorized && customer?.quickbookId) {
                    // Create QB Customer Job (assuming this function exists)
                    _createQBCustomerJob(req, res, company, updatedJobLocation, customer.quickbookId, (err, errMsg, qbCustomerJob) => {
                        if (err) {
                            return res.status(400).json({ status: err, message: errMsg });
                        }

                        if (qbCustomerJob) {
                            updatedJobLocation.quickbookId = qbCustomerJob.Id;
                            updatedJobLocation.save();
                        }

                        return res.json({ status: Status.Success, message: 'Subdivision updated successfully.', jobLocation: updatedJobLocation, quickbookCustomerJob: qbCustomerJob });
                    });
                } else {
                    return res.json({ status: Status.Success, message: 'Subdivision updated successfully.', jobLocation: updatedJobLocation });
                }
            }
        } else {
            const jobLocationData: any = {
                name,
                address: {
                    street,
                    city,
                    state,
                    zipcode
                },
                contacts: [],
                builderId: customer.companyId,
                customerIds: [customerId],
                companyId
            };

            if (contact?.name || contact?.phone || contact?.email) {
                const contactEntry = new Contact({
                    name: contact?.name,
                    phone: contact?.phone,
                    email: contact?.email
                });
                await contactEntry.save();
                jobLocationData.contacts.push(contactEntry._id);
            }

            if (locationLong && locationLat) {
                jobLocationData.location = {coordinates: [locationLong, locationLat]};
            }

            const newJobLocation = await JobLocation.create(jobLocationData);
            await newJobLocation
                .populate({ path: 'jobSites', select: '-__v -locationId -customerId' })
                .populate({ path: 'contacts', select: '-__v' })
                .execPopulate();

            const customerCompany = await Company.findOne({ companyId: customer.companyId });
            if (customerCompany) {
                customerCompany.jobLocations.push(newJobLocation._id);
                await customerCompany.save();
            }

            if (company.qbAuthorized && customer?.quickbookId) {
                // Create QB Customer Job
                _createQBCustomerJob(req, res, company, newJobLocation, customer.quickbookId, (err, errMsg, qbCustomerJob) => {
                    if (err) {
                        return res.status(400).json({ status: err, message: errMsg });
                    }

                    if (qbCustomerJob) {
                        newJobLocation.quickbookId = qbCustomerJob.Id;
                        newJobLocation.save();
                    }

                    return res.json({ status: Status.Success, message: 'Subdivision created successfully.', jobLocation: newJobLocation, quickbookCustomerJob: qbCustomerJob });
                });
            } else {
                return res.json({ status: Status.Success, message: 'Subdivision created successfully.', jobLocation: newJobLocation });
            }
        }
    } catch (err) {
        Sentry.captureException(err);
        return res.status(500).json({'status': Status.Error, 'message': err.message});
    }
};


export const update = async (req: Request, res: Response) => {
    const params = req.body;
    const { id } = req.params;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    try {
        // Find and check if customer exists
        if (!params.customerId) {
            return res.status(400).json({ status: Status.Error, message: 'CustomerId must be provided' });
        }

        const customer = await Customer.findOne({ _id: params.customerId });

        if (!customer) {
            return res.status(404).json({ status: Status.NotFound, message: 'Customer not found.' });
        }

        // Find and check if job location exists
        const jobLocation = await JobLocation.findById(id);

        if (!jobLocation) {
            return res.status(404).json({ status: Status.Error, message: 'Subdivision not found.' });
        }

        // Check the value of params req.body.isActive
        const currentIsActive = jobLocation.isActive;
        const isActive = params.isActive === undefined || params.isActive === null
            ? jobLocation.isActive
            : params.isActive === 'false' || params.isActive === '0'
                ? false
                : !!params.isActive;

        // Update job location
        jobLocation.name = params.name ?? jobLocation.name;
        jobLocation.isActive = isActive;
        jobLocation.address.street = params.street ?? jobLocation.address?.street;
        jobLocation.address.city = params.city ?? jobLocation.address?.city;
        jobLocation.address.state = params.state ?? jobLocation.address?.state;
        jobLocation.address.zipcode = params.zipcode ?? jobLocation.address?.zipcode;
        if (params.locationLong && params.locationLat) {
            jobLocation.location = { coordinates: [params.locationLong, params.locationLat] };
        }
        if (currentIsActive && !isActive) {
            jobLocation.inactiveAt = new Date();
            jobLocation.inactiveBy = user._id;
        } else if (isActive) {
            jobLocation.inactiveAt = null;
            jobLocation.inactiveBy = null;
        }
        await jobLocation.save();

        await jobLocation
            .populate({ path: 'jobSites', select: '-__v -locationId -customerId' })
            .populate({ path: 'contacts', select: '-__v' })
            .execPopulate();

        if (company.qbAuthorized && customer?.quickbookId && jobLocation.quickbookId) {
            // Sync the update to Customer Job in QuickBooks
            _updateQBCustomerJob(req, res, company, jobLocation, customer.quickbookId, (err, errMsg, qbCustomerJob) => {
                if (err) {
                    return res.status(500).json({ status: err, message: errMsg });
                }

                if (qbCustomerJob) {
                    // If company's customers already synced, update the synced date
                    if (company.qbSync?.customersSynced) {
                        company.qbSync.customersSyncedAt = new Date();
                        company.save();
                    }
                }

                return res.json({
                    status: Status.Success,
                    message: 'Subdivision updated successfully.',
                    jobLocation,
                    quickbookCustomerJob: qbCustomerJob
                });
            });
        } else {
            return res.json({ status: Status.Success, message: 'Subdivision updated successfully.', jobLocation });
        }
    } catch (error) {
        console.error('Error updating job location:', error);
        return res.status(500).json({ status: Status.Error, message: 'An error occurred while updating the job location' });
    }
};



export const search = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { keyword = '', customerId }: { keyword?: string; customerId?: string } = req.query;


        if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
            return res.status(400).json({ status: Status.Error, message: 'Invalid Customer ID' });
        }

        const objectIdCustomerId = new mongoose.Types.ObjectId(customerId);

        // Step 1: Find the Customer using the provided customerId
        const customer = await Customer.findById(objectIdCustomerId).lean().select('profile.displayName companyId');
        if (!customer) {
            return res.status(404).json({ status: Status.Error, message: 'Customer not found' });
        }

        // Step 2: Find IDs of all Customers with the same displayName, excluding the original one
        const relatedCustomerIds = await Customer.find({
            'profile.displayName': customer.profile.displayName,
            _id: { $ne: objectIdCustomerId },
        }).distinct('_id');


        // Step 3: Find names of all JobLocations associated with the searcher's customer
        const excludedJobLocationNames = await JobLocation.find({
            customerIds: objectIdCustomerId
        }).distinct('name');

        const searchPattern = new RegExp(escapeStringRegexp(keyword), 'i');

        // Step 4 & 5: Fetch JobLocations that belong to related Customers, 
        // applying the existing search criteria and excluding names that exist in the searcher's customer
        const jobLocations = await JobLocation.find({
            name: { $regex: searchPattern, $nin: excludedJobLocationNames },
            customerIds: { $in: relatedCustomerIds },
        }, { 
            name: 1, 
            location: 1, 
            address: 1
        }).lean();
        
        return res.json({ status: Status.Success, jobLocations });

    } catch (error) {
        console.error('Error in search function:', error);
        return res.status(500).json({ status: Status.Error, message: 'An error occurred while searching' });
    }
};