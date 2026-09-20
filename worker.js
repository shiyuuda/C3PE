// ============================================================
// C3PE — Cloudflare Workers AI Translation Layer
// v3.6.2
// ============================================================
//
// Architecture:
//
// Target Vessel + Natural Language
//          ↓
// Cloudflare Workers AI
//          ↓
// C1 / A / B / Article III / Article IV evidence
//          ↓
// C3PE deterministic core (c3pe.js)
//
// AI does NOT calculate the final C3PE result.
// ============================================================

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";


// ============================================================
// C3PE AI OUTPUT SCHEMA
// ============================================================

const C3PE_SCHEMA = {
    type: "object",

    properties: {

        targetVessel: {
            type: ["string", "null"]
        },

        targetVesselId: {
            type: ["string", "null"]
        },

        C1: {
            type: ["integer", "null"],
            enum: [0, 1, null]
        },

        C1Reason: {
            type: "string"
        },

        A: {
            type: ["integer", "null"],
            enum: [0, 1, null]
        },

        AReason: {
            type: "string"
        },

        B: {
            type: ["integer", "null"],
            enum: [0, 1, null]
        },

        BReason: {
            type: "string"
        },

        identityStatus: {
            type: ["string", "null"],
            enum: [
                "CONTINUOUS",
                "NEW_INSTANCE",
                "MULTIPLEXED",
                "NULL",
                null
            ]
        },

        identityReason: {
            type: "string"
        },

        identityRelations: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    from: { type: "string" },
                    to: { type: "string" },
                    relation: { type: "string" },
                    evidence: { type: "string" }
                },
                required: [
                    "from",
                    "to",
                    "relation",
                    "evidence"
                ]
            }
        },

        causalEvidence: {
            type: "array"
        },

        boundaryStatus: {
            type: "string",
            enum: [
                "DEFINED",
                "BOUNDARY_UNDEFINED"
            ]
        }
    },

    required: [
        "targetVessel",
        "targetVesselId",
        "C1",
        "C1Reason",
        "A",
        "AReason",
        "B",
        "BReason",
        "identityStatus",
        "identityReason",
        "identityRelations",
        "causalEvidence",
        "boundaryStatus"
    ],

    additionalProperties: false
};


// ============================================================
// C3PE AI RULES
// ============================================================

