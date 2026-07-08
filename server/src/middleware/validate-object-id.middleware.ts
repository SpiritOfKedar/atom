import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

export const validateObjectIdParam = (
    paramName: string = 'id'
) => (req: Request, res: Response, next: NextFunction): void => {
    const rawId = req.params[paramName];
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid conversation ID' });
        return;
    }

    next();
};
