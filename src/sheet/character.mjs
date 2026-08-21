import { BaseEquipment } from "../model/item/equipment/base_equipment.mjs";
import { runCheck } from "../roll/check_manager.mjs";
import { BaseCharacterSheet } from "./base_character.mjs";

export class CharacterSheet extends BaseCharacterSheet {
	static PARTS = {
		main: {
			template: "systems/warden/static/sheets/character-sheet.hbs",
			scrollable: ["", ".description textarea", ".scrollable"],
			templates: [
				"systems/warden/static/partials/proficiency-display.hbs",
				"systems/warden/static/partials/skill-display.hbs",
				"systems/warden/static/partials/knowledge-skill-display.hbs",
				"systems/warden/static/partials/condition-display.hbs",
			],
		},
	};

	static DEFAULT_OPTIONS = {
		actions: {
			clickChanger: {
				handler: CharacterSheet.clickChanger,
				buttons: [0, 2],
			},
			toggleValue: CharacterSheet.toggleValue,
			addKnowledgeSkill: CharacterSheet.addKnowledgeSkill,
			deleteKnowledgeSkill: CharacterSheet.deleteKnowledgeSkill,
			check: CharacterSheet.check,
			toggleDescription: CharacterSheet.toggleDescription,
		},
		window: {
			contentClasses: ["zero-pad"],
		},
		position: {
			width: 900,
		},
		form: {
			submitOnChange: true,
		},
	};

	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		const system = context.system;
		const actor = context.actor;

		context.kit = system.kit;

		const equipped_items = system.equipped_items;
		for (const item of equipped_items) {
			item.equippedSnippet = await item.system.equippedSnippet();
		}

		context.equipped_items = this.paddedInventoryList(equipped_items, 5);

		context.pocket_items = this.paddedInventoryList(system.pocket_items, 4);
		context.pack_items = this.paddedInventoryList(
			system.pack_items,
			system.kit?.system?.pack_slots ?? 2,
		);

		const untrainedResolver = system.untrainedCheckResolver();
		untrainedResolver.resolve("bonus");
		context.untrainedBonus = untrainedResolver.modifierSum();

