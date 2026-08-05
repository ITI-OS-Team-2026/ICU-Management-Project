const { generateAlertReasoning, SYSTEM_PROMPT } = require('./alertAi.service');
const bedrockClient = require('../../utils/bedrockClient');

jest.mock('../../utils/bedrockClient');

describe('AI Alert Reasoning Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should generate clinical reasoning successfully from scoreResult', async () => {
    const mockScoreResult = {
      total: 6,
      severity: 'P0',
      breakdown: {
        spo2: { value: 88, score: 3 },
        pulse: { value: 118, score: 2 },
        systolicBp: { value: 105, score: 1 },
      },
    };

    const mockReasoning =
      'SpO2 of 88% indicates significant hypoxaemia. Combined with a heart rate of 118 bpm and systolic BP of 105 mmHg, this pattern suggests ongoing respiratory compromise.';

    bedrockClient.callBedrock.mockResolvedValue(mockReasoning);

    const result = await generateAlertReasoning(mockScoreResult);

    expect(result).toBe(mockReasoning);
    expect(bedrockClient.callBedrock).toHaveBeenCalledTimes(1);

    const callArgs = bedrockClient.callBedrock.mock.calls[0][0];
    expect(callArgs.systemPrompt).toBe(SYSTEM_PROMPT);
    expect(callArgs.userMessage).toContain('Patient vitals triggered a NEWS2 score of 6 (P0 Critical).');
    expect(callArgs.userMessage).toContain('- SpO2: 88% (score 3) — normal is ≥96%');
    expect(callArgs.userMessage).toContain('- Heart rate: 118 bpm (score 2) — normal is 51–90');
    expect(callArgs.userMessage).toContain('- Systolic BP: 105 mmHg (score 1) — normal is 111–219');
    expect(callArgs.userMessage).toContain('Write a brief clinical reasoning for this alert.');
  });

  test('should return null (graceful degradation) if Bedrock API fails', async () => {
    const mockScoreResult = {
      total: 3,
      severity: 'P1',
      breakdown: {
        pulse: { value: 115, score: 2 },
      },
    };

    bedrockClient.callBedrock.mockRejectedValue(new Error('Bedrock timeout'));

    const result = await generateAlertReasoning(mockScoreResult);

    expect(result).toBeNull();
    expect(bedrockClient.callBedrock).toHaveBeenCalledTimes(1);
  });

  test('should return null if scoreResult is invalid or has no severity', async () => {
    expect(await generateAlertReasoning(null)).toBeNull();
    expect(await generateAlertReasoning({ total: 0, severity: null })).toBeNull();
    expect(bedrockClient.callBedrock).not.toHaveBeenCalled();
  });
});
