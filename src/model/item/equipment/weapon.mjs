import { DAMAGE_TYPES } from "../../../damage_type.mjs";
import { runCheck } from "../../../roll/check_manager.mjs";
import { runEffect } from "../../../roll/effect_manager.mjs";
import { BaseEquipment } from "./base_equipment.mjs";

const { NumberField, StringField, SetField } = foundry.data.fields;

/**
 * @property {"melee"|"ranged"} type
 * @property {number} hands
 * @property {number} range
 * @property {4|6|8|10|12} damage_die
 * @property {string[]} damage_types
 */
export class Weapon extends BaseEquipment {
	static defineSchema() {
		return {
			...super.defineSchema(),

			type: new StringField({
				required: true,
				initial: "melee",
				choices: {
					melee: "warden.weapon.type.melee",
					ranged: "warden.weapon.type.ranged",
				},
				label: "warden.weapon.type.label",
			}),

			hands: new NumberField({
				required: true,
				initial: 1,
				choices: {
					1: "1",
					2: "2",
				},
				label: "warden.weapon.hands.label",
			}),

			range: new NumberField({
				required: true,
				initial: 1,
				integer: true,
				label: "warden.weapon.range.label",
			}),

			damage_die: new NumberField({
				required: true,
				initial: 6,
				choices: {
					4: "d4",
					6: "d6",
					8: "d8",
					10: "d10",
					12: "d12",
				},
				label: "warden.weapon.damage_die.label",
			}),
			damage_types: new SetField(
				new StringField({
					choices: WARDEN.DAMAGE_TYPE_CHOICES,
					label: "warden.weapon.damage_type.label",
				}),
				{
					required: true,
					initial: ["slash"],
					label: "warden.weapon.damage_types.label",
				},
			),
		};
	}

	getProperties() {
		const properties = { ...super.getProperties() };

		properties.type = {
			field: this.schema.fields.type,
			value: this.type,
		};
		properties.hands = {
			field: this.schema.fields.hands,
			value: this.hands,
		};
		properties.range = {
			field: this.schema.fields.range,
			value: this.range,
		};
		properties.damage_die = {
			field: this.schema.fields.damage_die,
			value: this.damage_die,
		};
		properties.damage_types = {
			field: this.schema.fields.damage_types,
			value: this.damage_types,
		};

		return properties;
	}

	prepareDerivedData() {
		super.prepareDerivedData();

		this.registerNewDynamicEffect("effect_die_size", {
			label: `${this.parent.name} Base Die Size`,
			domains: new Set([`strike.${this.parent.id}.damage`]),
			defaultEnabled: true,

			modifier_type: "universal",

			mode: "upgrade",
			value: this.damage_die,
		});

		this.damage_types.forEach((damage_type) => {
			this.registerNewDynamicEffect("effect_damage_type", {
				label: `${this.parent.name} Base Damage`,
				domains: new Set([`strike.${this.parent.id}.damage`]),
				defaultEnabled: true,

				modifier_type: "universal",

				mode: "add",
				value: DAMAGE_TYPES[damage_type].abbreviation,
			});
		});
	}

	#weaponResolver(map, extra_domains = [], extra_discriminators = []) {
		const domains = new Set([
			"strike",
			"strike.attack",
			`strike.${this.parent.id}.attack`,
		]);
		const discriminators = new Set();

		if (this.type === "melee") {
			domains.add("strike.melee");
		} else {
			domains.add("strike.ranged");
		}

		if (map > 0) {
			discriminators.add("map");
		}

		extra_domains.forEach((extra_domain) => {
			domains.add(extra_domain);
		});
		extra_discriminators.forEach((extra_discriminator) => {
			discriminators.add(extra_discriminator);
		});

		return this.parent.actor.system.proficiencyCheckResolver("combat", {
			domains,
			discriminators,
		});
	}

	runStrike({
		skip = false,
		map = 0,
		extra_domains = [],
		extra_discriminators = [],
	}) {
		const rollData = this.parent.actor.getRollData();
		const speaker = ChatMessage.getSpeaker({
			actor: this.parent.actor,
		});

		let title;
		const difficulty = 10 + map * 5;

		if (this.type === "melee") {
			title = _loc("warden.action.melee_strike_weapon_title", {
				weapon: this.parent.name,
			});
		} else {
			title = _loc("warden.action.ranged_strike_weapon_title", {
				weapon: this.parent.name,
			});
		}

		const resolver = this.#weaponResolver(
			map,
			extra_domains,
			extra_discriminators,
		);

		return runCheck(
			rollData,
			speaker,
			resolver,
			{
				difficulty,
				title,
			},
			{ skip },
		);
	}

	rollDamage({
		skip = false,
		map = 0,
		extra_domains = [],
		extra_discriminators = [],
	}) {
		const rollData = this.parent.actor.getRollData();
		const speaker = ChatMessage.getSpeaker({
			actor: this.parent.actor,
		});

		const title = _loc("warden.weapon.damage_flavor", {
			weapon: this.parent.name,
		});

		const domains = new Set([
			"effect-roll",
			"damage",
			"strike",
			"strike.damage",
			`strike.${this.parent.id}.damage`,
		]);
		const discriminators = new Set();

		discriminators.add("strike");
		discriminators.add("strike.damage");
		discriminators.add(`strike.${this.parent.id}.damage`);

		if (this.type === "melee") {
			domains.add("strike.melee");
			discriminators.add("strike.melee");
		} else {
			domains.add("strike.ranged");
			discriminators.add("strike.ranged");
		}

		if (map > 0) {
			discriminators.add("map");
		}

		extra_domains.forEach((extra_domain) => {
			domains.add(extra_domain);
		});
		extra_discriminators.forEach((extra_discriminator) => {
			discriminators.add(extra_discriminator);
		});

		const resolver = this.parent.actor.system.getDynamicResultResolver(
			domains,
			discriminators,
		);

		return runEffect(
			rollData,
			speaker,
			resolver,
			{
				title,
				num_dice: 1,
				die_size: this.damage_die,
				potency: 1,
				modifier: 0,
			},
			{ skip },
		);
	}

	/**
	 * @returns {ActionButton[]}
	 */
	get equippedButtons() {
		return [
			{
				label: "Strike v. 10",
				onClick: (e) => this.runStrike({ skip: e.shiftKey }),
			},
			{
				label: "v. 15",
				onClick: (e) => this.runStrike({ skip: e.shiftKey, map: 1 }),
			},
			{
				label: "v. 20",
				onClick: (e) => this.runStrike({ skip: e.shiftKey, map: 2 }),
			},
			{
				label: _loc("warden.weapon.damage_button"),
				onClick: (e) => this.rollDamage({ skip: e.shiftKey, map: 0 }),
			},
			{
				label: _loc("warden.weapon.damage_map_button"),
				onClick: (e) => this.rollDamage({ skip: e.shiftKey, map: 1 }),
			},
			{
				label: _loc("warden.weapon.damage_crit_button"),
				onClick: (e) =>
					this.rollDamage({
						skip: e.shiftKey,
						map: 0,
						extra_discriminators: ["crit"],
					}),
			},
			{
				label: _loc("warden.weapon.damage_crit_map_button"),
				onClick: (e) =>
					this.rollDamage({
						skip: e.shiftKey,
						map: 1,
						extra_discriminators: ["crit"],
					}),
			},
		];
	}
}
