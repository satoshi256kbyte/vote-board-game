import { z } from 'zod';

// プロフィール更新スキーマ
// Requirements: 2.2 (username 1-50文字), 2.3 (iconUrl HTTPS URL), 2.8 (少なくとも1つのフィールドが必要)
export const updateProfileSchema = z
  .object({
    username: z
      .string()
      .min(1, 'Username must be at least 1 character')
      .max(50, 'Username must be at most 50 characters')
      .optional(),
    iconUrl: z
      .string()
      .url('IconUrl must be a valid URL')
      .startsWith('https://', 'IconUrl must start with https://')
      .optional(),
  })
  .refine((data) => data.username !== undefined || data.iconUrl !== undefined, {
    message: 'At least one field must be provided',
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// アイコンアップロードURL生成スキーマ
// Requirements: 3.2 (fileExtension png, jpg, jpeg, gif)
export const uploadUrlRequestSchema = z.object({
  fileExtension: z.enum(['png', 'jpg', 'jpeg', 'gif'], {
    errorMap: () => ({
      message: 'File extension must be one of: png, jpg, jpeg, gif',
    }),
  }),
});

export type UploadUrlRequestInput = z.infer<typeof uploadUrlRequestSchema>;
