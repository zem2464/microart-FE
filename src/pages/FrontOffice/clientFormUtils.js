// Utility helpers for ClientForm grading payload transformation
export function normalizeCustomRate(raw) {
    if (raw === undefined || raw === null) return null;
    if (typeof raw === 'number') return raw;
    const s = String(raw).trim();
    if (s === '') return null;
    const p = parseFloat(s);
    return Number.isFinite(p) ? p : null;
}

/**
 * Build gradings payload from an array that may contain string IDs or grading objects.
 * Items: array of string | { gradingId, customRate?, currency?, unit? }
 */
export function buildGradingsPayload(items = [], gradingCustomRates = {}, gradingsData = {}) {
    if (!Array.isArray(items)) return [];

    return items.map((gItem) => {
        let gradingId = null;
        let originalCustom = undefined;

        if (typeof gItem === 'string') {
            gradingId = gItem;
        } else if (gItem && typeof gItem === 'object') {
            gradingId = gItem.gradingId;
            originalCustom = gItem.customRate;
        }

        const gradingData = gradingsData?.gradingsByWorkType?.find((g) => g.id === gradingId);

        const customRaw = (originalCustom !== undefined)
            ? originalCustom
            : gradingCustomRates[gradingId] || 0;

        return {
            gradingId,
            customRate: normalizeCustomRate(customRaw),
            currency: gradingData?.currency || 'INR',
            unit: gradingData?.unit || 'image',
        };
    });
}

const clientFormUtils = { normalizeCustomRate, buildGradingsPayload };

export default clientFormUtils;
