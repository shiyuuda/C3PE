```javascript
/* ============================================================
 * C3PE — Consciousness Three Principles Engine
 * Version: 3.6.2
 * Identity Monitor UI Enhanced Kernel
 *
 * Author: ゐぬゐぬ (shiyuuda)
 * Date: 2026
 *
 * This implementation represents the deterministic evaluation
 * core of the C3PE v3.6.2 specification.
 *
 * Natural-language interpretation / context profiling is kept
 * separate from the Boolean evaluation core.
 * ============================================================ */

"use strict";

/* ============================================================
 * SYSTEM INITIALIZATION
 * ============================================================ */

const C3PE_NAME =
    "C3PE — Consciousness Three Principles Engine";

const C3PE_VERSION = "3.6.2";


/* ============================================================
 * RUNTIME EXCEPTION
 * ============================================================ */

class C3PEBoundaryUndefinedError extends Error {
    constructor() {
        super(
            "[ERROR] BOUNDARY_UNDEFINED: " +
            "The system boundary of the targeted Vessel is not defined. " +
            "Please specify the exact boundaries to proceed with the calculation."
        );

        this.name = "BOUNDARY_UNDEFINED";
    }
}


/* ============================================================
 * BASIC BINARY VALIDATION
 * ============================================================ */

function binary(value, name) {
    if (value !== 0 && value !== 1) {
        throw new TypeError(
            `${name} must be exactly 0 or 1.`
        );
    }

    return value;
}


/* ============================================================
 * STEP 1
 * OBJECT ISOLATION
 *
 * Article I / Runtime Pipeline
 * ============================================================ */

function validateBoundary(caseData) {
    if (
        !caseData ||
        caseData.boundaryDefined !== true ||
        !caseData.targetVessel
    ) {
        throw new C3PEBoundaryUndefinedError();
    }

    return true;
}


/* ============================================================
 * ARTICLE II
 * C1 — SUBJECTIVE EXPERIENCE
 *
 * C1 = 1 iff the target Vessel's own existence is continuously
 * instantiated as a first-person subjective state.
 *
 * C1 MUST NOT be inferred solely from:
 * - information processing
 * - intelligence
 * - memory
 * - self-recognition
 * - behavioral complexity
 * - functional sophistication
 * ============================================================ */

function evaluateC1(c1, reason = "") {
    const value = binary(c1, "C1");

    return {
        value,
        reason
    };
}


/* ============================================================
 * ARTICLE II
 * C2 — SELF-MAINTENANCE
 *
 * C2 = A OR B
 *
 * A = Cognitive Recognition
 * B = Functional Operation
 * ============================================================ */

function evaluateC2(A, B, reasons = {}) {
    const a = binary(A, "C2.A");
    const b = binary(B, "C2.B");

    const value = (a === 1 || b === 1) ? 1 : 0;

    return {
        value,
        A: a,
        B: b,
        reasonA: reasons.A || "",
        reasonB: reasons.B || ""
    };
}


/* ============================================================
 * ARTICLE II
 * MACRO-PHENOMENON
 *
 * Macro = C1 AND C2
 * ============================================================ */

function evaluateMacroPhenomenon(C1, C2) {
    const c1 = binary(C1, "C1");
    const c2 = binary(C2, "C2");

    return (c1 === 1 && c2 === 1) ? 1 : 0;
}


/* ============================================================
 * ARTICLE III
 * UNIQUE SUBJECTIVE ADDRESS
 * ============================================================ */

const SUBJECTIVE_IDENTITY = Object.freeze({
    CONTINUOUS: "CONTINUOUS",
    NEW_INSTANCE: "NEW_INSTANCE",
    MULTIPLEXED: "MULTIPLEXED",
    NULL: "NULL"
});


/*
 * Subjective Address Structure
 *
 * Each address is explicitly bound to a Vessel.
 *
 * IMPORTANT:
 * Data similarity, memory similarity, personality similarity,
 * or physical similarity MUST NOT merge addresses.
 *
 * Example:
 *
 * {
 *   id: "SA-001",
 *   vesselId: "VESSEL-A",
 *   active: true
 * }
 */

function validateSubjectiveAddress(address) {
    if (!address || typeof address !== "object") {
        throw new TypeError(
            "Each subjective address must be an object."
        );
    }

    if (!address.id) {
        throw new TypeError(
            "Each subjective address must have a unique id."
        );
    }

    if (!address.vesselId) {
        throw new TypeError(
            "Each subjective address must be explicitly bound to a Vessel."
        );
    }

    if (typeof address.active !== "boolean") {
        throw new TypeError(
            "Subjective address 'active' must be true or false."
        );
    }

    return true;
}


/*
 * Count ONLY active subjective addresses belonging to
 * the targeted Vessel.
 */

function countSubjectiveAddresses(addresses, targetVesselId) {
    if (!Array.isArray(addresses)) {
        return 0;
    }

    return addresses.filter(address => {
        validateSubjectiveAddress(address);

        return (
            address.vesselId === targetVesselId &&
            address.active === true
        );
    }).length;
}


/*
 * Article III identity evaluation.
 *
 * The engine does NOT derive identity from information similarity.
 * The identity state must be supplied as a logical result of
 * Vessel-bound address evaluation.
 */

function evaluateSubjectiveIdentity(data) {
    const {
        subjectiveAddresses = [],
        targetVesselId,
        identityStatus = null,
        identityReason = ""
    } = data;

    if (!targetVesselId) {
        throw new TypeError(
            "targetVesselId is required for Article III evaluation."
        );
    }

    subjectiveAddresses.forEach(validateSubjectiveAddress);

    const activeAddresses = subjectiveAddresses.filter(address =>
        address.vesselId === targetVesselId &&
        address.active === true
    );

    const activeCount = activeAddresses.length;

    /*
     * NULL:
     * No active subjective address exists in the target Vessel.
     */
    if (activeCount === 0) {
        return {
            status: SUBJECTIVE_IDENTITY.NULL,
            activeAddressCount: 0,
            activeAddresses,
            reason: identityReason ||
                "No active subjective address exists within the target Vessel."
        };
    }

    /*
     * MULTIPLEXED:
     * Two or more independently distinguishable active subjective
     * addresses exist simultaneously within one Vessel.
     */
    if (activeCount >= 2) {
        return {
            status: SUBJECTIVE_IDENTITY.MULTIPLEXED,
            activeAddressCount: activeCount,
            activeAddresses,
            reason: identityReason ||
                "Two or more independent subjective addresses are simultaneously active within the target Vessel."
        };
    }

    /*
     * Exactly one active address remains.
     *
     * The engine does NOT infer CONTINUOUS or NEW_INSTANCE from
     * memory, personality, information, or physical similarity.
     *
     * The status must therefore be explicitly supplied.
     */
    if (
        identityStatus !== SUBJECTIVE_IDENTITY.CONTINUOUS &&
        identityStatus !== SUBJECTIVE_IDENTITY.NEW_INSTANCE
    ) {
        throw new TypeError(
            "For exactly one active subjective address, " +
            "identityStatus must be CONTINUOUS or NEW_INSTANCE."
        );
    }

    return {
        status: identityStatus,
        activeAddressCount: 1,
        activeAddresses,
        reason: identityReason
    };
}


/* ============================================================
 * ARTICLE IV
 * CAUSAL COMPOSSIBILITY
 * ============================================================ */

/*
 * Expected causal condition format:
 *
 * {
 *   id: "EVENT_A",
 *   context: "same specified conditions",
 *   value: 1
 * }
 *
 * The logical key is:
 *
 *     id + context
 *
 * A contradiction exists ONLY when the same logical condition
 * under the same specified context is simultaneously asserted
 * as both 1 and 0.
 */

function causalConditionKey(condition) {
    const id = condition.id;
    const context =
        condition.context === undefined
            ? ""
            : String(condition.context);

    return `${id}::${context}`;
}


function evaluateCausalCompossibility(conditions = []) {
    if (!Array.isArray(conditions)) {
        throw new TypeError(
            "causalConditions must be an array."
        );
    }

    const conditionStates = new Map();

    for (const condition of conditions) {
        if (!condition || typeof condition !== "object") {
            throw new TypeError(
                "Each causal condition must be an object."
            );
        }

        if (!condition.id) {
            throw new TypeError(
                "Each causal condition must have an id."
            );
        }

        const value = binary(
            condition.value,
            `causal condition '${condition.id}'`
        );

        const key = causalConditionKey(condition);

        if (!conditionStates.has(key)) {
            conditionStates.set(key, new Set());
        }

        conditionStates.get(key).add(value);
    }


    /*
     * Search for:
     *
     * SAME logical condition
     * SAME specified context
     *
     * required as BOTH 1 and 0.
     */

    for (const [key, states] of conditionStates.entries()) {
        if (states.has(0) && states.has(1)) {
            return {
                value: 0,
                contradiction: true,
                reason:
                    `Logical self-contradiction detected: ` +
                    `the same condition under identical specified ` +
                    `conditions is simultaneously required to be 1 and 0.`,
                conflictingCondition: key
            };
        }
    }


    /*
     * No logical self-contradiction detected.
     *
     * This does NOT claim physical or metaphysical possibility.
     * It only establishes logical compossibility within the
     * supplied scenario constraints.
     */

    return {
        value: 1,
        contradiction: false,
        reason:
            "No logical self-contradiction was detected within the supplied temporal constraints.",
        conflictingCondition: null
    };
}


/* ============================================================
 * STANDARDIZED MONITOR
 * ============================================================ */

function generateMonitor(result) {

    const c1Text =
        result.C1 === 1
            ? "主観経験あり"
            : "主観経験なし";

    const c2Text =
        result.C2 === 1
            ? "自己維持あり"
            : "自己維持なし";

    const macroText =
        result.macroPhenomenon === 1
            ? "意識成立"
            : "意識不成立";

    const causalText =
        result.causalCompossibility === 1
            ? "因果矛盾なし"
            : "因果矛盾あり";

    const output =
        result.macroPhenomenon === 1
            ? "1［CONSCIOUSNESS_ESTABLISHED］"
            : "0［CONSCIOUSNESS_NOT_ESTABLISHED］";


    return `### 🖥️ [C3PE EVALUATION MONITOR v3.6.2]
