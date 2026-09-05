import {
	DAMAGE_CATEGORY_CHOICES,
	DAMAGE_TYPE_CHOICES,
	DAMAGE_TYPES,
} from "./damage_type.mjs";
import { WardenItem } from "./document/item.mjs";
import { registerHelpers } from "./handlebars.mjs";
import { AdversaryData } from "./model/character/adversary.mjs";
import { BaseCharacterData } from "./model/character/base_character.mjs";
import { CharacterData } from "./model/character/character.mjs";
import { MookData } from "./model/character/mook.mjs";
import { Ability } from "./model/item/character_build/ability.mjs";
import { Feat } from "./model/item/character_build/feat.mjs";
import { Origin } from "./model/item/character_build/origin.mjs";
import { Apparel } from "./model/item/equipment/apparel.mjs";
import { Kit } from "./model/item/equipment/kit.mjs";
import { Shield } from "./model/item/equipment/shield.mjs";
import { UtilityItem } from "./model/item/equipment/utility_item.mjs";
import { Weapon } from "./model/item/equipment/weapon.mjs";
import { Condition } from "./model/item/condition.mjs";
import { WardenCheck } from "./roll/warden_check.mjs";
import { WardenEffect } from "./roll/warden_effect.mjs";
import { CharacterSheet } from "./sheet/character.mjs";
import { EquipmentSheet } from "./sheet/equipment.mjs";
import { ConditionSheet } from "./sheet/condition.mjs";
import { OpponentSheet } from "./sheet/opponent.mjs";
import { WEAPON_TRAITS } from "./model/util/equipment_traits.mjs";

globalThis["WARDEN"] = {};
globalThis["WARDEN"].DAMAGE_TYPES = DAMAGE_TYPES;
globalThis["WARDEN"].DAMAGE_TYPE_CHOICES = DAMAGE_TYPE_CHOICES;
globalThis["WARDEN"].DAMAGE_CATEGORY_CHOICES = DAMAGE_CATEGORY_CHOICES;
globalThis["WARDEN"].WEAPON_TRAITS = WEAPON_TRAITS;

Hooks.once("init", () => {
	CONFIG.Actor.dataModels.character = CharacterData;
	CONFIG.Actor.dataModels.mook = MookData;
	CONFIG.Actor.dataModels.adversary = AdversaryData;
	CONFIG.Actor.trackableAttributes = {
		character: {
			bar: ["hit_points", "strain"],
			value: [],
		},
		mook: {
			bar: ["hit_points", "strain"],
			value: [],
		},
		adversary: {
			bar: ["hit_points", "strain"],
			value: [],
		},
	};

	CONFIG.Item.documentClass = WardenItem;

	CONFIG.Item.dataModels.utilityItem = UtilityItem;
	CONFIG.Item.dataModels.weapon = Weapon;
	CONFIG.Item.dataModels.apparel = Apparel;
	CONFIG.Item.dataModels.shield = Shield;
	CONFIG.Item.dataModels.kit = Kit;

	CONFIG.Item.dataModels.origin = Origin;
	CONFIG.Item.dataModels.ability = Ability;
	CONFIG.Item.dataModels.feat = Feat;

	CONFIG.Item.dataModels.condition = Condition;

	CONFIG.Dice.rolls.push(WardenCheck);
	CONFIG.Dice.rolls.push(WardenEffect);

	const DocumentSheetConfig = foundry.applications.apps.DocumentSheetConfig;
	DocumentSheetConfig.registerSheet(Actor, "warden", CharacterSheet, {
		types: ["character"],
		makeDefault: true,
		label: "warden.character.sheet.label",
	});
	DocumentSheetConfig.registerSheet(Actor, "warden", OpponentSheet, {
		types: ["mook", "adversary"],
		makeDefault: true,
		label: "warden.opponent.sheet.label",
	});

	DocumentSheetConfig.registerSheet(Item, "warden", EquipmentSheet, {
		types: [
			"utilityItem",
			"weapon",
			"apparel",
			"shield",
			"kit",
			"origin",
			"ability",
			"feat",
		],
		makeDefault: true,
		label: "warden.equipment.sheet.label",
	});

	DocumentSheetConfig.registerSheet(Item, "warden", ConditionSheet, {
		types: ["condition"],
		makeDefault: true,
		label: "warden.condition.sheet.label",
	});

	registerHelpers();
});

Hooks.once("i18nInit", () => {
	foundry.helpers.Localization.localizeDataModel(BaseCharacterData);
	foundry.helpers.Localization.localizeDataModel(CharacterData);
});
