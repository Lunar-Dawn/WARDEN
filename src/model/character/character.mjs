import { BaseEquipment } from "../item/equipment/base_equipment.mjs";
import { BaseCharacterData } from "./base_character.mjs";

const {
	BooleanField,
	DocumentIdField,
	SchemaField,
	SetField,
	StringField,
	NumberField,
	TypedObjectField,
} = foundry.data.fields;

/**
 * @typedef ProficiencyData
 * @property {number} rank
 * @property {number} proficiency_bonus
 * @property {number} bonus
 */
/**
 * @typedef SkillData
 * @property {boolean} is_proficient
 * @property {number} proficiency_bonus
 * @property {number} bonus
 */
/**
 * @typedef KnowledgeSkillData
 * @property {string} topic
 * @property {boolean} is_niche
 * @property {number} proficiency_bonus
 * @property {number} bonus
 */

/**
 * The PC class
 * @property {string} pronouns
 * @property {string} description
 * @property {number} temporary_hit_points
 * @property {0|1|2|3} fate_points
 * @property {{title: string, value: number}} vocation
 * @property {number} wealth
 * @property {boolean} has_savings
 * @property {{combat: ProficiencyData, skill: ProficiencyData, special: ProficiencyData}} path
 * @property {{toughness: ProficiencyData, resolve: ProficiencyData, perception: ProficiencyData}} defense
 * @property {{ crafting: SkillData,
 * 				deception: SkillData,
 * 				diplomacy: SkillData,
 * 				force: SkillData,
 * 				intimidation: SkillData,
 * 				medicine: SkillData,
 * 				mobility: SkillData,
 * 				skullduggery: SkillData,
 * 				stealth: SkillData,
 * 				survival: SkillData }} skill
 * @property {Object.<string, KnowledgeSkillData>} knowledge_skills
 * @property {string} kit_item_id
 * @property {string[]} equipped_item_ids
 * @property {string[]} pocket_item_ids
 * @property {string[]} pack_item_ids
 */
export class CharacterData extends BaseCharacterData {
	static LOCALIZATION_PREFIXES = ["warden.character"];

	/**
	 * @returns Object
	 */
	static defineSchema() {
		const proficiencyField = () =>
			new SchemaField({
				rank: new NumberField({
					required: true,
					integer: true,
					min: 0,
					max: 5,
					initial: 0,
				}),
			});

		const skillField = () =>
			new SchemaField({
				is_proficient: new BooleanField({ required: true }),
			});

		return {
			...super.defineSchema(),

			pronouns: new StringField({ required: true }),
			description: new StringField({ required: true }),

			temporary_hit_points: new NumberField({
				required: true,
				integer: true,
				min: 0,
				initial: 0,
			}),

			fate_points: new NumberField({
				required: true,
				integer: true,
				min: 0,
				max: 3,
				initial: 1,
			}),

			vocation: new SchemaField({
				title: new StringField({ required: true }),
				value: new NumberField({
					required: true,
					integer: true,
					min: 0,
					max: 10,
					initial: 3,
				}),
			}),

			wealth: new NumberField({
				required: true,
				integer: true,
				min: 0,
				initial: 3,
			}),
			has_savings: new BooleanField({ required: true }),

			path: new SchemaField({
				combat: proficiencyField(),
				skill: proficiencyField(),
				special: proficiencyField(),
			}),

			defense: new SchemaField({
				toughness: proficiencyField(),
				resolve: proficiencyField(),
				perception: proficiencyField(),
			}),

			skill: new SchemaField({
				crafting: skillField(),
				deception: skillField(),
				diplomacy: skillField(),
				force: skillField(),
				intimidation: skillField(),
				medicine: skillField(),
				mobility: skillField(),
				skullduggery: skillField(),
				stealth: skillField(),
				survival: skillField(),
			}),

			knowledge_skills: new TypedObjectField(
				new SchemaField({
					topic: new StringField({ required: true }),
					is_niche: new BooleanField({
						required: true,
						default: false,
					}),
				}),
			),

			// TODO: creation hook to fill this with the standard kit
			kit_item_id: new DocumentIdField({
				type: "Item",
				readonly: false,
			}),
			equipped_item_ids: new SetField(
				new DocumentIdField({
					type: "Item",
					readonly: false,
				}),
			),
			pocket_item_ids: new SetField(
				new DocumentIdField({ type: "Item", readonly: false }),
			),
			pack_item_ids: new SetField(
				new DocumentIdField({ type: "Item", readonly: false }),
			),
		};
	}

