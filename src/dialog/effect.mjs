import { transformEffectsForDisplay } from "../roll/common_manager.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * The window used to describe and edit effect rolls.
 * @property {EffectManager} manager
 */
export class EffectWindow extends HandlebarsApplicationMixin(ApplicationV2) {
	/**
	 * Create an EffectWindow.
	 * @param {EffectManager} manager
	 * @param {object} options
	 * @param {function} resolve
	 */
	constructor(manager, options, resolve = null) {
		super(options);

		this.manager = manager;

		this.resolve = resolve;

		this.pending_effect = {
			value: 0,
			label: "",
			modifier_type: "circumstance",
		};
	}

	static PARTS = {
		main: {
			template: "systems/warden/static/dialog/effect-window.hbs",
			forms: {
				".add-modifier-form": {
					handler: EffectWindow.#addModifier,
					submitOnChange: true,
					closeOnSubmit: false,
				},
			},
		},
	};

	static DEFAULT_OPTIONS = {
		actions: {
			execute: EffectWindow.#confirm,
			toggleModifier: EffectWindow.#toggleModifier,
		},
	};

	get title() {
		return this.manager.parameters.title ?? "Effect";
	}

	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		context.resolver = this.manager.resolver;
		context.formula = this.manager.formula;

		context.pending_effect = this.pending_effect;
		context.choices = {
			universal: "warden.modifier_type_abbr.universal",
			proficiency: "warden.modifier_type_abbr.proficiency",
			item: "warden.modifier_type_abbr.item",
			status: "warden.modifier_type_abbr.status",
			circumstance: "warden.modifier_type_abbr.circumstance",
		};

		context.modifiers = transformEffectsForDisplay(
			this.manager.resolver.applicableEffects,
			this.manager.resolver,
		);

		return context;
	}

	static async #confirm() {
		this.close({ submit: true });
		if (this.resolve !== null) {
			this.resolve(true);
		}
	}

	static async #toggleModifier(_, target) {
		const path = target.dataset.path;
		const index = target.dataset.index;
		this.manager.toggle(path, index);

		this.render();
	}
	static async #addModifier(e, form, data) {
		Object.assign(this.pending_effect, data.object);

		if (e.type !== "submit") return;

		this.manager.addModifier(this.pending_effect);

		this.pending_effect = {
			value: 0,
			label: "",
			modifier_type: "circumstance",
		};

		this.render();
	}

	static async wait(manager, options) {
		return new Promise((resolve) => {
			const prompt = new this(manager, options, resolve);

			prompt.addEventListener(
				"close",
				() => {
					resolve(false);
				},
				{ once: true },
			);

			prompt.render(true);
		});
	}
}
