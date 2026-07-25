'use client';

import { toast } from 'sonner';

export const showToast = {
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
      style: {
        background: 'var(--surface-2)',
        borderColor: 'var(--border)',
        color: 'var(--text-primary)',
      },
    });
  },
  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      style: {
        background: 'var(--surface-2)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
        color: 'var(--error)',
      },
    });
  },
  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
      style: {
        background: 'var(--surface-2)',
        borderColor: 'var(--border)',
        color: 'var(--text-primary)',
      },
    });
  },
};
