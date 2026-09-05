import { BaseItem } from "../base_item.mjs";

const { NumberField, StringField, HTMLField, ArrayField } = foundry.data.fields;

/**
 * @typedef {"light"|"normal"|"heavy"|"huge"} Weight
 */

/**
 * Base class for equipment, i.e. anything that can go in the inventory
 * @property {number} rarity
 * @property {"light"|"normal"|"heavy"|"huge"} weight
 * @property {"undamaged"|"damaged"|"broken"} condition
 */
export class BaseEquipment extends BaseItem {
	static LOCALIZATION_PREFIXES = ["warden.equipment"];

	static isItemEquipment = (item) => {
		return item.system?.isEquipment?.() ?? false;
	};

	static defineSchema() {
		return {
			...super.defineSchema(),

			rarity: new NumberField({
				required: true,
				min: 0,
				max: 10,
				initial: 0,
				integer: true,
			}),

			weight: new StringField({
				required: true,
				initial: "normal",
				choices: {
					light: "warden.equipment.weight.light",
					normal: "warden.equipment.weight.normal",
					heavy: "warden.equipment.weight.heavy",
					huge: "warden.equipment.weight.huge",
				},
			}),

			condition: new StringField({
				required: true,
				initial: "undamaged",
				choices: {
					undamaged: "warden.equipment.condition.undamaged",
					damaged: "warden.equipment.condition.damaged",
					broken: "warden.equipment.condition.broken",
				},
			}),

			description: new HTMLField({
				required: true,
			}),

			traits: new ArrayField(
				new StringField({}),
				{
					required: true,
					initial: [],
				}
			)
		};
	}

	/**
	 * @typedef ParameterInput
	 * @property {DataField} field
	 * @property {any} value
	 * @property {string?} type
	 */

	/**
	 * @returns {Record<string, ParameterInput>}
	 */
	getProperties() {
		const properties = {};

		properties.rarity = {
			field: this.schema.fields.rarity,
			value: this.rarity,
			type: "number",
		};
		properties.weight = {
			field: this.schema.fields.weight,
			value: this.weight,
		};
		properties.condition = {
			field: this.schema.fields.condition,
			value: this.condition,
		};

		return properties;
	}

	/**
	 * @callback ActionCallback
	 * @param {PointerEvent} event
	 */

	/**
	 * @typedef ActionButton
	 * @property {string} label
	 * @property {ActionCallback} onClick
	 */

	/**
	 * Returns an array of buttons to be displayed in the item area when equipped
	 * @returns {ActionButton[]}
	 */
	get equippedButtons() {
		return [];
	}

	/**
	 * Returns a HTMLElement to display below equipped items
	 * @returns {HTMLElement|null}
	 */
	async equippedSnippet() {
		return null;
	}

	isEquipment() {
		return true;
	}

	get supportedTabs() {
		return ["description", "properties", "traits", "effects"];
	}

	getDiscriminators(prefix = "") {
		const determined_prefix = prefix.length > 0 ? prefix : "item";
		const discriminators = super.getDiscriminators(determined_prefix);

		return discriminators.concat(this.traits.map((trait) => `${determined_prefix}.trait.${trait}`));
	}
}
