import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * S3Service handles S3 operations for the Profile API
 * Generates presigned URLs for icon uploads
 */
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly cdnDomain: string;

  constructor(bucketName: string, cdnDomain: string, region: string = 'ap-northeast-1') {
    this.bucketName = bucketName;
    this.cdnDomain = cdnDomain;
    this.s3Client = new S3Client({ region });
  }

  /**
   * Generate a presigned URL for uploading an icon image
   * @param userId - The user ID
   * @param fileExtension - The file extension (png, jpg, jpeg, gif)
   * @returns Object containing uploadUrl, iconUrl, and expiresIn
   */
  async generateUploadUrl(
    userId: string,
    fileExtension: string
  ): Promise<{
    uploadUrl: string;
    iconUrl: string;
    expiresIn: number;
  }> {
    const timestamp = Date.now();
    const key = `icons/${userId}/${timestamp}.${fileExtension}`;
    const contentType = this.getContentType(fileExtension);
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const expiresIn = 300; // 5 minutes

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
      ContentLength: maxFileSize,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn,
    });

    const iconUrl = `https://${this.cdnDomain}/${key}`;

    return {
      uploadUrl,
      iconUrl,
      expiresIn,
    };
  }

  /**
   * Map file extension to Content-Type
   * @param extension - File extension
   * @returns Content-Type string
   */
  private getContentType(extension: string): string {
    const contentTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
    };
    return contentTypes[extension] || 'application/octet-stream';
  }
}
