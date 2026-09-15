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
 * ------------------------------------------------------------
 * SOURCE RELIABILITY FILTER
 * ------------------------------------------------------------
 */

function sourceReliabilityFilter(
    evidence
) {

    if (!Array.isArray(evidence)) {
        return [];
    }

    return evidence.filter(
        item => {

            if (
                !item ||
                typeof item !== "object"
            ) {
                return false;
            }

            if (
                typeof item.sourceTitle !== "string" ||
                typeof item.statement !== "string"
            ) {
                return false;
            }

            if (
                ![
                    "DIRECT",
                    "RELATED",
                    "UNRELATED"
                ].includes(
                    item.targetRelation
                )
            ) {
                return false;
            }

            if (
                ![-1, 0, 1].includes(
                    item.C1Support
                )
            ) {
                return false;
            }

            if (
                ![-1, 0, 1].includes(
                    item.ASupport
                )
            ) {
                return false;
            }

            if (
                ![-1, 0, 1].includes(
                    item.BSupport
                )
            ) {
                return false;
            }

            if (
                ![
                    "CONTINUOUS",
                    "NEW_INSTANCE",
                    "MULTIPLEXED",
                    "NULL",
                    "NONE"
                ].includes(
                    item.identitySupport
                )
            ) {
                return false;
            }

            if (
                ![0, 1].includes(
                    item.directness
                )
            ) {
                return false;
            }

            if (
                ![0, 1].includes(
                    item.forbiddenInference
                )
            ) {
                return false;
            }

            return true;
        }
    );
}


/*
 * ------------------------------------------------------------
 * EVIDENCE RELEVANCE FILTER
 * ------------------------------------------------------------
 */

function evidenceRelevanceFilter(
    evidence
) {

    if (!Array.isArray(evidence)) {
        return [];
    }

    return evidence.filter(
        item => {

            if (
                item.targetRelation ===
                "UNRELATED"
            ) {
                return false;
            }

            if (
                item.directness !== 1
            ) {
                return false;
            }

            return true;
        }
    );
}


/*
 * ------------------------------------------------------------
 * NORMALIZE EVIDENCE
 * ------------------------------------------------------------
 */

function normalizeEvidence(
    evidence
) {

    if (!Array.isArray(evidence)) {
        return [];
    }

    return evidence.map(
        item => ({

            sourceTitle:
                String(
                    item.sourceTitle || ""
                ).trim(),

            statement:
                String(
                    item.statement || ""
                ).trim(),

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

        })
    );
}


/*
 * ------------------------------------------------------------
 * FORBIDDEN INFERENCE FILTER
 * ------------------------------------------------------------
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
 * ------------------------------------------------------------
 * CONTRADICTION / CONSISTENCY FILTER
 *
 * The purpose of this layer is not to decide C3PE.
 *
 * It only prevents an internally contradictory evidence item
 * set from being treated as a clean deterministic input.
 * ------------------------------------------------------------
 */

function contradictionConsistencyFilter(
    evidence
) {

    if (!Array.isArray(evidence)) {
        return [];
    }

    const seen = new Map();

    const output = [];

    for (
        const item of evidence
    ) {

        const key =
            item.statement
                .trim()
                .toLowerCase();

        if (!key) {
            continue;
        }

        const existing =
            seen.get(key);

        if (!existing) {

            seen.set(
                key,
                item
            );

            output.push(item);

            continue;
        }

        /*
         * Identical statement:
         * keep only one normalized copy.
         */

        if (
            existing.C1Support ===
            item.C1Support &&
            existing.ASupport ===
            item.ASupport &&
            existing.BSupport ===
            item.BSupport &&
            existing.identitySupport ===
            item.identitySupport
        ) {

            continue;

        }

        /*
         * If two identical statements carry different
         * classifications, do not silently select one.
         *
         * Remove the duplicated contradictory pair from
         * deterministic consideration.
         */

        const index =
            output.indexOf(
                existing
            );

        if (index !== -1) {
            output.splice(
                index,
                1
            );
        }

        seen.delete(key);
    }

    return output;
}


