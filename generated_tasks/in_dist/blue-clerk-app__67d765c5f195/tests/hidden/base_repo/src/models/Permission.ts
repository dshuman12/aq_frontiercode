import mongoose, { Document, Schema } from "mongoose";

export interface IPermission extends Document {
    user?: Schema.Types.ObjectId,
    admin?: {
        addVendors?: boolean
        manageItems?: boolean,
        manageCompanySettings?: boolean,
        manageEmployeeInfoAndPermissions?: boolean,
    },
    dispatch?: {
        serviceTickets?: boolean,
        jobs?: boolean
    },
    accounting?: {
        invoicing?: boolean,
        customerPayments?: boolean,
        vendorPayments?: boolean,
        reporting?: boolean,
    },
    superAdmin?: {
        editBillingInformation?: boolean
    },
    customers?: {
        editCustomerSettings?: boolean,
        overridePORequired?: boolean,
    }
}

const PermissionSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    admin: {
        addVendors: {
            type: Boolean,
            default: false,
        },
        manageItems: {
            type: Boolean,
            default: false,
        },
        manageCompanySettings: {
            type: Boolean,
            default: false,
        },
        manageEmployeeInfoAndPermissions: {
            type: Boolean,
            default: false,
        },
    },
    dispatch: {
        serviceTickets: {
            type: Boolean,
            default: false,
        },
        jobs: {
            type: Boolean,
            default: false,
        },
    },
    accounting: {
        invoicing: {
            type: Boolean,
            default: false,
        },
        customerPayments: {
            type: Boolean,
            default: false,
        },
        vendorPayments: {
            type: Boolean,
            default: false,
        },
        reporting: {
            type: Boolean,
            default: false,
        },
    },
    superAdmin: {
        editBillingInformation: {
            type: Boolean,
            default: false,
        },
    },
    customers: {
        editCustomerSettings: {
            type: Boolean,
            default: false,
        },
        overridePORequired: {
            type: Boolean,
            default: false,
        },
    },
});

export const Permission = mongoose.model<IPermission>("Permission", PermissionSchema);