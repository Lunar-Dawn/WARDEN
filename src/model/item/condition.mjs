const { HTMLField, StringField, NumberField } = foundry.data.fields;
const { TypeDataModel } = foundry.abstract;

/**
 * @property {string} description
 */
export class Condition extends TypeDataModel {
	static LOCALIZATION_PREFIXES = ["warden.condition"];

	static defineSchema() {
		return {
			description: new HTMLField({
				required: true,
			}),
			slug: new StringField({
				required: true,
			}),
			variant: new StringField({
				required: true,
				initial: "condition",
				choices: {
					condition: "warden.condition.variant.condition",
					active_effect: "warden.condition.variant.active_effect",
				},
			}),
			type: new StringField({
				required: true,
				initial: "temporary",
				choices: {
					temporary: "warden.condition.type.temporary",
					persistent: "warden.condition.type.persistent",
					permanent: "warden.condition.type.permanent",
				},
			}),
			timer: new NumberField({
				required: true,
				initial: 0,
				min: 0,
				integer: true,
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
		properties.variant = {
			field: this.schema.fields.variant,
			value: this.variant,
		};
		properties.type = {
			field: this.schema.fields.type,
			value: this.type,
		};
		properties.timer = {
			field: this.schema.fields.timer,
			value: this.timer,
		};

		return properties;
	}
}
