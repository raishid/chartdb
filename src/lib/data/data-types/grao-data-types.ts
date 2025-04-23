import type { DataTypeData } from './data-types';

export const graoDataTypes: readonly DataTypeData[] = [
    // Level 1 - Most commonly used types
    { name: 'text', id: 'text', usageLevel: 1 },
    { name: 'number', id: 'number', usageLevel: 1 },
    { name: 'textarea', id: 'textarea', usageLevel: 1 },
    { name: 'decimal', id: 'decimal', usageLevel: 1 },
    { name: 'date', id: 'date', usageLevel: 1 },
    { name: 'select', id: 'select', usageLevel: 1 },

    // Level 2 - Second most common types
    { name: 'checkbox', id: 'checkbox', usageLevel: 2 },
    { name: 'radio', id: 'radio', usageLevel: 2 },
    { name: 'datetime', id: 'datetime', usageLevel: 2 },
    { name: 'primary', id: 'primary', usageLevel: 2 },

    // Less common types
    { name: 'password', id: 'password' },
    { name: 'email', id: 'email' },
    { name: 'url', id: 'url' },
    { name: 'currency', id: 'currency' },
] as const;
