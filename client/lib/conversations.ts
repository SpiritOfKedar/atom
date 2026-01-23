import { useAuth } from '@clerk/nextjs';

const API_BASE = 'http://localhost:3001/api';

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: Array<{
        title: string;
        link: string;
        favicon: string;
    }>;
    createdAt: string;
}

export interface Conversation {
    _id: string;
    title: string;
    messages: Message[];
    createdAt: string;
    updatedAt: string;
}

export interface ConversationListItem {
    _id: string;
    title: string;
    updatedAt: string;
    createdAt: string;
}

export async function fetchConversations(token: string): Promise<ConversationListItem[]> {
    const response = await fetch(`${API_BASE}/conversations`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch conversations');
    }

    const data = await response.json();
    return data.conversations;
}

export async function fetchConversation(token: string, id: string): Promise<Conversation> {
    const response = await fetch(`${API_BASE}/conversations/${id}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch conversation');
    }

    const data = await response.json();
    return data.conversation;
}

export async function deleteConversation(token: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/conversations/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to delete conversation');
    }
}