	get kit() {
		return this.parent.items.get(this.kit_item_id);
	}
	get equipped_items() {
		const mapped = this.equipped_item_ids.map((id) =>
			this.parent.items.get(id),
		);
		return Array.from(mapped).sort((i1, i2) => i1.sort - i2.sort);
	}
	get pocket_items() {
		const mapped = this.pocket_item_ids.map((id) =>
			this.parent.items.get(id),
		);
		return Array.from(mapped).sort((i1, i2) => i1.sort - i2.sort);
	}
	get pack_items() {
		const mapped = this.pack_item_ids.map((id) =>
			this.parent.items.get(id),
		);
		return Array.from(mapped).sort((i1, i2) => i1.sort - i2.sort);
	}

	get origins() {
		return this.parent.items.filter((i) => i.type === "origin");
	}
	get abilities() {
		return this.parent.items.filter((i) => i.type === "ability");
	}
	get feats() {
		return this.parent.items.filter((i) => i.type === "feat");
	}

	/**
	 * Could the area contain the item in theory? i.e. this does not check if it can currently fit, only if it possibly could
	 * @param {Item} item
	 * @param {"kit"|"equipped"|"pockets"|"pack"} area
	 * @return {boolean|string} Success or a warning message
	 */
	couldAreaStoreEquipment(item, area) {
		if (item.type === "kit" && area !== "kit") {
			return game.i18n.localize(
				"warden.character.sheet.warnings.kit-in-non-kit-slot",
			);
		}
		if (item.type !== "kit" && area === "kit") {
			return game.i18n.localize(
				"warden.character.sheet.warnings.non-kit-in-kit-slot",
			);
		}
		if (area === "pockets" && item.system.weight !== "light") {
			return game.i18n.localize(
				"warden.character.sheet.warnings.pocket-weight",
			);
		}

		return true;
	}
	/**
	 * Find out if a piece of equipment can be inserted in a specified area at a specified slot
	 * @param {Item} item
	 * @param {"kit"|"equipped"|"pockets"|"pack"|"condition"} area
	 * @return {true|string} Success or a warning message
	 */
	canAreaFitEquipment(item, area) {
		if (!BaseEquipment.isItemEquipment(item)) return false;

		switch (area) {
			case "kit":
				return true;
			case "equipped":
				return this.equipped_item_ids.size < 5;
			case "pockets":
				return this.pocket_item_ids.size < 4;
			case "pack":
				return this.pack_item_ids.size < this.kit.system.pack_slots;
		}

		return false;
	}

	areaToPath(area) {
		switch (area) {
			case "equipped":
				return "equipped_item_ids";
			case "pockets":
				return "pocket_item_ids";
			case "pack":
				return "pack_item_ids";
		}
	}
	inventoryListByName(name) {
		switch (name) {
			case "equipped":
				return this.equipped_items;
			case "pockets":
				return this.pocket_items;
			case "pack":
				return this.pack_items;
		}
	}

