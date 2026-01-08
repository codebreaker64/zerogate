/**
 * XLS-24d Compliant Metadata Schemas for RWA Assets
 * Implements polymorphic metadata with base + extension pattern
 */

/**
 * Base Metadata Schema
 * Common structure for all RWA tokens
 */
export const BASE_METADATA_SCHEMA = {
    schema: "https://zerogate.com/schemas/v1/base.json",
    nftType: "rwa.v0",
    name: "", // Asset name
    description: "", // Asset description
    image: "", // IPFS thumbnail/logo
    issuer: "", // Service provider address
    attributes: [
        { trait_type: "Asset Category", value: "" },
        { trait_type: "Origin Country", value: "Singapore" },
        { trait_type: "Compliance Status", value: "Verified" },
        { trait_type: "Issuance Date", value: "" }
    ],
    properties: {
        legal_documents: [],
        asset_specific_data: {}
    }
};

/**
 * Real Estate Metadata Extension
 */
export const REAL_ESTATE_SCHEMA = {
    requiredFields: [
        'property_address',
        'gross_leasable_area',
        'valuation_date',
        'property_type'
    ],
    optionalFields: [
        'occupancy_rate',
        'year_built',
        'rental_yield',
        'latitude',
        'longitude',
        'zoning',
        'parking_spaces'
    ],
    requiredDocuments: [
        {
            type: 'title_deed',
            name: 'Title Deed',
            description: 'Official property ownership deed'
        },
        {
            type: 'valuation_report',
            name: 'Property Appraisal Report',
            description: 'Independent valuation by certified appraiser'
        },
        {
            type: 'spv_incorporation',
            name: 'SPV Incorporation Documents',
            description: 'Special Purpose Vehicle legal documents'
        }
    ],
    metadataTemplate: {
        property_address: "",
        gross_leasable_area: 0, // in sq ft
        occupancy_rate: 0, // percentage
        valuation_date: "",
        property_type: "", // Commercial Office, Residential, Industrial, etc.
        year_built: 0,
        rental_yield: 0 // percentage
    }
};

/**
 * Fixed Income (Bonds) Metadata Extension
 */
export const FIXED_INCOME_SCHEMA = {
    requiredFields: [
        'maturity_date',
        'coupon_rate',
        'payment_frequency',
        'face_value'
    ],
    optionalFields: [
        'credit_rating',
        'bond_type',
        'issuer_credit_rating',
        'call_date',
        'put_date',
        'yield_to_maturity'
    ],
    requiredDocuments: [
        {
            type: 'offering_memorandum',
            name: 'Offering Memorandum',
            description: 'Official bond offering document'
        },
        {
            type: 'term_sheet',
            name: 'Term Sheet',
            description: 'Bond terms and conditions'
        },
        {
            type: 'trustee_agreement',
            name: 'Trustee Agreement',
            description: 'Independent trustee appointment'
        }
    ],
    metadataTemplate: {
        maturity_date: "", // ISO date
        coupon_rate: 0, // percentage
        payment_frequency: "", // Annual, Semi-Annual, Quarterly, Monthly
        face_value: 0,
        credit_rating: "",
        bond_type: "" // Corporate Bond, Government Bond, Municipal Bond
    }
};

/**
 * Carbon Credits Metadata Extension
 */
export const CARBON_CREDITS_SCHEMA = {
    requiredFields: [
        'project_type',
        'vintage_year',
        'registry_id',
        'registry',
        'total_credits'
    ],
    optionalFields: [
        'verification_standard',
        'project_location',
        'co2_equivalent_tons',
        'verification_body',
        'project_start_date',
        'project_end_date'
    ],
    requiredDocuments: [
        {
            type: 'verification_report',
            name: 'Verification Report',
            description: 'Third-party verification of carbon credits'
        },
        {
            type: 'certification',
            name: 'Certification Statement',
            description: 'Registry certification (Verra/Gold Standard)'
        },
        {
            type: 'audit_logs',
            name: 'Audit Logs',
            description: 'Project monitoring and audit records'
        }
    ],
    metadataTemplate: {
        project_type: "", // Reforestation, Renewable Energy, etc.
        vintage_year: 0,
        registry_id: "",
        registry: "", // Verra, Gold Standard, ACR
        total_credits: 0,
        verification_standard: "" // VCS, CCB, CDM
    }
};

/**
 * Commodities Metadata Extension
 */
export const COMMODITIES_SCHEMA = {
    requiredFields: [
        'commodity_type',
        'quantity',
        'unit_of_measure',
        'storage_location',
        'quality_grade'
    ],
    optionalFields: [
        'warehouse_receipt_number',
        'expiry_date',
        'assay_report',
        'insurance_value'
    ],
    requiredDocuments: [
        {
            type: 'warehouse_receipt',
            name: 'Warehouse Receipt',
            description: 'Official commodity storage receipt'
        },
        {
            type: 'quality_certificate',
            name: 'Quality Certification',
            description: 'Independent quality assessment'
        },
        {
            type: 'insurance_policy',
            name: 'Insurance Policy',
            description: 'Commodity insurance coverage'
        }
    ],
    metadataTemplate: {
        commodity_type: "", // Gold, Silver, Oil, etc.
        quantity: 0,
        unit_of_measure: "", // Troy Ounces, Barrels, Tons
        storage_location: "",
        quality_grade: ""
    }
};

/**
 * Get schema for asset category
 */
export function getAssetSchema(category) {
    const schemas = {
        real_estate: REAL_ESTATE_SCHEMA,
        fixed_income: FIXED_INCOME_SCHEMA,
        carbon_credits: CARBON_CREDITS_SCHEMA,
        commodities: COMMODITIES_SCHEMA
    };

    return schemas[category] || null;
}

/**
 * Build complete XLS-24d metadata
 */
export function buildMetadata({
    assetName,
    description,
    imageUri,
    issuerAddress,
    category,
    country,
    assetSpecificData,
    legalDocuments
}) {
    const baseMetadata = {
        ...BASE_METADATA_SCHEMA,
        name: assetName,
        description,
        image: imageUri,
        issuer: issuerAddress,
        attributes: [
            { trait_type: "Asset Category", value: category },
            { trait_type: "Origin Country", value: country },
            { trait_type: "Compliance Status", value: "Verified" },
            { trait_type: "Issuance Date", value: new Date().toISOString() }
        ],
        properties: {
            legal_documents: legalDocuments.map(doc => ({
                name: doc.name,
                uri: doc.uri,
                hash: doc.hash,
                type: doc.type
            })),
            asset_specific_data: assetSpecificData
        }
    };

    return baseMetadata;
}

/**
 * Validate metadata against schema
 */
export function validateMetadata(category, metadata) {
    const schema = getAssetSchema(category);
    if (!schema) {
        return { valid: false, errors: ['Unknown asset category'] };
    }

    const errors = [];

    // Check required fields
    for (const field of schema.requiredFields) {
        if (!metadata[field]) {
            errors.push(`Missing required field: ${field}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Get required documents for category
 */
export function getRequiredDocuments(category) {
    const schema = getAssetSchema(category);
    return schema ? schema.requiredDocuments : [];
}
