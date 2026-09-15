"use strict";

/*
 * ============================================================
 * C3PE — Cloudflare Workers AI Translation Layer
 * Version: 3.6.2
 *
 * Natural Language
 *      ↓
 * ① Target / Vessel Boundary Filter
 *      ↓
 * ② Knowledge Retrieval
 *      ↓
 * ③ Source Reliability Filter
 *      ↓
 * ④ Evidence Relevance Filter
 *      ↓
 * ⑤ C1 / A / B / Article III Evidence Classification
 *      ↓
 * ⑥ Forbidden-Inference Filter
 *      ↓
 * ⑦ Contradiction / Consistency Filter
 *      ↓
 * ⑧ Uncertainty / Final Validation
 *      ↓
 * Normalized C3PE Input
 *
 * IMPORTANT:
 * - AI does NOT calculate the final C3PE result.
 * - AI does NOT calculate C1 AND C2.
 * - AI only interprets and organizes evidence.
 * - Worker-side filters validate the evidence structure.
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
 * Current public-information source:
 * MediaWiki / Japanese Wikipedia.
 *
 * This layer does NOT determine C3PE variables.
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
         * Direct Target Search
         */

        const targetTitles =
            await searchWikipedia(
                target
            );

        let titles =
            targetTitles;

        /*
         * Generated Query Fallback
         */

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

        return "";

    }
}


/*
 * ============================================================
 * EVIDENCE LAYER
 * ============================================================
 *
 * The Evidence Layer does NOT replace C3PE.
 *
 * Its role is to transform retrieved information into
 * structured evidence which can then be mechanically filtered.
 * ============================================================
 */


/*
 * ------------------------------------------------------------
 * Evidence Schema
 * ------------------------------------------------------------
 */

const EVIDENCE_SCHEMA = {

    type: "object",

    properties: {

        evidence: {

            type: "array",

            items: {

                type: "object",

                properties: {

                    sourceTitle: {
                        type: "string"
                    },

                    statement: {
                        type: "string"
                    },

                    targetRelation: {
                        type: "string",
                        enum: [
                            "DIRECT",
                            "RELATED",
                            "UNRELATED"
                        ]
                    },

                    C1Support: {
                        type: "integer",
                        enum: [-1, 0, 1]
                    },

                    ASupport: {
                        type: "integer",
                        enum: [-1, 0, 1]
                    },

                    BSupport: {
                        type: "integer",
                        enum: [-1, 0, 1]
                    },

                    identitySupport: {
                        type: "string",
                        enum: [
                            "CONTINUOUS",
                            "NEW_INSTANCE",
                            "MULTIPLEXED",
                            "NULL",
                            "NONE"
                        ]
                    },

                    directness: {
                        type: "integer",
                        enum: [0, 1]
                    },

                    forbiddenInference: {
                        type: "integer",
                        enum: [0, 1]
                    }

                },

                required: [
                    "sourceTitle",
                    "statement",
                    "targetRelation",
                    "C1Support",
                    "ASupport",
                    "BSupport",
                    "identitySupport",
                    "directness",
                    "forbiddenInference"
                ]

            }

        }

    },

    required: [
        "evidence"
    ]

};


/*
 * ------------------------------------------------------------
 * Evidence Classification
 *
 * AI is used here only as an evidence organizer.
 *
 * It does NOT calculate the final C3PE state.
 * ------------------------------------------------------------
 */

