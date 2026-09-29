import crypto from "crypto";
import { openai } from "@/lib/utils/openAIClient";
import { z } from "zod";

export interface DeliverableSubmission {
  jobId: string;
  criteria: string;
  deliverableType: "text" | "code" | "image" | "pdf" | "other";
  deliverableContent: string;
  deliverableURI?: string;
  notes?: string;
}

export interface VerifierOutput {
  jobId: string;
  pass: boolean;
  confidence: number; // 0.0 to 1.0
  reasoning: string;
  evidenceHash: string; // sha256(criteria + ":::" + deliverableContent)
  model: string;
  timestamp: number;
  criteriaBreakdown?: Array<{
    criterion: string;
    status: "MET" | "NOT_MET" | "PARTIAL";
    evidence: string;
  }>;
}

export const VerifierOutputSchema = z.object({
  jobId: z.string(),
  pass: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(10),
  evidenceHash: z.string().min(16),
  model: z.string(),
  timestamp: z.number(),
  criteriaBreakdown: z
    .array(
      z.object({
        criterion: z.string(),
        status: z.enum(["MET", "NOT_MET", "PARTIAL"]),
        evidence: z.string(),
      })
    )
    .optional(),
});

export interface DeterministicValidationResult {
  accepted: boolean;
  decision: "APPROVED" | "REJECTED" | "ESCALATED";
  reason: string;
  validatedAt: number;
}

/**
 * Calculates deterministic sha256 evidence hash for job criteria and deliverable
 */
export function calculateEvidenceHash(criteria: string, deliverableContent: string): string {
  return crypto
    .createHash("sha256")
    .update(`${criteria.trim()}:::${deliverableContent.trim()}`)
    .digest("hex");
}

/**
 * LLM Verifier Agent: Evaluates deliverable against criteria under ambiguity
 */
export async function evaluateDeliverable(
  submission: DeliverableSubmission,
  model = "gpt-4o"
): Promise<VerifierOutput> {
  const evidenceHash = calculateEvidenceHash(
    submission.criteria,
    submission.deliverableContent
  );

  const systemPrompt = `You are Veris Verifier Agent, an impartial evaluator for milestone-based deliverable escrow.
Your responsibility: evaluate whether the submitted deliverable strictly satisfies the acceptance criteria agreed upon between client and contractor.

You must output a single valid JSON object adhering strictly to this schema:
{
  "pass": boolean,
  "confidence": number between 0.00 and 1.00,
  "reasoning": "Clear, objective explanation of whether the requirements were met or failed",
  "criteriaBreakdown": [
    {
      "criterion": "Requirement description",
      "status": "MET" | "NOT_MET" | "PARTIAL",
      "evidence": "Brief excerpt or explanation"
    }
  ]
}

Evaluation guidelines:
- PASS requires that all critical and mandatory criteria are fulfilled with acceptable quality.
- If major deliverables or mandatory technical constraints are missing, invalid, or broken, pass must be FALSE.
- Confidence must reflect clarity of evidence:
  - 0.85 - 1.00: Clear-cut case, unambiguous evidence of fulfillment or non-fulfillment.
  - 0.65 - 0.84: Subtle borderline nuances or minor ambiguities.
  - < 0.65: Severe ambiguity, missing context, or impossible to verify conclusively.
Do not output markdown code blocks or surrounding text. Output only raw JSON.`;

  const userPrompt = `JOB ID: ${submission.jobId}
DELIVERABLE TYPE: ${submission.deliverableType}
EVIDENCE HASH: ${evidenceHash}

--- ACCEPTANCE CRITERIA ---
${submission.criteria}

--- SUBMITTED DELIVERABLE ---
${submission.deliverableContent}

${submission.notes ? `--- CONTRACTOR NOTES ---\n${submission.notes}` : ""}`;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Verifier agent returned empty response");
  }

  const parsed = JSON.parse(content);

  const output: VerifierOutput = {
    jobId: submission.jobId,
    pass: Boolean(parsed.pass),
    confidence: Number(parsed.confidence) || 0,
    reasoning: String(parsed.reasoning || ""),
    evidenceHash,
    model: response.model || model,
    timestamp: Date.now(),
    criteriaBreakdown: parsed.criteriaBreakdown,
  };

  // Validate output shape
  VerifierOutputSchema.parse(output);

  return output;
}

/**
 * Deterministic Validation Layer (Code owns authority):
 * Enforces schema integrity, evidence hash verification, and confidence threshold.
 * No funds or reputation can be triggered without this check returning accepted = true.
 */
export function validateVerifierDecision(
  output: VerifierOutput,
  expectedEvidenceHash: string,
  minConfidenceThreshold = 0.75
): DeterministicValidationResult {
  const now = Date.now();

  // 1. Evidence hash integrity
  if (output.evidenceHash !== expectedEvidenceHash) {
    return {
      accepted: false,
      decision: "ESCALATED",
      reason: `Evidence hash mismatch: expected ${expectedEvidenceHash}, got ${output.evidenceHash}`,
      validatedAt: now,
    };
  }

  // 2. Schema check
  const schemaValidation = VerifierOutputSchema.safeParse(output);
  if (!schemaValidation.success) {
    return {
      accepted: false,
      decision: "ESCALATED",
      reason: `Malformed verifier schema: ${schemaValidation.error.message}`,
      validatedAt: now,
    };
  }

  // 3. Confidence threshold rule
  if (output.confidence < minConfidenceThreshold) {
    return {
      accepted: false,
      decision: "ESCALATED",
      reason: `Confidence score (${output.confidence}) below required threshold (${minConfidenceThreshold}) - held for human / second-tier arbitration`,
      validatedAt: now,
    };
  }

  // 4. Deterministic decision
  if (output.pass) {
    return {
      accepted: true,
      decision: "APPROVED",
      reason: `Deliverable passed verification with confidence ${output.confidence}`,
      validatedAt: now,
    };
  } else {
    return {
      accepted: true,
      decision: "REJECTED",
      reason: `Deliverable failed verification with confidence ${output.confidence}: ${output.reasoning}`,
      validatedAt: now,
    };
  }
}