	async replaceKit(newKit) {
		newKit = newKit.inCompendium
			? game.items.fromCompendium(newKit, { clearFolder: true })
			: newKit.toObject();

		const id = foundry.utils.randomID();
		newKit._id = id;

		const updates = [
			{
				action: "create",
				documentName: "Item",
				data: [newKit],
				keepId: true,
				parent: this.parent,
			},
			{
				action: "update",
				documentName: "Actor",
				updates: [
					{
						_id: this.parent.id,
						"system.kit_item_id": id,
					},
				],
			},
		];

		if (this.kit !== undefined) {
			updates.push({
				action: "delete",
				documentName: "Item",
				ids: [this.kit.id],
				parent: this.parent,
			});
		}

		return foundry.documents.modifyBatch(updates);
	}
	/**
	 * Performs mutation of the inventory, adding a new item, removing an existing item, or swapping the area of items.
	 * There are many forms the function can take depending on what options are supplied
	 * - If srcArea and destArea are specified we move the item between areas
	 * - If srcArea, destArea and destItem are specified we swap the items' areas and sort order
	 * - If destArea is specified but not srcArea, we create the item ex nihilo
	 * - If srcArea are specified but not destArea we delete the item
	 * @param {Item} srcItem
	 * @param options
	 * @param {"equipped"|"pockets"|"pack"?} options.destArea
	 * @param {"equipped"|"pockets"|"pack"} options.srcArea
	 * @param {Item?} options.destItem
	 */
	async editInventory(srcItem, { destArea, srcArea, destItem }) {
		if (srcItem.type === "kit") {
			return this.replaceKit(srcItem);
		}

		const operations = [];

		// The relative path to the target Set, or null
		const srcPath = srcArea == null ? srcArea : this.areaToPath(srcArea);
		// A copy of the target Set to modify, or null
		const srcSet =
			srcPath == null
				? srcPath
				: new Set(foundry.utils.getProperty(this, srcPath));

		// The relative path to the target Set, or null
		const destPath =
			destArea == null ? destArea : this.areaToPath(destArea);
		// A copy of the target Set to modify, or null
		const destSet =
			destPath == null
				? destPath
				: new Set(foundry.utils.getProperty(this, destPath));

		let id = srcItem.id;

		if (srcArea == null) {
			// If the srcItem comes from nowhere we need to create it
			srcItem = srcItem.inCompendium
				? game.items.fromCompendium(srcItem, { clearFolder: true })
				: srcItem.toObject();

			id = foundry.utils.randomID();

			srcItem._id = id;

			operations.push({
				action: "create",
				documentName: "Item",
				data: [srcItem],
				keepId: true,
				parent: this.parent,
			});
		} else {
			// Else we'll need to edit where it came from
			srcSet.delete(id);
			operations.push({
				action: "update",
				documentName: "Actor",
				updates: [
					{
						_id: this.parent.id,
						[`system.${srcPath}`]: srcSet,
					},
				],
			});
		}

		if (destArea == null) {
			// If the item is going nowhere we delete it
			operations.push({
				action: "delete",
				documentName: "Item",
				ids: [srcItem.id],
				parent: this.parent,
			});
		} else {
			// Else we add it to the destination
			destSet.add(id);
			operations.push({
				action: "update",
				documentName: "Actor",
				updates: [
					{ _id: this.parent.id, [`system.${destPath}`]: destSet },
				],
			});
		}

		if (destItem != null) {
			// If we're swapping the Sets need to be updated inversely to the dropped srcItem
			srcSet.add(destItem.id);
			destSet.delete(destItem.id);

			// And we can just swap their sort values to preserve orders
			operations.push({
				action: "update",
				documentName: "Item",
				updates: [
					{ _id: srcItem.id, sort: destItem.sort },
					{ _id: destItem.id, sort: srcItem.sort },
				],
				parent: this.parent,
			});
		}

		await foundry.documents.modifyBatch(operations);
	}

	prepareDerivedData() {
		super.prepareDerivedData();

		this.wealth = Math.min(this.wealth, this.vocation.value);

		this.calculateBasicStats();
	}
	calculateBasicStats() {
		// Hit Points
		{
			const resolver = this.otherResolver({
				domains: ["hit_points"],
				discriminators: [],
			});
			const bonus = resolver.modifierSum();

			this.hit_points.max = bonus;
			this.hit_points.value = Math.min(
				this.hit_points.value,
				this.hit_points.max,
			);
		}

		// Strain Points
		{
			const resolver = this.otherResolver({
				domains: ["strain_points"],
				discriminators: [],
			});
			const bonus = resolver.modifierSum();

			this.strain.max = bonus;
			this.strain.value = Math.min(this.strain.value, this.strain.max);
		}

		// Speed
		{
			const speed_resolver = this.otherResolver({
				domains: ["speed"],
				discriminators: [],
			});
			const speed_bonus = speed_resolver.modifierSum();
			const base_speed_resolver = this.otherResolver({
				domains: ["base_speed"],
				discriminators: [],
			});
			const base_speed_bonus = base_speed_resolver.modifierSum();

			this.speed = {};
			this.speed.base = base_speed_bonus;
			this.speed.value = this.speed.base + speed_bonus;
		}
	}

