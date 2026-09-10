/**
 * Used for determining if a given trait should be allowed to be applied to a given item.
 * @callback ItemSystemCallback
 * @param {BaseEquipment} item - The base system data of the item.
 * @returns {boolean} - True if the trait may be applied to the item.
 */

/**
 * Contains anything related to resolving a check.
 * @typedef {Object} PreResolveDetails
 * @param {string} proficiency - The proficiency to resolve the check.
 * @param {string[]} domains - The domains collected up before the check is resolved.
 * @param {string[]} discriminators - The discriminators collected up before the check is resolved.
 */

/**
 * Used for determining if a given trait should be allowed to be applied to a given item.
 * @callback PreResolvingCallback
 * @param {BaseEquipment} item - The base system data of the item.
 * @param {PreResolveDetails} details - See that object's documentation.
 */

/**
 * 
 * @typedef {Object} WeaponTraitType
 * @property {string} label - The "name" for the trait as shown to the user.
 * @property {string} desc - The description of the trait, as shown to the user.
 * @property {?ItemSystemCallback} validity_cb - A function that determines whether a trait is valid for the item. 
 *                                               Can be null, in which case, the trait is always valid.
 * @property {?PreResolvingCallback} preresolve_cb
 * @property {DynamicEffect[]} dynamic_effects - An array of dynamic effects that are going to be applied to all characters, 
 *                                               even if they don't have an item with this trait.
 *                                               Can be used to set up DEs that affect every item with a specific trait ahead of time.
 * @property {}
 */

/**
 * @type Object.<string, WeaponTraitType>
 */
export const WEAPON_TRAITS = {
    activated: {
        label: "warden.traits.weapon.activated.label",
        desc: "warden.traits.weapon.activated.desc",
        dynamic_effects: []
    },
    advanced: {
        label: "warden.traits.weapon.advanced.label",
        desc: "warden.traits.weapon.advanced.desc",
        dynamic_effects: [],
        preresolve_cb: (item, details) => {
            const actor = item.parent.actor;

            if (actor)
                if (actor.system.path.combat.rank < 3)
                    details.proficiency = "untrained";
        }
    },
    agile: {
        label: "warden.traits.weapon.agile.label",
        desc: "warden.traits.weapon.agile.desc",
        validity_cb: (item) => {
            return ["heavy", "huge"].find((x) => x === item.weight) === undefined;
        },
        dynamic_effects: [
            {
                type: "bonus",
                label: "Agile",
                domains: new Set(["attack", "strike.attack"]),
                defaultEnabled: true,
                applicable_if: ["attack.trait.agile", "map"],

                modifier_type: "universal",

                mode: "add",
                value: 2,
            }
        ]
    },
    blast: {
        label: "warden.traits.weapon.blast.label",
        desc: "warden.traits.weapon.blast.desc",
        dynamic_effects: [
            {
                type: "note",
                label: "Blast",
                domains: new Set(["attack", "strike.attack"]),
                defaultEnabled: true,
                applicable_if: ["attack.trait.blast"],

                modifier_type: "universal",

                mode: "add",
                value: "<p><strong>@Localise[warden.traits.weapon.blast.label]</strong> @Localise[warden.traits.weapon.blast.desc]</p>",
            }
        ]
    },
    breach: {
        label: "warden.traits.weapon.breach.label",
        desc: "warden.traits.weapon.breach.desc",
        dynamic_effects: [
            {
                type: "note",
                label: "Breach",
                domains: new Set(["damage", "strike.damage"]),
                defaultEnabled: true,
                applicable_if: ["damage.trait.breach"],

                modifier_type: "universal",

                mode: "add",
                value: "<p><strong>@Localise[warden.traits.weapon.breach.label]</strong> @Localise[warden.traits.weapon.breach.desc]</p>",
            }
        ]
    },
    break: {
        label: "warden.traits.weapon.break.label",
        desc: "warden.traits.weapon.break.desc",
        dynamic_effects: [], // TODO: Will need implementation if we ever manually implement the various actions.
    },
    concealable: {
        label: "warden.traits.weapon.concealable.label",
        desc: "warden.traits.weapon.concealable.desc",
        dynamic_effects: [], // TODO: Will need implementation if we ever manually implement the various actions.
    },
    disperse: {
        label: "warden.traits.weapon.disperse.label",
        desc: "warden.traits.weapon.disperse.desc",
        dynamic_effects: [],
    },
    dual: {
        label: "warden.traits.weapon.dual.label",
        desc: "warden.traits.weapon.dual.desc",
        dynamic_effects: [], // TODO: I have no idea how we'll handle this.
    },
    explosive_1: {
        label: "warden.traits.weapon.explosive.label_1",
        desc: "warden.traits.weapon.explosive.desc",
        validity_cb: (item) => {
            return !(item.traits.has("explosive_2") || item.traits.has("explosive_3"));
        },
        dynamic_effects: [],
    },
    explosive_2: {
        label: "warden.traits.weapon.explosive.label_2",
        desc: "warden.traits.weapon.explosive.desc",
        validity_cb: (item) => {
            return !(item.traits.has("explosive_1") || item.traits.has("explosive_3"));
        },
        dynamic_effects: [],
    },
    explosive_3: {
        label: "warden.traits.weapon.explosive.label_3",
        desc: "warden.traits.weapon.explosive.desc",
        validity_cb: (item) => {
            return !(item.traits.has("explosive_1") || item.traits.has("explosive_2"));
        },
        dynamic_effects: [],
    },
    fatal: {
        label: "warden.traits.weapon.fatal.label",
        desc: "warden.traits.weapon.fatal.desc",
        validity_cb: (item) => {
            return item.damage_die <= 8;
        },
        dynamic_effects: [
            {
                type: "effect_die_size",
                label: "Fatal",
                domains: new Set(["damage", "strike.damage"]),
                defaultEnabled: true,
                applicable_if: ["damage.trait.fatal", "crit"],

                modifier_type: "universal",

                mode: "add",
                value: 4,
            }
        ],
    },
    forceful: {
        label: "warden.traits.weapon.forceful.label",
        desc: "warden.traits.weapon.forceful.desc",
        dynamic_effects: [
            {
                type: "bonus",
                label: "Forceful",
                domains: new Set(["damage", "strike.damage"]),
                defaultEnabled: true,
                applicable_if: ["damage.trait.forceful", "map"],

                modifier_type: "item",

                mode: "add",
                value: 2,
            }
        ],
    }
}