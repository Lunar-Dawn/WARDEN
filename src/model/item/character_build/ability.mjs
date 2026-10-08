import { BaseFeature } from "./base_feature.mjs";

const { HTMLField, StringField } = foundry.data.fields;

/**
 * @property {string} description
 */
export class Ability extends BaseFeature {
	static LOCALIZATION_PREFIXES = ["warden.ability"];

	static defineSchema() {
		return {
			...super.defineSchema(),

			description: new HTMLField({
				required: true,
			}),
			slug: new StringField({
				required: true,
			}),
		};
	}

	get supportedTabs() {
		return ["description", "properties", "effects"];
	}

	getProperties() {
		const properties = {};

		properties.slug = {
			field: this.schema.fields.slug,
			value: this.slug,
		};

		return properties;
	}
}
