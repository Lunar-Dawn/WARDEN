import { BaseCharacterData } from "./base_character.mjs";

const {
	BooleanField,
	SchemaField,
	NumberField,
	TypedObjectField,
	StringField,
} = foundry.data.fields;

export class BaseOpponentData extends BaseCharacterData {
	/**
	 * @returns Object
	 */
	static defineSchema() {
		const proficiencyField = () =>
			new SchemaField({
				is_major: new BooleanField({ required: true, initial: false }),
			});

		const schema = super.defineSchema();

		schema.max_hit_points = new NumberField({
			required: true,
			min: 0,
			initial: 10,
		});
		schema.max_strain = new NumberField({
			required: true,
			min: 0,
			initial: 5,
		});

		schema.toughness = proficiencyField();
		schema.perception = proficiencyField();
		schema.resolve = proficiencyField();
		schema.combat = proficiencyField();
		schema.special = proficiencyField();
		schema.skill = proficiencyField();

		schema.abilities = new TypedObjectField(
			new SchemaField({
				is_major: new BooleanField({ required: true, initial: false }),
				description: new StringField({ required: true }),
			}),
		);

		return schema;
	}

	/**
	 * Collect the dynamic effects that are specific to NPC sheets
	 *
	 * @return {Generator<DynamicEffect>}
	 */
	*getBaseDynamicEffects() {
		yield* super.getBaseDynamicEffects();

		yield* this.#createBaseStatDynamicEffects();
		yield* this.#createStatisticsDynamicEffects();
		yield* this.#createProficiencyDynamicEffects();
	}