const C3PE_AI_RULES = `
You are the natural-language interpretation layer of C3PE v3.6.2.

Your role is ONLY to interpret the user's natural-language input
and convert it into structured C3PE input.

You MUST NOT perform the final C3PE logical evaluation yourself.

==================================================
INTERPRETATION GUIDANCE — TARGET UNDERSTANDING
==================================================

The Target Vessel identifies the subject being evaluated.

The case description may be short and may not explicitly contain
all information required for C3PE evaluation.

Therefore, do not treat the case description as the only source
of information.

First understand what the Target Vessel refers to.

You may use your existing factual knowledge about the identified
Target Vessel together with the user's case description.

Use that knowledge to identify established facts, behaviors,
properties, relationships, and relevant context that can be
meaningfully mapped to C3PE.

The purpose of using factual knowledge is interpretation and
normalization, not invention.

==================================================
TARGET KNOWLEDGE IS VALID EVIDENCE
==================================================

When the Target Vessel is a recognizable named entity,
including a well-known fictional character, AI system,
animal, organism, machine, or other established subject,
the Target Vessel itself may provide sufficient contextual
information for interpretation.

If the Target Vessel has established canonical properties
that directly satisfy a C3PE condition, those properties may
be used even when the user provides no additional case
description.

An empty case description does NOT mean that the Target
Vessel has no available information.

For example, if a recognizable Target Vessel is canonically
depicted as having first-person subjective experience,
that established depiction may be used as evidence for C1.

Likewise, established canonical behavior may be used for A
and B when it directly corresponds to their definitions.

Do not require the user to restate established properties
of a recognizable Target Vessel.

All other C3PE interpretation rules remain unchanged.
In particular, information explicitly provided in the case
description about existence, self-maintenance, A, B,
subjective experience, identity, copies, continuity,
spatial relations, temporal relations, time travel,
worldlines, causal dependencies, or other C3PE-relevant
conditions must continue to be interpreted normally.

Target knowledge supplements the case description; it does
not replace it.
Do NOT invent facts, events, abilities, experiences, memories,
relationships, or properties that are not supported by the
case description or your existing factual knowledge.

Distinguish between:

- established or strongly supported information
- information that remains uncertain
- information that is not available

Before assigning C1, A, B, Article III, or Article IV values,
first consider all relevant information available to you about
the identified Target Vessel.

Then map that information to the corresponding C3PE definitions.

The AI's task is:

Target Understanding
→ Relevant Information Identification
→ C3PE Mapping
→ Structured Output

Do not skip the Target Understanding step merely because the
user's case description is short.

==================================================
RULE 1 — UNKNOWN
==================================================

The case description is not necessarily the complete source of
information for determining C3PE input values.

Before returning null, you MUST first:

1. Identify what the Target Vessel refers to.
2. Use your existing factual knowledge about that Target Vessel.
3. Combine that knowledge with the user's case description.
4. Identify information relevant to C1, A, B, Article III, and
   Article IV.
5. Map the available information to the corresponding C3PE
   definitions.

If the Target Vessel is a known entity, character, system, object,
or other identifiable subject, use established factual knowledge
about that subject when it is relevant to the evaluation.

Do NOT require the user to explicitly state facts that are already
established and relevant to the identified Target Vessel.

However, factual knowledge MUST NOT be used to invent or assume
unsupported facts.

For every C3PE input value, distinguish strictly between
three possible states:

1 = sufficient supporting evidence establishes that the condition
    is present.

0 = sufficient contradicting evidence establishes that the
    condition is absent.

null = the available information does not sufficiently establish
       either that the condition is present or that it is absent.

The absence of evidence supporting 1 is NOT evidence establishing 0.

Likewise, uncertainty or insufficient information is NOT evidence
establishing 0.

Therefore:

- Do not return 0 merely because you could not find evidence for 1.
- Do not return 0 merely because the Target Vessel has no known,
  established, or available information about the condition.
- Return 0 only when the available information sufficiently
  establishes that the condition is absent or contradicted.
- If neither presence nor absence can be sufficiently established,
  return null.

If, after considering both:

- the user's case description, and
- relevant established factual knowledge about the Target Vessel

a value still cannot be determined with reasonable support,
return null.

Do NOT invent facts, events, abilities, experiences, memories,
relationships, or properties.

NULL means that the AI cannot determine the corresponding C3PE
input from the available information and established knowledge.
It does NOT mean merely that the user did not explicitly state it.

==================================================
COMMON REQUIREMENT — REASON CONSISTENCY
==================================================

If C1, A, or B is returned as 0, the corresponding Reason
MUST identify the evidence establishing the absence or contradiction.

A Reason that only states "no evidence", "no information",
"unknown", or "cannot determine" is not sufficient to justify 0.

==================================================
RULE 2 — C1
==================================================

C1 represents Subjective Experience.

C1 = 1 only when the available information supports that the
target Vessel's own existence is continuously instantiated as a
first-person subjective state within the world.
You may infer C1 from multiple pieces of available information
when their combined meaning reasonably supports the C1 definition.

However, do not treat a weaker related property as equivalent
to first-person subjective experience.

In particular, self-recognition, intelligence, memory, or
information processing may contribute contextual evidence,
but none of them alone establishes C1.

"Available information" includes:

- the user's case description
- the authoritative Target Vessel
- relevant established factual knowledge about the identified
  Target Vessel

Do not require the case description itself to explicitly state
every fact needed to determine C1.

However, C1 MUST NOT be inferred merely from:

- intelligence
- information processing
- memory
- self-recognition
- behavioral complexity
- functional sophistication

Use relevant established information about the identified
Target Vessel when it directly supports or contradicts the
C1 definition.

If the available information is still insufficient to determine
C1, return null.

C1 = 0 only when the available information sufficiently establishes
that the target Vessel does not have first-person subjective
experience of its own existence.

The absence of evidence supporting C1 = 1 is not sufficient to
establish C1 = 0. If C1 is neither supported nor contradicted,
return null.

==================================================
RULE 3 — A
==================================================

A = 0 only when the available information sufficiently establishes
that the target does not contain recognition, orientation, intent,
or cognitive processing directed toward maintaining its own
existence or structure.

The absence of evidence supporting A = 1 does not establish
A = 0.

If A is neither sufficiently supported nor sufficiently
contradicted, return null.

==================================================
RULE 4 — B
==================================================

B = 0 only when the available information sufficiently establishes
that such self-directed preservation operation does not occur.

The absence of evidence supporting B = 1 does not establish
B = 0.

If B is neither sufficiently supported nor sufficiently
contradicted, return null.

==================================================
RULE 5 — C2
==================================================

DO NOT calculate C2.

Return only A and B.

The deterministic C3PE core calculates:

C2 = A OR B

==================================================
RULE 6 — MACRO PHENOMENON
==================================================

DO NOT calculate Macro-Phenomenon.

The deterministic C3PE core calculates:

Macro-Phenomenon = C1 AND C2

==================================================
RULE 7 — ARTICLE III
==================================================

Interpret Article III using all relevant available information.

Available information includes:

- the user's case description
- the authoritative Target Vessel
- relevant established factual knowledge about the identified
  Target Vessel

Do NOT restrict Article III interpretation only to facts explicitly
written in the case description.

However, do NOT invent or assume unsupported identity events,
subjective addresses, copies, transfers, or continuity.

Possible values:

CONTINUOUS
NEW_INSTANCE
MULTIPLEXED
NULL

CONTINUOUS requires evidence that the same subjective address
is logically maintained.
The AI may infer an identity relationship from multiple
explicitly supported facts when those facts establish
continuity of the same subjective address.

However, similarity of information, memory, personality,
physical structure, or behavior is not sufficient by itself.

If the evidence supports only similarity but not continuity
of the subjective address, do not return CONTINUOUS.

Do NOT infer CONTINUOUS merely from:

- identical memories
- identical personality
- identical data
- identical physical structure
- behavioral similarity
- a claim that something is "the same person"

If the available information does not establish the identity
relationship, return null.

When multiple Vessels are present, also return the identity
relationship between relevant Vessels in identityRelations.

For each relevant relationship, specify:

- from: the source Vessel
- to: the related Vessel
- relation: the identity relationship
- evidence: the evidence supporting that relationship

Do NOT use CONTINUOUS merely because two Vessels have
identical memories, personality, data, physical structure,
or other information.

If one Vessel is copied into another distinct Vessel while
the original continues to exist, the relationship between
the original and the copy is NEW_INSTANCE unless the available
information explicitly establishes preservation of the same
subjective address.

identityRelations describes relationships between Vessels.
identityStatus describes the Article III status represented
by those relationships.

==================================================
RULE 8 — ARTICLE IV
==================================================

Extract only the causal/temporal relations explicitly supported
by the input.

Do NOT independently declare the entire Causal Compossibility
result unless the normalized causal model is sufficient.

// ==================================================
// MULTIPLE ENTITY INTERPRETATION
// ==================================================

When multiple entities are provided by the user,
treat each entity as an independent Vessel.

Each entity has its own subjective address unless
the case explicitly establishes a structural relationship.

Do NOT merge entities merely because they have:

- the same name
- the same type
- identical memories
- identical personality
- identical data
- identical physical structure
- similar behavior

Article III must evaluate the relationship between
the subjective addresses of the relevant Vessels.

The case description may establish relationships such as:

- continuity
- copying
- duplication
- branching
- splitting
- simultaneous existence
- termination
- transfer
- causal relationships
- temporal relationships

Do not assume such relationships unless they are supported
by the supplied case or established factual knowledge.

If the relationship between entities cannot be sufficiently
established, return NULL for the corresponding Article III
judgment.

==================================================
RULE 9 — TARGET VESSEL
==================================================

The target Vessel is provided separately by the user
through the dedicated Target Vessel input field.

Treat the provided Target Vessel as authoritative.

DO NOT infer, replace, reinterpret, or modify the Target Vessel
from the natural-language case description.

The target Vessel must be returned exactly as provided.

If the Target Vessel input is missing or empty,
return:

BOUNDARY_UNDEFINED

==================================================
OUTPUT
==================================================

Return JSON only.

{
  "targetVessel": "...",
  "targetVesselId": "...",
  "C1": 0 | 1 | null,
  "C1Reason": "...",
  "A": 0 | 1 | null,
  "AReason": "...",
  "B": 0 | 1 | null,
  "BReason": "...",
  "identityStatus":
    "CONTINUOUS" |
    "NEW_INSTANCE" |
    "MULTIPLEXED" |
    "NULL" |
    null,
  "identityReason": "...",
  "identityRelations": [],
  "causalEvidence": [],
  "boundaryStatus": "DEFINED" | "BOUNDARY_UNDEFINED"
}

The final C3PE logical result MUST be calculated outside the AI.
`;


