import { WARDENItemSheet } from "./item.mjs";

export class EquipmentSheet extends WARDENItemSheet {
	static PARTS = {
		...WARDENItemSheet.PARTS,
		traits: {
			template: "systems/warden/static/sheets/item/traits.hbs",
			scrollable: [""],
		},
	};

	async _preparePartContext(partId, context, options) {
		await super._preparePartContext(partId, context, options);

		context.tab = context.tabs[partId];

		switch (partId) {
			case "traits":
				break;
		}

		return context;
	}
}
