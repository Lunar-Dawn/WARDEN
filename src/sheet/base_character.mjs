const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheet } = foundry.applications.sheets;

export class BaseCharacterSheet extends HandlebarsApplicationMixin(ActorSheet) {
	expandedDescriptions = new Set();

	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		context.actor = this.actor;
		context.system = this.actor.system;

		context.fields = this.actor.system.schema.fields;

		const conditions = await Promise.all(
			context.system.conditions.map(async (a) => ({
				id: a.id,
				name: a.name,
				variant: a.system.variant,
				type: a.system.type,
				timer:
					a.system.type === "temporary" ? a.system.timer : undefined,
				expanded: this.expandedDescriptions.has(a.id),
				description:
					await foundry.applications.ux.TextEditor.implementation.enrichHTML(
						a.system.description,
					),
			})),
		);

		context.conditions = {
			temporary: conditions.filter(
				(a) => a.variant === "condition" && a.type === "temporary",
			),
			persistent: conditions.filter(
				(a) => a.variant === "condition" && a.type === "persistent",
			),
			permanent: conditions.filter(
				(a) => a.variant === "condition" && a.type === "permanent",
			),
		};

		context.warden_active_effects = {
			temporary: conditions.filter(
				(a) => a.variant === "active_effect" && a.type === "temporary",
			),
			persistent: conditions.filter(
				(a) => a.variant === "active_effect" && a.type === "persistent",
			),
			permanent: conditions.filter(
				(a) => a.variant === "active_effect" && a.type === "permanent",
			),
		};

		return context;
	}

	async _onDropItem(event, item) {
		if (this.actor.uuid !== item.parent?.uuid) {
			if (item.type === "condition")
				return this.onDropCondition(event, item);
		}

		return super._onDropItem(event, item);
	}

	async onDropCondition(event, item) {
		await this.actor.system.editConditions(item, {
			destArea: "condition_item_ids",
		});
	}

	async _onFirstRender(context, options) {
		await super._onFirstRender(context, options);

		this._createContextMenu(
			() => [
				{
					label: "warden.character.sheet.button.edit",
					icon: "fas fa-edit",
					onClick: (e) => {
						const id =
							e.target.closest("[data-item-id]").dataset.itemId;
						this.actor.items.get(id).sheet.render(true);
					},
				},
				{
					label: "warden.character.sheet.button.delete",
					icon: "fas fa-trash-can",
					onClick: async (_, target) => {
						const id =
							target.closest("[data-item-id]").dataset.itemId;
						const item = this.actor.items.get(id);

						const question = _loc("COMMON.AreYouSure");
						const warning = _loc("SIDEBAR.DeleteWarning", {
							type: "Condition",
						});
						const content = `<p><strong>${question}</strong> ${warning}</p>`;

						await foundry.applications.api.DialogV2.confirm({
							content,
							yes: {
								callback: () => {
									this.actor.system.editConditions(item, {
										srcArea: "condition_item_ids",
									});
								},
							},
							window: {
								icon: "fa-solid fa-trash",
								title: `${_loc("DOCUMENT.Delete", { type: "Condition" })}: ${item.name}`,
							},
						});
					},
				},
			],
			".condition",
		);
	}

	static async openItemForEditing(_, target) {
		const container = target.closest("[data-item-id]");
		const id = container.dataset.itemId;
		this.actor.items.get(id).sheet.render(true);
	}

	static async toggleDescription(_, target) {
		const container = target.closest("[data-item-id]");
		const id = container.dataset.itemId;

		if (this.expandedDescriptions.has(id)) {
			this.expandedDescriptions.delete(id);
			container.classList.remove("expanded");
		} else {
			this.expandedDescriptions.add(id);
			container.classList.add("expanded");
		}
	}
}