	/**
	 * Collect the dynamic effects that are specific to PC sheets
	 *
	 * @return {Generator<DynamicEffect>}
	 */
	*getBaseDynamicEffects() {
		yield* super.getBaseDynamicEffects();

		yield* this.#createProficiencyDynamicEffects();
		yield* this.#createStatisticDynamicEffects();
		yield* this.#createStrikeDynamicEffects();

		// Effect counting the mobility penalty from heavy items
		yield {
			type: "penalty",
			label: "Heavy Items",
			domains: new Set(["skill.mobility"]),
			defaultEnabled: true,

			modifier_type: "universal",

			mode: "add",
			value: this.parent.items.filter(
				(x) =>
					x.system.weight &&
					(x.system.weight == "heavy" || x.system.weight == "huge"),
			).length,
		};
	}
	/**
	 * Create the dynamic effects to reflect invested pips on the sheet
	 *
	 * @return {Generator<DynamicEffect>}
	 */
	*#createProficiencyDynamicEffects() {
		yield {
			type: "proficiency_rank",
			label: _loc("warden.proficiency_rank_label", {
				type: _loc("warden.character.FIELDS.path.combat.label"),
			}),
			domains: new Set(["combat"]),
			defaultEnabled: true,

			mode: "upgrade",
			value: this.path.combat.rank,
		};
		yield {
			type: "proficiency_rank",
			label: _loc("warden.proficiency_rank_label", {
				type: _loc("warden.character.FIELDS.path.skill.label"),
			}),
			domains: new Set(["skill-path", "skill.knowledge"]),
			defaultEnabled: true,

			mode: "upgrade",
			value: this.path.skill.rank,
		};
		for (const [name, data] of Object.entries(this.skill)) {
			yield {
				type: "proficiency_rank",
				label: _loc("warden.proficiency_rank_label", {
					type: _loc("warden.character.FIELDS.path.skill.label"),
				}),
				domains: new Set([`skill.${name}`]),
				defaultEnabled: true,

				mode: "upgrade",
				value: data.is_proficient ? this.path.skill.rank : 0,
			};
		}
		yield {
			type: "proficiency_rank",
			label: _loc("warden.proficiency_rank_label", {
				type: _loc("warden.character.FIELDS.path.special.label"),
			}),
			domains: new Set(["special"]),
			defaultEnabled: true,

			mode: "upgrade",
			value: this.path.special.rank,
		};

