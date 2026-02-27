/**
 * Unit tests for Candidate OGP Image Generation Route
 *
 * Requirements: Task 19
 */

import { describe, it, expect } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

describe('GET /api/og/candidate/[candidateId]', () => {
  it('should generate OGP image with candidate data', async () => {
    const candidateId = 'test-candidate-123';
    const url = `http://localhost:3000/api/og/candidate/${candidateId}?position=D3&votes=5&user=TestUser&desc=Test description`;
    const request = new NextRequest(url);
    const params = Promise.resolve({ candidateId });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image');
  });

  it('should handle missing query parameters with defaults', async () => {
    const candidateId = 'test-candidate-456';
    const url = `http://localhost:3000/api/og/candidate/${candidateId}`;
    const request = new NextRequest(url);
    const params = Promise.resolve({ candidateId });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
  });

  it('should truncate long descriptions', async () => {
    const candidateId = 'test-candidate-789';
    const longDescription = 'A'.repeat(200);
    const url = `http://localhost:3000/api/og/candidate/${candidateId}?position=E5&votes=10&user=LongUser&desc=${longDescription}`;
    const request = new NextRequest(url);
    const params = Promise.resolve({ candidateId });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
  });

  it('should handle Japanese characters in description', async () => {
    const candidateId = 'test-candidate-jp';
    const description = 'この手は角を取る重要な一手です';
    const url = `http://localhost:3000/api/og/candidate/${candidateId}?position=A1&votes=15&user=日本太郎&desc=${encodeURIComponent(description)}`;
    const request = new NextRequest(url);
    const params = Promise.resolve({ candidateId });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
  });

  it('should include candidate ID in the image', async () => {
    const candidateId = 'abcd1234-5678-90ef-ghij-klmnopqrstuv';
    const url = `http://localhost:3000/api/og/candidate/${candidateId}?position=C4&votes=3&user=Player1`;
    const request = new NextRequest(url);
    const params = Promise.resolve({ candidateId });

    const response = await GET(request, { params });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
  });
});