- **Target Vessel**: ${result.targetVessel}

#### 🛠️ INPUT PROFILING
- **C1 (Subjective Experience)** = ${result.C1}［${c1Text}］（${result.C1Reason}）
- **C2 (Self-Maintenance)**      = ${result.C2}［${c2Text}］（[A] ${result.A}：${result.AReason} / [B] ${result.B}：${result.BReason}）

#### ⚡ LOGIC GATE STATUS
- **Macro-Phenomenon (C1 AND C2)** = ${result.macroPhenomenon}［${macroText}］

#### 🧠 意識数カウント・モニター
- **対象Vessel内のアクティブ主観アドレス数**：${result.activeSubjectiveAddressCount}個
 （※当該Vessel内で同時にアクティブとして成立している、相互に区別可能な主観アドレスの総数）

#### 🆔 主観同一性評価（Article III）
- **Subjective Identity** = ${result.subjectiveIdentity}
 ➔ ［CONTINUOUS］：同一の主観アドレスが、Vesselの状態変化をまたいでも同一アドレスとして論理的に維持されている状態
 ➔ ［NEW_INSTANCE］：別のVesselに新たに成立した主観アドレス。元のVesselが存続しているか否か、またはデータ・記憶・人格・物理状態が一致しているか否かによって、元の主観アドレスと同一にはならない。
 ➔ ［MULTIPLEXED］：1つのVessel内に2個以上の独立した主観アドレスが同時にアクティブとして存在する状態
 ➔ ［NULL］：アクティブな主観アドレスが存在しない状態
 ➔ （${result.subjectiveIdentityReason}）

