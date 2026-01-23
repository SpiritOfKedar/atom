import mongoose, { Schema, Document } from 'mongoose';

export interface ISource {
    title: string;
    link: string;
    favicon: string;
}

export interface IMessage {
    role: 'user' | 'assistant';
    content: string;
    sources?: ISource[];
    createdAt: Date;
}

export interface IConversation extends Document {
    clerkUserId: string;
    title: string;
    messages: IMessage[];
    createdAt: Date;
    updatedAt: Date;
}

const SourceSchema = new Schema<ISource>({
    title: { type: String, required: true },
    link: { type: String, required: true },
    favicon: { type: String, default: '' }
}, { _id: false });

const MessageSchema = new Schema<IMessage>({
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    sources: { type: [SourceSchema], default: [] },
    createdAt: { type: Date, default: Date.now }
}, { _id: true });

const ConversationSchema = new Schema<IConversation>({
    clerkUserId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    messages: { type: [MessageSchema], default: [] }
}, {
    timestamps: true
});

ConversationSchema.index({ clerkUserId: 1, updatedAt: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
