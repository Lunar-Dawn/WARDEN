/**
 * @typedef {"proficiency_rank" | "bonus" | "penalty" | "effect_dice" | "effect_die_size" | "effect_potency" | "effect_damage_type" | "note" | "benefit" | "detriment"} DynamicEffectType
 * @typedef {"add" | "subtract" | "downgrade"  | "upgrade" } DynamicEffectMode
 */

/**
 * @typedef DynamicEffect
 * @property {DynamicEffectType} type
 * @property {string} label
 * @property {Set<string>} domains
 * @property {DynamicEffectMode} mode
 * @property {boolean|string|string[]} [applicable_if]
 * @property {any} value
 * @property {number} [priority]
 * @property {boolean} [defaultEnabled]
 * @property {ModifierType} [modifier_type]
 */

export const MODE_PRIORITIES = {
	add: 100,
	subtract: 200,
	downgrade: 300,
	upgrade: 400
}

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
			effect.priority = effect.priority ?? MODE_PRIORITIES[effect.mode] ?? 404 // 404 should be a good "notice this immediately" number, I think?
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

		this.#resolveType("note");

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
				// Note is skipped, not much to reference in HTML snippets.
				benefit: this.#resolveType("benefit"),
				detriment: this.#resolveType("detriment"),
				self: this.data.origin,
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
			case "note":
				return "";
			default:
				return 0;
		}
	}

	#resolveType(type) {
		if (this.results[type] !== undefined) return this.results[type];

		this.results[type] = this.#getDefaultValue(type);

		const applicableEffects = this.applicableEffects
			.filter((e) => e.type === type)
			.sort((a, b) => a.priority - b.priority);

		for (const effect of applicableEffects) {
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
			this.#resolveDiscriminator(this.discriminators, cond),
		);
	}

	#resolveDiscriminator(discriminators, condition) {
		if (typeof condition === "string")
			return discriminators.has(condition);
		if (typeof condition === "boolean") // ...Sure.
			return condition;

		if (typeof condition === "object") {
			if (Object.hasOwn(condition, "not"))
				return !this.#resolveDiscriminator(discriminators, condition.not);
			
			return this.#resolveComparisonCondition(discriminators, condition);
		}

		return false;
	}

	/**
	 * @brief Given a discriminator that is implied to have a "sub-value", looks through the discriminators
	 * list to get said value.
	 * 
	 * @details Some discriminators are written in the format like this: "example.discriminator.5",
	 * with the number part typically describing some kind of value for the thing that discriminator
	 * talks about -- easiest example is that you could have a "character.hit_points.percent.50" discriminator
	 * that tells you that the current character is at 50% of their HP.
	 * 
	 * This function allows you to get back the value of the discriminator by giving in the part before 
	 * the number -- so in the above examples, giving "example.discriminator" would get you back 5, and
	 * givinbg "character.hit_points.percent" would get you back 50.
	 * 
	 * @param {string[]} discriminators An array of all the discriminators currently applicable.
	 * @param {string|number} searched_discriminator The discriminator whose value to get. Can also be a number.
	 * In that case, the function just returns it immediately.
	 * @returns {number|null} The number value of the discriminator as detailed in the... details, or "null", if for
	 * some reason it's not obtainable (either it doesn't exist or it's a string, most often).
	 */
	#getValueOfDiscriminator(discriminators, searched_discriminator) {
		if (Number.isInteger(searched_discriminator))
			return searched_discriminator;

		const searched_txt = `${searched_discriminator}.`;

		const potential_element = discriminators
			.filter(x => x.startsWith(searched_txt))
			.map(x => x.replace(searched_txt, ''))
			.map(Number.parseInt)
			.keys().next().value; // <-- God, I hate JavaScript sets.

		if (Number.isInteger(potential_element))
			return potential_element;

		return null;
	}

	/**
	 * @brief Tries to perform comparations based on the received condition and discriminators.
	 * 
	 * @details This function expects a condition somewhat like this:
	 * 
	 * ```
	 * 	{
	 * 	    "lt": [
	 * 	        "character.hit_points.percent",
	 * 	        50
	 *      ]
	 *  }
	 * ```
	 * 
	 * In this example, the condition looks for a discriminator that details the character's current
	 * percentage of hit points, and if it's less than half, the condition succeeds.
	 * In any other case (the percentage is more than 50%, the condition is malformatted, there's no
	 * detailing discriminator, there IS a discriminator, but it's value is malformatted), the condition fails.
	 * 
	 * For why some discriminators are formatted like that, see DynamicResultResolver.#getValueOfDiscriminator().
	 * 
	 * At the time of writing, you can use four different keys:
	 * - "gt": the first element is Greater Than the second,
	 * - "gte": the first element is Greater Than or Equal to the second,
	 * - "lt": the first element is Lesser Than the second,
	 * - "lte": the first element is Lesser Than or Equal to the second.
	 * 
	 * @param {string[]} discriminators An array of all the discriminators currently applicable.
	 * @param {any} condition The condition to resolve. See the detailed description of this function for, well, details.
	 * @returns True if the condition resolved correctly, and its result was true. False in every other case.
	 */
	#resolveComparisonCondition(discriminators, condition) {
		const keys = Object.keys(condition);

		if (keys.length !== 1)
			return false;

		const comparator_key = keys.at(0);

		if (!Array.isArray(condition[comparator_key]))
			return false;

		const compared_elements = Array.from(condition[comparator_key]);

		if (compared_elements.length !== 2)
			return false;

		const first_element = this.#getValueOfDiscriminator(discriminators, compared_elements[0]);
		const second_element = this.#getValueOfDiscriminator(discriminators, compared_elements[1]);

		if (first_element === null || second_element === null)
			return false;
		
		switch (comparator_key) {
			case "gt":
				return first_element > second_element;
			case "gte":
				return first_element >= second_element;
			case "lt":
				return first_element < second_element;
			case "lte":
				return first_element <= second_element;
			default:
				return false;
		}
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
