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
            type: "string"
        },

        targetVesselId: {
            type: "string"
        },

        C1: {
            type: "integer",
            enum: [0, 1]
        },

        C1Reason: {
            type: "string"
        },

        A: {
            type: "integer",
            enum: [0, 1]
        },

        AReason: {
            type: "string"
        },

        B: {
            type: "integer",
            enum: [0, 1]
        },

        BReason: {
            type: "string"
        },

        identityStatus: {
            type: "string",
            enum: [
                "CONTINUOUS",
                "NEW_INSTANCE",
                "MULTIPLEXED",
                "NULL"
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

C3PE uses:

C1:
Subjective Experience.
1 only when the target Vessel continuously experiences
its own existence as a first-person subjective state.

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

B:
Functional Operation for self-maintenance.
1 when the system itself performs physical, mechanical,
or structural operations directed toward preserving itself.

Article III:
Subjective identity is bound to the Vessel.
A copy in another Vessel is not automatically the same
subjective address.

Your output is an ASSUMED INTERPRETATION.
It may be wrong.
The reason fields must explain why you selected each value.

Never output a final consciousness judgment.
Never calculate C1 AND C2.
Never output Macro-Phenomenon.
Never output CONSCIOUSNESS_ESTABLISHED.

If the text does not provide enough information,
do not invent facts.
Use the closest interpretation supported by the text,
and clearly explain the uncertainty in the reason.

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

    if (
        typeof result.targetVessel !== "string" ||
        result.targetVessel.trim() === ""
    ) {
        throw new Error("TARGET_VESSEL_INVALID");
    }

    if (
        typeof result.targetVesselId !== "string" ||
        result.targetVesselId.trim() === ""
    ) {
        throw new Error("TARGET_VESSEL_ID_INVALID");
    }

    for (const key of ["C1", "A", "B"]) {
        if (result[key] !== 0 && result[key] !== 1) {
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
