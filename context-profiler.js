 /* ============================================================
  * C3PE — Context Profiler
  * Version: 3.6.2
  *
  * Natural Language
  *        ↓
  * Context Profiling
  *        ↓
  * Normalized C3PE Input
  *
  * IMPORTANT:
  * This layer does NOT perform the C3PE Boolean calculation.
  * It only converts natural-language context into normalized
  * logical input for the deterministic C3PE core.
  * ============================================================ */

 "use strict";


 /* ============================================================
  * PROFILING STATUS
  * ============================================================ */

 const C3PE_PROFILING_STATUS = Object.freeze({

     COMPLETE:
         "COMPLETE",

     PROFILE_UNDEFINED:
         "PROFILE_UNDEFINED",

     BOUNDARY_UNDEFINED:
         "BOUNDARY_UNDEFINED"
 });


 /* ============================================================
  * UNKNOWN
  *
  * UNKNOWN is NOT equivalent to 0.
  * ============================================================ */

 const UNKNOWN = null;


 /* ============================================================
  * PROFILE RESULT
  * ============================================================ */

 function createProfileResult() {

     return {

         status:
             C3PE_PROFILING_STATUS.PROFILE_UNDEFINED,

         boundaryDefined: false,

         targetVessel: null,

         targetVesselId: null,

         C1: UNKNOWN,
         C1Reason: "",

         A: UNKNOWN,
         AReason: "",

         B: UNKNOWN,
         BReason: "",

         subjectiveAddresses: [],

         identityStatus: null,
         identityReason: "",

         causalConditions: [],

         profilingTrace: []
     };
 }


 /* ============================================================
  * PROFILING HELPERS
  * ============================================================ */

 function addTrace(result, field, value, reason) {

     result.profilingTrace.push({

         field,
         value,
         reason
     });
 }


 /* ============================================================
  * STEP 1
  * OBJECT ISOLATION
  *
  * This first implementation intentionally requires an
  * identifiable target rather than inventing one.
  * ============================================================ */

 function profileBoundary(text, result) {

     /*
      * Explicit Target Vessel syntax.
      *
      * Example:
      *
      * Target Vessel: Human-A
      */

     const explicit =
         text.match(
             /Target\s*Vessel\s*[:：=]\s*([A-Za-z0-9_-]+)/i
         );


     if (explicit) {

         result.boundaryDefined = true;

         result.targetVessel =
             explicit[1];

         result.targetVesselId =
             explicit[1];

         addTrace(
             result,
             "Target Vessel",
             explicit[1],
             "Explicit Target Vessel was supplied."
         );

         return;
     }


     /*
      * Japanese explicit target.
      *
      * Example:
      *
      * 対象Vessel：A
      */

     const japaneseExplicit =
         text.match(
             /対象\s*Vessel\s*[:：=]\s*([A-Za-z0-9_-]+)/i
         );


     if (japaneseExplicit) {

         result.boundaryDefined = true;

         result.targetVessel =
             japaneseExplicit[1];

         result.targetVesselId =
             japaneseExplicit[1];

         addTrace(
             result,
             "Target Vessel",
             japaneseExplicit[1],
             "対象Vessel was explicitly supplied."
         );

         return;
     }


     /*
      * Single clearly specified entity.
      *
      * This is deliberately conservative.
      */

     const singularHuman =
         /^(?:ある)?人物(?:が|は|の)/.test(
             text.trim()
         );


     if (singularHuman) {

         result.boundaryDefined = true;

         result.targetVessel =
             "Vessel-1";

         result.targetVesselId =
             "Vessel-1";

         addTrace(
             result,
             "Target Vessel",
             "Vessel-1",
             "A singular human Vessel is specified."
         );

         return;
     }


     /*
      * No sufficiently explicit boundary.
      */

     result.status =
         C3PE_PROFILING_STATUS.BOUNDARY_UNDEFINED;

     addTrace(
         result,
         "Target Vessel",
         UNKNOWN,
         "The target Vessel cannot be isolated with sufficient certainty."
     );
 }


 /* ============================================================
  * STEP 2
  * C1 — SUBJECTIVE EXPERIENCE
  *
  * IMPORTANT:
  *
  * Intelligence, memory, information processing,
  * self-recognition, behavior, etc. are NOT sufficient
  * evidence for C1.
  * ============================================================ */

 function profileC1(text, result) {

     /*
      * Explicit positive statements.
      */

     const positivePatterns = [

         "自己存在の第一人称的主観経験",

         "自分自身の存在を主観として経験",

         "自分の存在を主観として経験",

         "自分が存在していることを主観として経験",

         "自己の存在を第一人称的に経験",

         "第一人称の主観経験"
     ];


     if (
         positivePatterns.some(
             pattern => text.includes(pattern)
         )
     ) {

         result.C1 = 1;

         result.C1Reason =
             "The input explicitly establishes first-person subjective experience of the target Vessel's own existence.";

         addTrace(
             result,
             "C1",
             1,
             result.C1Reason
         );

         return;
     }


     /*
      * Explicit negative statements.
      */

     const negativePatterns = [

         "主観経験はない",

         "主観的経験はない",

         "主観経験が存在しない",

         "自己存在の主観経験はない",

         "第一人称の主観経験はない"
     ];


     if (
         negativePatterns.some(
             pattern => text.includes(pattern)
         )
     ) {

         result.C1 = 0;

         result.C1Reason =
             "The input explicitly denies first-person subjective experience.";

         addTrace(
             result,
             "C1",
             0,
             result.C1Reason
         );

         return;
     }


     /*
      * No inference.
      */

     result.C1 = UNKNOWN;

     result.C1Reason =
         "Insufficient information. C1 cannot be inferred from intelligence, memory, information processing, self-recognition, or behavior alone.";

     addTrace(
         result,
         "C1",
         UNKNOWN,
         result.C1Reason
     );
 }


 /* ============================================================
  * C2-A
  *
  * Cognitive Recognition
  * ============================================================ */

 function profileA(text, result) {

     const positivePatterns = [

         "自分を守ろうとする",

         "自分自身を守ろうとする",

         "自己保存を意図する",

         "自己維持を意図する",

         "自分自身を維持しようと判断する",

         "自己保存を考える"
     ];


     if (
         positivePatterns.some(
             pattern => text.includes(pattern)
         )
     ) {

         result.A = 1;

         result.AReason =
             "The input establishes internal cognitive orientation toward preservation of the target system.";

         addTrace(
             result,
             "A",
             1,
             result.AReason
         );

         return;
     }


     const negativePatterns = [

         "自分を守ろうとしない",

         "自己保存を意図しない",

         "自己維持を意図しない",

         "自己保存を考えない"
     ];


     if (
         negativePatterns.some(
             pattern => text.includes(pattern)
         )
     ) {

         result.A = 0;

         result.AReason =
             "The input explicitly denies cognitive orientation toward self-preservation.";

         addTrace(
             result,
             "A",
             0,
             result.AReason
         );

         return;
     }


     result.A = UNKNOWN;

     result.AReason =
         "Insufficient information to determine cognitive self-maintenance.";

     addTrace(
         result,
         "A",
         UNKNOWN,
         result.AReason
     );
 }


 /* ============================================================
  * C2-B
  *
  * Functional Operation
  * ============================================================ */

 function profileB(text, result) {

     const positivePatterns = [

         "自動的に自分を修復",

         "自動的に自己修復",

         "自分自身を修復",

         "自己修復機構",

         "自己保存機構",

         "自身を維持する機構"
     ];


     if (
         positivePatterns.some(
             pattern => text.includes(pattern)
         )
     ) {

         result.B = 1;

         result.BReason =
             "The input establishes system-driven functional operation directed toward self-preservation.";

         addTrace(
             result,
             "B",
             1,
             result.BReason
         );

         return;
     }


     const negativePatterns = [

         "自己修復しない",

         "自分自身を修復しない",

         "自己保存機構はない"
     ];


     if (
         negativePatterns.some(
             pattern => text.includes(pattern)
         )
     ) {

         result.B = 0;

         result.BReason =
             "The input explicitly denies self-preserving functional operation.";

         addTrace(
             result,
             "B",
             0,
             result.BReason
         );

         return;
     }


     result.B = UNKNOWN;

     result.BReason =
         "Insufficient information to determine functional self-maintenance.";

     addTrace(
         result,
         "B",
         UNKNOWN,
         result.BReason
     );
 }


 /* ============================================================
  * ARTICLE III
  *
  * SUBJECTIVE ADDRESS
  *
  * The profiler does NOT invent subjective addresses.
  *
  * Explicit addresses are passed through when supplied.
  * When no explicit address state is supplied, the state remains
  * unspecified here and is resolved by the deterministic C3PE
  * core according to Article II and Article III.
  * ============================================================ */

 function profileSubjectiveAddress(
     text,
     result
 ) {

     /*
      * Explicit address declaration.
      */

     if (
         text.includes("主観アドレスが存在") ||
         text.includes("主観的アドレスが存在")
     ) {

         result.subjectiveAddresses = [

             {
                 id:
                     `${result.targetVesselId}-SA-001`,

                 vesselId:
                     result.targetVesselId,

                 active:
                     true
             }
         ];


         addTrace(
             result,
             "Subjective Address",
             "ACTIVE",
             "An active subjective address is explicitly established."
         );

         return;
     }


     /*
      * Explicit absence.
      */

     if (
         text.includes("主観アドレスは存在しない") ||
         text.includes("主観的アドレスは存在しない")
     ) {

         result.subjectiveAddresses = [];

         addTrace(
             result,
             "Subjective Address",
             "NULL",
             "The input explicitly establishes absence of an active subjective address."
         );

         return;
     }


     /*
      * UNKNOWN.
      *
      * Do not automatically create an explicit address in the
      * profiling layer merely because a Vessel exists.
      *
      * If Article II subsequently establishes consciousness,
      * the deterministic C3PE core resolves the unspecified
      * single-subject case without requiring this profiler to
      * invent an address object.
      */

     result.subjectiveAddresses = [];

     addTrace(
         result,
         "Subjective Address",
         UNKNOWN,
         "No explicit subjective address state was supplied."
     );
 }


 /* ============================================================
  * ARTICLE III
  *
  * IDENTITY RELATION
  * ============================================================ */

 function profileIdentity(text, result) {

     if (
         text.includes("同一の主観が連続") ||
         text.includes("主観が連続している") ||
         text.includes("主観的に連続している")
     ) {

         result.identityStatus =
             "CONTINUOUS";

         result.identityReason =
             "The input explicitly establishes continuity of the same subjective address.";

         addTrace(
             result,
             "Article III",
             "CONTINUOUS",
             result.identityReason
         );

         return;
     }


     if (
         text.includes("新しい主観") ||
         text.includes("新規インスタンス") ||
         text.includes("別個の主観") ||
         text.includes("別の主観アドレス")
     ) {

         result.identityStatus =
             "NEW_INSTANCE";

         result.identityReason =
             "The input explicitly establishes a distinct subjective instance.";

         addTrace(
             result,
             "Article III",
             "NEW_INSTANCE",
             result.identityReason
         );

         return;
     }


     result.identityStatus =
         null;

     result.identityReason =
         "No explicit subjective identity relation was supplied.";

     addTrace(
         result,
         "Article III",
         UNKNOWN,
         result.identityReason
     );
 }


 /* ============================================================
  * ARTICLE IV
  *
  * TEMPORAL / CAUSAL CONDITIONS
  * ============================================================ */

 function profileCausalConditions(
     text,
     result
 ) {

     /*
      * This first implementation does NOT invent temporal
      * conditions.
      *
      * Only explicitly stated logical contradictions are
      * normalized.
      */

     if (
         text.includes("同時に1と0") ||
         text.includes("同時に1と0になる") ||
         text.includes("論理的矛盾")
     ) {

         result.causalConditions = [

             {
                 id:
                     "P",

                 context:
                     "specified-condition",

                 value:
                     1
             },

             {
                 id:
                     "P",

                 context:
                     "specified-condition",

                 value:
                     0
             }
         ];


         addTrace(
             result,
             "Article IV",
             0,
             "The same logical condition is explicitly asserted as both 1 and 0."
         );

         return;
     }


     /*
      * No causal contradiction supplied.
      *
      * Empty causal constraints are valid for the current
      * deterministic Article IV implementation.
      */

     result.causalConditions = [];

     addTrace(
         result,
         "Article IV",
         1,
         "No explicit causal contradiction was supplied."
     );
 }


 /* ============================================================
  * MAIN CONTEXT PROFILER
  * ============================================================ */

 function profileC3PEContext(text) {

     const result =
         createProfileResult();


     if (
         typeof text !== "string" ||
         text.trim() === ""
     ) {

         result.status =
             C3PE_PROFILING_STATUS.PROFILE_UNDEFINED;

         return result;
     }


     const normalizedText =
         text.trim();


     /* --------------------------------------------------------
      * STEP 1 — OBJECT ISOLATION
      * -------------------------------------------------------- */

     profileBoundary(
         normalizedText,
         result
     );


     if (
         result.status ===
         C3PE_PROFILING_STATUS.BOUNDARY_UNDEFINED
     ) {

         return result;
     }


     /* --------------------------------------------------------
      * STEP 2 — CONTEXT PROFILING
      * -------------------------------------------------------- */

     profileC1(
         normalizedText,
         result
     );

     profileA(
         normalizedText,
         result
     );

     profileB(
         normalizedText,
         result
     );


     profileSubjectiveAddress(
         normalizedText,
         result
     );

     profileIdentity(
         normalizedText,
         result
     );

     profileCausalConditions(
         normalizedText,
         result
     );


     /* --------------------------------------------------------
      * REQUIRED ARTICLE II INPUT
      *
      * UNKNOWN is NOT converted to 0.
      * -------------------------------------------------------- */

     if (
         result.C1 === UNKNOWN ||
         result.A === UNKNOWN ||
         result.B === UNKNOWN
     ) {

         result.status =
             C3PE_PROFILING_STATUS.PROFILE_UNDEFINED;

         return result;
     }


     result.status =
         C3PE_PROFILING_STATUS.COMPLETE;


     return result;
 }


 /* ============================================================
  * PUBLIC API
  * ============================================================ */

 const C3PEContextProfiler = Object.freeze({

     version:
         "3.6.2",

     UNKNOWN,

     STATUS:
         C3PE_PROFILING_STATUS,

     profile:
         profileC3PEContext
 });


 /* ============================================================
  * GLOBAL EXPORT
  * ============================================================ */

 if (typeof window !== "undefined") {

     window.C3PEContextProfiler =
         C3PEContextProfiler;
 }


 /* ============================================================
  * MODULE EXPORT
  * ============================================================ */

 if (
     typeof module !== "undefined" &&
     module.exports
 ) {

     module.exports =
         C3PEContextProfiler;
 }