/*
 * ------------------------------------------------------------
 * DERIVE EVIDENCE STATE
 *
 * IMPORTANT:
 * This function only derives normalized evidence state.
 *
 * It does NOT calculate C2.
 * It does NOT calculate Macro-Phenomenon.
 * ------------------------------------------------------------
 */

function deriveEvidenceState(
    evidence
) {

    const state = {

        C1: null,
        A: null,
        B: null,

        C1SupportCount: 0,
        C1AgainstCount: 0,

        ASupportCount: 0,
        AAgainstCount: 0,

        BSupportCount: 0,
        BAgainstCount: 0

    };

    if (!Array.isArray(evidence)) {
        return state;
    }

    for (
        const item of evidence
    ) {

        if (
            item.C1Support === 1
        ) {
            state.C1SupportCount++;
        }

        if (
            item.C1Support === -1
        ) {
            state.C1AgainstCount++;
        }

        if (
            item.ASupport === 1
        ) {
            state.ASupportCount++;
        }

        if (
            item.ASupport === -1
        ) {
            state.AAgainstCount++;
        }

        if (
            item.BSupport === 1
        ) {
            state.BSupportCount++;
        }

        if (
            item.BSupport === -1
        ) {
            state.BAgainstCount++;
        }
    }

    /*
     * C1
     */

    if (
        state.C1SupportCount > 0 &&
        state.C1AgainstCount === 0
    ) {

        state.C1 = 1;

    } else if (
        state.C1AgainstCount > 0 &&
        state.C1SupportCount === 0
    ) {

        state.C1 = 0;

    }

    /*
     * A
     */

    if (
        state.ASupportCount > 0 &&
        state.AAgainstCount === 0
    ) {

        state.A = 1;

    } else if (
        state.AAgainstCount > 0 &&
        state.ASupportCount === 0
    ) {

        state.A = 0;

    }

    /*
     * B
     */

    if (
        state.BSupportCount > 0 &&
        state.BAgainstCount === 0
    ) {

        state.B = 1;

    } else if (
        state.BAgainstCount > 0 &&
        state.BSupportCount === 0
    ) {

        state.B = 0;

    }

    return state;
}


/*
 * ------------------------------------------------------------
 * PROCESS EVIDENCE
 * ------------------------------------------------------------
 */

function processEvidence(
    classifiedEvidence
) {

    const rawEvidence =
        Array.isArray(
            classifiedEvidence?.evidence
        )
            ? classifiedEvidence.evidence
            : [];

    const reliable =
        sourceReliabilityFilter(
            rawEvidence
        );

    const relevant =
        evidenceRelevanceFilter(
            reliable
        );

    const normalized =
        normalizeEvidence(
            relevant
        );

    const forbiddenFiltered =
        forbiddenInferenceFilter(
            normalized
        );

    const consistent =
        contradictionConsistencyFilter(
            forbiddenFiltered
        );

    const state =
        deriveEvidenceState(
            consistent
        );

    return {

        evidence:
            consistent,

        evidenceCount:
            consistent.length,

        state

    };
}


/*
 * ============================================================
 * AI INTERPRETATION LAYER
 *
 * This layer converts validated evidence into normalized
 * C3PE input values.
 *
 * It does NOT calculate C2 or Macro-Phenomenon.
 * ============================================================
 */

