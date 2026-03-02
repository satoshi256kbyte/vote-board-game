import fs from 'fs';

const filePath = 'src/routes/auth.property.test.ts';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing remaining arrow function mocks...');

// Pattern 1: RateLimiter with arrow function on same line
content = content.replace(
  /vi\.mocked\(RateLimiter\)\.mockImplementation\(\s*\(\)\s*=>\s*\(\{/g,
  'vi.mocked(RateLimiter).mockImplementation(function (this: RateLimiter) {\n                        return {'
);

// Pattern 2: UserRepository with arrow function on same line
content = content.replace(
  /vi\.mocked\(UserRepository\)\.mockImplementation\(\s*\(\)\s*=>\s*\(\{/g,
  'vi.mocked(UserRepository).mockImplementation(function (this: UserRepository) {\n                        return {'
);

// Pattern 3: CognitoService with arrow function on same line
content = content.replace(
  /vi\.mocked\(CognitoService\)\.mockImplementation\(\s*\(\)\s*=>\s*\(\{/g,
  'vi.mocked(CognitoService).mockImplementation(function (this: CognitoService) {\n                        return {'
);

// Fix closing patterns - replace }) as unknown as Type) with }; }) as unknown as Type
content = content.replace(
  /\}\)\s+as\s+unknown\s+as\s+RateLimiter\s*\)/g,
  '}; }) as unknown as RateLimiter'
);

content = content.replace(
  /\}\)\s+as\s+unknown\s+as\s+UserRepository\s*\)/g,
  '}; }) as unknown as UserRepository'
);

content = content.replace(
  /\}\)\s+as\s+unknown\s+as\s+CognitoService\s*\)/g,
  '}; }) as unknown as CognitoService'
);

fs.writeFileSync(filePath, content);
console.log('Done! All mocks should now use proper constructor functions.');