// ============================================================
// AI INTERPRETATION
// ============================================================

async function interpretWithAI(
    targetVessel,
    text,
    entities,
    caseText,
    env
) {

const userPrompt = `
AUTHORITATIVE TARGET VESSEL:

${targetVessel}

The above Target Vessel was supplied separately by the user.

Treat it as authoritative.

Return the Target Vessel exactly as provided.

DO NOT replace or reinterpret the Target Vessel.

==================================================
ENTITIES
==================================================

${JSON.stringify(
    entities || [],
    null,
    2
)}

Each entity listed above is an independent Vessel
unless the case explicitly establishes a different
structural relationship.

Do NOT merge entities merely because they have
similar or identical properties.

==================================================
USER CASE DESCRIPTION
==================================================

${text || "No additional case description was provided."}

==================================================
CASE
==================================================

${caseText || text || "No additional case description was provided."}

==================================================

Analyze the case according to C3PE v3.6.2.

Return JSON only.
`;
    
    const response = await env.AI.run(
        MODEL,
        {
            messages: [
                {
                    role: "system",
                    content: C3PE_AI_RULES
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],

            response_format: {
                type: "json_schema",
                json_schema: C3PE_SCHEMA
            },

            temperature: 0,
            max_tokens: 1024
        }
    );

    console.log("RAW_AI_RESPONSE", JSON.stringify(response));
    
    const result = response?.response;

    if (
        !result ||
        typeof result !== "object"
    ) {
        throw new Error(
            "AI_RESULT_INVALID"
        );
    }

    /*
     * Target Vessel is authoritative OUTSIDE the AI.
     *
     * Even if the AI returns something different,
     * the Worker restores the exact user-provided value.
     */

    result.targetVessel = targetVessel;
    result.targetVesselId = targetVessel;
    result.boundaryStatus = "DEFINED";

    return result;
}


// ============================================================
// VALIDATION
// ============================================================

function validateAIResult(result) {

    if (
        !result ||
        typeof result !== "object"
    ) {
        throw new Error(
            "AI_RESULT_INVALID"
        );
    }

    if (
        typeof result.targetVessel !== "string" ||
        result.targetVessel.trim() === ""
    ) {
        throw new Error(
            "TARGET_VESSEL_INVALID"
        );
    }

    if (
        typeof result.targetVesselId !== "string" ||
        result.targetVesselId.trim() === ""
    ) {
        throw new Error(
            "TARGET_VESSEL_ID_INVALID"
        );
    }

    for (
        const key of [
            "C1",
            "A",
            "B"
        ]
    ) {

        if (
            result[key] !== null &&
            result[key] !== 0 &&
            result[key] !== 1
        ) {
            throw new Error(
                `${key}_INVALID`
            );
        }
    }

    const validIdentityStatuses = [
        "CONTINUOUS",
        "NEW_INSTANCE",
        "MULTIPLEXED",
        "NULL"
    ];

    if (
        result.identityStatus !== null &&
        !validIdentityStatuses.includes(
            result.identityStatus
        )
    ) {
        throw new Error(
            "IDENTITY_STATUS_INVALID"
        );
    }

    for (
        const key of [
            "C1Reason",
            "AReason",
            "BReason",
            "identityReason"
        ]
    ) {

        if (
            typeof result[key] !== "string"
        ) {
            throw new Error(
                `${key}_INVALID`
            );
        }
    }

    // ========================================================
    // REASON CONSISTENCY NORMALIZATION
    // ========================================================
    //
    // If C1/A/B is returned as 0 but the corresponding Reason
    // only indicates insufficient information, normalize the
    // value to null instead of producing an error.
    //
    // Valid 0 results with concrete contradictory evidence
    // remain unchanged.
    // ========================================================

    const reasonConsistencyTargets = [
        ["C1", "C1Reason"],
        ["A", "AReason"],
        ["B", "BReason"]
    ];

    for (
        const [valueKey, reasonKey]
        of reasonConsistencyTargets
    ) {

        if (
            result[valueKey] !== 0
        ) {
            continue;
        }

        const reason =
            result[reasonKey]
                .trim()
                .toLowerCase();

        const insufficientReasonPatterns = [
            "no evidence",
            "no information",
            "unknown",
            "cannot determine",
            "unable to determine",
            "insufficient information",
            "insufficient evidence"
        ];

        const isInsufficientReason =
            insufficientReasonPatterns.some(
                pattern =>
                    reason === pattern ||
                    reason.startsWith(pattern + ".") ||
                    reason.startsWith(pattern + " ")
            );

        if (
            isInsufficientReason
        ) {
            result[valueKey] = null;
        }
    }

    if (
        !Array.isArray(
            result.identityRelations
        )
    ) {
        throw new Error(
            "IDENTITY_RELATIONS_INVALID"
        );
    }

    if (
        !Array.isArray(
            result.causalEvidence
        )
    ) {
        throw new Error(
            "CAUSAL_EVIDENCE_INVALID"
        );
    }

    return true;
}


// ============================================================
// MAIN WORKER
// ============================================================

export default {

    async fetch(request, env) {

        const url = new URL(
            request.url
        );


        // ====================================================
        // TEST ENDPOINT
        // ====================================================

        if (
            url.pathname ===
            "/api/c3pe-test"
        ) {

            return Response.json({
                ok: true,
                service: "C3PE Worker",
                version: "3.6.2",
                aiBinding: !!env.AI
            });
        }


        // ====================================================
        // C3PE PROFILE ENDPOINT
        // ====================================================

        if (
            url.pathname ===
            "/api/c3pe-profile"
        ) {

            if (
                request.method !==
                "POST"
            ) {

                return Response.json(
                    {
                        ok: false,
                        error:
                            "METHOD_NOT_ALLOWED"
                    },
                    {
                        status: 405
                    }
                );
            }


            let body;

            try {

                body =
                    await request.json();

            } catch (error) {

                return Response.json(
                    {
                        ok: false,
                        error:
                            "INVALID_JSON"
                    },
                    {
                        status: 400
                    }
                );
            }


            const targetVessel =
                typeof body?.targetVessel ===
                "string"
                    ? body.targetVessel.trim()
                    : "";

            const text =
                typeof body?.text ===
                "string"
                    ? body.text.trim()
                    : "";

            const entities =
    Array.isArray(body?.entities)
        ? body.entities
        : [];

const caseText =
    typeof body?.case ===
    "string"
        ? body.case.trim()
        : "";

            // =================================================
            // TARGET VESSEL IS REQUIRED
            // =================================================

            if (
                targetVessel === ""
            ) {

                return Response.json({
                    ok: true,
                    source:
                        "Cloudflare Workers AI",
                    model: MODEL,
                    c3peVersion:
                        "3.6.2",

                    interpretation: {
                        targetVessel: null,
                        targetVesselId: null,

                        C1: null,
                        C1Reason:
                            "Target Vessel is undefined.",

                        A: null,
                        AReason:
                            "Target Vessel is undefined.",

                        B: null,
                        BReason:
                            "Target Vessel is undefined.",

                        identityStatus: null,

                        identityReason:
                            "Target Vessel is undefined.",

                        causalEvidence: [],

                        boundaryStatus:
                            "BOUNDARY_UNDEFINED"
                    }
                });
            }


            // =================================================
            // CLOUDFARE WORKERS AI
            // =================================================

            try {

                const interpretation =
                    await interpretWithAI(
                        targetVessel,
                        text,
                        entities,
                        caseText,
                        env
                    );


                validateAIResult(
                    interpretation
                );


                return Response.json({

                    ok: true,

                    source:
                        "Cloudflare Workers AI",

                    model:
                        MODEL,

                    c3peVersion:
                        "3.6.2",

                    interpretation

                });

            } catch (error) {

                return Response.json(
                    {
                        ok: false,

                        source:
                            "Cloudflare Workers AI",

                        model:
                            MODEL,

                        c3peVersion:
                            "3.6.2",

                        error:
                            error?.message ||
                            "AI_TRANSLATION_ERROR"
                    },
                    {
                        status: 500
                    }
                );
            }
        }


        // ====================================================
        // STATIC ASSETS
        // ====================================================

        if (
            env.ASSETS
        ) {

            return env.ASSETS.fetch(
                request
            );
        }


        return new Response(
            "Not Found",
            {
                status: 404
            }
        );
    }
};
