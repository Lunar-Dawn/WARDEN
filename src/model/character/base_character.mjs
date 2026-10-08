import { DynamicResultResolver } from "../../dynamic_effects/resolver.mjs";

const {
	AnyField,
	SchemaField,
	NumberField,
	ArrayField,
	SetField,
	DocumentIdField,
} = foundry.data.fields;
const { TypeDataModel } = foundry.abstract;

/**
 * Base class for characters and opponents
 * @property {0,1,2,3,4,5} size
 * @property {number} level
 * @property {{value: number, max: number}} hit_points
 * @property {{value: number, max: number}} strain
 * @property {DynamicEffect[]} dynamic_effects
 */
export class BaseCharacterData extends TypeDataModel {
	static LOCALIZATION_PREFIXES = ["warden.character"];

	static defineSchema() {
		return {
			size: new NumberField({
				required: true,
				choices: {
					0: this.sizeLocKey(0),
					1: this.sizeLocKey(1),
					2: this.sizeLocKey(2),
					3: this.sizeLocKey(3),
					4: this.sizeLocKey(4),
					5: this.sizeLocKey(5),
				},
				initial: 2,
			}),

			level: new NumberField({
				required: true,
				integer: true,
				min: 0,
				max: 10,
				initial: 0,
			}),

			hit_points: new SchemaField({
				value: new NumberField({
					required: true,
					integer: true,
					min: 0,
					initial: 10,
				}),
			}),
			strain: new SchemaField({
				value: new NumberField({
					required: true,
					integer: true,
					min: 0,
					initial: 10,
				}),
			}),
			condition_item_ids: new SetField(
				new DocumentIdField({ type: "Item", readonly: false }),
			),
		};
	}

	static sizeLocKey(size) {
		switch (size) {
			case 0:
				return "warden.character.size.tiny";
			case 1:
				return "warden.character.size.small";
			case 2:
				return "warden.character.size.medium";
			case 3:
				return "warden.character.size.large";
			case 4:
				return "warden.character.size.huge";
			case 5:
				return "warden.character.size.massive";
		}
	}

	prepareBaseData() {
		super.prepareBaseData();

		this.prepareDynamicEffects();
	}

	get actions() {
		return this.parent.items
			.filter((i) => i.system.providesAction())
			.map((i) => i.system.getAction());
	}

	/*================================================================================================================*/
	/*|-------------------------------------Dynamic Result system implementation-------------------------------------|*/
	/*================================================================================================================*/

	/**
	 * Prepare the sets where effects are stored
	 */
	prepareDynamicEffects() {
		/** @type {DynamicEffect[]} */
		this.dynamic_effects = [];
	}
	prepareDerivedData() {
		super.prepareDerivedData();

		this.#collectDynamicEffects();
		this.calculateBasicStats();
	}

	/**
	 * Common statistics for both player characters and opponents.
	 * The base dynamic effects to actually fill these can be found in the respective child classes.
	 */
	calculateBasicStats() {
		// Hit Points
		{
			const resolver = this.getDynamicResultResolver(["hit_points"], []);
			const bonus = resolver.modifierSum();

			this.hit_points.max = bonus;
			this.hit_points.value = Math.min(
				this.hit_points.value,
				this.hit_points.max,
			);
		}

		// Strain Points
		{
			const resolver = this.getDynamicResultResolver(
				["strain_points"],
				[],
			);
			const bonus = resolver.modifierSum();

			this.strain.max = bonus;
			this.strain.value = Math.min(this.strain.value, this.strain.max);
		}

		// Speed
		{
			const speed_resolver = this.getDynamicResultResolver(["speed"], []);
			const speed_bonus = speed_resolver.modifierSum();
			const base_speed_resolver = this.getDynamicResultResolver(
				["base_speed"],
				[],
			);
			const base_speed_bonus = base_speed_resolver.modifierSum();

			this.speed = {};
			this.speed.base = base_speed_bonus;
			this.speed.value = this.speed.base + speed_bonus;
		}
	}

	/**
	 * This is the core of the dynamic effect distribution.
	 * It's not complicated, but it is important; So here's how it works in "short".
	 *
	 * Dynamic effects are gathered from a series of generators defined on
	 * the actor and item model classes. It adds all of these effects to
	 * `this.dynamic_effects`, a flat array containing all of them.
	 *
	 * This function first iterates over the `getBaseDynamicEffects`
	 * generator on the character, most likely an overload from a child class.
	 * This defines the "basic" effects such as proficiency calculations
	 * and base speed values. Those overloads are where effects without
	 * a very clear origin should be created, see the CharacterData implementation
	 * for a reasonable division.
	 *
	 * It then iterates over all the items owned by the Actor and iterates its
	 * `getDynamicEffects` iterator. All `BaseItem`s have a store for custom written ones,
	 * and overloads of this is where e.g. item trait's effects should be added.
	 */
	#collectDynamicEffects() {
		for (const effect of this.getBaseDynamicEffects())
			this.dynamic_effects.push(effect);