	/**
	 * Create the effects to calculate the minor and major statistic
	 *
	 * @return {Generator<DynamicEffect>}
	 */
	*#createStatisticsDynamicEffects() {
		yield {
			type: "proficiency_rank",
			label: "Major Statistic",
			domains: new Set(["major-statistic"]),
			defaultEnabled: true,

			mode: "upgrade",
			value: this.majorProficiencyRank,
		};
		yield {
			type: "proficiency_rank",
			label: "Minor Statistic",
			domains: new Set(["minor-statistic"]),
			defaultEnabled: true,

			mode: "upgrade",
			value: this.minorProficiencyRank,
		};
		yield {
			type: "bonus",
			label: "Major Statistic",
			domains: new Set(["major-statistic"]),
			defaultEnabled: true,

			modifier_type: "proficiency",

			mode: "upgrade",
			value: "@profCalc",
		};
		yield {
			type: "bonus",
			label: "Minor Statistic",
			domains: new Set(["minor-statistic"]),
			defaultEnabled: true,

			modifier_type: "proficiency",

			mode: "upgrade",
			value: "@profCalc",
		};
	}

	/**
	 * Create the effects deciding which statistic to use for each proficiency
	 *
	 * @return {Generator<DynamicEffect>}
	 */
	*#createProficiencyDynamicEffects() {
		yield {
			type: "proficiency_rank",
			label: _loc("warden.proficiency_rank_label", {
				type: _loc("warden.character.FIELDS.path.combat.label"),
			}),
			domains: new Set(["combat"]),
			defaultEnabled: true,

			mode: "upgrade",
			value: this.combat.is_major
				? this.majorProficiencyRank
				: this.minorProficiencyRank,
		};
		yield {
			type: "proficiency_rank",
			label: _loc("warden.proficiency_rank_label", {
				type: _loc("warden.character.FIELDS.path.skill.label"),
			}),
			domains: new Set(["skill"]),
			defaultEnabled: true,

			mode: "upgrade",
			value: this.skill.is_major
				? this.majorProficiencyRank
				: this.minorProficiencyRank,
		};
		yield {
			type: "proficiency_rank",
			label: _loc("warden.proficiency_rank_label", {
				type: _loc("warden.character.FIELDS.path.special.label"),
			}),
			domains: new Set(["special"]),
			defaultEnabled: true,

			mode: "upgrade",
			value: this.special.is_major
				? this.majorProficiencyRank
				: this.minorProficiencyRank,
		};

		yield {
			type: "proficiency_rank",
			label: _loc("warden.proficiency_rank_label", {
				type: _loc("warden.character.FIELDS.defense.toughness.label"),
			}),
			domains: new Set(["toughness"]),
			defaultEnabled: true,

			mode: "upgrade",
			value: this.toughness.is_major
				? this.majorProficiencyRank
				: this.minorProficiencyRank,
		};
		yield {
			type: "proficiency_rank",
			label: _loc("warden.proficiency_rank_label", {
				type: _loc("warden.character.FIELDS.defense.resolve.label"),
			}),
			domains: new Set(["resolve"]),
			defaultEnabled: true,

			mode: "upgrade",
			value: this.resolve.is_major
				? this.majorProficiencyRank
				: this.minorProficiencyRank,
		};
		yield {
			type: "proficiency_rank",
			label: "Perception Rank",
			domains: new Set(["perception"]),
			defaultEnabled: true,

			mode: "upgrade",
			value: this.perception.is_major
				? this.majorProficiencyRank
				: this.minorProficiencyRank,
		};
	}

	get majorProficiencyRank() {
		switch (this.level) {
			case 0:
			case 1:
			case 2:
				return 2;
			case 3:
			case 4:
				return 3;
			case 5:
			case 6:
			case 7:
				return 4;
			default:
				return 5;
		}
	}
	get minorProficiencyRank() {
		switch (this.level) {
			case 0:
			case 1:
			case 2:
				return 0;
			case 3:
			case 4:
			case 5:
			case 6:
			case 7:
				return 1;
			default:
				return 2;
		}
	}

	/**
	 * Creates the basic dynamic effects to fill stuff out like HP, SP, and speed.
	 */
	*#createBaseStatDynamicEffects() {
		yield {
			type: "bonus",
			label: "Base Hit Points",
			domains: new Set(["hit_points"]),
			defaultEnabled: true,

			modifier_type: "proficiency",

			mode: "upgrade",
			value: 10
		};
		yield {
			type: "bonus",
			label: "Base Strain Points",
			domains: new Set(["strain_points"]),
			defaultEnabled: true,

			modifier_type: "proficiency",

			mode: "upgrade",
			value: 5
		};
		yield {
			type: "bonus",
			label: "Base Speed",
			domains: new Set(["base_speed"]),
			defaultEnabled: true,

			modifier_type: "proficiency",

			mode: "upgrade",
			value: 5,
		};
	}

	/**
	 * Parameters to make a check with a path.
	 * @param {string} proficiency_name - The path of the proficiency, e.g. "path.combat".
	 * @param {string[]|Set<string>} domains - Extra domains for this check.
	 * @param {string[]|Set<string>} discriminators - Extra discriminators for this check.
	 * @returns DynamicResultResolver
	 */
	proficiencyCheckResolver(
		proficiency_name,
		{ domains = [], discriminators = [] } = {},
	) {
		if (Array.isArray(domains)) {
			domains = new Set(domains);
		}
		domains = domains.union(new Set([proficiency_name]));

		return this.getDynamicResultResolver(domains, discriminators);
	}

	/**
	 * Make a check with one of the two statistics
	 * @param {boolean} is_major - Use the major statistic
	 * @param {string[]|Set<string>} domains - Extra domains for this check.
	 * @param {string[]|Set<string>} discriminators - Extra discriminators for this check.
	 */
	statisticResolver(is_major, { domains = [], discriminators = [] } = {}) {
		if (Array.isArray(domains)) {
			domains = new Set(domains);
		}
		domains = domains.union(
			new Set([is_major ? "major-statistic" : "minor-statistic"]),
		);

		return this.getDynamicResultResolver(domains, discriminators);
	}
}
