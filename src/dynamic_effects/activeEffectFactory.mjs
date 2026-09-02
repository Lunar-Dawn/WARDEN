export const getBaseActiveEffect = (label, type) => {
	type ??= "bonus";

	return {
		name: "dynamicEffectHolder",
		changes: [
			{
				key: `system.dynamic_effects.${type}`,
				type: "add",
				phase: "initial",
				value: getDefaultValue(label, type),
			},
		],
	};
};

const getDefaultValue = (label, type) => {
	return {
		label: label,
		domains: [],

		value: 0,
		mode: "upgrade",
		modifier_type: "universal",

		applicable_if: [],

		defaultEnabled: true,
	};
};
