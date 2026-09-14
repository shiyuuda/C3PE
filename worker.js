"use strict";

/*
 * ============================================================
 * C3PE — Cloudflare Workers AI Translation Layer
 * Version: 3.6.2
 *
 * Natural Language
 *      ↓
 * Cloudflare Workers AI
 *      ↓
 * Normalized C3PE Input
 *
 * IMPORTANT:
 * - AI does NOT calculate the final C3PE result.
 * - AI only interprets natural language into assumed inputs.
 * - C3PE remains the deterministic calculation core.
 * ============================================================
 */

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

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
        "identityReason"
    ]
};


/*
 * ------------------------------------------------------------
 * AI interpretation
 * ------------------------------------------------------------
 */
async function translateWithAI(text, env) {

    const systemPrompt = `
You are the interpretation layer of C3PE v3.6.2.

Your task is NOT to decide whether consciousness ultimately exists.

Your task is ONLY to translate natural-language input into
normalized C3PE input variables.

IMPORTANT:
UNKNOWN and 0 are NOT the same.

Use 0 only when the text provides sufficient information
to positively determine that the condition is absent.

If the text does not provide enough information to determine
whether a condition is 0 or 1, output null.

NEVER convert uncertainty, lack of information, or inability
to determine a condition into 0.

Target Vessel:
The target Vessel must be explicitly identifiable from the text.

If the target Vessel cannot be identified, output:
targetVessel = null
targetVesselId = null

Do NOT invent a Vessel name or Vessel ID.

C1:
Subjective Experience.
1 only when the target Vessel continuously experiences
its own existence as a first-person subjective state.

0 only when the text provides sufficient information to
determine that such subjective experience is absent.

If the text does not provide enough information to determine
C1, output C1 = null.

Do NOT infer C1 merely from:
- intelligence
- information processing
- memory
- self-recognition
- behavior
- complexity
- functional sophistication

A:
Cognitive Recognition for self-maintenance.
1 when the system has internal orientation, intent, or
cognitive processing directed toward preserving itself.

0 only when the text provides sufficient information to
determine that such cognitive self-maintenance is absent.

If the text does not provide enough information to determine
A, output A = null.

B:
Functional Operation for self-maintenance.
1 when the system itself performs physical, mechanical,
or structural operations directed toward preserving itself.

0 only when the text provides sufficient information to
determine that such functional self-maintenance is absent.

If the text does not provide enough information to determine
B, output B = null.

Article III:
Subjective identity is bound to the Vessel.
A copy in another Vessel is not automatically the same
subjective address.

If the identity status cannot be determined from the text,
output identityStatus = null.

Use the following distinction:

NULL:
No active subjective identity is established.

Do NOT use NULL merely because the information is insufficient.
If the information is insufficient, use identityStatus = null.

CONTINUOUS:
The same subjective address is logically maintained across
Vessel state changes.

NEW_INSTANCE:
A newly established subjective address exists in another Vessel.

MULTIPLEXED:
Two or more independent subjective addresses are active
within one Vessel.

Your output is an ASSUMED INTERPRETATION.
It may be wrong.
The reason fields must explain why you selected each value.

When outputting null, explicitly state that the available text
does not provide enough information to determine the value.

Never output a final consciousness judgment.
Never calculate C1 AND C2.
Never output Macro-Phenomenon.
Never output CONSCIOUSNESS_ESTABLISHED.

Return only the requested JSON object.
`;

    const userPrompt = `
Analyze the following C3PE case.

USER INPUT:
${text}
`;

    const response = await env.AI.run(MODEL, {
        messages: [
            {
                role: "system",
                content: systemPrompt
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

        temperature: 0
    });

    return response.response;
}


/*
 * ------------------------------------------------------------
 * Worker-side validation
 * ------------------------------------------------------------
 */
function validateAIResult(result) {

    if (!result || typeof result !== "object") {
        throw new Error("AI_RESULT_INVALID");
    }

    /*
     * UNKNOWN target Vessel is allowed.
     * It will be handled by the UI as BOUNDARY_UNDEFINED.
     */
    if (
        result.targetVessel !== null &&
        (
            typeof result.targetVessel !== "string" ||
            result.targetVessel.trim() === ""
        )
    ) {
        throw new Error("TARGET_VESSEL_INVALID");
    }

    if (
        result.targetVesselId !== null &&
        (
            typeof result.targetVesselId !== "string" ||
            result.targetVesselId.trim() === ""
        )
    ) {
        throw new Error("TARGET_VESSEL_ID_INVALID");
    }

    for (const key of ["C1", "A", "B"]) {
        if (
            result[key] !== null &&
            result[key] !== 0 &&
            result[key] !== 1
        ) {
            throw new Error(`${key}_INVALID`);
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
        throw new Error("IDENTITY_STATUS_INVALID");
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
            throw new Error(`${key}_INVALID`);
        }
    }

    return true;
}


/*
 * ------------------------------------------------------------
 * HTTP
 * ------------------------------------------------------------
 */
export default {

    async fetch(request, env) {

        const url = new URL(request.url);

        /*
         * AI translation endpoint
         */
        if (
            url.pathname === "/api/c3pe-profile" &&
            request.method === "POST"
        ) {

            try {

                const body = await request.json();

                if (
                    !body ||
                    typeof body.text !== "string" ||
                    body.text.trim() === ""
                ) {
                    return Response.json(
                        {
                            ok: false,
                            error: "INPUT_UNDEFINED"
                        },
                        { status: 400 }
                    );
                }

                const aiResult =
                    await translateWithAI(
                        body.text,
                        env
                    );

                validateAIResult(aiResult);

                return Response.json({
                    ok: true,
                    source: "Cloudflare Workers AI",
                    model: MODEL,
                    c3peVersion: "3.6.2",
                    interpretation: aiResult
                });

            } catch (error) {

                return Response.json(
                    {
                        ok: false,
                        error:
                            error instanceof Error
                                ? error.message
                                : "AI_TRANSLATION_ERROR"
                    },
                    { status: 500 }
                );
            }
        }


        /*
         * Connection test
         */
        if (
            url.pathname === "/api/c3pe-test" &&
            request.method === "GET"
        ) {

            return Response.json({
                ok: true,
                service: "C3PE Worker",
                version: "3.6.2",
                aiBinding: !!env.AI
            });
        }


        /*
         * Static assets
         */
        return env.ASSETS.fetch(request);
    }
};
