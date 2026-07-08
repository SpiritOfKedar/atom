/** NVIDIA NIM models (via nvapi / integrate.api.nvidia.com) */
export const NVAPI_MODELS = [
    'z-ai/glm-5.2',
    'mistralai/mistral-medium-3.5-128b',
    'nvidia/nemotron-3-ultra-550b-a55b',
    'minimaxai/minimax-m3',
    'deepseek-ai/deepseek-v4-pro',
    'deepseek-ai/deepseek-v4-flash',
] as const;

export type NvapiModel = (typeof NVAPI_MODELS)[number];

export type ClassicProvider = 'openai' | 'claude' | 'gemini';

export type ModelProvider = ClassicProvider | NvapiModel;

export const DEFAULT_MODEL_PROVIDER: ModelProvider = NVAPI_MODELS[0];

export const isNvapiModel = (provider: string): provider is NvapiModel =>
    (NVAPI_MODELS as readonly string[]).includes(provider);

export const isModelProvider = (value: string): value is ModelProvider =>
    value === 'openai' ||
    value === 'claude' ||
    value === 'gemini' ||
    isNvapiModel(value);

/** Short label for UI pills / dropdowns */
export const modelProviderLabel = (provider: ModelProvider): string => {
    switch (provider) {
        case 'openai':
            return 'OpenAI (gpt-4o-mini)';
        case 'claude':
            return 'Claude (3.5 Haiku)';
        case 'gemini':
            return 'Gemini (2.5 Flash)';
        default:
            return provider;
    }
};

export const modelProviderShortLabel = (provider: ModelProvider): string => {
    switch (provider) {
        case 'openai':
            return 'GPT-4o';
        case 'claude':
            return 'Claude';
        case 'gemini':
            return 'Gemini';
        case 'z-ai/glm-5.2':
            return 'GLM-5.2';
        case 'mistralai/mistral-medium-3.5-128b':
            return 'Mistral Med';
        case 'nvidia/nemotron-3-ultra-550b-a55b':
            return 'Nemotron Ultra';
        case 'minimaxai/minimax-m3':
            return 'MiniMax M3';
        case 'deepseek-ai/deepseek-v4-pro':
            return 'DeepSeek Pro';
        case 'deepseek-ai/deepseek-v4-flash':
            return 'DeepSeek Flash';
        default:
            return provider;
    }
};

export const modelProviderPoweredBy = (provider: ModelProvider): string => {
    if (isNvapiModel(provider)) return 'NVIDIA NIM';
    if (provider === 'openai') return 'OpenAI';
    if (provider === 'claude') return 'Anthropic';
    return 'Google';
};

/** Group used to render sectioned model pickers (dropdowns/popovers). */
export const modelProviderGroup = modelProviderPoweredBy;

/** Short one-line description shown under a model's name in the picker. */
export const modelProviderDescription = (provider: ModelProvider): string => {
    switch (provider) {
        case 'z-ai/glm-5.2':
            return 'Balanced flagship model, strong general reasoning';
        case 'mistralai/mistral-medium-3.5-128b':
            return 'Fast mid-size model with a large context window';
        case 'nvidia/nemotron-3-ultra-550b-a55b':
            return 'Large frontier model, best for complex questions';
        case 'minimaxai/minimax-m3':
            return 'Efficient model tuned for quick answers';
        case 'deepseek-ai/deepseek-v4-pro':
            return 'High-quality reasoning, slower responses';
        case 'deepseek-ai/deepseek-v4-flash':
            return 'Lightweight and fast version of DeepSeek';
        case 'openai':
            return 'Reliable general-purpose model from OpenAI';
        case 'claude':
            return 'Careful, well-reasoned answers from Anthropic';
        case 'gemini':
            return "Google's fast multimodal model";
        default:
            return '';
    }
};

export const ALL_MODEL_PROVIDERS: ModelProvider[] = [
    ...NVAPI_MODELS,
    'openai',
    'claude',
    'gemini',
];
