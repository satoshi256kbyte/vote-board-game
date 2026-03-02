import fs from 'fs';

const filePath = 'src/routes/auth.property.test.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Count occurrences before
const beforeCount = (content.match(/vi\.mocked\(CognitoService\)\.mockImplementation\(/g) || [])
  .length;
console.log(`Found ${beforeCount} CognitoService mocks to fix`);

// Replace pattern: vi.mocked(CognitoService).mockImplementation(\n    () =>\n        ({
// With: vi.mocked(CognitoService).mockImplementation(function (this: CognitoService) {\n        return {
content = content.replace(
  /vi\.mocked\(CognitoService\)\.mockImplementation\(\s+\(\)\s+=>\s+\(\{/g,
  'vi.mocked(CognitoService).mockImplementation(function (this: CognitoService) {\n        return {'
);

// Replace pattern: })\s+as unknown as CognitoService\s+)
// With: }; }) as unknown as CognitoService
content = content.replace(
  /\}\)\s+as\s+unknown\s+as\s+CognitoService\s+\)/g,
  '}; }) as unknown as CognitoService'
);

// Count occurrences after
const afterCount = (content.match(/function \(this: CognitoService\)/g) || []).length;
console.log(`Fixed ${afterCount} CognitoService mocks`);

fs.writeFileSync(filePath, content);
console.log('Done!');
