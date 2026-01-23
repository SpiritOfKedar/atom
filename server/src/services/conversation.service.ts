import { Conversation, IConversation, IMessage, ISource } from '../models/conversation.model';
import { logger } from '../utils/logger';

const CONTEXT = 'ConversationService';

export interface CreateConversationInput {
    clerkUserId: string;
    title: string;
    initialMessage?: {
        role: 'user' | 'assistant';
        content: string;
        sources?: ISource[];
    };
}

export interface AddMessageInput {
    conversationId: string;
    clerkUserId: string;
    message: {
        role: 'user' | 'assistant';
        content: string;
        sources?: ISource[];
    };
}

export const createConversation = async (input: CreateConversationInput): Promise<IConversation> => {
    const messages: IMessage[] = input.initialMessage
        ? [{ ...input.initialMessage, createdAt: new Date() }]
        : [];

    const conversation = new Conversation({
        clerkUserId: input.clerkUserId,
        title: input.title,
        messages
    });

    await conversation.save();
    logger.info(`Created conversation ${conversation._id} for user ${input.clerkUserId}`, CONTEXT);
    return conversation;
};

export const getUserConversations = async (clerkUserId: string): Promise<IConversation[]> => {
    const conversations = await Conversation.find({ clerkUserId })
        .sort({ updatedAt: -1 })
        .select('_id title updatedAt createdAt')
        .limit(50);

    return conversations;
};

export const getConversationById = async (
    conversationId: string,
    clerkUserId: string
): Promise<IConversation | null> => {
    const conversation = await Conversation.findOne({
        _id: conversationId,
        clerkUserId
    });

    return conversation;
};

export const addMessageToConversation = async (input: AddMessageInput): Promise<IConversation | null> => {
    const conversation = await Conversation.findOneAndUpdate(
        { _id: input.conversationId, clerkUserId: input.clerkUserId },
        {
            $push: {
                messages: {
                    ...input.message,
                    createdAt: new Date()
                }
            }
        },
        { new: true }
    );

    if (conversation) {
        logger.debug(`Added message to conversation ${input.conversationId}`, CONTEXT);
    }

    return conversation;
};

export const updateConversationTitle = async (
    conversationId: string,
    clerkUserId: string,
    title: string
): Promise<IConversation | null> => {
    return Conversation.findOneAndUpdate(
        { _id: conversationId, clerkUserId },
        { title },
        { new: true }
    );
};

export const deleteConversation = async (
    conversationId: string,
    clerkUserId: string
): Promise<boolean> => {
    const result = await Conversation.deleteOne({
        _id: conversationId,
        clerkUserId
    });

    return result.deletedCount > 0;
};
