import { runCheck } from "./roll/check_manager.mjs";
import { getTarget } from "./roll/common_manager.mjs";

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
		this.actor = source.parent;

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

	#getResolver(base_domains) {
		const target = getTarget();

		const domains = [
			...base_domains,
			...this.actor.system.getDomains(),
			...(target?.getDomains("target") ?? []),
		];
		const discriminators = [
			...this.actor.system.getDiscriminators(),
			...(target?.getDiscriminators("target") ?? []),
		];

		return this.actor.system.getDynamicResultResolver(
			domains,
			discriminators,
		);
	}

	#generateCheckHandler() {
		return (e) => {
			const rollData = this.actor.getRollData();
			const speaker = ChatMessage.getSpeaker({
				actor: this.actor,
			});

			const resolver = this.#getResolver(this.check_domains);

			return runCheck(
				rollData,
				speaker,
				resolver,
				{
					title: this.title,
					origin: this.actor.system,
				},
				{ skip: e.shiftKey },
			);
		};
	}
	#generateAttackHandler({ map }) {
		return (e) => {
			const rollData = this.actor.getRollData();
			const speaker = ChatMessage.getSpeaker({
				actor: this.actor,
			});

			const resolver = this.#getResolver(this.check_domains);

			const target = getTarget();
			const difficulty = 10 + map * 5;

			return runCheck(
				rollData,
				speaker,
				resolver,
				{
					difficulty,
					title: this.title,
					against: Array.from(this.target_defenses),
					target,
					origin: this.actor.system,
				},
				{ skip: e.shiftKey },
			);
		};
	}

	#generateEffectHandler() {
		return () => console.log("#generateEffectHandler");
	}
	#generateDamageHandler({ map, crit }) {
		return () => console.log("#generateDamageHandler", map, crit);
	}
}
