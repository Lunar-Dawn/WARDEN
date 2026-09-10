import { WARDENItemSheet } from "./item.mjs";

export class EquipmentSheet extends WARDENItemSheet {
	static PARTS = {
		...WARDENItemSheet.PARTS,
		traits: {
			template: "systems/warden/static/sheets/item/traits.hbs",
			scrollable: [""],
		},
	};

	async _onChangeForm(formConfig, event) {
		super._onChangeForm(formConfig, event);

		const src_element = event.srcElement;
		const dataset = src_element?.dataset;

		if (dataset && dataset.changeTrait) {
			const changed_trait = dataset.changeTrait;
			const traits = this.item.system.traits.filter(x => x !== changed_trait);

			if (src_element.checked) {
				traits.add(changed_trait);
			}

			await this.item.update({
				"system.traits": traits
			});
		}
	}

	async _preparePartContext(partId, context, options) {
		await super._preparePartContext(partId, context, options);

		context.tab = context.tabs[partId];

		switch (partId) {
			case "traits":
				const traitOptions = this.item.system.constructor.traitOptions;
				context.traits = [];

				for (const trait in traitOptions) {
					if (!Object.hasOwn(traitOptions, trait)) continue;

					const traitData = traitOptions[trait];

					context.traits.push({
						slug: trait,
						label: traitData.label,
						desc: game.i18n.localize(traitData.desc),
						available: traitData.validity_cb ? traitData.validity_cb(this.item.system) : true,
						enabled: this.item.system.traits.has(trait)
					})
				};
				break;
		}

		return context;
	}
}
