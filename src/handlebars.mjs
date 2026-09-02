import { BaseCharacterData } from "./model/character/base_character.mjs";

export const registerHelpers = async () => {
	Handlebars.registerHelper(
		"warden-size-loc-key",
		BaseCharacterData.sizeLocKey,
	);
	Handlebars.registerHelper("warden-generate-bool-array", generateBoolArray);
	Handlebars.registerHelper("warden-prettify-modifier", prettifyModifier);

	await foundry.applications.handlebars.loadTemplates({
		"warden-diamond": "systems/warden/static/partials/diamond.hbs",
		"warden-diamonds": "systems/warden/static/partials/diamonds.hbs",
	});
};

const generateBoolArray = (total, context) => {
	const filled = context.hash["filled"] ?? 0;
	const reverse = context.hash["reverse"] ?? false;

	const ret = Array.fromRange(total).map((_, i) => i < filled);

	if (reverse) ret.reverse();

	return ret;
};

const prettifyModifier = (value, prefix = "", postfix = "") => {
	const sign = isNaN(value) ? "" : value >= 0 ? "+" : "-";

	return `${sign}${prefix}${value}${postfix}`;
};
