declare module '@anthropic-ai/sdk' {
    export interface AnthropicMessageTextBlock {
        type: string;
        text?: string;
    }

    export interface AnthropicMessageResponse {
        content: AnthropicMessageTextBlock[];
    }

    export interface AnthropicMessageCreateParams {
        model: string;
        system?: string;
        messages: Array<{ role: 'user' | 'assistant'; content: string }>;
        temperature?: number;
        max_tokens: number;
    }

    export interface AnthropicStreamTextDelta {
        type: 'text_delta';
        text: string;
    }

    export interface AnthropicStreamEvent {
        type: string;
        delta: AnthropicStreamTextDelta;
    }

    export interface AnthropicMessageStream extends AsyncIterable<AnthropicStreamEvent> {
        [Symbol.asyncIterator](): AsyncIterator<AnthropicStreamEvent>;
    }

    export default class Anthropic {
        constructor(options: { apiKey?: string });

        messages: {
            create(params: AnthropicMessageCreateParams): Promise<AnthropicMessageResponse>;
            stream(params: AnthropicMessageCreateParams): AnthropicMessageStream;
        };
    }
}
