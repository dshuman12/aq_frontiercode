import mongoose, { Document, Schema } from 'mongoose';
import { ICustomer } from '../models/Customer';
import { IHomeOwner } from '../models/HomeOwner';

export interface IJobSite extends Document {
    name: string
    location: 'Point'
    isActive: boolean
    address: {
      city: string,
      state: string,
      street: string,
      zipcode: string
    }
    locationId: Schema.Types.ObjectId
    customerId: Schema.Types.ObjectId | ICustomer
    homeOwner: Schema.Types.ObjectId | IHomeOwner
    createdAt?: Date
    updatedAt?: Date
}

const JobSiteSchema = new Schema({
    name: { type: String, required: false },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: false
        },
        coordinates: {
            type: [Number],
            required: false
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    address: {
        city: { type: String },
        state: { type: String },
        street: { type: String },
        zipcode: { type: String }, 
    },
    locationId: {
        type: Schema.Types.ObjectId,
        ref: 'JobLocation',
        required: true
    },
    customerId: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
    },
    homeOwner: {
        type: Schema.Types.ObjectId,
        ref: 'HomeOwner'
    },
}, { timestamps: true });

// Compound text index
JobSiteSchema.index({ 
    name: 'text', 
    'address.city': 'text', 
    'address.state': 'text', 
    'address.street': 'text', 
    'address.zipcode': 'text' 
});

// Regular indexes for search fields
JobSiteSchema.index({ name: 1 });
JobSiteSchema.index({ 'address.city': 1 });
JobSiteSchema.index({ 'address.state': 1 });
JobSiteSchema.index({ 'address.street': 1 });
JobSiteSchema.index({ 'address.zipcode': 1 });

// Other existing indexes
JobSiteSchema.index({ locationId: 1 });
JobSiteSchema.index({ customerId: 1 });
JobSiteSchema.index({ homeOwner: 1 });
JobSiteSchema.index({ isActive: 1 });
JobSiteSchema.index({ _id: 1, customerId: 1, isActive: 1 });

export const JobSite = mongoose.model<IJobSite>('JobSite', JobSiteSchema);