		for (const item of this.parent.items)
			if (item.system.getDynamicEffects !== undefined)
				for (const effect of item.system.getDynamicEffects())
					this.dynamic_effects.push(effect);

		for (const trait in WARDEN.WEAPON_TRAITS) {
			if (!Object.hasOwn(WARDEN.WEAPON_TRAITS, trait)) continue;
			const traitData = WARDEN.WEAPON_TRAITS[trait];

			if (traitData.dynamic_effects.length === 0) continue;

			for (const effect of traitData.dynamic_effects)
				this.dynamic_effects.push(effect);
		}
	}

	/**
	 * Collect base effects for characters, should be extended in child classes
	 *
	 * @return {Generator<DynamicEffect>}
	 */
	*getBaseDynamicEffects() {
		yield* this.#createProficiencyCalculationEffects();
	}

	/**
	 * Create the dynamic effects that perform proficiency calculations
	 *
	 * @return {Generator<DynamicEffect>}
	 */
	*#createProficiencyCalculationEffects() {
		yield {
			type: "bonus",
			label: "Combat Proficiency",
			domains: new Set(["combat"]),
			defaultEnabled: true,

			modifier_type: "proficiency",

			mode: "upgrade",
			value: "@profCalc",
		};
		yield {
			type: "bonus",
			label: "Skill Proficiency",
			domains: new Set(["skill"]),
			defaultEnabled: true,

			modifier_type: "proficiency",

			mode: "upgrade",
			value: "@profCalc",
		};
		yield {
			type: "bonus",
			label: "Special Proficiency",
			domains: new Set(["special"]),
			defaultEnabled: true,

			modifier_type: "proficiency",

			mode: "upgrade",
			value: "@profCalc",
		};
		yield {
			type: "bonus",
			label: "Toughness Proficiency",
			domains: new Set(["toughness"]),
			defaultEnabled: true,

			modifier_type: "proficiency",

			mode: "upgrade",
			value: "@profCalc",
		};
		yield {
			type: "bonus",
			label: "Resolve Proficiency",
			domains: new Set(["resolve"]),
			defaultEnabled: true,

			modifier_type: "proficiency",

			mode: "upgrade",
			value: "@profCalc",
		};
		yield {
			type: "bonus",
			label: "Perception Proficiency",
			domains: new Set(["perception"]),
			defaultEnabled: true,

			modifier_type: "proficiency",

			mode: "upgrade",
			value: "@profCalc",
		};

		// Base effect for the untrained button at the top of the character sheet
		yield {
			type: "bonus",
			label: "Untrained Proficiency",
			domains: new Set(["untrained"]),

			defaultEnabled: true,

			modifier_type: "proficiency",

			mode: "upgrade",
			value: Math.min(Math.floor(this.level / 2), 10),
		};
	}

	/**
	 * A genuinely insane implementation, but hey. On the spot, force the apparel to create its resistance bonus.
	 *
	 * @param {string} type The damage type that would apply to the character.
	 * @param {string[]} traits Traits that would modify how the damage is applied.
	 */
	prepareApparelResistances(type, traits) {
		// To be overwritten by child classes.
	}

	/**
	 * Returns a list of domains that describe the current status of the character.
	 *
	 * @param {string} prefix A custom prefix to differentiate domains. Defaults to `character`.
	 * @returns {string[]} The relevant domains to the character.
	 */
	getDomains(prefix = "") {
		const determined_prefix = prefix.length > 0 ? prefix : "character";

		return [];
	}

	/**
	 * Returns a list of discriminators that describe the current status of the character.
	 *
	 * @param {string} prefix A custom prefix to differentiate discriminators. Defaults to `character`.
	 * @returns {string[]} The relevant discriminators to the character.
	 */
	getDiscriminators(prefix = "") {
		const determined_prefix = prefix.length > 0 ? prefix : "character";

		return [
			`${determined_prefix}.level.${this.level}`,
			`${determined_prefix}.level.${this.size}`,
			`${determined_prefix}.hit_points.current.${this.hit_points.value}`,
			`${determined_prefix}.hit_points.max.${this.hit_points.max}`,
			`${determined_prefix}.hit_points.percent.${Math.round((this.hit_points.value / this.hit_points.max) * 100)}`,
			`${determined_prefix}.strain.current.${this.strain.value}`,
			`${determined_prefix}.strain.max.${this.strain.max}`,
			`${determined_prefix}.strain.percent.${Math.round((this.strain.value / this.strain.max) * 100)}`,
		];
	}

	/**
	 * Get a handler for all dynamic effects that belong to one of the domains and fulfills its applicability requirements
	 * @param {string[]|Set<string>} domains - The domains to filter the effects by, if any overlap it's applied
	 * @param {string[]|Set<string>} discriminators - Items used to filter an effect to see if it applies in the specific circumstance. Shape *very* much up for change
	 * @return DynamicResultResolver
	 */
	getDynamicResultResolver(domains, discriminators = []) {
		const domain_set = Array.isArray(domains) ? new Set(domains) : domains;
		const discriminator_set = Array.isArray(discriminators)
			? new Set(discriminators)
			: discriminators;

		const filtered_effects = this.dynamic_effects.filter((e) => {
			if (e.domains === undefined) {
				return false;
			}
			const effect_domains = Array.isArray(e.domains)
				? new Set(e.domains)
				: e.domains;
			return !effect_domains.isDisjointFrom(domain_set);
		});

		return new DynamicResultResolver(
			domain_set,
			discriminator_set,
			filtered_effects,
			{
				origin: this,
			},
		);
	}

	get conditions() {
		const mapped = this.condition_item_ids.map((id) =>
			this.parent.items.get(id),
		);
		return Array.from(mapped).sort((i1, i2) => i1.sort - i2.sort);
	}

	/// TODO: characterData's editInventory could be merged with this somehow?
	async editConditions(srcItem, { destArea, srcArea, destItem }) {
		const operations = [];

		const srcPath = srcArea == null ? srcArea : "condition_item_ids";
		const srcSet =
			srcPath == null
				? srcPath
				: new Set(foundry.utils.getProperty(this, srcPath));

		const destPath = destArea == null ? destArea : "condition_item_ids";
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

	/**
	 * @typedef DamageApplicationData
	 *
	 * Data about the incoming damage.
	 *
	 * @property {integer} total The amount of incoming damage.
	 * @property {string[]} types The damage types of the incoming damage. These *should* be keys in the WARDEN.DAGAME_TYPES struct.
	 * @property {string[]} traits The traits of the incoming damage, where relevant. Hardcode hell.
	 */

	/**
	 * @brief Applies damage to the character, considering immunities, weaknesses, and resistance.
	 *
	 * @details The damage application favours the "attacker", or in other words, picks the worst options for the
	 * character every time. This is mainly based on asking Raven how the calculation is actually to be interpreted.
	 *
	 * @param {DamageApplicationData} damage The damage data to apply to the character.
	 */
	async applyDamage(damage) {
		let calcDetails = {
			immune: true,
			resistance: undefined,
			weakness: undefined,
		};

		damage.types.forEach((type) => {
			// Immunity
			{
				const immunityResolver = this.getDynamicResultResolver(
					["damage.immunity.all", `damage.immunity.${type}`],
					[],
				);
				const immunity = immunityResolver.modifierSum();

				// This should nullify immunities unless the character is immune to EVERY damage type.
				calcDetails.immune = calcDetails.immune && immunity > 0;
			}

			// Resistance
			{
				this.prepareApparelResistances(type, damage.traits);

				const resistanceResolver = this.getDynamicResultResolver(
					["damage.resistance.all", `damage.resistance.${type}`],
					[],
				);
				const resistance = resistanceResolver.modifierSum();

				// Take the lower of the current detected resistance and this new one.
				// Remember, when applying damage, the calculations should favour the attacker!
				calcDetails.resistance =
					calcDetails.resistance === undefined
						? resistance
						: Math.min(calcDetails.resistance, resistance);
			}

			// Weakness
			{
				const weaknessResolver = this.getDynamicResultResolver(
					["damage.weakness.all", `damage.weakness.${type}`],
					[],
				);
				const weakness = weaknessResolver.modifierSum();

				// Take the higher of the current detected weakness and this new one.
				// Remember, when applying damage, the calculations should favour the attacker!
				calcDetails.weakness =
					calcDetails.weakness === undefined
						? weakness
						: Math.max(calcDetails.weakness, weakness);
			}
		});

		const finalDamage = calcDetails.immune
			? 0
			: Math.max(
					0,
					damage.total +
						calcDetails.weakness -
						calcDetails.resistance,
				);
		const content = game.i18n.localize("warden.roll.damage_taken", {
			name: this.parent.name,
			damage: finalDamage,
		});

		if (finalDamage > 0)
			await this.parent.update({
				"system.hit_points.value": Math.max(
					0,
					this.hit_points.value - finalDamage,
				),
			});

		// I don't think this is correct, but I gotta get rid of the apparel dynamic effects somehow.
		this.prepareBaseData();
		this.prepareDerivedData();

		ChatMessage.create({ content });
	}
}
