/**
 * @typedef {"proficiency_rank" | "bonus" | "penalty" | "effect_dice" | "effect_die_size" | "effect_potency" | "effect_damage_type" | "benefit" | "detriment"} DynamicEffectType
 */

/** TODO: Priority?
 * @typedef {
 *    "add"
 *  | "subtract"
 *  | "downgrade"
 *  | "upgrade"
 * } DynamicEffectMode
 */

/**
 * @typedef DynamicEffect
 * @property {DynamicEffectType} type
 * @property {string} label
 * @property {Set<string>} domains
 * @property {DynamicEffectMode} mode
 * @property {boolean|string|string[]} [applicable_if]
 * @property {any} value
 * @property {boolean} [defaultEnabled]
 * @property {ModifierType} [modifier_type]
 */

export class DynamicResultResolver {
	/**
	 * @param {Set<string>} domains
	 * @param {Set<string>} discriminators
	 * @param {DynamicEffect[]} effects
	 * @param {Record<string, any>} data
	 */
	constructor(domains, discriminators, effects, data) {
		this.domains = domains;
		this.discriminators = discriminators;
		this.effects = effects;
		this.data = data;

		this.reset();

		for (const effect of this.effects) {
			effect.enabled = effect.defaultEnabled ?? false;
		}
	}

	get applicableEffects() {
		return this.effects.filter((effect) =>
			this.#isEffectApplicable(effect),
		);
	}

	calcNonTypeSums(type) {
		this.#resolveType(type);
		return this.results[type];
	}

	#calcModifierSum(type) {
		this.#resolveType(type);
		return Object.values(this.results[type]).reduce((a, b) => a + b, 0);
	}
	modifierSum() {
		return (
			this.#calcModifierSum("bonus") - this.#calcModifierSum("penalty")
		);
	}

	reset() {
		this.results = {};
		this.appliedEffects = [];
	}
	resolve(type) {
		this.#resolveType(type);

		return this.results[type];
	}
	resolveAll() {
		this.reset();

		this.#resolveType("proficiency_rank");

		this.#resolveType("bonus");
		this.#resolveType("penalty");

		this.#resolveType("effect_dice");
		this.#resolveType("effect_die_size");
		this.#resolveType("effect_potency");
		this.#resolveType("effect_damage_type");

		this.#resolveType("benefit");
		this.#resolveType("detriment");

		return this.results;
	}

	parseValue(value, extra_data = {}) {
		if (typeof value === "string") {
			const proficiency_rank = this.#resolveType("proficiency_rank");
			const profCalc =
				proficiency_rank > 0
					? proficiency_rank + this.data.origin.level
					: Math.min(Math.floor(this.data.origin.level / 2), 10);

			const data = {
				profCalc,
				proficiency_rank,
				bonus: this.#resolveType("bonus"),
				penalty: this.#resolveType("penalty"),
				effect_dice: this.#resolveType("effect_dice"),
				effect_die_size: this.#resolveType("effect_die_size"),
				effect_potency: this.#resolveType("effect_potency"),
				effect_damage_type: this.#resolveType("effect_damage_type"),
				benefit: this.#resolveType("benefit"),
				detriment: this.#resolveType("detriment"),
				...extra_data,
			};

			try {
				const roll = new Roll(value, data).evaluateSync();
				return roll.total;
			} catch (_error) {
				// Basically, this try-catch part is for handling damage types.
				// As they aren't really valid roll terms to evaluate, the evaluation will fail.
				// That's actually fine, because we don't want it evaluated anyway.
				// This does mean you cannot evaluate to strings, but the PF2e system also runs its
				// own evaluation for that (it's the `{actor|whatever}` thing it does), so it's no biggie.
				return value;
			}
		} else {
			return value;
		}
	}

	#getDefaultValue(type) {
		switch (type) {
			case "bonus":
			case "penalty":
				return {
					universal: 0,
					proficiency: 0,
					item: 0,
					status: 0,
					circumstance: 0,
				};
			case "effect_damage_type":
				return "";
			default:
				return 0;
		}
	}

	#resolveType(type) {
		if (this.results[type] !== undefined) return this.results[type];

		this.results[type] = this.#getDefaultValue(type);

		for (const effect of this.applicableEffects.filter(
			(e) => e.type === type,
		)) {
			this.#resolveEffect(effect);
		}

		return this.results[type];
	}
	#resolveEffect(effect) {
		if (!effect.enabled) return;

		if (this.#isEffectApplicable(effect)) this.#applyEffect(effect);
	}
	#isEffectApplicable(effect) {
		if (effect.applicable_if === undefined) return true;
		if (typeof effect.applicable_if === "boolean")
			return effect.applicable_if;
		if (!Array.isArray(effect.applicable_if))
			return this.discriminators.has(effect.applicable_if);

		// TODO: More complex resolution mechanics
		return effect.applicable_if.every((cond) =>
			this.discriminators.has(cond),
		);
	}

	#getEffectTarget(effect) {
		switch (effect.type) {
			case "bonus":
			case "penalty":
				return [
					this.results[effect.type][effect.modifier_type],
					(v) =>
						(this.results[effect.type][effect.modifier_type] = v),
				];
			default:
				return [
					this.results[effect.type],
					(v) => (this.results[effect.type] = v),
				];
		}
	}

	#overrideEffectApplied(effect) {
		switch (effect.type) {
			case "bonus":
			case "penalty":
				this.appliedEffects = this.appliedEffects.filter(
					(e) =>
						!(
							e.type === effect.type &&
							e.modifier_type === effect.modifier_type
						),
				);
				this.appliedEffects.push(effect);
				break;
			default:
				this.appliedEffects.push(effect);
				break;
		}
	}

	/**
	 * @param {DynamicEffect} effect
	 * @param {boolean} override
	 */
	#setEffectApplied(effect, override = false) {
		if (override) {
			this.#overrideEffectApplied(effect);
			return;
		}

		this.appliedEffects.push(effect);
	}
	#applyEffect(effect) {
		let [accumulator, setter] = this.#getEffectTarget(effect);
		const value = this.parseValue(effect.value);

		switch (effect.mode) {
			case "add":
				setter(accumulator + value);
				this.#setEffectApplied(effect);
				break;
			case "subtract":
				setter(accumulator - value);
				this.#setEffectApplied(effect);
				break;
			case "upgrade":
				if (accumulator < value) {
					setter(value);
					this.#setEffectApplied(effect, true);
				}
				break;
			case "downgrade":
				if (accumulator > value) {
					setter(value);
					this.#setEffectApplied(effect, true);
				}
				break;
		}
	}
}
