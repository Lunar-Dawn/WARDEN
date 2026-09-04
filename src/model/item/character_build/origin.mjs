import { BaseItem } from "../base_item.mjs";

const { HTMLField } = foundry.data.fields;

/**
 * @property {string} description
 */
export class Origin extends BaseItem {
	static LOCALIZATION_PREFIXES = ["warden.origin"];

	static defineSchema() {
		return {
			...super.defineSchema(),

			description: new HTMLField({
				required: true,
			}),
		};
	}

	get supportedTabs() {
		return ["description", "effects"];
	}
}
