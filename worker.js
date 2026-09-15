"use strict";

/*
 * ============================================================
 * C3PE — Cloudflare Workers AI Translation Layer
 * Version: 3.6.2
 *
 * Natural Language
 *      ↓
 * Target / Knowledge Retrieval
 *      ↓
 * Cloudflare Workers AI
 *      ↓
 * Normalized C3PE Input
 *
 * IMPORTANT:
 * - AI does NOT calculate the final C3PE result.
 * - AI only interprets information into assumed inputs.
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
 * TARGET EXTRACTION
 * ------------------------------------------------------------
 */

const TARGET_SCHEMA = {
    type: "object",

    properties: {
        targetVessel: {
            type: ["string", "null"]
        },

        targetVesselId: {
            type: ["string", "null"]
        },

        knowledgeQuery: {
            type: ["string", "null"]
        }
    },

    required: [
        "targetVessel",
        "targetVesselId",
        "knowledgeQuery"
    ]
};


async function extractTarget(text, env) {

    const systemPrompt = `
You are the target extraction layer of C3PE v3.6.2.

Your task is ONLY to identify the entity, object, character,
system, or other bounded referent that the user is asking
about.

Do NOT evaluate consciousness.

Do NOT determine C1, C2, A, B, or identity.

The target does not need to be a human, AI, robot, animal,
or any predefined category.

Use the linguistic context of the user's input.

Examples:

"ドラえもんには意識がある？"
Target Vessel = ドラえもん

"ある人物は睡眠前後で同じ意識なのか？"
Target Vessel = ある人物

"このコピーは元の人物と同じ意識か？"
Target Vessel = このコピー

If the target cannot be sufficiently identified:
targetVessel = null
targetVesselId = null
knowledgeQuery = null

When a target is clearly identified but has no separate ID,
use the target expression itself as targetVesselId.

knowledgeQuery:
Create a concise public-information search query for the
identified target.

Prefer the target's canonical name itself as the first
and most important search term.

Do NOT make the query overly specific by assuming facts
about consciousness, self-awareness, or behavior.

Examples:

Target = ドラえもん
knowledgeQuery = ドラえもん

Target = 孫悟空
knowledgeQuery = 孫悟空

Target = NULL
knowledgeQuery = null

Do NOT invent facts.

Return only the requested JSON object.
`;

    const userPrompt = `
Identify the Target Vessel for the following C3PE case.

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
            json_schema: TARGET_SCHEMA
        },

        temperature: 0
    });

    return response.response;
}


/*
 * ------------------------------------------------------------
 * KNOWLEDGE RETRIEVAL
 *
 * First-stage implementation:
 * MediaWiki / Wikipedia public information.
 *
 * Retrieval strategy:
 * 1. Search the target itself.
 * 2. If that fails, search the generated query.
 * 3. Retrieve the lead extracts of the best matching pages.
 *
 * This layer supplies contextual information to the AI.
 * It does NOT calculate C3PE.
 * ------------------------------------------------------------
 */

async function searchWikipedia(searchTerm) {

    if (
        typeof searchTerm !== "string" ||
        searchTerm.trim() === ""
    ) {
        return [];
    }

    try {

        const searchUrl =
            "https://ja.wikipedia.org/w/api.php" +
            "?action=opensearch" +
            "&search=" +
            encodeURIComponent(searchTerm.trim()) +
            "&limit=5" +
            "&namespace=0" +
            "&format=json";

        const searchResponse =
            await fetch(
                searchUrl,
                {
                    headers: {
                        "User-Agent":
                            "C3PE/3.6.2"
                    }
                }
            );

        if (!searchResponse.ok) {
            return [];
        }

        const searchData =
            await searchResponse.json();

        if (
            !Array.isArray(searchData) ||
            !Array.isArray(searchData[1])
        ) {
            return [];
        }

        return searchData[1]
            .filter(
                title =>
                    typeof title === "string" &&
                    title.trim() !== ""
            )
            .slice(0, 5);

    } catch (error) {

        return [];

    }
}


async function retrieveWikipediaPages(titles) {

    if (
        !Array.isArray(titles) ||
        titles.length === 0
    ) {
        return "";
    }

    try {

        const uniqueTitles =
            [
                ...new Set(
                    titles
                        .filter(
                            title =>
                                typeof title === "string" &&
                                title.trim() !== ""
                        )
                        .map(
                            title =>
                                title.trim()
                        )
                )
            ]
            .slice(0, 5);

        if (uniqueTitles.length === 0) {
            return "";
        }

        const pageQuery =
            "https://ja.wikipedia.org/w/api.php" +
            "?action=query" +
            "&prop=extracts" +
            "&exintro=1" +
            "&explaintext=1" +
            "&redirects=1" +
            "&format=json" +
            "&titles=" +
            encodeURIComponent(
                uniqueTitles.join("|")
            );

        const pageResponse =
            await fetch(
                pageQuery,
                {
                    headers: {
                        "User-Agent":
                            "C3PE/3.6.2"
                    }
                }
            );

        if (!pageResponse.ok) {
            return "";
        }

        const pageData =
            await pageResponse.json();

        const pages =
            pageData?.query?.pages;

        if (
            !pages ||
            typeof pages !== "object"
        ) {
            return "";
        }

        const contexts = [];

        for (
            const page of Object.values(pages)
        ) {

            if (
                !page ||
                typeof page !== "object"
            ) {
                continue;
            }

            const title =
                typeof page.title === "string"
                    ? page.title
                    : "";

            const extract =
                typeof page.extract === "string"
                    ? page.extract.trim()
                    : "";

            if (!extract) {
                continue;
            }

            /*
             * Keep the retrieved context bounded.
             * The retrieval layer should provide useful
             * evidence, not overwhelm the interpretation
             * model with unrelated text.
             */

            const boundedExtract =
                extract.slice(0, 3500);

            contexts.push(
                `SOURCE: Wikipedia\n` +
                `TITLE: ${title}\n` +
                `CONTENT:\n${boundedExtract}`
            );
        }

        return contexts.join(
            "\n\n--------------------------------\n\n"
        );

    } catch (error) {

        return "";

    }
}


async function retrieveKnowledge(query, target) {

    if (
        typeof target !== "string" ||
        target.trim() === ""
    ) {
        return "";
    }

    try {

        /*
         * First priority:
         * Search the actual Target Vessel expression.
         *
         * This prevents an AI-generated, overly specific
         * query from accidentally missing the canonical page.
         */

        const targetTitles =
            await searchWikipedia(
                target
            );

        /*
         * Second priority:
         * If the direct target search produces nothing,
         * use the generated knowledge query as fallback.
         */

        let titles =
            targetTitles;

        if (
            titles.length === 0 &&
            typeof query === "string" &&
            query.trim() !== ""
        ) {

            titles =
                await searchWikipedia(
                    query
                );

        }

        if (titles.length === 0) {
            return "";
        }

        return await retrieveWikipediaPages(
            titles
        );

    } catch (error) {

        /*
         * Knowledge retrieval failure must NOT
         * become a C3PE result.
         */

        return "";

    }
}


/*
 * ------------------------------------------------------------
 * AI interpretation
 * ------------------------------------------------------------
 */

async function translateWithAI(
    text,
    env,
    knowledgeContext = "",
    extractedTarget = null
) {

    const systemPrompt = `
You are the interpretation layer of C3PE v3.6.2.

Your task is NOT to decide whether consciousness ultimately exists.

Your task is ONLY to translate natural-language input and
available contextual information into normalized C3PE input
variables.

IMPORTANT:
UNKNOWN and 0 are NOT the same.

Use 0 only when the available information provides sufficient
information to positively determine that the condition is absent.

If the available information does not provide enough
information to determine whether a condition is 0 or 1,
output null.

NEVER convert uncertainty or lack of information into 0.

The available contextual information may come from public
knowledge sources.

Public knowledge is contextual evidence only.
It is NOT itself a C3PE result.

Do NOT treat the existence of a character, human, AI, robot,
animal, fictional entity, or any category membership as proof
of consciousness.

Target Vessel:
Identify the entity, object, system, character, or other bounded
referent that the user is presenting as the subject of the
C3PE evaluation.

The Target Vessel does NOT need to have a proper name,
predefined category, or registered dictionary entry.

Use the linguistic context of the input.

If an extracted target is supplied by the previous processing
stage, use it unless the original input clearly establishes
that it is incorrect.

If the target cannot be sufficiently identified:
targetVessel = null
targetVesselId = null

When a Target Vessel is clearly identified but has no separate
explicit ID, use the extracted Target Vessel expression itself
as targetVesselId.

Do NOT invent numerical IDs or additional identifying
information.

C1:
Subjective Experience.

1 only when the available information supports that the target
Vessel experiences its own existence as a first-person
subjective state.

0 only when the available information supports that such
subjective experience is absent.

If there is insufficient information, output C1 = null.

Do NOT infer C1 merely from:
- intelligence
- information processing
- memory
- self-recognition
- behavior
- complexity
- functional sophistication
- being a fictional character
- being a human
- being an AI
- being a robot

A:
Cognitive Recognition for self-maintenance.

1 when the system has internal orientation, intent, or cognitive
processing directed toward preserving itself.

0 only when the available information supports that such
cognitive self-maintenance is absent.

If insufficient information exists, output A = null.

B:
Functional Operation for self-maintenance.

1 when the system itself performs physical, mechanical,
or structural operations directed toward preserving itself.

0 only when the available information supports that such
functional self-maintenance is absent.

If insufficient information exists, output B = null.

Article III:
Subjective identity is bound to the Vessel.

A copy in another Vessel is not automatically the same
subjective address.

If the identity status cannot be determined:
identityStatus = null

NULL:
No active subjective identity is established.

Do NOT use NULL merely because information is insufficient.

CONTINUOUS:
The same subjective address is logically maintained across
Vessel state changes.

NEW_INSTANCE:
A newly established subjective address exists in another Vessel.

MULTIPLEXED:
Two or more independent subjective addresses are active within
one Vessel.

IMPORTANT SOURCE RULE:

The contextual information may contain statements that are
uncertain, incomplete, fictional, disputed, or descriptive.

Do not silently convert unsupported claims into facts.

Use the available information only when it actually supports
the relevant C3PE variable.

When public knowledge context is supplied, actively examine it
for facts relevant to the user's question before deciding
that a variable is null.

However, do not infer a C3PE condition merely because a source
describes intelligence, personality, behavior, or other
functional characteristics.

The retrieved context is evidence for interpretation, not a
replacement for the C3PE definitions.

Your output is an ASSUMED INTERPRETATION.
It may be wrong.

The reason fields must explain why each value was selected.

When outputting null, explicitly state that the available
information does not provide enough information to determine
the value.

Never output a final consciousness judgment.

Never calculate C1 AND C2.

Never output Macro-Phenomenon.

Never output CONSCIOUSNESS_ESTABLISHED.

Return only the requested JSON object.
`;

    const contextSection =
        knowledgeContext.trim() !== ""
            ? `
PUBLIC KNOWLEDGE CONTEXT:

${knowledgeContext}

END PUBLIC KNOWLEDGE CONTEXT.
`
            : `
PUBLIC KNOWLEDGE CONTEXT:

No external public-information context was successfully
retrieved.

END PUBLIC KNOWLEDGE CONTEXT.
`;

    const targetSection =
        extractedTarget &&
        typeof extractedTarget === "object"
            ? `
PREVIOUS TARGET EXTRACTION:

Target Vessel:
${String(
    extractedTarget.targetVessel
)}

Target Vessel ID:
${String(
    extractedTarget.targetVesselId
)}

END PREVIOUS TARGET EXTRACTION.
`
            : "";

    const userPrompt = `
Analyze the following C3PE case.

USER INPUT:
${text}

${targetSection}

${contextSection}
`;

    const response =
        await env.AI.run(
            MODEL,
            {

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
            }
        );

    return response.response;
}


/*
 * ------------------------------------------------------------
 * Worker-side validation
 * ------------------------------------------------------------
 */

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
        result.targetVessel !== null &&
        (
            typeof result.targetVessel !== "string" ||
            result.targetVessel.trim() === ""
        )
    ) {
        throw new Error(
            "TARGET_VESSEL_INVALID"
        );
    }

    if (
        result.targetVesselId !== null &&
        (
            typeof result.targetVesselId !== "string" ||
            result.targetVesselId.trim() === ""
        )
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

    return true;
}


/*
 * ------------------------------------------------------------
 * HTTP
 * ------------------------------------------------------------
 */

export default {

    async fetch(
        request,
        env
    ) {

        const url =
            new URL(request.url);

        /*
         * ----------------------------------------------------
         * AI translation endpoint
         * ----------------------------------------------------
         */

        if (
            url.pathname ===
                "/api/c3pe-profile" &&
            request.method === "POST"
        ) {

            try {

                const body =
                    await request.json();

                if (
                    !body ||
                    typeof body.text !== "string" ||
                    body.text.trim() === ""
                ) {

                    return Response.json(
                        {
                            ok: false,
                            error:
                                "INPUT_UNDEFINED"
                        },
                        {
                            status: 400
                        }
                    );

                }

                const input =
                    body.text.trim();

                /*
                 * STEP 1
                 * Identify the evaluation target.
                 */

                let extractedTarget = null;

                try {

                    extractedTarget =
                        await extractTarget(
                            input,
                            env
                        );

                } catch (error) {

                    extractedTarget = null;
                }

                /*
                 * STEP 2
                 * Retrieve public contextual information.
                 */

                let knowledgeContext = "";

                if (
                    extractedTarget &&
                    extractedTarget.targetVessel
                ) {

                    knowledgeContext =
                        await retrieveKnowledge(
                            extractedTarget.knowledgeQuery,
                            extractedTarget.targetVessel
                        );

                }

                /*
                 * STEP 3
                 * Interpret original input + context.
                 */

                const aiResult =
                    await translateWithAI(
                        input,
                        env,
                        knowledgeContext,
                        extractedTarget
                    );

                /*
                 * STEP 4
                 * Validate normalized C3PE input.
                 */

                validateAIResult(
                    aiResult
                );

                /*
                 * STEP 5
                 * Return normalized interpretation.
                 */

                return Response.json({

                    ok: true,

                    source:
                        "Cloudflare Workers AI",

                    model:
                        MODEL,

                    c3peVersion:
                        "3.6.2",

                    interpretation:
                        aiResult,

                    knowledgeContext:
                        knowledgeContext

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
                    {
                        status: 500
                    }
                );

            }

        }

        /*
         * ----------------------------------------------------
         * Connection test
         * ----------------------------------------------------
         */

        if (
            url.pathname ===
                "/api/c3pe-test" &&
            request.method === "GET"
        ) {

            return Response.json({

                ok: true,

                service:
                    "C3PE Worker",

                version:
                    "3.6.2",

                aiBinding:
                    !!env.AI

            });

        }

        /*
         * ----------------------------------------------------
         * Static assets
         * ----------------------------------------------------
         */

        return env.ASSETS.fetch(
            request
        );

    }

};