		context.path = {};
		for (const name of Object.keys(system.path)) {
			context.path[name] = this.#prepareProficiencyDisplay(
				name,
				`path.${name}`,
			);
		}

		context.defense = {};
		for (const name of Object.keys(system.defense)) {
			context.defense[name] = this.#prepareProficiencyDisplay(
				name,
				`defense.${name}`,
			);
		}

		// Gimmick-ass solution
		system.calculateBasicStats();

		context.skill = {};
		for (const [name, data] of Object.entries(system.skill)) {
			context.skill[name] = this.#prepareSkillDisplay(name, data);
		}

		context.knowledge_skills = {};
		for (const [id, data] of Object.entries(system.knowledge_skills)) {
			context.knowledge_skills[id] = this.#prepareKnowledgeSkillDisplay(
				id,
				data,
			);
		}

		context.abilities = await Promise.all(
			system.abilities.map(async (a) => ({
				id: a.id,
				name: a.name,
				description:
					await foundry.applications.ux.TextEditor.implementation.enrichHTML(
						a.system.description,
					),
				expanded: this.expandedDescriptions.has(a.id),
				feats: await Promise.all(
					this.actor.system.feats
						.filter(
							(f) =>
								a.system.slug !== "" &&
								f.system.parentAbilitySlug === a.system.slug,
						)
						.map(async (f) => ({
							id: f.id,
							name: f.name,
							description:
								await foundry.applications.ux.TextEditor.implementation.enrichHTML(
									f.system.description,
								),
							expanded: this.expandedDescriptions.has(f.id),
						})),
				),
			})),
		);

		context.orphanedItems = this.#findOrphanedItems(context);

		return context;
	}

	#findOrphanedItems(context) {
		const registeredItems = new Set();

		registeredItems.add(context.kit?.id);
		context.equipped_items
			.filter((i) => i !== null)
			.forEach((i) => registeredItems.add(i.id));
		context.pocket_items
			.filter((i) => i !== null)
			.forEach((i) => registeredItems.add(i.id));
		context.pack_items
			.filter((i) => i !== null)
			.forEach((i) => registeredItems.add(i.id));

		context.system.origins
			.slice(0, 2)
			.forEach((o) => registeredItems.add(o.id));

		[...context.conditions.permanent, ...context.conditions.persistent, ...context.conditions.temporary,
			...context.warden_active_effects.permanent, ...context.warden_active_effects.persistent, ...context.warden_active_effects.temporary]
			.flat()
			.filter((i) => i !== null)
			.forEach((i) => registeredItems.add(i.id));

		context.abilities.forEach((ability) => {
			registeredItems.add(ability.id);
			ability.feats.forEach((feat) => registeredItems.add(feat.id));
		});

		return this.actor.items.filter((i) => !registeredItems.has(i.id));
	}

	#prepareProficiencyDisplay(name, dataPath) {
		const resolver = this.actor.system.proficiencyCheckResolver(name);
		const rank = resolver.resolve("proficiency_rank");
		const bonus = resolver.modifierSum();
		return { name, rank, bonus, path: dataPath };
	}
	#prepareSkillDisplay(name, data) {
		const resolver = this.actor.system.skillCheckResolver(name);

		const rank = resolver.resolve("proficiency_rank");
		const bonus = resolver.modifierSum();
		return { name, rank, bonus, is_proficient: data.is_proficient };
	}
	#prepareKnowledgeSkillDisplay(id, data) {
		const resolver = this.actor.system.knowledgeCheckResolver(id);

		const rank = resolver.resolve("proficiency_rank");
		const bonus = resolver.modifierSum();
		return { id, topic: data.topic, rank, bonus };
	}

	/**
	 * Pads lists with nulls, so handlebars #each works better
	 * @param {any[]} list - The list to pad
	 * @param {number} length - The desired minimum length of the output
	 * @return {any[]}
	 */
	paddedInventoryList(list, length) {
		return Array.fromRange(Math.max(length, list.length)).map(
			(i) => list[i] ?? null,
		);
	}

	/**
	 * Handle dropping equipment in specified inventory areas
	 * @param {DragEvent} event
	 * @param {Item} item
	 * @return {Promise<documents.Item | null | undefined>}
	 * @private
	 */
	async _onDropItem(event, item) {
		if (!BaseEquipment.isItemEquipment(item))
			return super._onDropItem(event, item);

		// We're either sorting or swapping
		if (this.actor.uuid === item.parent?.uuid) {
			const destElement = event.target.closest("[data-item-id]");
			const destArea = event.target.closest("[data-inventory-area]")
				?.dataset?.inventoryArea;
			const srcElement = this.element.querySelector(
				`[data-item-id="${item.id}"]`,
			);
			const srcArea = srcElement.closest("[data-inventory-area]")?.dataset
				?.inventoryArea;

			if (destArea === srcArea) {
				// We're sorting, let the base implementation handle it.
				if (event.target.closest("[data-empty]") === null) {
					return super._onDropItem(event, item);
				}

				// We're putting in a past-the-end empty slot, sort just after the end element
				const list = this.actor.system.inventoryListByName(destArea);
				await item.update({
					sort: list[list.length - 1].sort + 1,
				});
				return item;
			}

			const couldStoreDroppedItem =
				this.actor.system.couldAreaStoreEquipment(item, destArea);
			if (couldStoreDroppedItem !== true) {
				if (typeof couldStoreDroppedItem === "string") {
					ui.notifications.warn(couldStoreDroppedItem);
				}
				return null;
			}
			if (event.target.closest("[data-empty]") !== null) {
				if (couldStoreDroppedItem !== true) {
					return null;
				}

				await this.actor.system.editInventory(item, {
					destArea,
					srcArea,
				});
				return item;
			}

			const destItem = this.actor.items.get(destElement.dataset.itemId);

			const couldStoreTargetItem =
				this.actor.system.couldAreaStoreEquipment(destItem, srcArea);

			if (typeof couldStoreTargetItem === "string") {
				ui.notifications.warn(couldStoreTargetItem);
			}
			if (
				couldStoreDroppedItem !== true ||
				couldStoreTargetItem !== true
			) {
				return null;
			}

			await this.actor.system.editInventory(item, {
				destArea,
				srcArea,
				destItem,
			});
			return item;
		}

		const destArea = event.target.closest("[data-inventory-area]")?.dataset
			?.inventoryArea;

		if (destArea === undefined) {
			ui.notifications.warn(
				_loc("warden.character.sheet.warnings.no-inventory-area"),
			);
			return null;
		}

		const canStore = this.actor.system.couldAreaStoreEquipment(
			item,
			destArea,
		);
		if (canStore !== true) {
			if (typeof canStore === "string") ui.notifications.warn(canStore);
			return null;
		}

		const canFit = this.actor.system.canAreaFitEquipment(item, destArea);
		if (canFit !== true) {
			if (typeof canFit === "string") ui.notifications.warn(canFit);
			return null;
		}

		await this.actor.system.editInventory(item, { destArea });
	}

	async _onRender(context, options) {
		await super._onRender(context, options);

		for (const item of this.actor.system.equipped_items) {
			const itemButtons = item.system.equippedButtons;

			if (itemButtons.length === 0) continue;

			const buttonElements = this.element.querySelectorAll(
				`[data-item-id=${item.id}] button`,
			);

			buttonElements.forEach((button, index) => {
				button.addEventListener("click", itemButtons[index].onClick);
			});
		}
	}

	async _onFirstRender(context, options) {
		await super._onFirstRender(context, options);

		// Equipment edit/delete menu
		this._createContextMenu(
			() => [
				{
					label: "warden.character.sheet.button.edit",
					icon: "fas fa-edit",
					onClick: (e) => {
						const id =
							e.target.closest("[data-item-id]").dataset.itemId;
						this.actor.items.get(id).sheet.render(true);
					},
				},
				{
					label: "warden.character.sheet.button.delete",
					icon: "fas fa-trash-can",
					onClick: async (_, target) => {
						const id =
							target.closest("[data-item-id]").dataset.itemId;
						const item = this.actor.items.get(id);

						const question = _loc("COMMON.AreYouSure");
						const warning = _loc("SIDEBAR.DeleteWarning", {
							type: "Equipment",
						});
						const content = `<p><strong>${question}</strong> ${warning}</p>`;

						await foundry.applications.api.DialogV2.confirm({
							content,
							yes: {
								callback: () => {
									const srcArea = target.closest(
										"[data-inventory-area]",
									).dataset.inventoryArea;
									this.actor.system.editInventory(item, {
										srcArea,
									});
								},
							},
							window: {
								icon: "fa-solid fa-trash",
								title: `${_loc("DOCUMENT.Delete", { type: "Equipment" })}: ${item.name}`,
							},
						});
					},
					visible: (target) =>
						target.closest("[data-inventory-area]").dataset
							.inventoryArea !== "kit",
				},
			],
			".equipment-context",
		);

		this._createContextMenu(
			() => [
				{
					label: "warden.character.sheet.button.edit",
					icon: "fas fa-edit",
					onClick: (e) => {
						const id =
							e.target.closest("[data-item-id]").dataset.itemId;
						this.actor.items.get(id).sheet.render(true);
					},
				},
				{
					label: "warden.character.sheet.button.delete",
					icon: "fas fa-trash-can",
					onClick: async (_, target) => {
						const id =
							target.closest("[data-item-id]").dataset.itemId;
						this.actor.items.get(id).deleteDialog();
					},
				},
			],
			".origin, .ability, .feat, .orphan",
		);
	}

	static async clickChanger(e, target) {
		const path = target.dataset.path;
		const dataField = this.actor.getFieldForProperty(path);
		const property = foundry.utils.getProperty(this.actor, path);

		const change = e.button === 0 ? 1 : -1;
		this.actor.update({
			[path]: Math.clamp(
				property + change,
				dataField.options.min,
				dataField.options.max,
			),
		});
	}
	static async toggleValue(_, target) {
		const path = target.dataset.path;
		this.actor.update({
			[path]: !foundry.utils.getProperty(this.actor, path),
		});
	}
	static async addKnowledgeSkill() {
		await this.actor.update({
			[`system.knowledge_skills.${foundry.utils.randomID()}`]: {},
		});
	}
	static async deleteKnowledgeSkill(_, target) {
		const id = target.dataset.id;

		await this.actor.update({
			[`system.knowledge_skills.${id}`]:
				new foundry.data.operators.ForcedDeletion(),
		});
	}

	static async check(e, target) {
		const rollData = this.actor.getRollData();
		const speaker = ChatMessage.getSpeaker({ actor: this.actor });

		/**
		 * @type CheckParameters
		 */
		let parameters;
		let resolver;
		switch (target.dataset.type) {
			case "untrained":
				resolver = this.actor.system.untrainedCheckResolver();
				parameters = {
					title: _loc("warden.check_label", {
						type: _loc("warden.proficiency_rank.0"),
					}),
				};
				break;
			case "proficiency":
				const name = target.dataset.name;
				const locPath = target.dataset.path;
				resolver = this.actor.system.proficiencyCheckResolver(name);
				parameters = {
					title: _loc("warden.check_label", {
						type: _loc(`warden.character.FIELDS.${locPath}.label`),
					}),
				};
				break;
			case "skill":
				const skill = target.dataset.skill;
				resolver = this.actor.system.skillCheckResolver(skill);
				parameters = {
					title: _loc("warden.check_label", {
						type: _loc(
							`warden.character.FIELDS.skill.${skill}.name`,
						),
					}),
				};
				break;
			case "knowledge":
				const id = target.dataset.id;
				const knowledge_skill = this.actor.system.knowledge_skills[id];

				resolver = this.actor.system.knowledgeCheckResolver(id);
				parameters = {
					title: _loc("warden.check_label", {
						type: knowledge_skill.topic,
					}),
					benefit: knowledge_skill.is_niche,
				};
				break;
		}

		return runCheck(rollData, speaker, resolver, parameters, {
			skip: e.shiftKey,
		});
	}
}
