import { CheckWindow } from "../dialog/check.mjs";
import {
	CommonManager,
	transformEffectsForDisplay,
} from "./common_manager.mjs";
import { WardenCheck } from "./warden_check.mjs";

/**
 * @typedef {"universal"|"proficiency"|"item"|"status"|"circumstance"} ModifierType
 */

/**
 * All the data and descriptions for presenting and making a Check.
 * @typedef {Object} CheckParameters
 * @property {string} title - Title for the roll window and chat message.
 * @property {number|"open"?} difficulty - The difficulty of the check, or "open" if open
 * @property {boolean?} benefit - Should the roll gain a benefit. TODO: temp until dynamic effects can deal with it
 * @property {boolean?} detriment - Should the roll suffer a detriment. TODO: temp until dynamic effects can deal with it
 * @property {BaseCharacterData} target - To be used with the `against` param below. The target's statistics will be used to adjust the difficulty.
 * @property {string[]} against - The statistic to roll against, if any. If there's an opponent, it'll grab any dynamic effects with these strings
 * 								  as their domains / discriminators, and the resulting total will be added to the difficulty.
 * 							      More than one against string adds the higher of the resulting totals.
 */

/**
 * The window used to describe and edit check rolls.
 * @property {object} rollData
 * @property {ChatSpeakerData} speaker - Who should the roll message originate from.
 * @property {CheckParameters} parameters - The parameters used for the roll.
 */
class CheckManager extends CommonManager {
	/**
	 * Create a CheckManager.
	 * @param {object} rollData
	 * @param {ChatSpeakerData} speaker
	 * @param {DynamicResultResolver} resolver
	 * @param {CheckParameters} parameters
	 */
	constructor(rollData, speaker, resolver, parameters) {
		super(rollData, speaker, resolver, parameters);

		this.parameters.difficulty ??= "open";
		this.parameters.benefit ??= false;
		this.parameters.detriment ??= false;
		this.parameters.against ??= [];
		this.parameters.target ??= null;

		/**
		 * As targetDefence() doesn't change here, and it's somewhat intensive to calculate,
		 * we'll use this to cache it the first time we calculate it.
		 */
		this.cached_vs_data = null;
	}

	get idDomainPrefix() {
		return "check";
	}

	/**
	 * Set the check base difficulty
	 * @param {number|"open"} difficulty
	 */
	setDifficulty(difficulty) {
		this.parameters.difficulty = difficulty;
	}

	toggleBenefit() {
		this.parameters.benefit = !this.parameters.benefit;
	}
	toggleDetriment() {
		this.parameters.detriment = !this.parameters.detriment;
	}

	/**
	 * Generate the roll formula to be used.
	 * @returns {string} - The formula used for the roll.
	 */
	get formula() {
		const sum = this.resolver.modifierSum();

		const sumStr = sum === 0 ? "" : sum < 0 ? sum.toString() : `+${sum}`;

		return `d20${sumStr}`;
	}

	/**
	 * Is the check currently an open check
	 * @returns {boolean}
	 */
	get isOpen() {
		return this.parameters.difficulty === "open";
	}

	/**
	 * Benefit and detriment-adjusted difficulty, or "open"
	 * Do NOT apply targetDefence here, as this gets shown in the Check Window!
	 */
	get difficulty() {
		return this.isOpen
			? "open"
			: this.parameters.difficulty -
					(this.parameters.benefit ? 5 : 0) +
					(this.parameters.detriment ? 5 : 0);
	}

	get detriment() {
		return !!this.parameters.detriment;
	}

	get benefit() {
		return !!this.parameters.benefit;
	}

	/**
 	* The struct returned by targetDefence().
	* @typedef {Object} TargetDefenceData
	* @property {string} name - Lowercase name of the statistic.
	* @property {number} value - The summed modifier value of the statistic.
	*/

	/**
	 * Returns data about the target's statistic that's being rolled against, if there is any.
	 * If there are more, returns the highest one. If there are multiple biggest, returns the one found earlier.
	 * If there are none, returns a ""-named 0-value "statistic".
	 * 
	 * @returns {TargetDefenceData}
	 */
	get targetDefence() {
		if (!!this.cached_vs_data) return this.cached_vs_data;
		if (this.parameters.target === null || this.parameters.target === undefined) return {name: "", value: 0};

		// TODO: the base character TypeDataModel should have a function that looks for the appropriate resolver, as both
		// characters and opponents have different sets of resolvers with different default domains.
		this.cached_vs_data = this.parameters.against
			.map((x) => {return {name: x, value: this.parameters.target.getDynamicResultResolver([x, "defense"], [x, "defense"]).modifierSum()}})
			.reduce((prev, current) => (prev && prev.value > current.value) ? prev : current);

		return this.cached_vs_data;
	}

	async display() {
		return CheckWindow.wait(this, {});
	}

	/**
	 * Calculate the result tier and difference
	 * @returns {{difference: number, result_tier: -1|0|1|2}}
	 */
	calculateResult() {
		const difference = this.roll.total - this.difficulty - this.targetDefence.value;

		let result_tier;
		if (difference >= 10) result_tier = 2;
		else if (difference >= 0) result_tier = 1;
		else if (difference > -10) result_tier = 0;
		else result_tier = -1;

		const d20_result = this.roll.d20_result;

		if (d20_result === 20) result_tier += 1;
		else if (d20_result === 1) result_tier -= 1;

		result_tier = Math.clamp(result_tier, -1, 2);

		return {
			difference,
			result_tier,
		};
	}

	async executeCheck() {
		this.resolver.resolveAll();

		const rollMode = game.settings.get("core", "messageMode");

		this.roll = new WardenCheck(this.formula, this.rollData, {
			difficulty: this.difficulty,
			target_defence: this.targetDefence,
			modifiers: transformEffectsForDisplay(
				this.resolver.appliedEffects,
				this.resolver,
			),
		});

		await this.roll.evaluate();

		if (!this.isOpen) {
			Object.assign(this.roll.options, this.calculateResult());
		}

		await this.roll.toMessage({
			speaker: this.speaker,
			rollMode,
			flavor: this.parameters.title,
		});

		return this.roll;
	}
}

/**
 * Create a CheckWindow.
 * @param {object} rollData
 * @param {ChatSpeakerData} speaker
 * @param {DynamicResultResolver} resolver
 * @param {Partial<CheckParameters>} parameters
 * @param {{skip?:boolean}} options
 */
export const runCheck = async (
	rollData,
	speaker,
	resolver,
	parameters,
	options,
) => {
	const manager = new CheckManager(rollData, speaker, resolver, parameters);

	options.skip ??= false;

	if (!options.skip) {
		const success = await manager.display();
		if (!success) {
			return null;
		}
	}

	return manager.executeCheck();
};
