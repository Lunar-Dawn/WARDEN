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

	get buttons() {
		const buttons = [];

		switch (this.check_type) {
			case "none":
				break;
			case "check":
				buttons.push({
					text: "Check",
					handler: this.#generateCheckHandler(),
				});
				break;
			case "attack":
				buttons.push({
					text: "Attack v. 10",
					handler: this.#generateAttackHandler({ map: 0 }),
				});
				buttons.push({
					text: "v. 15",
					handler: this.#generateAttackHandler({ map: 1 }),
				});
				buttons.push({
					text: "v. 20",
					handler: this.#generateAttackHandler({ map: 2 }),
				});
		}

		switch (this.effect_type) {
			case "none":
				break;
			case "effect":
				buttons.push({
					text: "Effect",
					handler: this.#generateEffectHandler(),
				});
				break;
			case "damage":
				buttons.push({
					text: "Damage",
					handler: this.#generateDamageHandler({
						map: 0,
						crit: false,
					}),
				});
				buttons.push({
					text: "+MAP",
					handler: this.#generateDamageHandler({
						map: 1,
						crit: false,
					}),
				});
				buttons.push({
					text: "Critical",
					handler: this.#generateDamageHandler({
						map: 0,
						crit: true,
					}),
				});
				buttons.push({
					text: "+MAP",
					handler: this.#generateDamageHandler({
						map: 1,
						crit: true,
					}),
				});
		}

		return buttons;
	}

	#generateCheckHandler() {
		return () => console.log("#generateCheckHandler");
	}
	#generateAttackHandler({ map }) {
		return () => console.log("#generateAttackHandler", map);
	}
	#generateEffectHandler() {
		return () => console.log("#generateEffectHandler");
	}
	#generateDamageHandler({ map, crit }) {
		return () => console.log("#generateDamageHandler", map, crit);
	}
}
