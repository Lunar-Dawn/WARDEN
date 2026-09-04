import { transformEffectsForDisplay } from "../roll/common_manager.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * A work in progress effect being input.
 * @typedef {Object} PendingEffect
 * @property {string} label - The label used to identify the modifier in the roll window and chat.
 * @property {ModifierType} modifier_type - The modifier type.
 * @property {number} value - The value of the modifier, positive or negative.
 */

/**
 * The window used to describe and edit check rolls.
 * @property {CheckManager} manager
 * @property {PendingEffect} pending_modifier
 */
export class CheckWindow extends HandlebarsApplicationMixin(ApplicationV2) {
	/**
	 * Create a CheckWindow.
	 * @param {CheckManager} manager
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
			template: "systems/warden/static/dialog/check-window.hbs",
			forms: {
				".add-modifier-form": {
					handler: CheckWindow.#addModifier,
					submitOnChange: true,
					closeOnSubmit: false,
				},
			},
		},
	};

	static DEFAULT_OPTIONS = {
		actions: {
			execute: CheckWindow.#confirm,
			toggleModifier: CheckWindow.#toggleModifier,
			setDifficulty: CheckWindow.#setDifficulty,
			toggleBenefit: CheckWindow.#toggleBenefit,
			toggleDetriment: CheckWindow.#toggleDetriment,
		},
	};

	get title() {
		return this.manager.parameters.title ?? "Check";
	}

	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		context.manager = this.manager;
		context.resolver = this.manager.resolver;
		context.formula = this.manager.formula;

		context.difficulty = this.manager.difficulty;
		context.isOpen = this.manager.isOpen;

		context.raw_difficulty = this.manager.parameters.difficulty;
		context.benefit = this.manager.parameters.benefit;
		context.detriment = this.manager.parameters.detriment;

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
		const index = target.dataset.index;
		this.manager.toggle(index);

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
	static async #setDifficulty(_, target) {
		const rawDifficulty = target.dataset.difficulty;
		const difficulty =
			target.dataset.difficulty === "open"
				? rawDifficulty
				: parseInt(rawDifficulty);

		this.manager.setDifficulty(difficulty);

		this.render();
	}
	static async #toggleBenefit() {
		this.manager.toggleBenefit();
		this.render();
	}
	static async #toggleDetriment() {
		this.manager.toggleDetriment();
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
