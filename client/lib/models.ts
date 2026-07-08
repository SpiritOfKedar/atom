/** NVIDIA NIM models (via nvapi / integrate.api.nvidia.com) */
export const NVAPI_MODELS = [
    'mistralai/mistral-medium-3.5-128b',
    'z-ai/glm-5.2',
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
            return 'ChatGPT (GPT-4o mini)';
        case 'claude':
            return 'Claude Sonnet 5';
        case 'gemini':
            return 'Google Gemini 3.1 Pro';
        default:
            return modelProviderShortLabel(provider);
    }
};

export const modelProviderShortLabel = (provider: ModelProvider): string => {
    switch (provider) {
        case 'openai':
            return 'ChatGPT';
        case 'claude':
            return 'Claude Sonnet 5';
        case 'gemini':
            return 'Google Gemini 3.1 Pro';
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
            return 'Anthropic Claude Sonnet 5 for careful reasoning';
        case 'gemini':
            return "Google's Gemini 3.1 Pro multimodal model";
        default:
            return '';
    }
};

/** Brand logo path under /public for model picker icons. */
export const modelProviderLogo = (provider: ModelProvider): string => {
    switch (provider) {
        case 'z-ai/glm-5.2':
            return '/models/zai.png';
        case 'mistralai/mistral-medium-3.5-128b':
            return '/models/mistral.png';
        case 'nvidia/nemotron-3-ultra-550b-a55b':
            return '/models/nvidia.png';
        case 'minimaxai/minimax-m3':
            return '/models/minimax.png';
        case 'deepseek-ai/deepseek-v4-pro':
        case 'deepseek-ai/deepseek-v4-flash':
            return '/models/deepseek.png';
        case 'openai':
            return '/models/openai.png';
        case 'claude':
            return '/models/claude.png';
        case 'gemini':
            return '/models/gemini.png';
        default:
            return '/models/zai.png';
    }
};

/** How the logo tile should crop/contain each brand mark. */
export type ModelLogoFit = 'cover' | 'contain';

export const modelProviderLogoFit = (provider: ModelProvider): ModelLogoFit => {
    switch (provider) {
        case 'z-ai/glm-5.2':
        case 'minimaxai/minimax-m3':
        case 'nvidia/nemotron-3-ultra-550b-a55b':
        case 'gemini':
            return 'cover';
        default:
            return 'contain';
    }
};

export const ALL_MODEL_PROVIDERS: ModelProvider[] = [
    ...NVAPI_MODELS,
    'openai',
    'claude',
    'gemini',
];
