import { damageTypeFromAbbreviation } from "../damage_type.mjs";

export class WardenEffect extends Roll {
	constructor(formula, data, options) {
		super(formula, data, options);

		this.modifiers = options.modifiers;
		this.notes = options.notes;

		// TODO: Unfathomably criminal, throw this shit out when we redo resolvers.
		this.damage_types = this.modifiers
			.filter(x => x.path === "effect_damage_type")
			.map(x => damageTypeFromAbbreviation(x.value))
			.filter(Boolean);
		this.damage_traits = this.modifiers
			.filter(x => x.label === "Breach" || x.label === "Tangible")
			.map(x => x.label.toLowerCase());
	}

	async _prepareChatRenderContext(options) {
		const context = await super._prepareChatRenderContext(options);

		context.modifiers = this.modifiers;
		context.notes = this.notes;
		context.damage_types = this.damage_types;
		context.damage_traits = this.damage_traits;

		return context;
	}

	static CHAT_TEMPLATE = "/systems/warden/static/chat/effect.hbs";
}
