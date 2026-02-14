import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { OpenAIEmbeddings } from '@langchain/openai';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { env } from '../config/env';

const CONTEXT = 'VectorStoreService';

let vectorStore: MongoDBAtlasVectorSearch | null = null;
let embeddingsDisabled = false;

const isAuthError = (error: unknown): boolean => {
    const message = (error as any)?.message || '';
    const status = (error as any)?.status || (error as any)?.response?.status;
    return status === 401 || /Incorrect API key|MODEL_AUTHENTICATION|authentication/i.test(String(message));
};

const getVectorStore = (): MongoDBAtlasVectorSearch | null => {
    if (vectorStore) return vectorStore;

    if (embeddingsDisabled) {
        return null;
    }

    if (!env.openaiApiKey) {
        logger.warn('OPENAI_API_KEY is not configured, memory vector search is disabled', CONTEXT);
        return null;
    }

    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        logger.warn('MongoDB is not ready, memory vector search is temporarily unavailable', CONTEXT);
        return null;
    }

    // Use the native MongoDB driver collection from Mongoose connection DB
    const collection = mongoose.connection.db.collection('memories');

    vectorStore = new MongoDBAtlasVectorSearch(
        new OpenAIEmbeddings({
            modelName: 'text-embedding-3-small',
            apiKey: env.openaiApiKey,
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
    if (!store) {
        return;
    }

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
        if (isAuthError(error)) {
            embeddingsDisabled = true;
            logger.warn(
                'Disabling memory embeddings due to authentication failure (check OPENAI_API_KEY)',
                CONTEXT
            );
            return;
        }
        logger.error(`Failed to store memory: ${error.message}`, CONTEXT, error);
        throw error;
    }
};

/**
 * Represents a memory result from vector search.
 * This is the simplified shape consumed by the RAG pipeline.
 */
export interface MemoryResult {
    content: string;
    metadata?: {
        userId?: string;
        date?: Date | string;
        tags?: string[];
        sourceUrl?: string;
        [key: string]: unknown;
    };
}

/**
 * Searches for relevant memories using vector similarity.
 */
export const searchMemory = async (
    userId: string,
    query: string,
    limit: number = 3
): Promise<MemoryResult[]> => {
    logger.debug(`Searching memory for: "${query}"`, CONTEXT);

    try {
        const store = getVectorStore();
        if (!store) {
            return [];
        }

        const results = await store.similaritySearch(query, limit, {
            preFilter: {
                userId: { $eq: userId }
            }
        });

        // Map LangChain Document → our MemoryResult shape
        return results.map(doc => ({
            content: doc.pageContent,
            metadata: doc.metadata as MemoryResult['metadata'],
        }));

    } catch (error: any) {
        if (isAuthError(error)) {
            embeddingsDisabled = true;
            logger.warn(
                'Disabling memory embeddings due to authentication failure (check OPENAI_API_KEY)',
                CONTEXT
            );
            return [];
        }
        logger.error(`Vector search failed: ${error.message}`, CONTEXT, error);
        return [];
    }
};