		yield {
			type: "proficiency_rank",
			label: _loc("warden.proficiency_rank_label", {
				type: _loc("warden.character.FIELDS.defense.toughness.label"),
			}),
			domains: new Set(["toughness"]),
			defaultEnabled: true,

			mode: "upgrade",
			value: this.defense.toughness.rank,
		};
		yield {
			type: "proficiency_rank",
			label: _loc("warden.proficiency_rank_label", {
				type: _loc("warden.character.FIELDS.defense.resolve.label"),
			}),
			domains: new Set(["resolve"]),
			defaultEnabled: true,

			mode: "upgrade",
			value: this.defense.resolve.rank,
		};
		yield {
			type: "proficiency_rank",
			label: _loc("warden.proficiency_rank_label", {
				type: _loc("warden.character.FIELDS.defense.perception.label"),
			}),
			domains: new Set(["perception"]),
			defaultEnabled: true,

			mode: "upgrade",
			value: this.defense.perception.rank,
		};
	}
	/**
	 * Create the dynamic effects for the basic numerical stats
	 *
	 * @return {Generator<DynamicEffect>}
	 */
	*#createStatisticDynamicEffects() {
		yield {
			type: "bonus",
			label: "Base Hit Points",
			domains: new Set(["hit_points"]),
			defaultEnabled: true,

			modifier_type: "proficiency",

			mode: "upgrade",
			value: 10 + this.defense.toughness.rank * 2,
		};
		yield {
			type: "bonus",
			label: "Base Strain Points",
			domains: new Set(["strain_points"]),
			defaultEnabled: true,

			modifier_type: "proficiency",

			mode: "upgrade",
			value: 10 + this.defense.resolve.rank * 2,
		};
		yield {
			type: "bonus",
			label: "Base Speed",
			domains: new Set(["base_speed"]),
			defaultEnabled: true,

			modifier_type: "proficiency",

			mode: "upgrade",
			value: 5,
		};
	}
	/**
	 * Create the dynamic effects that define some base statistics for strikes
	 *
	 * @return {Generator<DynamicEffect>}
	 */
	*#createStrikeDynamicEffects() {
		yield {
			type: "effect_dice",
			label: "Base Strike Dice",
			domains: new Set(["strike.damage"]),
			defaultEnabled: true,

			modifier_type: "universal",

			mode: "add",
			value: Math.max(this.path.combat.rank, 1),
		};
		yield {
			type: "effect_die_size",
			label: "Base Strike Die Size",
			domains: new Set(["strike.damage"]),
			defaultEnabled: true,

			modifier_type: "universal",

			mode: "upgrade",
			value: 4,
		};
		yield {
			type: "effect_potency",
			label: "Base Strike Potency",
			domains: new Set(["strike.damage"]),
			defaultEnabled: true,

			modifier_type: "universal",

			mode: "add",
			value: 1,
		};

		yield {
			type: "proficiency_rank",
			label: _loc("warden.proficiency_rank_label", {
				type: _loc("warden.character.FIELDS.path.combat.label"),
			}),
			domains: new Set(["strike.damage"]),
			applicable_if: ["strike.melee"],
			defaultEnabled: true,

			mode: "upgrade",
			value: this.path.combat.rank,
		};
		yield {
			type: "bonus",
			label: "Combat Proficiency",
			domains: new Set(["strike.damage"]),
			applicable_if: ["strike.melee"],
			defaultEnabled: true,

			modifier_type: "proficiency",

			mode: "upgrade",
			value: "@profCalc",
		};
	}

	// TODO: add effect parameter for all of these when the system's worked out
	/**
	 * Parameters to make an untrained check.
	 * @param {string[]|Set<string>} domains - Extra domains for this check.
	 * @param {string[]|Set<string>} discriminators - Extra discriminators for this check.
	 * @returns DynamicResultResolver
	 */
	untrainedCheckResolver({ domains = [], discriminators = [] } = {}) {
		if (Array.isArray(domains)) {
			domains = new Set(domains);
		}
		domains = domains.union(new Set(["untrained"]));
		return this.getDynamicResultResolver(domains, discriminators);
	}

	/**
	 * Parameters to make a check with a path.
	 * @param {string} proficiency_name - The path of the proficiency, e.g. "path.combat".
	 * @param {string[]|Set<string>} domains - Extra domains for this check.
	 * @param {string[]|Set<string>} discriminators - Extra discriminators for this check.
	 * @returns DynamicResultResolver
	 */
	proficiencyCheckResolver(
		proficiency_name,
		{ domains = [], discriminators = [] } = {},
	) {
		if (Array.isArray(domains)) {
			domains = new Set(domains);
		}
		domains = domains.union(new Set([proficiency_name]));

		if (proficiency_name === "skill") {
			domains.add("skill-path");
		}

		return this.getDynamicResultResolver(domains, discriminators);
	}

	/**
	 * Parameters to resolve other data, that don't necessarily have to be checks.
	 *
	 * @param {string[]|Set<string>} domains - Domains for this resolving.
	 * @param {string[]|Set<string>} discriminators - Discriminators for this resolving.
	 *
	 * @returns DynamicResultResolver
	 */
	otherResolver({ domains = [], discriminators = [] } = {}) {
		if (Array.isArray(domains)) {
			domains = new Set(domains);
		}

		return this.getDynamicResultResolver(domains, discriminators);
	}

	/**
	 * Parameters to make a check with a skill.
	 * @param {string} skill_name - The skill name to check e.g. "crafting", "medicine".
	 * @param {string[]|Set<string>} domains - Extra domains for this check.
	 * @param {string[]|Set<string>} discriminators - Extra discriminators for this check.
	 * @returns DynamicResultResolver
	 */
	skillCheckResolver(skill_name, { domains = [], discriminators = [] } = {}) {
		if (Array.isArray(domains)) {
			domains = new Set(domains);
		}
		domains = domains.union(new Set(["skill", `skill.${skill_name}`]));

		return this.getDynamicResultResolver(domains, discriminators);
	}
	/**
	 * Parameters to make a check with a knowledge skill.
	 * @param {string} id - The id of the knowledge skill.
	 * @param {string[]|Set<string>} domains - Extra domains for this check.
	 * @param {string[]|Set<string>} discriminators - Extra discriminators for this check.
	 * @returns DynamicResultResolver
	 */
	knowledgeCheckResolver(id, { domains = [], discriminators = [] } = {}) {
		if (Array.isArray(domains)) {
			domains = new Set(domains);
		}
		domains = domains.union(
			new Set(["skill", "skill.knowledge", `skill.knowledge.${id}`]),
		);

		return this.getDynamicResultResolver(domains, discriminators);
	}
}
