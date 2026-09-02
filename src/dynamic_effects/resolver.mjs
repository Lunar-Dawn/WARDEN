/**
 * @typedef {"proficiency_rank" | "bonus" | "penalty" | "effect_dice" | "effect_die_size" | "effect_potency" | "effect_damage_type" | "benefit" | "detriment"} DynamicEffectType
 */

export class DynamicResultResolver {
	/**
	 * @param {Set<string>} domains
	 * @param {Set<string>} discriminators
	 * @param {Record<string, DynamicEffect[]>} effects
	 * @param {Record<string, any>} data
	 */
	constructor(domains, discriminators, effects, data) {
		this.domains = domains;
		this.discriminators = discriminators;
		this.effects = effects;
		this.data = data;

		this.reset();

		for (const effect_type of Object.values(this.effects)) {
			for (const effect of effect_type) {
				effect.enabled = effect.defaultEnabled ?? false;
			}
		}
	}

	get applicableEffects() {
		return Object.fromEntries(
			Object.entries(this.effects).map(([key, type]) => [
				key,
				type.filter((effect) => this.#isEffectApplicable(effect)),
			]),
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
		this.appliedEffects = {};
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

	parseValue(value) {
		if (typeof value === "string" && value.startsWith("@")) {
			if (value === "@profCalc") {
				// Very special case here
				const rank = this.#resolveType("proficiency_rank");
				if (rank > 0) {
					return rank + this.data.origin.level;
				} else {
					return Math.min(Math.floor(this.data.origin.level / 2), 10);
				}
			}

			return this.#resolveType(value.substring(1));
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

		for (const effect of this.applicableEffects[type]) {
			this.#resolveEffect(type, effect);
		}

		return this.results[type];
	}
	#resolveEffect(type, effect) {
		if (!effect.enabled) return;

		if (this.#isEffectApplicable(effect)) this.#applyEffect(type, effect);
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

	#getEffectTarget(type, effect) {
		switch (type) {
			case "bonus":
			case "penalty":
				return [
					this.results[type][effect.modifier_type],
					(v) => (this.results[type][effect.modifier_type] = v),
				];
			default:
				return [this.results[type], (v) => (this.results[type] = v)];
		}
	}

	#overrideEffectApplied(type, effect) {
		switch (type) {
			case "bonus":
			case "penalty":
				this.appliedEffects[type] =
					this.appliedEffects[type]?.filter(
						(e) => e.modifier_type !== effect.modifier_type,
					) ?? [];
				this.appliedEffects[type].push(effect);
				break;
			default:
				this.appliedEffects[type] = [effect];
				break;
		}
	}

	/**
	 *
	 * @param {DynamicEffectType} type
	 * @param {DynamicEffect} effect
	 * @param {boolean} override
	 */
	#setEffectApplied(type, effect, override = false) {
		if (override) {
			this.#overrideEffectApplied(type, effect);
			return;
		}

		if (this.appliedEffects[type] === undefined) {
			this.appliedEffects[type] = [];
		}

		this.appliedEffects[type].push(effect);
	}
	#applyEffect(type, effect) {
		let [accumulator, setter] = this.#getEffectTarget(type, effect);
		const value = this.parseValue(effect.value);

		switch (effect.mode) {
			case "add":
				setter(accumulator + value);
				this.#setEffectApplied(type, effect);
				break;
			case "subtract":
				setter(accumulator - value);
				this.#setEffectApplied(type, effect);
				break;
			case "upgrade":
				if (accumulator < value) {
					setter(value);
					this.#setEffectApplied(type, effect, true);
				}
				break;
			case "downgrade":
				if (accumulator > value) {
					setter(value);
					this.#setEffectApplied(type, effect, true);
				}
				break;
		}
	}
}
