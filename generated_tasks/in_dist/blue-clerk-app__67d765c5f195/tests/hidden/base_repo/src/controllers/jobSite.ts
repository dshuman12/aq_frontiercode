import { Request, Response } from 'express';
import { Status, Messages } from '../common/constants';

import { JobSite, IJobSite } from '../models/JobSite';
import { JobLocation, IJobLocation } from '../models/JobLocation';
import * as Sentry from '@sentry/node';
import escapeStringRegexp from 'escape-string-regexp';
import { Types } from 'mongoose';


export const get = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { query: queryParams = {} } = req;
    const { customerId, homeOwnerId, locationId, isActive } = queryParams;

    console.log('Query Params:', queryParams);
   
    let query: {
        _id?: string;
        customerId?: string;
        locationId?: Types.ObjectId;
        homeOwner?: string;
        $or?: Array<{[key: string]: any}>;
        isActive?: boolean;
    } = {};
 
    if (id) {
        query = { _id: id };
    } else if (customerId && locationId) {
        query = { customerId, locationId: new Types.ObjectId(locationId) };
    } else if (homeOwnerId && locationId) {
        query = { homeOwner: homeOwnerId, locationId: new Types.ObjectId(locationId) };
    } else if (customerId && !homeOwnerId) {
        query = { customerId };
    } else if (customerId && homeOwnerId) {
        query = { $or: [{ customerId }, { homeOwner: homeOwnerId }] };
    } else if (homeOwnerId && !customerId) {
        query = { homeOwner: homeOwnerId };
    } else if (locationId) {
        query = { locationId: new Types.ObjectId(locationId) };
    } 

    switch (isActive) {
        case 'true':
        case true:
            query = {...query, $or: [...(query.$or || []), { isActive: true }, { isActive: { $exists: false } }] };
            break;
        case 'false':
        case false:
            query = {...query, isActive: false};
            break;
        default:
            // Retrieve all job sites
            break;
    }

    try {
        const jobSites = await JobSite.find(query).lean();
        res.status(Status.OK).json(jobSites);
    } catch (err) {
        console.error('Error in get JobSite:', err);
        res.status(Status.InternalError).json({ status: Status.Error, message: Messages.InternalServerError });
    }
};

export const create = async (req: Request, res: Response) => {
    const params = req.body || {};
    const {
        name,
        location: { lat, long },
        address,
        locationId,
        customerId
    } = params;

    // Validate required parameters
    const missingParams = [];
    if (!locationId) missingParams.push('locationId');
    if (!customerId) missingParams.push('customerId');
    
    if (missingParams.length > 0) {
        const message = `${Messages.MissingParams}: ${missingParams.join(', ')}`;
        return res.status(400).json({ status: Status.Error, message });
    }

    try {
        // Find the job location
        const jobLocation = await JobLocation.findById(locationId, { customerId: 1, homeOwner: 1 });
        
        if (!jobLocation) {
            return res.status(404).json({ status: Status.Error, message: 'Subdivision not found.' });
        }

        // Create the new job site
        const newJobSite: IJobSite = await JobSite.create({
            name,
            location: {
                coordinates: [long ?? '', lat ?? '']
            },
            address,
            locationId,
            customerId: new Types.ObjectId(customerId)
        });

        // Update the job location with the new job site
        await JobLocation.findByIdAndUpdate(locationId, {
            $push: { jobSites: newJobSite._id }
        });

        return res.status(Status.OK).json(newJobSite);

    } catch (error) {
        Sentry.captureException(error);
        console.error('Error in create job site:', error);
        return res.status(500).json({ status: Status.Error, message: Messages.InternalServerError });
    }
};

export const update = async (req: Request, res: Response) => {
    const params = req.body;
    const { id } = req.params;
    const {
        name,
        location,
        isActive,
        address,
        locationId,
    } = params;

    const missingParams = [];
    if (!id) missingParams.push('id');
    if (!locationId) missingParams.push('locationId');
    const isMissingParams = missingParams.length > 0;

    if (isMissingParams) {
        const message = `${Messages.MissingParams}: ${missingParams.join(', ')}`;
        return res.json({ status: Status.Error, message });
    }

    let jobLocation = null;
    try {
        jobLocation = await JobLocation.findById(locationId, {customerId: 1, homeOwner: 1});
        if (!jobLocation) {
            return res.json({ status: Status.Error, message: 'Subdivision not found.' });
        }
    } catch (err) {
        Sentry.captureException(err);
        return res.json({ status: Status.Error, message: Messages.InternalServerError });
    }
    if (!jobLocation) return;

    const jobSite = await JobSite.findById(id).exec();
    const isJobSiteActive = isActive === undefined || isActive === null
        ? jobSite.isActive
        : isActive === 'false'
            ? false
            : !!isActive;

    JobSite.updateOne({ _id: id }, {
        name: name ?? jobSite.name,
        location: {
            coordinates: [location?.long ?? '', location?.lat ?? '']
        },
        isActive: isJobSiteActive,
        address: address,
        locationId: locationId,
        customerId: jobSite.customerId,
        homeOwner: jobSite.homeOwner || params.homeOwner,
    }, (err: any) => {
        if (err) {
            return res.json({ status: Status.Error, message: Messages.InternalServerError });
        } else {
            return res.json({ status: Status.OK, message: 'Job Address has been updated successfully.' });
        }
    });
};




export const search = async (req: Request, res: Response) => {
    try {
        const { keyword, locationId, customerId } = req.query as { keyword: string, locationId: string, customerId: string };

        // Validate the keyword
        if (!keyword || typeof keyword !== 'string') {
            return res.status(422).json({ status: 'Error', message: 'Invalid keyword' });
        }

        // Validate the locationId
        if (!locationId || !Types.ObjectId.isValid(locationId)) {
            return res.status(422).json({ status: 'Error', message: 'Invalid locationId' });
        }

        // Validate the customerId
        if (!customerId || !Types.ObjectId.isValid(customerId)) {
            return res.status(422).json({ status: 'Error', message: 'Invalid customerId' });
        }

        const objectIdLocationId = new Types.ObjectId(locationId);
        const objectIdCustomerId = new Types.ObjectId(customerId);

        // Step 1: Find JobSites with the given locationId but NOT the passed customerId
        const jobSitesToExclude = await JobSite.find({
            locationId: objectIdLocationId,
            customerId: objectIdCustomerId
        }).distinct('name');

        // Step 2: Create a search pattern for the keyword (case-insensitive)
        const searchPattern = new RegExp(escapeStringRegexp(keyword), 'i');

        // Step 3: Find JobSites with the locationId that do NOT belong to the passed customerId
        // and where the name matches the searchPattern but is NOT in the excluded names
        const jobSites = await JobSite.find({
            locationId: objectIdLocationId,
            customerId: { $ne: objectIdCustomerId },
            name: { $regex: searchPattern, $nin: jobSitesToExclude }
        }, {
            name: 1,
            location: 1,
            address: 1,
            locationId: 1,
            customerId: 1
        }).lean();

        return res.json({ status: 'Success', jobSites });

    } catch (error) {
        Sentry.captureException(error);
        return res.status(500).json({ status: 'Error', message: 'Internal Server Error' });
    }
};