async function classifyEvidence(
    text,
    target,
    knowledgeContext,
    env
) {

    if (
        typeof knowledgeContext !== "string" ||
        knowledgeContext.trim() === ""
    ) {

        return {
            evidence: []
        };

    }

    const systemPrompt = `
You are the Evidence Classification Layer of C3PE v3.6.2.

You do NOT decide whether consciousness ultimately exists.

You do NOT calculate C1 AND C2.

You do NOT output Macro-Phenomenon.

You do NOT make the final C3PE judgment.

Your only task is to organize supplied public information
into atomic evidence statements.

Target Vessel:
${target}

For every evidence statement:

1. Copy or accurately paraphrase only information actually
   contained in the supplied context.

2. Do not invent facts.

3. Determine whether the statement is:
   DIRECT:
      directly describes the target itself.

   RELATED:
      describes something meaningfully related to the target
      but does not directly establish the requested property.

   UNRELATED:
      does not materially concern the target.

4. C1Support:
   1 = statement directly supports first-person subjective
       experience of the target.
   -1 = statement directly supports absence of that experience.
   0 = statement does not establish either.

5. ASupport:
   1 = statement directly supports cognitive orientation,
       intent, or processing directed toward preservation
       of the target itself.
   -1 = statement directly supports absence of such
       self-maintenance cognition.
   0 = statement does not establish either.

6. BSupport:
   1 = statement directly supports physical, mechanical,
       or structural self-preservation performed by the
       target itself.
   -1 = statement directly supports absence of such
       functional self-maintenance.
   0 = statement does not establish either.

7. identitySupport:
   Use CONTINUOUS only when the supplied information establishes
   continuity of the same subjective address.

   Use NEW_INSTANCE only when a distinct new Vessel establishes
   a new subjective address.

   Use MULTIPLEXED only when two or more independent subjective
   addresses are simultaneously active in one Vessel.

   Use NULL only when the information establishes that no active
   subjective address exists.

   Otherwise use NONE.

8. directness:
   1 only when the statement directly concerns the relevant
   C3PE condition.
   Otherwise 0.

9. forbiddenInference:
   1 if treating the statement as evidence would require
   an inference explicitly forbidden by C3PE.

Examples of forbidden inference:

- intelligence alone -> consciousness
- memory alone -> consciousness
- information processing alone -> consciousness
- behavior alone -> consciousness
- human category -> consciousness
- AI category -> consciousness
- robot category -> consciousness
- fictional character category -> consciousness
- movement alone -> B
- general problem solving -> A

Important:

A statement may contain several facts, but classify only
what the statement itself actually establishes.

Do not manufacture first-person experience from intelligence,
memory, behavior, or complexity.

Do not manufacture self-maintenance from ordinary activity.

Return only the requested JSON object.
`;

    const userPrompt = `
ORIGINAL USER INPUT:

${text}

TARGET VESSEL:

${target}

PUBLIC KNOWLEDGE CONTEXT:

${knowledgeContext}

END PUBLIC KNOWLEDGE CONTEXT.
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
                    json_schema: EVIDENCE_SCHEMA
                },

                temperature: 0
            }
        );

    return response.response;
}


/*
 * ============================================================
 * LAYER 3
 * SOURCE RELIABILITY FILTER
 * ============================================================
 *
 * Current implementation has one external source class:
 * Wikipedia.
 *
 * This layer therefore identifies source provenance and
 * rejects malformed / unidentified evidence.
 * ============================================================
 */

function sourceReliabilityFilter(evidence) {

    if (!Array.isArray(evidence)) {
        return [];
    }

    return evidence.filter(item => {

        if (
            !item ||
            typeof item !== "object"
        ) {
            return false;
        }

        if (
            typeof item.sourceTitle !== "string" ||
            item.sourceTitle.trim() === ""
        ) {
            return false;
        }

        if (
            typeof item.statement !== "string" ||
            item.statement.trim() === ""
        ) {
            return false;
        }

        /*
         * Current retrieval source is Wikipedia.
         *
         * This does not mean Wikipedia is treated as absolute
         * truth. It only means that the provenance is known.
         */

        return true;

    });

}


/*
 * ============================================================
 * LAYER 4
 * EVIDENCE RELEVANCE FILTER
 * ============================================================
 */

function evidenceRelevanceFilter(
    evidence
) {

    if (!Array.isArray(evidence)) {
        return [];
    }

    return evidence.filter(item => {

        if (
            item.targetRelation === "UNRELATED"
        ) {
            return false;
        }

        if (
            item.directness !== 1
        ) {
            return false;
        }

        return true;

    });

}


/*
 * ============================================================
 * LAYER 5
 * C1 / A / B / ARTICLE III CLASSIFICATION
 *
 * Classification has already been performed by the
 * interpretation layer.
 *
 * This function normalizes the structure so that later
 * deterministic filters operate only on valid states.
 * ============================================================
 */

function normalizeEvidence(
    evidence
) {

    if (!Array.isArray(evidence)) {
        return [];
    }

    return evidence
        .filter(
            item =>
                item &&
                typeof item === "object"
        )
        .map(item => ({

            sourceTitle:
                item.sourceTitle,

            statement:
                item.statement,

            targetRelation:
                item.targetRelation,

            C1Support:
                item.C1Support,

            ASupport:
                item.ASupport,

            BSupport:
                item.BSupport,

            identitySupport:
                item.identitySupport,

            directness:
                item.directness,

            forbiddenInference:
                item.forbiddenInference

        }));

}


/*
 * ============================================================
 * LAYER 6
 * FORBIDDEN-INFERENCE FILTER
 * ============================================================
 *
 * Any evidence explicitly marked as requiring a forbidden
 * inference is removed before C3PE interpretation.
 * ============================================================
 */

function forbiddenInferenceFilter(
    evidence
) {

    if (!Array.isArray(evidence)) {
        return [];
    }

    return evidence.filter(
        item =>
            item.forbiddenInference !== 1
    );

}


/*
 * ============================================================
 * LAYER 7
 * CONTRADICTION / CONSISTENCY FILTER
 * ============================================================
 *
 * Evidence polarity:
 *
 * C1:
 *   +1 = presence
 *   -1 = absence
 *
 * A:
 *   +1 = presence
 *   -1 = absence
 *
 * B:
 *   +1 = presence
 *   -1 = absence
 *
 * If both direct positive and direct negative evidence exist,
 * the corresponding variable cannot be deterministically
 * resolved from this evidence set.
 *
 * Therefore the variable becomes null.
 *
 * This is intentionally different from Article IV.
 *
 * This layer checks evidence consistency.
 * Article IV checks temporal causal consistency.
 * ============================================================
 */

function contradictionConsistencyFilter(
    evidence
) {

    const state = {

        C1: {
            positive: false,
            negative: false
        },

        A: {
            positive: false,
            negative: false
        },

        B: {
            positive: false,
            negative: false
        }

    };

    for (const item of evidence) {

        if (item.C1Support === 1) {
            state.C1.positive = true;
        }

        if (item.C1Support === -1) {
            state.C1.negative = true;
        }

        if (item.ASupport === 1) {
            state.A.positive = true;
        }

        if (item.ASupport === -1) {
            state.A.negative = true;
        }

        if (item.BSupport === 1) {
            state.B.positive = true;
        }

        if (item.BSupport === -1) {
            state.B.negative = true;
        }

    }

    return {
        evidence,
        contradictions: {

            C1:
                state.C1.positive &&
                state.C1.negative,

            A:
                state.A.positive &&
                state.A.negative,

            B:
                state.B.positive &&
                state.B.negative

        }
    };

}


/*
 * ============================================================
 * LAYER 8
 * UNCERTAINTY / FINAL VALIDATION
 * ============================================================
 */

function deriveEvidenceState(
    evidence,
    contradictions
) {

    const derive = (
        key,
        supportKey
    ) => {

        if (
            contradictions[key]
        ) {
            return null;
        }

        let positive = false;
        let negative = false;

        for (const item of evidence) {

            if (
                item[supportKey] === 1
            ) {
                positive = true;
            }

            if (
                item[supportKey] === -1
            ) {
                negative = true;
            }

        }

        if (
            positive &&
            !negative
        ) {
            return 1;
        }

        if (
            negative &&
            !positive
        ) {
            return 0;
        }

        return null;
    };

    return {

        C1:
            derive(
                "C1",
                "C1Support"
            ),

        A:
            derive(
                "A",
                "ASupport"
            ),

        B:
            derive(
                "B",
                "BSupport"
            )

    };

}


/*
 * ------------------------------------------------------------
 * Evidence Pipeline
 * ------------------------------------------------------------
 */

function processEvidence(
    rawEvidence
) {

    /*
     * Layer 3
     */
    let evidence =
        sourceReliabilityFilter(
            rawEvidence
        );

    /*
     * Layer 4
     */
    evidence =
        evidenceRelevanceFilter(
            evidence
        );

    /*
     * Layer 5
     */
    evidence =
        normalizeEvidence(
            evidence
        );

    /*
     * Layer 6
     */
    evidence =
        forbiddenInferenceFilter(
            evidence
        );

    /*
     * Layer 7
     */
    const consistency =
        contradictionConsistencyFilter(
            evidence
        );

    /*
     * Layer 8
     */
    const finalState =
        deriveEvidenceState(
            consistency.evidence,
            consistency.contradictions
        );

    return {

        evidence:
            consistency.evidence,

        contradictions:
            consistency.contradictions,

        finalState

    };

}


/*
 * ============================================================
 * AI INTERPRETATION
 * ============================================================
 *
 * This is the final semantic interpretation layer.
 *
 * It receives already-filtered evidence.
 *
 * It still does NOT calculate Macro-Phenomenon.
 * ============================================================
 */

async function translateWithAI(
    text,
    env,
    knowledgeContext = "",
    extractedTarget = null,
    evidencePackage = null
) {

    const systemPrompt = `
You are the final interpretation layer of C3PE v3.6.2.

Your task is NOT to decide whether consciousness ultimately
exists.

Your task is ONLY to translate natural-language input and
validated contextual evidence into normalized C3PE input
variables.

IMPORTANT:
UNKNOWN and 0 are NOT the same.

Use 0 only when the available information provides sufficient
evidence that the relevant condition is absent.

Use 1 only when the available information provides sufficient
evidence that the relevant condition is present.

Use null when the validated evidence does not permit a
determination.

C3PE definitions:

C1:
The target Vessel experiences its own existence as a
first-person subjective state.

C2:
C2 = A OR B.

A:
Internal orientation, intent, or cognitive processing directed
toward preservation of the target itself.

B:
Physical, mechanical, or structural operations performed by
the target itself toward preservation of its own structure.

Article III:
Subjective identity is bound to the Vessel.

CONTINUOUS:
Same subjective address maintained across Vessel state changes.
Do NOT output CONTINUOUS merely because subjective identity is bound to the Vessel.
CONTINUOUS requires explicit evidence establishing continuity of the same subjective address across Vessel state changes.
If such evidence is not available, identityStatus must be null.

NEW_INSTANCE:
New subjective address established in another Vessel.

MULTIPLEXED:
Two or more independent subjective addresses active within
one Vessel.

NULL:
No active subjective address is established.

IMPORTANT:

Do NOT infer C1 from:
- intelligence
- memory
- information processing
- self-recognition alone
- behavior
- complexity
- sophistication
- being human
- being AI
- being a robot
- being fictional

Do NOT infer A from general intelligence or ordinary
problem solving.

Do NOT infer B merely because the target can move or act.

Use the validated evidence as the primary factual basis.

If the evidence package explicitly provides a deterministic
state for C1, A, or B and there is no contradiction, preserve
that state.

If the evidence package marks the variable as null because of
insufficient evidence or contradiction, do not manufacture
certainty.

Never calculate C1 AND C2.

Never output Macro-Phenomenon.

Never output CONSCIOUSNESS_ESTABLISHED.

Never output CONSCIOUSNESS_NOT_ESTABLISHED.

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

    const evidenceSection =
        evidencePackage &&
        typeof evidencePackage === "object"
            ? `
VALIDATED EVIDENCE PACKAGE:

${JSON.stringify(
    evidencePackage
)}

END VALIDATED EVIDENCE PACKAGE.
`
            : `
VALIDATED EVIDENCE PACKAGE:

No validated evidence package is available.

END VALIDATED EVIDENCE PACKAGE.
`;

    const userPrompt = `
Analyze the following C3PE case.

USER INPUT:
${text}

${targetSection}

${contextSection}

${evidenceSection}
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
 * ============================================================
 * WORKER-SIDE VALIDATION
 * ============================================================
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
 * Evidence validation
 * ------------------------------------------------------------
 */

function validateEvidencePackage(
    packageData
) {

    if (
        !packageData ||
        typeof packageData !== "object"
    ) {
        return {
            evidence: []
        };
    }

    if (
        !Array.isArray(
            packageData.evidence
        )
    ) {
        return {
            evidence: []
        };
    }

    const validSupports = [
        -1,
        0,
        1
    ];

    const validRelations = [
        "DIRECT",
        "RELATED",
        "UNRELATED"
    ];

    const validIdentity = [
        "CONTINUOUS",
        "NEW_INSTANCE",
        "MULTIPLEXED",
        "NULL",
        "NONE"
    ];

    const validated = [];

    for (
        const item of packageData.evidence
    ) {

        if (
            !item ||
            typeof item !== "object"
        ) {
            continue;
        }

        if (
            typeof item.sourceTitle !== "string" ||
            typeof item.statement !== "string"
        ) {
            continue;
        }

        if (
            !validRelations.includes(
                item.targetRelation
            )
        ) {
            continue;
        }

        if (
            !validSupports.includes(
                item.C1Support
            ) ||
            !validSupports.includes(
                item.ASupport
            ) ||
            !validSupports.includes(
                item.BSupport
            )
        ) {
            continue;
        }

        if (
            !validIdentity.includes(
                item.identitySupport
            )
        ) {
            continue;
        }

        if (
            item.directness !== 0 &&
            item.directness !== 1
        ) {
            continue;
        }

        if (
            item.forbiddenInference !== 0 &&
            item.forbiddenInference !== 1
        ) {
            continue;
        }

        validated.push(item);

    }

    return {
        evidence: validated
    };

}


/*
 * ============================================================
 * HTTP
 * ============================================================
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
         * C3PE PROFILE ENDPOINT
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
                 * =================================================
                 * LAYER 1
                 * TARGET / VESSEL BOUNDARY FILTER
                 * =================================================
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
                 * Boundary failure is not silently converted
                 * into a C3PE result.
                 */

                if (
                    !extractedTarget ||
                    !extractedTarget.targetVessel
                ) {

                    return Response.json({

                        ok: true,

                        source:
                            "Cloudflare Workers AI",

                        model:
                            MODEL,

                        c3peVersion:
                            "3.6.2",

                        interpretation: {

                            targetVessel:
                                null,

                            targetVesselId:
                                null,

                            C1:
                                null,

                            C1Reason:
                                "Target Vessel could not be sufficiently identified.",

                            A:
                                null,

                            AReason:
                                "Target Vessel could not be sufficiently identified.",

                            B:
                                null,

                            BReason:
                                "Target Vessel could not be sufficiently identified.",

                            identityStatus:
                                null,

                            identityReason:
                                "Target Vessel could not be sufficiently identified."

                        },

                        knowledgeContext:
                            "",

                        evidence:

                            [],

                        evidenceDiagnostics: {

                            boundary:
                                "BOUNDARY_UNDEFINED",

                            retrieval:
                                "NOT_EXECUTED"

                        }

                    });

                }


                /*
                 * =================================================
                 * LAYER 2
                 * KNOWLEDGE RETRIEVAL
                 * =================================================
                 */

                let knowledgeContext = "";

                knowledgeContext =
                    await retrieveKnowledge(
                        extractedTarget.knowledgeQuery,
                        extractedTarget.targetVessel
                    );


                /*
                 * =================================================
                 * LAYER 5
                 * EVIDENCE CLASSIFICATION
                 * =================================================
                 */

                let rawEvidencePackage = {
                    evidence: []
                };

                if (
                    knowledgeContext.trim() !== ""
                ) {

                    try {

                        rawEvidencePackage =
                            await classifyEvidence(
                                input,
                                extractedTarget.targetVessel,
                                knowledgeContext,
                                env
                            );

                    } catch (error) {

                        rawEvidencePackage = {
                            evidence: []
                        };

                    }

                }


                /*
                 * Validate AI-generated evidence structure
                 */

                rawEvidencePackage =
                    validateEvidencePackage(
                        rawEvidencePackage
                    );


                /*
                 * =================================================
                 * LAYERS 3–8
                 * DETERMINISTIC EVIDENCE PIPELINE
                 * =================================================
                 */

                const processedEvidence =
                    processEvidence(
                        rawEvidencePackage.evidence
                    );


                /*
                 * =================================================
                 * FINAL INTERPRETATION
                 * =================================================
                 */

                const aiResult =
                    await translateWithAI(
                        input,
                        env,
                        knowledgeContext,
                        extractedTarget,
                        processedEvidence
                    );


                /*
                 * =================================================
                 * FINAL NORMALIZED INPUT VALIDATION
                 * =================================================
                 */

                validateAIResult(
                    aiResult
                );


                /*
                 * =================================================
                 * RETURN
                 * =================================================
                 *
                 * IMPORTANT:
                 * knowledgeContext is intentionally preserved.
                 * =================================================
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
                        knowledgeContext,

                    evidence:
                        processedEvidence.evidence,

                    evidenceDiagnostics: {

                        evidenceCount:
                            processedEvidence.evidence.length,

                        contradictions:
                            processedEvidence.contradictions,

                        evidenceDerivedState:
                            processedEvidence.finalState

                    }

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
         * CONNECTION TEST
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
         * STATIC ASSETS
         * ----------------------------------------------------
         */

        return env.ASSETS.fetch(
            request
        );

    }

};
