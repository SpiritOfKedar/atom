import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Memory, IMemory } from '../models/memory.model';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const CONTEXT = 'VectorStoreService';

let vectorStore: MongoDBAtlasVectorSearch | null = null;

const getVectorStore = (): MongoDBAtlasVectorSearch => {
    if (vectorStore) return vectorStore;

    // Use the native MongoDB driver collection from Mongoose
    const collection = mongoose.connection.collection('memories');

    vectorStore = new MongoDBAtlasVectorSearch(
        new OpenAIEmbeddings({
            modelName: 'text-embedding-3-small',
            apiKey: process.env.OPENAI_API_KEY,
        }),
        {
            collection: collection as any,
            indexName: 'vector_index', // Must match your Atlas Search index name
            textKey: 'content',
            embeddingKey: 'embedding',
        }
    );

    return vectorStore;
};

/**
 * Stores a new memory with its vector embedding.
 */
export const storeMemory = async (
    userId: string,
    content: string,
    metadata?: { sourceUrl?: string; tags?: string[] }
): Promise<void> => {
    logger.info(`Storing memory for user ${userId}`, CONTEXT);

    const store = getVectorStore();

    // metadata must include userId for filtering
    const docMetadata = {
        userId,
        ...metadata,
        date: new Date(),
    };

    try {
        await store.addDocuments([
            {
                pageContent: content,
                metadata: docMetadata,
            },
        ]);
    } catch (error: any) {
        logger.error(`Failed to store memory: ${error.message}`, CONTEXT, error);
        throw error;
    }
};

/**
 * Searches for relevant memories using vector similarity.
 */
export const searchMemory = async (
    userId: string,
    query: string,
    limit: number = 3
): Promise<IMemory[]> => {
    logger.debug(`Searching memory for: "${query}"`, CONTEXT);

    try {
        const store = getVectorStore();

        // Perform similarity search
        // Note: LangChain's similaritySearch allows a filter only if using specific vector stores.
        // For MongoDBAtlasVectorSearch, we can pass a pre-filter stage.
        // However, the standard similaritySearch method signature is (query, k, filter).
        // The filter for MongoDB Atlas is an MQL match object.

        const results = await store.similaritySearch(query, limit, {
            preFilter: {
                userId: { $eq: userId }
            }
        });

        // Map back to IMemory application interface
        return results.map(doc => ({
            content: doc.pageContent,
            metadata: doc.metadata,
            // We don't get the raw embedding or ID back easily from this simplified call, but we have the content
        } as unknown as IMemory));

    } catch (error: any) {
        logger.error(`Vector search failed: ${error.message}`, CONTEXT, error);
        return [];
    }
};
