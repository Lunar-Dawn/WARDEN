import { Action } from "../../../action.mjs";
import { BaseItem } from "../base_item.mjs";

const { SchemaField, SetField, StringField } = foundry.data.fields;

export class BaseFeature extends BaseItem {
	static defineSchema() {
		return {
			...super.defineSchema(),

			action: new SchemaField(
				{
					check_type: new StringField({
						choices: {
							none: "warden.action.check_type.none",
							check: "warden.action.check_type.check",
							attack: "warden.action.check_type.attack",
						},

						required: true,
						initial: "none",
						label: "warden.action.check_type.label",
					}),
					check_domains: new SetField(
						new StringField({ nullable: false }),
						{
							nullable: false,
							initial: [],
							label: "warden.action.check_domains.label",
						},
					),
					target_defenses: new SetField(
						new StringField({
							choices: {
								toughness:
									"warden.character.FIELDS.defense.toughness.label",
								resolve:
									"warden.character.FIELDS.defense.resolve.label",
								perception:
									"warden.character.FIELDS.defense.perception.label",
							},
						}),
						{
							initial: [],
							label: "warden.action.target_defenses.label",
						},
					),

					effect_type: new StringField({
						choices: {
							none: "warden.action.effect_type.none",
							effect: "warden.action.effect_type.effect",
							damage: "warden.action.effect_type.damage",
						},

						required: true,
						initial: "none",
						label: "warden.action.effect_type.label",
					}),
					effect_domains: new SetField(
						new StringField({ nullable: false }),
						{
							nullable: false,
							initial: [],
							label: "warden.action.effect_domains.label",
						},
					),
					damage_types: new SetField(
						new StringField({
							choices: WARDEN.DAMAGE_TYPE_CHOICES,
							label: "warden.action.damage_type.label",
						}),
						{
							initial: [],
							label: "warden.action.damage_types.label",
						},
					),
				},
				{ nullable: false },
			),
		};
	}

	/**
	 * @inheritDoc
	 */
	providesAction() {
		return (
			this.action.check_type !== "none" ||
			this.action.effect_type !== "none"
		);
	}

	/**
	 * Builds an action from the action fields of a feature
	 * @override
	 */
	getAction() {
		if (!this.providesAction()) return null;

		return new Action(this.parent.name, this.parent, this.action);
	}
}
