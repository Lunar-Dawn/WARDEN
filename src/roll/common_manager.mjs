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
	 * @param {string} type
	 * @param {ModifierType} modifierType
	 */
	#disableModifierType(type, modifierType) {
		this.resolver.effects
			.filter((m) => m.type === type)
			.filter((m) => m.modifier_type === modifierType)
			.forEach((m) => (m.enabled = false));
	}

	/**
	 * Add a new modifier to the check
	 * @param {PendingEffect} pendingEffect
	 */
	addModifier(pendingEffect) {
		const type = pendingEffect.value < 0 ? "penalty" : "bonus";

		if (pendingEffect.modifier_type !== "universal") {
			this.#disableModifierType(type, pendingEffect.modifier_type);
		}

		/** @type DynamicEffect */
		const newEffect = {
			type: type,
			label: pendingEffect.label,
			mode:
				pendingEffect.modifier_type === "universal" ? "add" : "upgrade",

			domains: new Set([this.idDomain]),
			applicable_if: true,
			enabled: true,

			modifier_type: pendingEffect.modifier_type,
			value: Math.abs(pendingEffect.value),
		};

		this.resolver.effects.push(newEffect);
		this.resolver.reset();
	}

	/**
	 * Toggle the effect, will disable all others of type and sign if needed.
	 * @param {string} index
	 */
	toggle(index) {
		const effect = this.resolver.effects[index];

		// If we're enabling a non-universal modifier we disable all with the same type and sign first
		if (!effect.enabled && effect.modifier_type !== "universal") {
			this.#disableModifierType(effect.type, effect.modifier_type);
		}

		effect.enabled = !effect.enabled;
		this.resolver.reset();
	}

	get formula() {
		return "d1 #replacethis";
	}
}

const PATH_ORDER = {
	effect_dice: 0,
	effect_die_size: 1,
	effect_potency: 2,
	effect_damage_type: 3,
	bonus: 4,
	penalty: 5,
};

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
	const annotatedBonuses = effects
		.map((e, i) => [e, i])
		.filter(([e, _]) => e.type === "bonus")
		.map(([e, i]) => ({
			path: "bonus",
			index: i,
			modifier_type: e.modifier_type,
			dir: 1,
			label: e.label ?? "",
			value: resolver.parseValue(e.value),
			enabled: e.enabled,
		}));
	const annotatedPenalties = effects
		.map((e, i) => [e, i])
		.filter(([e, _]) => e.type === "penalty")
		.map(([e, i]) => ({
			path: "penalty",
			index: i,
			modifier_type: e.modifier_type,
			dir: -1,
			label: e.label ?? "",
			value: -resolver.parseValue(e.value),
			enabled: e.enabled,
		}));

	const annotatedDice = effects
		.map((e, i) => [e, i])
		.filter(([e, _]) => e.type === "effect_dice")
		.map(([e, i]) => ({
			path: "effect_dice",
			index: i,
			modifier_type: "universal",
			dir: 1,
			label: e.label ?? "",
			value: resolver.parseValue(e.value),
			postfix: "d",
			pretty_type: "effect_dice",
			enabled: e.enabled,
		}));
	const annotatedDieSize = effects
		.map((e, i) => [e, i])
		.filter(([e, _]) => e.type === "effect_die_size")
		.map(([e, i]) => ({
			path: "effect_die_size",
			index: i,
			modifier_type: "universal",
			dir: 1,
			label: e.label ?? "",
			value: resolver.parseValue(e.value),
			prefix: "d",
			pretty_type: "effect_die_size",
			enabled: e.enabled,
		}));
	const annotatedPotency = effects
		.map((e, i) => [e, i])
		.filter(([e, _]) => e.type === "effect_potency")
		.map(([e, i]) => ({
			path: "effect_potency",
			index: i,
			modifier_type: "universal",
			dir: 1,
			label: e.label ?? "",
			value: resolver.parseValue(e.value),
			prefix: "P",
			pretty_type: "effect_potency",
			enabled: e.enabled,
		}));
	const annotatedDamageType = effects
		.map((e, i) => [e, i])
		.filter(([e, _]) => e.type === "effect_damage_type")
		.map(([e, i]) => ({
			path: "effect_damage_type",
			index: i,
			modifier_type: "universal",
			dir: 1,
			label: e.label ?? "",
			value: resolver.parseValue(e.value),
			pretty_type: "effect_damage_type",
			enabled: e.enabled,
		}));

	const modifiers = [
		...annotatedBonuses,
		...annotatedPenalties,
		...annotatedDice,
		...annotatedDieSize,
		...annotatedPotency,
		...annotatedDamageType,
	];

	modifiers.sort(modifierSort);

	return modifiers;
};

/**
 * Super shrimple stuff -- just gets the first target the user is currently targeting.
 * Mainly exists as a common ground for anything that needs it.
 */
export const getTarget = () => {
	return game.user.targets.first()?.actor.system;
};