async function translateWithAI(
    text,
    target,
    processedEvidence,
    env
) {

    const evidence =
        Array.isArray(
            processedEvidence?.evidence
        )
            ? processedEvidence.evidence
            : [];

    const evidenceText =
        evidence.length > 0
            ? evidence
                .map(
                    (item, index) =>
                        `[Evidence ${index + 1}]
Source: ${item.sourceTitle}
Statement: ${item.statement}
Target Relation: ${item.targetRelation}
C1Support: ${item.C1Support}
ASupport: ${item.ASupport}
BSupport: ${item.BSupport}
IdentitySupport: ${item.identitySupport}`
                )
                .join("\n\n")
            : "NO VALIDATED EVIDENCE";

    const systemPrompt = `
You are the C3PE v3.6.2 semantic interpretation layer.

Your job is ONLY to translate validated evidence into
normalized C3PE input variables.

You are NOT the deterministic C3PE calculation core.

Therefore:

DO NOT calculate C2.

DO NOT calculate C1 AND C2.

DO NOT calculate Macro-Phenomenon.

DO NOT output CONSCIOUSNESS_ESTABLISHED.

DO NOT output CONSCIOUSNESS_NOT_ESTABLISHED.

The deterministic core will perform those calculations
after your response.

------------------------------------------------------------
C1
------------------------------------------------------------

C1 = 1 ONLY when validated evidence supports that the target
Vessel itself continuously experiences its own existence as
a first-person subjective state within the world.

C1 = 0 ONLY when validated evidence supports absence of such
first-person subjective experience.

If evidence is insufficient:
C1 = null.

UNKNOWN and 0 are NOT the same.

Do NOT infer C1 from:

- intelligence
- information processing
- memory
- self-recognition
- behavior
- complexity
- sophistication
- being human
- being an AI
- being a robot
- being a fictional character

------------------------------------------------------------
A
------------------------------------------------------------

A = 1 ONLY when validated evidence supports internal
orientation, intent, or cognitive processing directed toward
preservation of the target itself.

A = 0 ONLY when validated evidence supports absence.

Otherwise:
A = null.

------------------------------------------------------------
B
------------------------------------------------------------

B = 1 ONLY when validated evidence supports physical,
mechanical, or structural operations performed by the target
system toward preservation of itself.

B = 0 ONLY when validated evidence supports absence.

Otherwise:
B = null.

------------------------------------------------------------
ARTICLE III
------------------------------------------------------------

Allowed values:

CONTINUOUS
NEW_INSTANCE
MULTIPLEXED
NULL

Or JSON null when the information is insufficient to determine
the Article III state.

IMPORTANT:

Do NOT output CONTINUOUS merely because subjective identity
is bound to the Vessel.

CONTINUOUS requires explicit evidence establishing continuity
of the same subjective address across Vessel state changes.

If such evidence is not available:
identityStatus = null.

NEW_INSTANCE requires evidence of a newly established
subjective address in a different Vessel.

MULTIPLEXED requires evidence that two or more independent
subjective addresses are simultaneously active within one
Vessel.

NULL requires evidence that no active subjective address exists.

If Article III cannot be determined from validated evidence:
identityStatus = null.

------------------------------------------------------------
GENERAL RULE
------------------------------------------------------------

Use ONLY the validated evidence supplied to you.

Do not invent facts.

Do not use outside knowledge to fill missing evidence.

Do not transform uncertainty into 0.

Do not transform category membership into C1=1.

Return only the normalized interpretation JSON.
`;

    const userPrompt = `
ORIGINAL USER INPUT:

${text}

TARGET VESSEL:

${target}

VALIDATED EVIDENCE:

${evidenceText}
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
 * AI RESULT VALIDATION
 * ------------------------------------------------------------
 */

function validateAIResult(
    result
) {

    if (
        !result ||
        typeof result !== "object"
    ) {
        throw new Error(
            "Invalid AI result."
        );
    }

    const binaryOrNull =
        value =>
            value === 0 ||
            value === 1 ||
            value === null;

    if (
        !binaryOrNull(result.C1) ||
        !binaryOrNull(result.A) ||
        !binaryOrNull(result.B)
    ) {
        throw new Error(
            "Invalid C3PE binary input."
        );
    }

    const allowedIdentity =
        [
            "CONTINUOUS",
            "NEW_INSTANCE",
            "MULTIPLEXED",
            "NULL"
        ];

    if (
        result.identityStatus !== null &&
        !allowedIdentity.includes(
            result.identityStatus
        )
    ) {
        throw new Error(
            "Invalid Article III identity status."
        );
    }

    return true;
}


/*
 * ------------------------------------------------------------
 * EVIDENCE PACKAGE VALIDATION
 * ------------------------------------------------------------
 */

function validateEvidencePackage(
    processedEvidence
) {

    if (
        !processedEvidence ||
        !Array.isArray(
            processedEvidence.evidence
        )
    ) {
        throw new Error(
            "Invalid evidence package."
        );
    }

    for (
        const item
        of processedEvidence.evidence
    ) {

        if (
            !item ||
            typeof item !== "object"
        ) {
            throw new Error(
                "Invalid evidence item."
            );
        }

        if (
            ![-1, 0, 1].includes(
                item.C1Support
            )
        ) {
            throw new Error(
                "Invalid C1 evidence state."
            );
        }

        if (
            ![-1, 0, 1].includes(
                item.ASupport
            )
        ) {
            throw new Error(
                "Invalid A evidence state."
            );
        }

        if (
            ![-1, 0, 1].includes(
                item.BSupport
            )
        ) {
            throw new Error(
                "Invalid B evidence state."
            );
        }

        if (
            ![
                "CONTINUOUS",
                "NEW_INSTANCE",
                "MULTIPLEXED",
                "NULL",
                "NONE"
            ].includes(
                item.identitySupport
            )
        ) {
            throw new Error(
                "Invalid Article III evidence state."
            );
        }
    }

    return true;
}


/*
 * ============================================================
 * DETERMINISTIC C3PE CORE
 *
 * AI INTERPRETATION
 *       ↓
 * NORMALIZED INPUT
 *       ↓
 * THIS FUNCTION
 *
 * NO AI CALCULATION OCCURS HERE.
 * ============================================================
 */

function evaluateC3PECore(
    normalizedInput,
    processedEvidence
) {

    /*
     * --------------------------------------------------------
     * Article II — C1
     * --------------------------------------------------------
     */

    const C1 =
        normalizedInput?.C1 === 0 ||
        normalizedInput?.C1 === 1
            ? normalizedInput.C1
            : null;


    /*
     * --------------------------------------------------------
     * Article II — A
     * --------------------------------------------------------
     */

    const A =
        normalizedInput?.A === 0 ||
        normalizedInput?.A === 1
            ? normalizedInput.A
            : null;


    /*
     * --------------------------------------------------------
     * Article II — B
     * --------------------------------------------------------
     */

    const B =
        normalizedInput?.B === 0 ||
        normalizedInput?.B === 1
            ? normalizedInput.B
            : null;


    /*
     * --------------------------------------------------------
     * C2 = A OR B
     *
     * Deterministic Boolean Core
     * --------------------------------------------------------
     */

    let C2 = null;

    if (
        A === 1 ||
        B === 1
    ) {

        C2 = 1;

    } else if (
        A === 0 &&
        B === 0
    ) {

        C2 = 0;

    }


    /*
     * --------------------------------------------------------
     * Macro-Phenomenon = C1 AND C2
     *
     * Deterministic Boolean Core
     * --------------------------------------------------------
     */

    let macroPhenomenon = null;

    if (
        C1 === 1 &&
        C2 === 1
    ) {

        macroPhenomenon = 1;

    } else if (
        C1 === 0 ||
        C2 === 0
    ) {

        macroPhenomenon = 0;

    }


    /*
     * --------------------------------------------------------
     * Article III
     *
     * Identity is derived from validated evidence,
     * not from AI's unsupported assumption.
     * --------------------------------------------------------
     */

    const identityCandidates =
        new Set();

    if (
        processedEvidence &&
        Array.isArray(
            processedEvidence.evidence
        )
    ) {

        for (
            const item
            of processedEvidence.evidence
        ) {

            if (
                item.identitySupport ===
                    "CONTINUOUS" ||
                item.identitySupport ===
                    "NEW_INSTANCE" ||
                item.identitySupport ===
                    "MULTIPLEXED" ||
                item.identitySupport ===
                    "NULL"
            ) {

                identityCandidates.add(
                    item.identitySupport
                );

            }

        }

    }


    let identityStatus = null;

    let identityReason =
        "Insufficient validated evidence to determine Article III subjective identity.";


    if (
        identityCandidates.size === 1
    ) {

        identityStatus =
            [
                ...identityCandidates
            ][0];

        identityReason =
            "Article III status derived from validated evidence.";

    } else if (
        identityCandidates.size > 1
    ) {

        identityStatus = null;

        identityReason =
            "Conflicting validated Article III identity states prevent deterministic resolution.";

    }


    /*
     * --------------------------------------------------------
     * Article IV
     *
     * Intentionally not fabricated yet.
     * --------------------------------------------------------
     */

    return {

        articleII: {

            C1,
            A,
            B,
            C2,
            macroPhenomenon

        },

        articleIII: {

            identityStatus,
            identityReason

        },

        articleIV: {

            causalCompossibility: null,

            reason:
                "No normalized causal model is supplied to the deterministic core yet."

        },

        output:

            macroPhenomenon === 1
                ? "CONSCIOUSNESS_ESTABLISHED"

                : macroPhenomenon === 0
                    ? "CONSCIOUSNESS_NOT_ESTABLISHED"

                    : null

    };

}

/*
 * ============================================================
 * HTTP WORKER
 * ============================================================
 */

export default {

    async fetch(
        request,
        env,
        ctx
    ) {

        const url =
            new URL(
                request.url
            );

        /*
         * ----------------------------------------------------
         * CORS
         * ----------------------------------------------------
         */

        const corsHeaders = {

            "Access-Control-Allow-Origin":
                "*",

            "Access-Control-Allow-Methods":
                "GET, POST, OPTIONS",

            "Access-Control-Allow-Headers":
                "Content-Type"

        };


        /*
         * ----------------------------------------------------
         * OPTIONS
         * ----------------------------------------------------
         */

        if (
            request.method ===
            "OPTIONS"
        ) {

            return new Response(
                null,
                {
                    status: 204,
                    headers: corsHeaders
                }
            );

        }


        /*
         * ----------------------------------------------------
         * BASIC TEST ENDPOINT
         * ----------------------------------------------------
         */

        if (
            url.pathname ===
            "/api/c3pe-test"
        ) {

            return new Response(

                JSON.stringify({

                    ok: true,

                    service:
                        "C3PE Worker",

                    version:
                        "3.6.2",

                    aiBinding:
                        !!env.AI

                }),

                {

                    status: 200,

                    headers: {

                        ...corsHeaders,

                        "Content-Type":
                            "application/json; charset=utf-8"

                    }

                }

            );

        }


        /*
         * ----------------------------------------------------
         * MAIN C3PE ENDPOINT
         * ----------------------------------------------------
         */

        if (
            url.pathname ===
            "/api/c3pe-profile"
        ) {

            if (
                request.method !==
                "POST"
            ) {

                return new Response(

                    JSON.stringify({

                        ok: false,

                        error:
                            "POST required."

                    }),

                    {

                        status: 405,

                        headers: {

                            ...corsHeaders,

                            "Content-Type":
                                "application/json; charset=utf-8"

                        }

                    }

                );

            }


            /*
             * ------------------------------------------------
             * READ INPUT
             * ------------------------------------------------
             */

            let body;

            try {

                body =
                    await request.json();

            } catch (error) {

                return new Response(

                    JSON.stringify({

                        ok: false,

                        error:
                            "Invalid JSON request body."

                    }),

                    {

                        status: 400,

                        headers: {

                            ...corsHeaders,

                            "Content-Type":
                                "application/json; charset=utf-8"

                        }

                    }

                );

            }


            const text =
                typeof body?.text === "string"
                    ? body.text.trim()
                    : "";


            if (!text) {

                return new Response(

                    JSON.stringify({

                        ok: false,

                        error:
                            "text is required."

                    }),

                    {

                        status: 400,

                        headers: {

                            ...corsHeaders,

                            "Content-Type":
                                "application/json; charset=utf-8"

                        }

                    }

                );

            }


            /*
             * ------------------------------------------------
             * STEP 1
             *
             * OBJECT ISOLATION
             * ------------------------------------------------
             */

            let target;

            try {

                target =
                    await extractTarget(
                        text,
                        env
                    );

            } catch (error) {

                return new Response(

                    JSON.stringify({

                        ok: false,

                        stage:
                            "OBJECT_ISOLATION",

                        error:
                            error?.message ||
                            "Target extraction failed."

                    }),

                    {

                        status: 500,

                        headers: {

                            ...corsHeaders,

                            "Content-Type":
                                "application/json; charset=utf-8"

                        }

                    }

                );

            }


            /*
             * ------------------------------------------------
             * BOUNDARY CHECK
             * ------------------------------------------------
             */

            if (
                !target ||
                !target.targetVessel
            ) {

                return new Response(

                    JSON.stringify({

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
                                "Target Vessel boundary could not be determined.",

                            A:
                                null,

                            AReason:
                                "Target Vessel boundary could not be determined.",

                            B:
                                null,

                            BReason:
                                "Target Vessel boundary could not be determined.",

                            identityStatus:
                                null,

                            identityReason:
                                "Target Vessel boundary could not be determined."

                        },

                        c3peResult: {

                            articleII: {

                                C1:
                                    null,

                                A:
                                    null,

                                B:
                                    null,

                                C2:
                                    null,

                                macroPhenomenon:
                                    null

                            },

                            articleIII: {

                                identityStatus:
                                    null,

                                identityReason:
                                    "Target Vessel boundary could not be determined."

                            },

                            articleIV: {

                                causalCompossibility:
                                    null,

                                reason:
                                    "No target Vessel was established."

                            },

                            output:
                                null

                        },

                        knowledgeContext:
                            "",

                        evidence:
                            [],

                        evidenceCount:
                            0

                    }),

                    {

                        status: 200,

                        headers: {

                            ...corsHeaders,

                            "Content-Type":
                                "application/json; charset=utf-8"

                        }

                    }

                );

            }


            /*
             * ------------------------------------------------
             * STEP 2
             *
             * KNOWLEDGE RETRIEVAL
             * ------------------------------------------------
             */

            let knowledgeContext = "";

            try {

                knowledgeContext =
                    await retrieveKnowledge(

                        target.knowledgeQuery ||
                        target.targetVessel,

                        target.targetVessel

                    );

            } catch (error) {

                knowledgeContext = "";

            }


            /*
             * ------------------------------------------------
             * STEP 3
             *
             * EVIDENCE CLASSIFICATION
             * ------------------------------------------------
             */

            let classifiedEvidence = {

                evidence: []

            };


            try {

                classifiedEvidence =
                    await classifyEvidence(

                        text,

                        target.targetVessel,

                        knowledgeContext,

                        env

                    );

            } catch (error) {

                classifiedEvidence = {

                    evidence: []

                };

            }


            /*
             * ------------------------------------------------
             * STEP 4
             *
             * EVIDENCE PROCESSING
             * ------------------------------------------------
             */

            let processedEvidence;

            try {

                processedEvidence =
                    processEvidence(
                        classifiedEvidence
                    );

            } catch (error) {

                processedEvidence = {

                    evidence: [],

                    evidenceCount: 0,

                    state: {

                        C1: null,

                        A: null,

                        B: null,

                        C1SupportCount: 0,

                        C1AgainstCount: 0,

                        ASupportCount: 0,

                        AAgainstCount: 0,

                        BSupportCount: 0,

                        BAgainstCount: 0

                    }

                };

            }


            /*
             * ------------------------------------------------
             * STEP 5
             *
             * AI INTERPRETATION
             * ------------------------------------------------
             */

            let aiResult;

            try {

                aiResult =
                    await translateWithAI(

                        text,

                        target.targetVessel,

                        processedEvidence,

                        env

                    );

            } catch (error) {

                return new Response(

                    JSON.stringify({

                        ok: false,

                        stage:
                            "CONTEXT_PROFILING",

                        error:
                            error?.message ||
                            "AI interpretation failed."

                    }),

                    {

                        status: 500,

                        headers: {

                            ...corsHeaders,

                            "Content-Type":
                                "application/json; charset=utf-8"

                        }

                    }

                );

            }


            /*
             * ------------------------------------------------
             * VALIDATE AI RESULT
             * ------------------------------------------------
             */

            try {

                validateAIResult(
                    aiResult
                );

            } catch (error) {

                return new Response(

                    JSON.stringify({

                        ok: false,

                        stage:
                            "AI_RESULT_VALIDATION",

                        error:
                            error?.message ||
                            "AI result validation failed."

                    }),

                    {

                        status: 500,

                        headers: {

                            ...corsHeaders,

                            "Content-Type":
                                "application/json; charset=utf-8"

                        }

                    }

                );

            }


            /*
             * ------------------------------------------------
             * VALIDATE EVIDENCE PACKAGE
             * ------------------------------------------------
             */

            try {

                validateEvidencePackage(
                    processedEvidence
                );

            } catch (error) {

                return new Response(

                    JSON.stringify({

                        ok: false,

                        stage:
                            "EVIDENCE_VALIDATION",

                        error:
                            error?.message ||
                            "Evidence validation failed."

                    }),

                    {

                        status: 500,

                        headers: {

                            ...corsHeaders,

                            "Content-Type":
                                "application/json; charset=utf-8"

                        }

                    }

                );

            }


            /*
             * ------------------------------------------------
             * ARTICLE III CONTINUITY GUARD
             *
             * AI must not output CONTINUOUS unless
             * validated evidence explicitly supports it.
             * ------------------------------------------------
             */

            if (
                aiResult.identityStatus ===
                "CONTINUOUS"
            ) {

                const continuityEvidence =

                    Array.isArray(
                        processedEvidence.evidence
                    ) &&

                    processedEvidence.evidence.some(

                        item =>
                            item.identitySupport ===
                            "CONTINUOUS"

                    );


                if (
                    !continuityEvidence
                ) {

                    aiResult.identityStatus =
                        null;

                    aiResult.identityReason =
                        "Insufficient validated evidence to establish continuity of the same subjective address.";

                }

            }


            /*
             * ------------------------------------------------
             * DETERMINISTIC C3PE CORE
             *
             * IMPORTANT:
             *
             * AI result is used ONLY as normalized input.
             *
             * C2 and Macro-Phenomenon are calculated here.
             * ------------------------------------------------
             */

            let c3peResult;

            try {

                c3peResult =
                    evaluateC3PECore(

                        aiResult,

                        processedEvidence

                    );

            } catch (error) {

                return new Response(

                    JSON.stringify({

                        ok: false,

                        stage:
                            "DETERMINISTIC_C3PE_CORE",

                        error:
                            error?.message ||
                            "Deterministic C3PE core failed."

                    }),

                    {

                        status: 500,

                        headers: {

                            ...corsHeaders,

                            "Content-Type":
                                "application/json; charset=utf-8"

                        }

                    }

                );

            }


            /*
             * ------------------------------------------------
             * FINAL RESPONSE
             * ------------------------------------------------
             *
             * interpretation:
             *     AI semantic interpretation
             *
             * c3peResult:
             *     deterministic C3PE calculation result
             *
             * knowledgeContext:
             *     retained for debugging / verification
             *
             * evidence:
             *     validated evidence package
             * ------------------------------------------------
             */

            return new Response(

                JSON.stringify(

                    {

                        ok: true,

                        source:
                            "Cloudflare Workers AI",

                        model:
                            MODEL,

                        c3peVersion:
                            "3.6.2",

                        interpretation:
                            aiResult,

                        c3peResult:
                            c3peResult,

                        targetVessel:
                            target.targetVessel,

                        targetVesselId:
                            target.targetVesselId,

                        knowledgeContext:
                            knowledgeContext,

                        evidence:
                            processedEvidence.evidence,

                        evidenceCount:
                            processedEvidence.evidenceCount,

                        evidenceState:
                            processedEvidence.state

                    },

                    null,

                    2

                ),

                {

                    status: 200,

                    headers: {

                        ...corsHeaders,

                        "Content-Type":
                            "application/json; charset=utf-8"

                    }

                }

            );

        }


        /*
         * ----------------------------------------------------
         * STATIC ASSETS
         * ----------------------------------------------------
         */

        if (
            env.ASSETS
        ) {

            return env.ASSETS.fetch(
                request
            );

        }


        /*
         * ----------------------------------------------------
         * NOT FOUND
         * ----------------------------------------------------
         */

        return new Response(

            JSON.stringify({

                ok: false,

                error:
                    "Not Found."

            }),

            {

                status: 404,

                headers: {

                    ...corsHeaders,

                    "Content-Type":
                        "application/json; charset=utf-8"

                }

            }

        );

    }

};
