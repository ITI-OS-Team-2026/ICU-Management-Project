const { callBedrock } = require('../../utils/bedrockClient');
const logger = require('../../utils/logger');

const PARAMETER_META = {
  spo2: {
    name: 'SpO2',
    formatVal: (v) => `${v}%`,
    normal: '≥96%',
  },
  pulse: {
    name: 'Heart rate',
    formatVal: (v) => `${v} bpm`,
    normal: '51–90',
  },
  systolicBp: {
    name: 'Systolic BP',
    formatVal: (v) => `${v} mmHg`,
    normal: '111–219',
  },
  respiratoryRate: {
    name: 'Respiratory rate',
    formatVal: (v) => `${v} /min`,
    normal: '12–20',
  },
  temperature: {
    name: 'Temperature',
    formatVal: (v) => `${v} °C`,
    normal: '36.1–38.0',
  },
};

const SYSTEM_PROMPT = `You are a clinical reasoning engine in an Intensive Care Unit (ICU).
Your sole task is to provide objective, evidence-based clinical reasoning explaining abnormal patient vital signs and why they drive an elevated NEWS2 score.

Follow these rules strictly:
1. Write 2–4 concise sentences (1–2 short paragraphs) explaining the physiological significance of the findings.
2. CITE ALL specific measured vital sign values (e.g., SpO2, Respiratory Rate, Heart Rate, Systolic BP, Temperature) provided in the prompt.
3. Use precise medical terminology for physiological abnormalities (e.g., hypoxaemia, tachypnoea, tachycardia, hypotension, pyrexia, hypothermia).
4. Explain how these combined physiological abnormalities contribute to the NEWS2 score and indicate acute physiological instability.
5. DO NOT provide operational recommendations or workflow call-to-action phrases (e.g., AVOID "immediate physician review", "urgent assessment", "prompt clinical evaluation", "immediate intervention", or "requires further investigation"). The alert framework already handles urgency and review workflows.
6. DO NOT provide a specific medical diagnosis or disease name.
7. DO NOT recommend specific medications, procedures, dosages, or treatment instructions.
8. DO NOT speculate beyond the provided clinical data or use vague filler phrases like "another underlying condition" or "may indicate various causes".
9. Maintain a purely objective, evidence-based physiological focus.`;

/**
 * Formats abnormal vitals and NEWS2 score into a structured prompt,
 * calls AWS Bedrock via callBedrock(), and returns clinical reasoning text.
 * Implements graceful degradation: returns null on failure or timeout.
 *
 * @param {Object} scoreResult - Result from calculateScore(vitals)
 * @param {number} scoreResult.total - Total NEWS2 score
 * @param {string} scoreResult.severity - 'P0' or 'P1'
 * @param {Object} scoreResult.breakdown - Breakdown of abnormal vital parameters
 * @returns {Promise<string|null>} Generated clinical reasoning or null on error
 */
const generateAlertReasoning = async (scoreResult) => {
  try {
    if (!scoreResult || !scoreResult.severity || scoreResult.total === 0) {
      return null;
    }

    const { total, severity, breakdown } = scoreResult;
    const severityLabel = severity === 'P0' ? 'P0 Critical' : 'P1 Warning';

    const abnormalLines = [];
    if (breakdown) {
      for (const [key, data] of Object.entries(breakdown)) {
        if (data && data.score > 0) {
          const meta = PARAMETER_META[key] || {
            name: key,
            formatVal: (v) => `${v}`,
            normal: 'normal',
          };
          abnormalLines.push(
            `- ${meta.name}: ${meta.formatVal(data.value)} (score ${data.score}) — normal is ${meta.normal}`
          );
        }
      }
    }

    if (abnormalLines.length === 0) {
      return null;
    }

    const userMessage = [
      `Patient vitals triggered a NEWS2 score of ${total} (${severityLabel}).`,
      `Abnormal parameters:`,
      ...abnormalLines,
      `Write a brief clinical reasoning for this alert. Explain the physiological significance of these measured vitals, why they drive the elevated NEWS2 score, and the acute physiological risk while citing all measured values. Do not include operational recommendations or call-to-action phrases.`,
    ].join('\n');

    logger.info(`Calling Bedrock for alert clinical reasoning (Severity: ${severityLabel}, Score: ${total})...`);

    const responseText = await callBedrock({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      maxTokens: 300,
      temperature: 0.2,
    });

    if (!responseText || typeof responseText !== 'string') {
      logger.warn('Bedrock returned empty or non-string response for clinical reasoning.');
      return null;
    }

    return responseText.trim();
  } catch (error) {
    logger.error(`Graceful degradation triggered: Bedrock AI reasoning failed for alert (${error.message}). Proceeding with null reasoning.`);
    return null;
  }
};

module.exports = {
  generateAlertReasoning,
  SYSTEM_PROMPT,
  PARAMETER_META,
};