#### 🌀 因果整合性評価（Article IV）
- **Causal Compossibility** = ${result.causalCompossibility}［${causalText}］（${result.causalReason}）

#### 📊 OUTPUT DISPLAY
- **[算出結果（統合意識の成立フラグ）]** ➔ ${output}
 （※マクロ現象評価が0の場合は、必ず \`0［CONSCIOUSNESS_NOT_ESTABLISHED］\` と出力すること）`;
}


/* ============================================================
 * DETERMINISTIC C3PE CORE
 *
 * This function receives already-profiled variables.
 *
 * It does NOT invent C1/C2 values from arbitrary text.
 * Natural-language Context Profiling belongs to a separate
 * layer and must supply these normalized variables.
 * ============================================================ */

function evaluateC3PE(caseData) {

    /* --------------------------------------------------------
     * STEP 1 — OBJECT ISOLATION
     * -------------------------------------------------------- */

    validateBoundary(caseData);


    /* --------------------------------------------------------
     * Target Vessel
     * -------------------------------------------------------- */

    const targetVessel = caseData.targetVessel;

    const targetVesselId =
        caseData.targetVesselId || targetVessel;


    /* --------------------------------------------------------
     * STEP 2 — NORMALIZED INPUT
     * -------------------------------------------------------- */

    const c1Result = evaluateC1(
        caseData.C1,
        caseData.C1Reason || ""
    );

    const c2Result = evaluateC2(
        caseData.A,
        caseData.B,
        {
            A: caseData.AReason || "",
            B: caseData.BReason || ""
        }
    );


    /* --------------------------------------------------------
     * ARTICLE II
     * -------------------------------------------------------- */

    const macroPhenomenon =
        evaluateMacroPhenomenon(
            c1Result.value,
            c2Result.value
        );


    /* --------------------------------------------------------
     * ARTICLE III
     * -------------------------------------------------------- */

    const identityResult =
        evaluateSubjectiveIdentity({
            subjectiveAddresses:
                caseData.subjectiveAddresses || [],
            targetVesselId,
            identityStatus:
                caseData.identityStatus || null,
            identityReason:
                caseData.identityReason || ""
        });


    /* --------------------------------------------------------
     * ARTICLE IV
     *
     * Completely independent from Macro-Phenomenon.
     * -------------------------------------------------------- */

    const causalResult =
        evaluateCausalCompossibility(
            caseData.causalConditions || []
        );


    /* --------------------------------------------------------
     * STANDARDIZED RESULT
     * -------------------------------------------------------- */

    const result = {

        targetVessel,

        C1: c1Result.value,
        C1Reason: c1Result.reason,

        C2: c2Result.value,

        A: c2Result.A,
        AReason: c2Result.reasonA,

        B: c2Result.B,
        BReason: c2Result.reasonB,

        macroPhenomenon,

        activeSubjectiveAddressCount:
            identityResult.activeAddressCount,

        subjectiveIdentity:
            identityResult.status,

        subjectiveIdentityReason:
            identityResult.reason,

        causalCompossibility:
            causalResult.value,

        causalReason:
            causalResult.reason,

        causalContradiction:
            causalResult.contradiction,

        conflictingCondition:
            causalResult.conflictingCondition
    };


    /* --------------------------------------------------------
     * STEP 3 — STANDARDIZED OUTPUT
     * -------------------------------------------------------- */

    result.monitor = generateMonitor(result);

    return result;
}


