import { BaseEquipment } from "./base_equipment.mjs";

const { NumberField, StringField, SetField } = foundry.data.fields;
const { renderTemplate } = foundry.applications.handlebars;

/**
 * @property {number} armor
 * @property {string[]} strength
 * @property {string[]} weakness
 */
export class Apparel extends BaseEquipment {
	static defineSchema() {
		return {
			...super.defineSchema(),

			armor: new NumberField({
				required: true,
				initial: 0,
				min: 0,
				integer: true,
				label: "warden.apparel.armor.label",
			}),

			strength: new SetField(
				new StringField({
					required: true,
					nullable: true,
					initial: null,
					choices: {
						...WARDEN.DAMAGE_TYPE_CHOICES,
						...WARDEN.DAMAGE_CATEGORY_CHOICES,
					},
					label: "warden.apparel.strength.label",
				}),
				{
					required: true,
					initial: [],
					label: "warden.apparel.strength.label",
				},
			),
			weakness: new SetField(
				new StringField({
					required: true,
					nullable: true,
					initial: null,
					choices: {
						...WARDEN.DAMAGE_TYPE_CHOICES,
						...WARDEN.DAMAGE_CATEGORY_CHOICES,
					},
					label: "warden.apparel.weakness.label",
				}),
				{
					required: true,
					initial: [],
					label: "warden.apparel.weakness.label",
				},
			),
		};
	}

	getProperties() {
		const properties = { ...super.getProperties() };

		properties.armor = {
			field: this.schema.fields.armor,
			value: this.armor,
		};
		properties.strength = {
			field: this.schema.fields.strength,
			value: this.strength,
		};
		properties.weakness = {
			field: this.schema.fields.weakness,
			value: this.weakness,
		};

		return properties;
	}

	/**
	 * Displays armor value, strength, and weakness
	 * @returns {HTMLElement}
	 */
	async equippedSnippet() {
		return renderTemplate(
			"systems/warden/static/sheets/item/apparel-snippet.hbs",
			{
				apparel: this,
			},
		);
	}

	/**
	 * Creates an item bonus on the spot that represents the resistance the apparel would give against a damage type.
	 * 
	 * @param {string} type The damage type that would apply to the character wearing the apparel.
	 * @param {string[]} traits Traits that would modify how the damage is applied.
	 * 
	 * @return {Generator<DynamicEffect>}
	 */
	getArmourEffect(type, traits) {
		const traitData = WARDEN.DAMAGE_TYPES[type];

		// Basically, since apparel resist fully, partially, or none at all (Strength / Weakness ignoring for now),
		// we can divide this distinction into how many "halves" of armour an apparel resists with.
		// Physical attacks are resisted with two halves. Energy with one, and special with zero.
		// Stuff like breach decreases the halves count by 1, tangible forcibly sets it to 2.
		let armourHalves = 2;

		if (traitData?.category) {
			switch (traitData.category) {
				case "energy":
					armourHalves = 1;
					break;
				case "special":
					armourHalves = 0;
					break;
				default:
					break;
			}
		}

		if (traits.includes("breach"))
			armourHalves = Math.max(armourHalves - 1, 0);
		if (traits.includes("tangible"))
			armourHalves = 2

		// The +2 / -2 from Strength / Weakness.
		let strOrWeaknessMod = 0

		if (this.strength.has(type))
			strOrWeaknessMod = strOrWeaknessMod + 2;
		if (this.weakness.has(type))
			strOrWeaknessMod = strOrWeaknessMod - 2; 

		return {
			type: "bonus",
			label: `${this.parent.name} Armor`,
			domains: new Set([`damage.resistance.${type}`]),
			defaultEnabled: true,

			modifier_type: "item",

			mode: "add",
			value: Math.max(0, Math.floor(this.armor * armourHalves / 2) + strOrWeaknessMod),
		};
	}
}
