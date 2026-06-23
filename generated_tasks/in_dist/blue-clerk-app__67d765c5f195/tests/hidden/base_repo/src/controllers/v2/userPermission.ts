import { Request, Response } from "express";
import { Status } from "../../common/constants";
import { Permission, IPermission } from "../../models/Permission";
import * as Sentry from '@sentry/node';

export const getUserPermission = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    // Validate the userId
    if (!userId) {
      throw new Error("UserId is required.");
    }

    // Find permissions based on the user ID
    const permissions: IPermission = await Permission.findOne({ user: userId as any }).exec();

    // If permissions not found, throw an error response
    if (!permissions) {
      throw new Error("Permissions not found for the given user ID");
    }

    // Return the found permissions
    return res.json({
      status: Status.Success,
      permissions: permissions,
    });

  } catch (err) {
    // Log the error using Sentry
    Sentry.captureException(err);
    console.error('Error fetching user permissions:', err);

    // Return a generic error response
    if (err.message === "UserId is required." || err.message === "Permissions not found for the given user ID") {
      res.status(400).send(err.message);
    } else {
      res.status(Status.InternalError).send("An unexpected error occurred");
    }
  }
};

export const updateUserPermission = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { permissions } = req.body;
  try {
    // Validate the userId
    if (!userId) {
      throw new Error("UserId is required.");
    }
    if (!permissions) {
      throw new Error("Valid permissions object is required.");
    }

    // Find permissions based on the user ID
    const updatedPermissions: IPermission = await Permission.findOneAndUpdate(
      { user: userId as any },
      permissions,
      { upsert: true, new: true }).exec();

    // If permissions not found, throw an error response
    if (!updatedPermissions) {
      throw new Error("Permissions has not been updated for the given user ID");
    }

    // Return the found permissions
    return res.json({
      status: Status.Success,
      permissions: updatedPermissions,
    });

  } catch (err) {
    // Log the error using Sentry
    Sentry.captureException(err);
    console.error('Error updating user permissions:', err);

    // Return a generic error response
    res.status(Status.InternalError).send(err.message);
  }
};
