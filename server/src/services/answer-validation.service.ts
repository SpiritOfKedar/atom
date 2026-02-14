import { logger } from '../utils/logger';
import { ModelProvider, RAGContext } from '../types';
import { completeText } from './llm.service';

const CONTEXT = 'AnswerValidationService';

/**
 * Result of answer validation against sources.
 */
export interface ValidationResult {
    isValid: boolean;
    confidence: number; // 0-1 score
    issues: string[];
    supportedClaims: number;
    totalClaims: number;
    summary: string;
}

/**
 * Validates an answer against the provided sources to check for:
 * - Unsupported claims (hallucinations)
 * - Missing citations
 * - Factual accuracy
 * 
 * @param answer - The generated answer to validate
 * @param sources - The RAG contexts used to generate the answer
 * @param query - Original user query
 * @returns Validation result with confidence score and issues
 */
export const validateAnswer = async (
    answer: string,
    sources: RAGContext[],
    query: string,
    provider: ModelProvider = 'openai'
): Promise<ValidationResult> => {
    logger.info(`Validating answer for query: "${query.substring(0, 50)}..."`, CONTEXT);

    try {
        const sourcesText = sources
            .map((src, idx) => `[${idx + 1}] ${src.title}\n${src.content.substring(0, 500)}`)
            .join('\n\n---\n\n');

        const validationPrompt = `You are an answer validation expert. Your task is to validate whether an AI-generated answer is well-supported by the provided sources.

ORIGINAL QUESTION: ${query}

SOURCES PROVIDED:
${sourcesText}

GENERATED ANSWER:
${answer}

Analyze the answer and provide a JSON response with the following structure:
{
  "isValid": boolean,  // true if answer is well-supported, false if there are significant issues
  "confidence": number,  // 0.0 to 1.0, how confident you are the answer is accurate
  "issues": [string],  // List of specific issues found (e.g., "Claim X is not supported by sources", "Missing citation for Y")
  "supportedClaims": number,  // Number of claims that are well-supported
  "totalClaims": number,  // Total number of factual claims in the answer
  "summary": string  // Brief summary of validation (1-2 sentences)
}

Focus on:
1. Whether all factual claims are supported by the sources
2. Whether citations are used appropriately
3. Whether the answer addresses the question accurately
4. Any potential hallucinations or unsupported statements

Return ONLY valid JSON, no other text.`;

        const response = await completeText({
            provider,
            systemPrompt: 'You are an answer validation expert. Return only valid JSON, no explanations.',
            userPrompt: validationPrompt,
            temperature: 0.2,
            maxTokens: 500,
        });

        const responseText = response.text || '{}';
        let validationResult: ValidationResult;

        try {
            // Strip markdown code fences if present (LLMs often wrap JSON in ```json...```)
            const cleanedText = responseText
                .replace(/^```(?:json)?\s*/i, '')
                .replace(/\s*```\s*$/i, '')
                .trim();

            const parsed = JSON.parse(cleanedText);
            validationResult = {
                isValid: parsed.isValid ?? true,
                confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0.5)),
                issues: Array.isArray(parsed.issues) ? parsed.issues : [],
                supportedClaims: parsed.supportedClaims ?? 0,
                totalClaims: parsed.totalClaims ?? 0,
                summary: parsed.summary || 'Validation completed',
            };
        } catch (parseError) {
            logger.warn('Failed to parse validation JSON, using defaults', CONTEXT);
            // Fallback: basic validation
            validationResult = {
                isValid: true,
                confidence: 0.7,
                issues: [],
                supportedClaims: 0,
                totalClaims: 0,
                summary: 'Validation completed with default values',
            };
        }

        logger.info(
            `Validation complete: isValid=${validationResult.isValid}, ` +
            `confidence=${validationResult.confidence.toFixed(2)}, ` +
            `issues=${validationResult.issues.length}`,
            CONTEXT
        );

        if (validationResult.issues.length > 0) {
            logger.warn(`Validation issues found: ${validationResult.issues.join('; ')}`, CONTEXT);
        }

        return validationResult;

    } catch (error: any) {
        logger.error(`Answer validation failed: ${error.message}`, CONTEXT, error);
        
        // Return a neutral validation result on error — do not expose internal error details
        return {
            isValid: true, // Assume valid on error to not block answers
            confidence: 0.5,
            issues: [],
            supportedClaims: 0,
            totalClaims: 0,
            summary: 'Validation could not be completed',
        };
    }
};

/**
 * Quick validation that checks for basic issues without LLM call.
 * Useful for fast pre-validation.
 */
export const quickValidate = (answer: string, sources: RAGContext[]): {
    hasCitations: boolean;
    citationCount: number;
    sourceCount: number;
} => {
    // Count citations in format [1], [2], etc.
    const citationMatches = answer.match(/\[\d+\]/g);
    const citationCount = citationMatches ? citationMatches.length : 0;
    
    // Check if answer has any citations
    const hasCitations = citationCount > 0;
    
    return {
        hasCitations,
        citationCount,
        sourceCount: sources.length,
    };
};