/* ============================================================
 * INITIALIZATION
 * ============================================================ */

function initialize() {
    return (
        `${C3PE_NAME} v${C3PE_VERSION}: ` +
        "SYSTEM_INITIALIZATION COMPLETE"
    );
}


/* ============================================================
 * PUBLIC API
 * ============================================================ */

const C3PE = Object.freeze({

    name: C3PE_NAME,
    version: C3PE_VERSION,

    initialize,

    evaluate: evaluateC3PE,

    evaluateC1,
    evaluateC2,
    evaluateMacroPhenomenon,

    evaluateSubjectiveIdentity,
    countSubjectiveAddresses,

    evaluateCausalCompossibility,

    generateMonitor,

    SUBJECTIVE_IDENTITY,

    C3PEBoundaryUndefinedError
});


/* ============================================================
 * GLOBAL EXPORT
 * ============================================================ */

if (typeof window !== "undefined") {
    window.C3PE = C3PE;
}


/* ============================================================
 * MODULE EXPORT
 * ============================================================ */

if (typeof module !== "undefined" && module.exports) {
    module.exports = C3PE;
}


/* ============================================================
 * SYSTEM READY
 * ============================================================ */

console.log(
    `${C3PE_NAME} v${C3PE_VERSION} initialized.`
);
```
