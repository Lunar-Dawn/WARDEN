const { Sidebar } = foundry.applications.sidebar;

export class WardenSidebar extends Sidebar {

	static DEFAULT_OPTIONS = {
        actions: {
            applyDamage: WardenSidebar.applyDamage
        }
    }

    static async applyDamage(event, target) {
        if (canvas.tokens.controlled.length === 0) {
            ui.notifications.warn("warden.canvas.select-one-or-more-tokens");
            return;
        }

		const data = target.dataset;
        const damage = {
            types: data.damageTypes.split(","),
            traits: data.damageTraits.split(","),
            total: Number(data.damageTotal)
        }

        canvas.tokens.controlled.forEach(async token => {
            if (token.actor === undefined) return; // How?
            if (token.actor.system === undefined) return; // HOW???

            await token.actor.system.applyDamage(damage);
        });
    }
}