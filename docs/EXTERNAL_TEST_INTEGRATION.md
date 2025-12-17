# External Test Integration Guide

This guide explains how to integrate external testing systems (Oracle Certification, Coursera, Udemy, etc.) with Daleel's milestone progress tracking.

## Overview

Daleel supports tracking completion of external tests/certifications as part of milestone completion. When a user passes an external test, it counts toward milestone completion and overall path progress.

## API Endpoint

### POST `/api/milestones/[milestoneId]/external-test`

Records an external test result for a user.

**Request Body:**
```json
{
  "userId": "user-uuid",
  "testId": "oracle-1z0-1056-23",
  "testName": "Oracle Financials Cloud: General Ledger 2023 Implementation Professional",
  "score": 85.5,
  "passingScore": 70.0,
  "isPassed": true,
  "completedAt": "2024-01-15T10:30:00Z",
  "externalSystem": "Oracle Certification",
  "certificateUrl": "https://certification.oracle.com/cert/...",
  "metadata": {
    "examCode": "1Z0-1056-23",
    "validUntil": "2027-01-15"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "External test result recorded successfully"
}
```

## Database Schema

The `external_test_results` table stores external test results. Run the SQL schema:

```sql
-- See: docs/sql/external_test_results_schema.sql
```

## Integration Examples

### 1. Oracle Certification Integration

When a user completes an Oracle certification exam:

```javascript
// From your Oracle certification webhook
fetch('/api/milestones/[milestoneId]/external-test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: user.id,
    testId: `oracle-${examCode}`,
    testName: examName,
    score: examScore,
    passingScore: 70.0,
    isPassed: examScore >= 70,
    completedAt: new Date().toISOString(),
    externalSystem: "Oracle Certification",
    certificateUrl: certificateUrl,
    metadata: {
      examCode: examCode,
      validUntil: validUntil
    }
  })
});
```

### 2. Coursera Course Completion

```javascript
// From Coursera webhook
fetch('/api/milestones/[milestoneId]/external-test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: user.id,
    testId: `coursera-${courseId}-${assignmentId}`,
    testName: assignmentName,
    score: grade,
    passingScore: 80.0,
    isPassed: grade >= 80,
    completedAt: completedAt,
    externalSystem: "Coursera",
    certificateUrl: certificateUrl
  })
});
```

### 3. Custom Testing System

```javascript
// From your custom testing platform
const testResult = {
  userId: user.id,
  testId: `custom-${testId}`,
  testName: testName,
  score: score,
  passingScore: passingScore,
  isPassed: score >= passingScore,
  completedAt: new Date().toISOString(),
  externalSystem: "Custom Platform",
  metadata: {
    // Any additional data
  }
};

await fetch(`/api/milestones/${milestoneId}/external-test`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testResult)
});
```

## How It Works

1. **External system calls API**: When a user completes a test, the external system calls the API endpoint
2. **Result is recorded**: The test result is stored in `external_test_results` table
3. **Milestone progress is checked**: The system checks if the milestone is now complete
4. **Path progress updates**: If milestone is complete, overall path progress is recalculated

## Milestone Completion Logic

A milestone is considered complete when ALL of the following are true:

1. **All videos** are ≥90% watched (`is_completed = true` OR `completion_percentage >= 90`)
2. **All quizzes** are passed (`is_passed = true` in latest attempt)
3. **All articles** are completed (if articles exist - future feature)
4. **All external tests** are passed (if external tests are required)

## Security

- The API verifies that the `userId` matches the authenticated user (if authenticated)
- External systems can report results with proper authentication
- RLS policies ensure users can only see their own test results

## Testing

To test the integration:

```bash
curl -X POST http://localhost:3000/api/milestones/[milestoneId]/external-test \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "testId": "test-123",
    "testName": "Sample Test",
    "score": 85,
    "passingScore": 70,
    "isPassed": true,
    "completedAt": "2024-01-15T10:30:00Z"
  }'
```

## Next Steps

1. Run the SQL schema: `docs/sql/external_test_results_schema.sql`
2. Set up webhooks from external testing systems
3. Configure which milestones require external tests
4. Test the integration with sample data

