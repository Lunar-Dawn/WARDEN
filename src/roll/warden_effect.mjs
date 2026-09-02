export class WardenEffect extends Roll {
	constructor(formula, data, options) {
		super(formula, data, options);

		this.modifiers = options.modifiers;
	}

	async _prepareChatRenderContext(options) {
		const context = await super._prepareChatRenderContext(options);

		context.modifiers = this.modifiers;

		return context;
	}

	static CHAT_TEMPLATE = "/systems/warden/static/chat/effect.hbs";
}
