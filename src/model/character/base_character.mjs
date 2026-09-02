import { DynamicResultResolver } from "../../dynamic_effects/resolver.mjs";

const { AnyField, SchemaField, NumberField, ArrayField, SetField, DocumentIdField } = foundry.data.fields;
const { TypeDataModel } = foundry.abstract;

/**
 * Base class for characters and opponents
 * @property {0,1,2,3,4,5} size
 * @property {number} level
 * @property {{value: number, max: number}} hit_points
 * @property {{value: number, max: number}} strain
 * @property {Record<string, DynamicEffect[]>} dynamic_effects
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

	/*================================================================================================================*/
	/*|-------------------------------------Dynamic Result system implementation-------------------------------------|*/
	/*================================================================================================================*/

	/** TODO: Priority?
	 * @typedef {
	 *    "add"
	 *  | "subtract"
	 *  | "downgrade"
	 *  | "upgrade"
	 * } DynamicEffectMode
	 */

	/**
	 * @typedef DynamicEffect
	 * @property {string} label
	 * @property {Set<string>} domains
	 * @property {DynamicEffectMode} mode
	 * @property {boolean|string|string[]} applicable_if
	 * @property {any} value
	 * @property {boolean?} defaultEnabled
	 */

	/**
	 * Prepare the sets where effects are stored
	 */
	prepareDynamicEffects() {
		/** @type {Record<string, DynamicEffect[]>} */
		this.dynamic_effects = {
			proficiency_rank: [],

			bonus: [],
			penalty: [],

			effect_dice: [],
			effect_die_size: [],
			effect_potency: [],
			effect_damage_type: [],

			benefit: [],
			detriment: [],
		};

		// I don't like this, but without a fake field it coerces all values to strings
		this.dynamic_effect_field_type = new ArrayField(new AnyField());
	}

	getFieldForProperty(key) {
		if (
			(typeof key === "string" && key.startsWith("dynamic_effects.")) ||
			(Array.isArray(key) && key[0] === "dynamic_effect")
		) {
			return this.dynamic_effect_field_type;
		} else {
			return super.getFieldForProperty(key);
		}
	}

	/**
	 * Returns a list of domains that describe the current status of the character.
	 * 
	 * @param {string} prefix A custom prefix to differentiate domains. Defaults to `character`.
	 * @returns {string[]} The relevant domains to the character.
	 */
	getDomains(prefix = "") {
		const determined_prefix = prefix.length > 0 ? prefix : "character";

		return []
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
			`${determined_prefix}.hit_points.percent.${Math.round(this.hit_points.value / this.hit_points.max * 100)}`,
			`${determined_prefix}.strain.current.${this.strain.value}`,
			`${determined_prefix}.strain.max.${this.strain.max}`,
			`${determined_prefix}.strain.percent.${Math.round(this.strain.value / this.strain.max * 100)}`
		]
	}

	/**
	 * Get a handler for all dynamic effects that belong to one of the domains and fulfills its applicability requirements
	 * @param {string[]|Set<string>} domains - The domains to filter the effects by, if any overlap it's applied
	 * @param {string[]|Set<string>} discriminators - Items used to filter an effect to see if it applies in the specific circumstance. Shape *very* much up for change
	 * @return DynamicResultResolver
	 */
	getDynamicResultResolver(domains, discriminators = []) {
		const target = game.user.targets.first()?.actor.system;
		
		const targetDomains = target !== undefined ? target.getDomains("target") : [];
		const raw_domains = [...domains, ...this.getDomains(), ...targetDomains];
		const domain_set = new Set(raw_domains);
		
		const targetDiscriminators = target !== undefined ? target.getDiscriminators("target") : [];
		const raw_discriminators = [...discriminators, ...this.getDiscriminators(), ...targetDiscriminators];
		const discriminator_set = new Set(raw_discriminators);

		const filtered_effects = {};

		for (const [type, effects] of Object.entries(this.dynamic_effects)) {
			filtered_effects[type] = effects.filter((e) => {
				if (e.domains === undefined) {
					return false;
				}
				if (Array.isArray(e.domains)) {
					e.domains = new Set(e.domains);
				}

				return !e.domains.isDisjointFrom(domain_set);
			});
		}

		return new DynamicResultResolver(
			domain_set,
			discriminator_set,
			filtered_effects,
			{
				origin: this,
				target
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
}
