import type { Ipo, IpoSignal } from "./types.js";
/**
 * Explainable IPO verdict. Every dimension contributes a weighted, signed
 * `points` value plus a human-readable `note`, so the final APPLY / SKIP /
 * WATCH call is fully auditable rather than a black box.
 */
export declare function computeIpoSignal(ipo: Ipo): IpoSignal;
