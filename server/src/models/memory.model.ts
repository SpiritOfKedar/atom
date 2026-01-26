import mongoose, { Schema, Document } from 'mongoose';

const CONTEXT = 'MemoryModel';

export interface IMemory extends Document {
    content: string;
    embedding: number[];
    userId: string;
    metadata: {
        sourceUrl?: string;
        date?: Date;
        tags?: string[];
    };
    createdAt: Date;
    updatedAt: Date;
}

const MemorySchema: Schema = new Schema({
    content: { type: String, required: true },
    embedding: { type: [Number], required: true },
    userId: { type: String, required: true, index: true },
    metadata: {
        sourceUrl: { type: String },
        date: { type: Date },
        tags: { type: [String] },
    },
}, {
    timestamps: true,
});

// Create a vector search index (Instructions for Atlas setup will be in README)
// This definition is for Mongoose to know about the collection
export const Memory = mongoose.model<IMemory>('Memory', MemorySchema);
