import { getBaseActiveEffect } from "../dynamic_effects/activeEffectFactory.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheet } = foundry.applications.sheets;

export class WARDENItemSheet extends HandlebarsApplicationMixin(ItemSheet) {
	static PARTS = {
		header: {
			template: "systems/warden/static/sheets/item/header.hbs",
		},
		tabs: {
			template: "templates/generic/tab-navigation.hbs",
		},
		description: {
			template: "systems/warden/static/sheets/item/description.hbs",
		},
		properties: {
			template: "systems/warden/static/sheets/item/properties.hbs",
			scrollable: [""],
		},
		effects: {
			template: "systems/warden/static/sheets/item/effects.hbs",
			scrollable: [""],
			forms: {
				".effects": {
					handler: WARDENItemSheet.#effectFormHandler,
					submitOnChange: true,
					closeOnSubmit: false,
				},
			},
		},
	};

	static DEFAULT_OPTIONS = {
		actions: {
			newEffect: WARDENItemSheet.newEffect,
			deleteEffect: WARDENItemSheet.deleteEffect,
		},
		window: {
			contentClasses: ["zero-pad", "item-sheet"],
			resizable: true,
		},
		form: {
			submitOnChange: true,
		},
	};

	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		context.tabs = await this._prepareTabs("primary");

		const item = this.item;
		const system = item.system;

		context.item = item;
		context.system = system;

		context.fields = system.schema.fields;

		return context;
	}

	_getTabsConfig(_) {
		const tabs =
			this.item.system.supportedTabs?.map((tab) => ({ id: tab })) ?? [];

		return {
			labelPrefix: "warden.item.sheet.tab",
			tabs,
			initial: tabs[0]?.id,
		};
	}
	async _preparePartContext(partId, context, options) {
		await super._preparePartContext(partId, context, options);

		context.tab = context.tabs[partId];

		switch (partId) {
			case "properties":
				context.properties = this.item.system.getProperties?.() ?? [];
			case "description":
				context.description =
					await foundry.applications.ux.TextEditor.implementation.enrichHTML(
						this.item.system.description,
					);
				break;
			case "effects":
				context.effects = this.item.effects
					.filter((e) => e.changes.length > 0)
					.map((e) => ({
						effect: e,
						change_string: JSON.stringify(
							e.changes[0].value,
							null,
							4,
						),
					}));
				context.effect_types = {
					"system.dynamic_effects.proficiency_rank":
						"Proficiency Rank",
					"system.dynamic_effects.bonus": "Bonus",
					"system.dynamic_effects.penalty": "Penalty",
					"system.dynamic_effects.effect_dice": "Effect Dice",
					"system.dynamic_effects.effect_die_size": "Effect Die Size",
					"system.dynamic_effects.effect_potency": "Effect Potency",
					"system.dynamic_effects.effect_damage_type":
						"Effect Damage Type",
					"system.dynamic_effects.benefit":
						"Benefit (Not implemented)",
					"system.dynamic_effects.detriment":
						"Detriment (Not implemented)",
				};
				break;
		}

		return context;
	}

	static async #effectFormHandler(e, form, data) {
		if (e.type !== "submit") return;

		// Dirty hack since Foundry breaks FormData.getAll
		const keys = [].concat(data.object.key);
		const values = [].concat(data.object.value);

		const updates = [].concat(data.object.id).map((id, index) => ({
			_id: id,
			"system.changes": [
				{
					key: keys[index],
					value: JSON.parse(values[index]),
				},
			],
		}));

		await foundry.documents.modifyBatch([
			{
				action: "update",
				documentName: "ActiveEffect",
				updates,
				parent: this.item,
			},
		]);
	}
	static async newEffect() {
		await ActiveEffect.create(
			getBaseActiveEffect(this.item.name, "bonus"),
			{ parent: this.item },
		);
		this.render({ parts: ["effects"] });
	}
	static async deleteEffect(e, target) {
		const id = target.closest("[data-id]").dataset.id;

		await this.item.deleteEmbeddedDocuments("ActiveEffect", [id]);

		this.render({ parts: ["effects"] });
	}
}
