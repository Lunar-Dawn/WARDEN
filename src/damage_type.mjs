/**
 * @typedef DamageType
 * @property {"physical"|"energy"|"special"} category
 * @property {string} abbreviation
 */

/**
 *
 * @type {Record<string, DamageType>}
 */
export const DAMAGE_TYPES = {
	bleed: { category: "physical", abbreviation: "Be" },
	blunt: { category: "physical", abbreviation: "B" },
	pierce: { category: "physical", abbreviation: "P" },
	slash: { category: "physical", abbreviation: "S" },

	acid: { category: "energy", abbreviation: "Ac" },
	cold: { category: "energy", abbreviation: "C" },
	electricity: { category: "energy", abbreviation: "E" },
	fire: { category: "energy", abbreviation: "F" },
	toxic: { category: "energy", abbreviation: "T" },

	aether: { category: "special", abbreviation: "Ae" },
	dark: { category: "special", abbreviation: "D" },
	holy: { category: "special", abbreviation: "H" },
	psychic: { category: "special", abbreviation: "Psy" },
};

export const DAMAGE_TYPE_CHOICES = Object.fromEntries(
	Object.entries(DAMAGE_TYPES).map(([k, _]) => [
		k,
		`warden.damage_type.${k}`,
	]),
);

export const DAMAGE_CATEGORY_CHOICES = Object.fromEntries(
	Object.entries(DAMAGE_TYPES).map(([_, v]) => [
		v.category,
		`warden.damage_category.${v.category}`,
	]),
);

/**
 * @brief When given a damage type abbreviation, returns the key for said damage type in WARDEN.DAMAGE_TYPES.
 * 
 * @details REALLY shitty solution, to be replaced when we actually make resolvers use separate classes and shit.
 * For now, this is needed to determine what damage types we actually picked for an Effect Roll.
 * 
 * @param {string} abbr The abbreviation for the damage type.
 * @returns As brief description, but also returns undefined if no match can be found.
 */
export function damageTypeFromAbbreviation(abbr) {
	return Object.entries(WARDEN.DAMAGE_TYPES)
		.find(([, { abbreviation: value }]) => value === abbr)?.[0];
}