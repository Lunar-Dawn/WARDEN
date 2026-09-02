import { EffectWindow } from "../dialog/effect.mjs";
import {
	CommonManager,
	transformEffectsForDisplay,
} from "./common_manager.mjs";
import { WardenEffect } from "./warden_effect.mjs";

/**
 * All the data and descriptions for rolling an effect
 * @typedef {Object} EffectParameters
 * @property {string} title - Title for the roll window and chat message.
 * @property {number} num_dice - Number of dice to pick from
 * @property {4|6|8|10|12} die_size - Die size to roll
 * @property {number} potency - Number of dice to pick
 * @property {number} modifier - Base modifier to roll
 * */

/**
 * @property {object} rollData
 * @property {ChatSpeakerData} speaker - Who should the roll message originate from.
 * @property {EffectParameters} parameters - The parameters used for the roll.
 */
class EffectManager extends CommonManager {
	/**
	 * Create a CheckManager.
	 * @param {object} rollData
	 * @param {ChatSpeakerData} speaker
	 * @param {DynamicResultResolver} resolver
	 * @param {EffectParameters} parameters
	 */
	constructor(rollData, speaker, resolver, parameters) {
		super(rollData, speaker, resolver, parameters);
	}

	get idDomainPrefix() {
		return "effectroll";
	}

	/**
	 * Generate the roll formula to be used.
	 * @returns {string} - The formula used for the roll.
	 */
	get formula() {
		const diceSum = this.resolver.calcNonTypeSums("effect_dice");
		const dieSizeSum = this.resolver.calcNonTypeSums("effect_die_size");
		const potencySum = this.resolver.calcNonTypeSums("effect_potency");

		const damageTypes = this.resolver.calcNonTypeSums("effect_damage_type");
		const dmgTypesStr = damageTypes.length > 0 ? `[${damageTypes}]` : "";

		const modSum = this.resolver.modifierSum();
		const modStr =
			modSum === 0 ? "" : modSum < 0 ? modSum.toString() : `+${modSum}`;

		return `${diceSum}d${dieSizeSum}kh${potencySum}${modStr}${dmgTypesStr}`;
	}

	async display() {
		return EffectWindow.wait(this, {});
	}

	async evaluateEffect() {
		this.resolver.resolveAll();

		const rollMode = game.settings.get("core", "messageMode");

		this.roll = new WardenEffect(this.formula, this.rollData, {
			modifiers: transformEffectsForDisplay(
				this.resolver.appliedEffects,
				this.resolver,
			),
		});

		await this.roll.evaluate();

		await this.roll.toMessage({
			speaker: this.speaker,
			rollMode,
			flavor: this.parameters.title,
		});

		return this.roll;
	}
}

/**
 * Create an EffectWindow.
 * @param {object} rollData
 * @param {ChatSpeakerData} speaker
 * @param {Partial<EffectParameters>} parameters
 * @param {{skip?:boolean}} options
 */
export const runEffect = async (
	rollData,
	speaker,
	resolver,
	parameters,
	{ skip = false } = {},
) => {
	const manager = new EffectManager(rollData, speaker, resolver, parameters);

	if (!skip) {
		const success = await manager.display();
		if (!success) {
			return null;
		}
	}

	return manager.evaluateEffect();
};
