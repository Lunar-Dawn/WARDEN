/**
 * The local representation of an Action with buttons for checks and effects
 */
export class Action {
	constructor(
		title,
		source,
		{
			check_type = null,
			check_domains = [],

			effect_type = null,
			effect_domains = [],

			target_defenses = null,
			damage_types = [],
		},
	) {
		this.title = title;

		this.source = source;

		this.check_type = check_type;
		this.check_domains = check_domains;

		this.effect_type = effect_type;
		this.effect_domains = effect_domains;

		this.target_defenses = target_defenses;
		this.damage_types = damage_types;
	}
}
