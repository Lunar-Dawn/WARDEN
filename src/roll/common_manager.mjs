export class CommonManager {
	get idDomainPrefix() {
		return "changethis";
	}

	constructor(rollData, speaker, resolver, parameters) {
		this.id = foundry.utils.randomID();
		this.idDomain = `${this.idDomainPrefix}.${this.id}`;

		this.rollData = rollData;
		this.speaker = speaker;
		this.parameters = parameters;
		this.resolver = resolver;
		this.resolver.domains.add(this.idDomain);

		this.resolver.resolveAll();
	}

	/**
	 * Disabled all modifiers of a give type and sign
	 * @param {string} path
	 * @param {ModifierType} modifierType
	 */
	#disableModifierType(path, modifierType) {
		this.resolver.effects[path]
			.filter((m) => m.modifier_type === modifierType)
			.forEach((m) => (m.enabled = false));
	}

	/**
	 * Add a new modifier to the check
	 * @param {PendingEffect} pendingEffect
	 */
	addModifier(pendingEffect) {
		const path = pendingEffect.value < 0 ? "penalty" : "bonus";

		if (pendingEffect.modifier_type !== "universal") {
			this.#disableModifierType(path, pendingEffect.modifier_type);
		}

		/** @type DynamicEffect */
		const newEffect = {
			label: pendingEffect.label,
			mode:
				pendingEffect.modifier_type === "universal" ? "add" : "upgrade",

			domains: new Set([this.idDomain]),
			applicable_if: true,
			enabled: true,

			modifier_type: pendingEffect.modifier_type,
			value: Math.abs(pendingEffect.value),
		};

		this.resolver.effects[path].push(newEffect);
		this.resolver.reset();
	}

	/**
	 * Toggle the effect, will disable all others of type and sign if needed.
	 * @param {string} path
	 * @param {string} index
	 */
	toggle(path, index) {
		const effect = this.resolver.effects[path][index];

		// If we're enabling a non-universal modifier we disable all with the same type and sign first
		if (!effect.enabled && effect.modifier_type !== "universal") {
			this.#disableModifierType(path, effect.modifier_type);
		}

		effect.enabled = !effect.enabled;
		this.resolver.reset();
	}

	get formula() {
		return "d1 #replacethis";
	}
};

const PATH_ORDER = {
	effect_dice: 0,
	effect_die_size: 1,
	effect_potency: 2,
	effect_damage_type: 3,
	bonus: 4,
	penalty: 5
}

const TYPES_ORDER = {
	universal: 0,
	proficiency: 1,
	item: 2,
	status: 3,
	circumstance: 4,
};
// Sort by modifier type, bonus/penalty, label, then index
const modifierSort = (a, b) => {
	return (
		PATH_ORDER[a.path] - PATH_ORDER[b.path] ||
		TYPES_ORDER[a.modifier_type] - TYPES_ORDER[b.modifier_type] ||
		a.dir - b.dir ||
		a.label.localeCompare(b.label) ||
		a.index - b.index
	);
};
export const transformEffectsForDisplay = (effects, resolver) => {
	const annotatedBonuses =
		effects.bonus?.map((e, i) => ({
			path: "bonus",
			index: i,
			modifier_type: e.modifier_type,
			dir: 1,
			label: e.label ?? "",
			value: resolver.parseValue(e.value),
			enabled: e.enabled,
		})) ?? [];
	const annotatedPenalties =
		effects.penalty?.map((e, i) => ({
			path: "penalty",
			index: i,
			modifier_type: e.modifier_type,
			dir: -1,
			label: e.label ?? "",
			value: -resolver.parseValue(e.value),
			enabled: e.enabled,
		})) ?? [];

	const annotatedDice =
		effects.effect_dice?.map((e, i) => ({
			path: "effect_dice",
			index: i,
			modifier_type: "universal",
			dir: 1,
			label: e.label ?? "",
			value: resolver.parseValue(e.value),
			postfix: "d",
			pretty_type: "effect_dice",
			enabled: e.enabled,
		})) ?? [];
	const annotatedDieSize =
		effects.effect_die_size?.map((e, i) => ({
			path: "effect_die_size",
			index: i,
			modifier_type: "universal",
			dir: 1,
			label: e.label ?? "",
			value: resolver.parseValue(e.value),
			prefix: "d",
			pretty_type: "effect_die_size",
			enabled: e.enabled,
		})) ?? [];
	const annotatedPotency =
		effects.effect_potency?.map((e, i) => ({
			path: "effect_potency",
			index: i,
			modifier_type: "universal",
			dir: 1,
			label: e.label ?? "",
			value: resolver.parseValue(e.value),
			prefix: "P",
			pretty_type: "effect_potency",
			enabled: e.enabled,
		})) ?? [];
	const annotatedDamageType =
		effects.effect_damage_type?.map((e, i) => ({
			path: "effect_damage_type",
			index: i,
			modifier_type: "universal",
			dir: 1,
			label: e.label ?? "",
			value: resolver.parseValue(e.value),
			pretty_type: "effect_damage_type",
			enabled: e.enabled,
		})) ?? [];

	const modifiers = [...annotatedBonuses, ...annotatedPenalties, ...annotatedDice, ...annotatedDieSize, ...annotatedPotency, ...annotatedDamageType];

	modifiers.sort(modifierSort);

	return modifiers;
};